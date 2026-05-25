package com.afterglowtv.nativeplayer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.os.PowerManager;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.documentfile.provider.DocumentFile;

import com.hierynomus.msdtyp.AccessMask;
import com.hierynomus.msfscc.FileAttributes;
import com.hierynomus.mssmb2.SMB2CreateDisposition;
import com.hierynomus.mssmb2.SMB2CreateOptions;
import com.hierynomus.mssmb2.SMB2ShareAccess;
import com.hierynomus.smbj.SMBClient;
import com.hierynomus.smbj.auth.AuthenticationContext;
import com.hierynomus.smbj.connection.Connection;
import com.hierynomus.smbj.session.Session;
import com.hierynomus.smbj.share.DiskShare;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.KeyStore;

public class DvrRecordingService extends Service {
    public static final String ACTION_RECORD = "com.afterglowtv.nativeplayer.action.RECORD_DVR";
    public static final String ACTION_DVR_RECORDING_FINISHED = "com.afterglowtv.nativeplayer.action.DVR_RECORDING_FINISHED";
    public static final String EXTRA_KEY = "key";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_CHANNEL_NAME = "channelName";
    public static final String EXTRA_STREAM_URL = "streamUrl";
    public static final String EXTRA_START_MILLIS = "startMillis";
    public static final String EXTRA_STOP_MILLIS = "stopMillis";
    public static final String EXTRA_TARGET_MODE = "targetMode";
    public static final String EXTRA_TARGET_LOCATION = "targetLocation";
    public static final String EXTRA_TARGET_LABEL = "targetLabel";
    public static final String EXTRA_USER_AGENT = "userAgent";
    public static final String EXTRA_SUCCESS = "success";
    public static final String EXTRA_BYTES = "bytes";
    public static final String EXTRA_DISPLAY_PATH = "displayPath";
    public static final String EXTRA_ERROR = "error";

    private static final String DEFAULT_USER_AGENT = "VLC/3.0.18 LibVLC/3.0.18";
    private static final String PREFS_NAME = "afterglow_native_prefs";
    private static final String DVR_RECORDINGS_CACHE_FILE = "afterglow_dvr_recordings.cache";
    private static final String KEYSTORE_ALIAS_SMB_PASSWORD = "afterglow_dvr_smb_password";
    private static final String DVR_TARGET_DEVICE = "device";
    private static final String DVR_TARGET_TREE = "tree";
    private static final String DVR_TARGET_PATH = "path";
    private static final String DVR_TARGET_SMB = "smb";
    private static final String CHANNEL_ID = "afterglow_dvr_recording";
    private static final int NOTIFICATION_ID = 6201;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private SharedPreferences prefs;

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        ensureNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || !ACTION_RECORD.equals(intent.getAction())) {
            return START_NOT_STICKY;
        }

        DvrJob job = DvrJob.fromIntent(intent);
        startInForeground(job);
        executor.execute(() -> recordJob(job, startId));
        return START_REDELIVER_INTENT;
    }

    @Override
    public void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startInForeground(DvrJob job) {
        Notification notification = buildNotification("Recording " + job.title, job.channelName);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification(String title, String body) {
        Intent launchIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        return builder
            .setSmallIcon(com.afterglowtv.nativeplayer.R.drawable.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build();
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Afterglow DVR", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Active DVR recordings");
        manager.createNotificationChannel(channel);
    }

    private void recordJob(DvrJob job, int startId) {
        DvrOutput target = null;
        PowerManager.WakeLock wakeLock = acquireRecordingWakeLock(job);
        long bytesWritten = 0L;
        Exception failure = null;
        try {
            target = openDvrOutput(job);
            bytesWritten = recordDvrStream(job, target.stream);
        } catch (Exception error) {
            failure = error;
        } finally {
            if (target != null) {
                closeQuietly(target.stream);
            }
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }

        boolean success = failure == null && bytesWritten > 0 && target != null;
        if (success) {
            appendRecording(job, target, bytesWritten);
        }
        removeDvrJob(job.key);
        sendCompletionBroadcast(job, target, bytesWritten, success, failure);
        stopForeground(true);
        stopSelf(startId);
    }

    private PowerManager.WakeLock acquireRecordingWakeLock(DvrJob job) {
        PowerManager manager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (manager == null) {
            return null;
        }
        PowerManager.WakeLock wakeLock = manager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AfterglowTV:DvrRecording");
        wakeLock.setReferenceCounted(false);
        long remaining = Math.max(10L * 60L * 1000L, job.stopMillis - System.currentTimeMillis() + 5L * 60L * 1000L);
        wakeLock.acquire(remaining);
        return wakeLock;
    }

    private long recordDvrStream(DvrJob job, OutputStream output) throws Exception {
        if (looksLikeHls(job.streamUrl)) {
            return recordHlsStream(job, output);
        }
        return recordHttpResource(job.streamUrl, output, job.stopMillis, job.userAgent);
    }

    private long recordHttpResource(String streamUrl, OutputStream output, long stopMillis, String userAgent) throws Exception {
        HttpURLConnection connection = openDvrConnection(streamUrl, userAgent);
        long bytesWritten = 0L;
        try (InputStream input = new BufferedInputStream(connection.getInputStream())) {
            byte[] buffer = new byte[128 * 1024];
            while (System.currentTimeMillis() < stopMillis && !Thread.currentThread().isInterrupted()) {
                int read;
                try {
                    read = input.read(buffer);
                } catch (IOException error) {
                    if (System.currentTimeMillis() >= stopMillis) {
                        break;
                    }
                    throw error;
                }
                if (read < 0) {
                    break;
                }
                output.write(buffer, 0, read);
                bytesWritten += read;
            }
            output.flush();
        } finally {
            connection.disconnect();
        }
        return bytesWritten;
    }

    private long recordHlsStream(DvrJob job, OutputStream output) throws Exception {
        String playlistUrl = job.streamUrl;
        Set<String> downloadedSegments = new LinkedHashSet<>();
        long bytesWritten = 0L;
        while (System.currentTimeMillis() < job.stopMillis && !Thread.currentThread().isInterrupted()) {
            String manifest = fetchText(playlistUrl, job.userAgent);
            List<String> entries = parseHlsEntries(manifest, playlistUrl);
            String variantPlaylist = firstVariantPlaylist(entries);
            if (variantPlaylist != null) {
                playlistUrl = variantPlaylist;
                downloadedSegments.clear();
                continue;
            }

            boolean wroteSegment = false;
            for (String segmentUrl : entries) {
                if (System.currentTimeMillis() >= job.stopMillis) {
                    break;
                }
                if (downloadedSegments.add(segmentUrl)) {
                    bytesWritten += recordHttpResource(segmentUrl, output, job.stopMillis, job.userAgent);
                    wroteSegment = true;
                }
            }

            if (manifest.toUpperCase(Locale.US).contains("#EXT-X-ENDLIST") && !wroteSegment) {
                break;
            }
            if (!wroteSegment) {
                try {
                    Thread.sleep(2500);
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        output.flush();
        return bytesWritten;
    }

    private HttpURLConnection openDvrConnection(String streamUrl, String userAgent) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(streamUrl).openConnection();
        connection.setInstanceFollowRedirects(true);
        connection.setConnectTimeout(12000);
        connection.setReadTimeout(15000);
        connection.setRequestProperty("User-Agent", userAgent == null || userAgent.trim().isEmpty() ? DEFAULT_USER_AGENT : userAgent);
        connection.setRequestProperty("Accept", "*/*");
        connection.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
        return connection;
    }

    private String fetchText(String targetUrl, String userAgent) throws IOException {
        HttpURLConnection connection = openDvrConnection(targetUrl, userAgent);
        try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        } finally {
            connection.disconnect();
        }
    }

    private boolean looksLikeHls(String streamUrl) {
        String lower = streamUrl == null ? "" : streamUrl.toLowerCase(Locale.US);
        return lower.contains(".m3u8") || lower.contains("format=m3u8") || lower.contains("type=m3u8");
    }

    private List<String> parseHlsEntries(String manifest, String baseUrl) {
        List<String> entries = new ArrayList<>();
        String[] lines = manifest.split("\\r?\\n");
        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            entries.add(resolveUrl(baseUrl, line));
        }
        return entries;
    }

    private String firstVariantPlaylist(List<String> entries) {
        for (String entry : entries) {
            if (looksLikeHls(entry)) {
                return entry;
            }
        }
        return null;
    }

    private String resolveUrl(String baseUrl, String value) {
        try {
            return new URL(new URL(baseUrl), value).toString();
        } catch (Exception ignored) {
            return value;
        }
    }

    private DvrOutput openDvrOutput(DvrJob job) throws Exception {
        String fileName = buildDvrFileName(job);
        String mode = job.targetMode == null || job.targetMode.isEmpty() ? DVR_TARGET_DEVICE : job.targetMode;
        if (DVR_TARGET_SMB.equals(mode)) {
            return openSmbDvrOutput(job, fileName);
        }
        if (DVR_TARGET_TREE.equals(mode)) {
            String treeValue = job.targetLocation;
            if (treeValue.isEmpty()) {
                throw new IOException("No DVR folder selected.");
            }
            DocumentFile root = DocumentFile.fromTreeUri(this, Uri.parse(treeValue));
            if (root == null || !root.exists() || !root.canWrite()) {
                throw new IOException("Selected DVR folder is not writable.");
            }
            DocumentFile recordingFile = root.createFile("video/mp2t", fileName);
            if (recordingFile == null) {
                throw new IOException("Could not create DVR file.");
            }
            OutputStream stream = getContentResolver().openOutputStream(recordingFile.getUri(), "w");
            if (stream == null) {
                throw new IOException("Could not open DVR output stream.");
            }
            return new DvrOutput(stream, recordingFile.getUri().toString(), "Picked folder / " + fileName);
        }

        File folder = DVR_TARGET_PATH.equals(mode) ? new File(job.targetLocation) : defaultDvrFolder();
        if (!folder.exists() && !folder.mkdirs()) {
            throw new IOException("Could not create DVR folder.");
        }
        if (!folder.canWrite()) {
            throw new IOException("DVR folder is not writable.");
        }
        File file = new File(folder, fileName);
        return new DvrOutput(new FileOutputStream(file), Uri.fromFile(file).toString(), file.getAbsolutePath());
    }

    private DvrOutput openSmbDvrOutput(DvrJob job, String fileName) throws Exception {
        SmbTarget target = decodeSmbTargetLocation(job.targetLocation);
        if (target.host.isEmpty() || target.share.isEmpty()) {
            throw new IOException("SMB server or share is missing.");
        }

        SMBClient client = new SMBClient();
        Connection connection = null;
        Session session = null;
        DiskShare share = null;
        com.hierynomus.smbj.share.File smbFile = null;
        try {
            connection = client.connect(target.host);
            session = connection.authenticate(createSmbAuthenticationContext(target, getSmbPassword()));
            share = (DiskShare) session.connectShare(target.share);
            String remoteFolder = normalizeSmbFolder(target.path);
            ensureSmbDirectories(share, remoteFolder);
            String remotePath = joinSmbPath(remoteFolder, fileName);
            smbFile = share.openFile(
                remotePath,
                EnumSet.of(AccessMask.GENERIC_WRITE),
                EnumSet.of(FileAttributes.FILE_ATTRIBUTE_NORMAL),
                SMB2ShareAccess.ALL,
                SMB2CreateDisposition.FILE_OVERWRITE_IF,
                EnumSet.of(SMB2CreateOptions.FILE_SEQUENTIAL_ONLY)
            );
            OutputStream stream = new SmbDvrOutputStream(smbFile.getOutputStream(), smbFile, share, session, connection, client);
            String display = "SMB / //" + target.host + "/" + target.share + "/" + remotePath.replace('\\', '/');
            return new DvrOutput(stream, "smb://" + target.host + "/" + target.share + "/" + remotePath.replace('\\', '/'), display);
        } catch (Exception error) {
            closeAuto(smbFile);
            closeAuto(share);
            closeAuto(session);
            closeAuto(connection);
            closeAuto(client);
            throw error;
        }
    }

    private AuthenticationContext createSmbAuthenticationContext(SmbTarget target, String password) {
        if (target.username.isEmpty() && (password == null || password.isEmpty())) {
            return AuthenticationContext.guest();
        }
        return new AuthenticationContext(target.username, (password == null ? "" : password).toCharArray(), target.domain);
    }

    private void ensureSmbDirectories(DiskShare share, String remoteFolder) throws IOException {
        if (remoteFolder.isEmpty()) {
            return;
        }
        String[] parts = remoteFolder.split("\\\\");
        String current = "";
        for (String part : parts) {
            if (part.trim().isEmpty()) {
                continue;
            }
            current = current.isEmpty() ? part : current + "\\" + part;
            if (!share.folderExists(current)) {
                share.mkdir(current);
            }
        }
    }

    private String normalizeSmbFolder(String path) {
        String normalized = path == null ? "" : path.trim().replace('/', '\\');
        while (normalized.startsWith("\\")) {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("\\")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String joinSmbPath(String folder, String fileName) {
        return folder == null || folder.isEmpty() ? fileName : folder + "\\" + fileName;
    }

    private String buildDvrFileName(DvrJob job) {
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMdd-HHmm", Locale.US);
        return sanitizeFileName(formatter.format(new Date(job.startMillis)) + "-" + job.channelName + "-" + job.title) + ".ts";
    }

    private String sanitizeFileName(String value) {
        String cleaned = value == null ? "Afterglow-DVR" : value.replaceAll("[^a-zA-Z0-9._ -]", " ").replaceAll("\\s+", " ").trim();
        if (cleaned.length() > 120) {
            cleaned = cleaned.substring(0, 120).trim();
        }
        return cleaned.isEmpty() ? "Afterglow-DVR" : cleaned;
    }

    private File defaultDvrFolder() {
        File movies = getExternalFilesDir(Environment.DIRECTORY_MOVIES);
        File root = movies == null ? getFilesDir() : movies;
        return new File(root, "AfterglowDVR");
    }

    private void appendRecording(DvrJob job, DvrOutput target, long bytesWritten) {
        try (OutputStreamWriter writer = new OutputStreamWriter(openFileOutput(DVR_RECORDINGS_CACHE_FILE, Context.MODE_APPEND), StandardCharsets.UTF_8)) {
            writer.write(joinCacheFields(
                job.key + "-" + System.currentTimeMillis(),
                job.title,
                job.channelName,
                target.uri,
                target.displayPath,
                String.valueOf(System.currentTimeMillis()),
                String.valueOf(bytesWritten),
                String.valueOf(Math.max(0L, Math.min(System.currentTimeMillis(), job.stopMillis) - job.startMillis))
            ));
            writer.write("\n");
        } catch (Exception ignored) {
        }
    }

    private void removeDvrJob(String key) {
        String savedJobs = prefs.getString("dvr_schedule_jobs", "");
        StringBuilder jobsBuilder = new StringBuilder();
        StringBuilder keysBuilder = new StringBuilder();
        for (String line : savedJobs.split("\\n")) {
            if (line.trim().isEmpty()) {
                continue;
            }
            String[] fields = line.split("\\t", -1);
            if (fields.length == 0 || key.equals(decodeCacheField(fields[0]))) {
                continue;
            }
            if (jobsBuilder.length() > 0) {
                jobsBuilder.append('\n');
            }
            jobsBuilder.append(line);
            if (keysBuilder.length() > 0) {
                keysBuilder.append('\n');
            }
            keysBuilder.append(decodeCacheField(fields[0]));
        }
        prefs.edit()
            .putString("dvr_schedule_jobs", jobsBuilder.toString())
            .putString("dvr_schedule_keys", keysBuilder.toString())
            .apply();
    }

    private void sendCompletionBroadcast(DvrJob job, DvrOutput target, long bytesWritten, boolean success, Exception failure) {
        Intent finished = new Intent(ACTION_DVR_RECORDING_FINISHED)
            .setPackage(getPackageName())
            .putExtra(EXTRA_KEY, job.key)
            .putExtra(EXTRA_TITLE, job.title)
            .putExtra(EXTRA_SUCCESS, success)
            .putExtra(EXTRA_BYTES, bytesWritten)
            .putExtra(EXTRA_DISPLAY_PATH, target == null ? "" : target.displayPath)
            .putExtra(EXTRA_ERROR, failure == null || failure.getMessage() == null ? "" : failure.getMessage());
        sendBroadcast(finished);
    }

    private String joinCacheFields(String... fields) {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < fields.length; index++) {
            if (index > 0) {
                builder.append('\t');
            }
            builder.append(encodeCacheField(fields[index]));
        }
        return builder.toString();
    }

    private String encodeCacheField(String value) {
        return Base64.encodeToString((value == null ? "" : value).getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
    }

    private String decodeCacheField(String value) {
        try {
            return new String(Base64.decode(value, Base64.NO_WRAP), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return "";
        }
    }

    private String decryptPreferenceValue(String value) {
        if (value == null || value.trim().isEmpty() || !value.contains(":")) {
            return "";
        }
        try {
            String[] parts = value.split(":", 2);
            byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
            byte[] encrypted = Base64.decode(parts[1], Base64.NO_WRAP);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateSecretKey(), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return "";
        }
    }

    private SecretKey getOrCreateSecretKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(KEYSTORE_ALIAS_SMB_PASSWORD)) {
            return (SecretKey) keyStore.getKey(KEYSTORE_ALIAS_SMB_PASSWORD, null);
        }

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEYSTORE_ALIAS_SMB_PASSWORD, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }

    private String getSmbPassword() {
        return decryptPreferenceValue(prefs.getString("dvr_smb_password_enc", ""));
    }

    private void closeQuietly(OutputStream output) {
        if (output == null) {
            return;
        }
        try {
            output.close();
        } catch (IOException ignored) {
        }
    }

    private void closeAuto(AutoCloseable closeable) {
        if (closeable == null) {
            return;
        }
        try {
            closeable.close();
        } catch (Exception ignored) {
        }
    }

    private static class DvrJob {
        final String key;
        final String title;
        final String channelName;
        final String streamUrl;
        final long startMillis;
        final long stopMillis;
        final String targetMode;
        final String targetLocation;
        final String targetLabel;
        final String userAgent;

        DvrJob(String key, String title, String channelName, String streamUrl, long startMillis, long stopMillis, String targetMode, String targetLocation, String targetLabel, String userAgent) {
            this.key = key == null ? "" : key.trim();
            this.title = title == null || title.trim().isEmpty() ? "Afterglow DVR Recording" : title.trim();
            this.channelName = channelName == null || channelName.trim().isEmpty() ? "Unknown Channel" : channelName.trim();
            this.streamUrl = streamUrl == null ? "" : streamUrl.trim();
            this.startMillis = startMillis;
            this.stopMillis = stopMillis;
            this.targetMode = targetMode == null || targetMode.trim().isEmpty() ? DVR_TARGET_DEVICE : targetMode.trim();
            this.targetLocation = targetLocation == null ? "" : targetLocation.trim();
            this.targetLabel = targetLabel == null || targetLabel.trim().isEmpty() ? "Device Storage" : targetLabel.trim();
            this.userAgent = userAgent == null || userAgent.trim().isEmpty() ? DEFAULT_USER_AGENT : userAgent.trim();
        }

        static DvrJob fromIntent(Intent intent) {
            return new DvrJob(
                intent.getStringExtra(EXTRA_KEY),
                intent.getStringExtra(EXTRA_TITLE),
                intent.getStringExtra(EXTRA_CHANNEL_NAME),
                intent.getStringExtra(EXTRA_STREAM_URL),
                intent.getLongExtra(EXTRA_START_MILLIS, System.currentTimeMillis()),
                intent.getLongExtra(EXTRA_STOP_MILLIS, System.currentTimeMillis() + 60L * 60L * 1000L),
                intent.getStringExtra(EXTRA_TARGET_MODE),
                intent.getStringExtra(EXTRA_TARGET_LOCATION),
                intent.getStringExtra(EXTRA_TARGET_LABEL),
                intent.getStringExtra(EXTRA_USER_AGENT)
            );
        }
    }

    private static class SmbTarget {
        final String host;
        final String share;
        final String path;
        final String username;
        final String domain;

        SmbTarget(String host, String share, String path, String username, String domain) {
            this.host = host == null ? "" : host.trim().replace("smb://", "").replaceAll("/.*$", "");
            this.share = share == null ? "" : share.trim().replace("/", "").replace("\\", "");
            this.path = path == null ? "" : path.trim();
            this.username = username == null ? "" : username.trim();
            this.domain = domain == null ? "" : domain.trim();
        }
    }

    private SmbTarget decodeSmbTargetLocation(String value) {
        if (value == null || value.trim().isEmpty()) {
            return new SmbTarget("", "", "", "", "");
        }
        String[] fields = value.split("\\|", -1);
        if (fields.length < 5) {
            return new SmbTarget("", "", "", "", "");
        }
        return new SmbTarget(
            decodeCacheField(fields[0]),
            decodeCacheField(fields[1]),
            decodeCacheField(fields[2]),
            decodeCacheField(fields[3]),
            decodeCacheField(fields[4])
        );
    }

    private static class DvrOutput {
        final OutputStream stream;
        final String uri;
        final String displayPath;

        DvrOutput(OutputStream stream, String uri, String displayPath) {
            this.stream = stream;
            this.uri = uri == null ? "" : uri;
            this.displayPath = displayPath == null ? "" : displayPath;
        }
    }

    private static class SmbDvrOutputStream extends OutputStream {
        private final OutputStream delegate;
        private final AutoCloseable[] closeables;

        SmbDvrOutputStream(OutputStream delegate, AutoCloseable... closeables) {
            this.delegate = delegate;
            this.closeables = closeables;
        }

        @Override
        public void write(int value) throws IOException {
            delegate.write(value);
        }

        @Override
        public void write(byte[] buffer, int offset, int count) throws IOException {
            delegate.write(buffer, offset, count);
        }

        @Override
        public void flush() throws IOException {
            delegate.flush();
        }

        @Override
        public void close() throws IOException {
            IOException failure = null;
            try {
                delegate.close();
            } catch (IOException error) {
                failure = error;
            }
            for (AutoCloseable closeable : closeables) {
                if (closeable == null) {
                    continue;
                }
                try {
                    closeable.close();
                } catch (Exception error) {
                    if (failure == null) {
                        failure = new IOException(error);
                    }
                }
            }
            if (failure != null) {
                throw failure;
            }
        }
    }
}