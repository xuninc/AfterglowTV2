package com.afterglowtv.nativeplayer;

import android.app.Activity;
import android.content.Intent;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.documentfile.provider.DocumentFile;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.PlayerView;

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
import java.util.Collections;
import java.util.Date;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.KeyStore;

public class MainActivity extends Activity {
    private static final String DEFAULT_USER_AGENT = "VLC/3.0.18 LibVLC/3.0.18";
    private static final String PREFS_NAME = "afterglow_native_prefs";
    private static final String CHANNEL_CACHE_FILE = "afterglow_channels.cache";
    private static final String LIBRARY_CACHE_FILE = "afterglow_library.cache";
    private static final String EPG_CACHE_FILE = "afterglow_epg.cache";
    private static final String DVR_RECORDINGS_CACHE_FILE = "afterglow_dvr_recordings.cache";
    private static final String KEYSTORE_ALIAS_SMB_PASSWORD = "afterglow_dvr_smb_password";
    private static final int REQUEST_LIBRARY_TREE = 4510;
    private static final int REQUEST_DVR_TREE = 4511;
    private static final int MAX_RENDERED_CHANNELS = 500;
    private static final String DVR_TARGET_DEVICE = "device";
    private static final String DVR_TARGET_TREE = "tree";
    private static final String DVR_TARGET_PATH = "path";
    private static final String DVR_TARGET_SMB = "smb";

    private static final int COLOR_BLACK = Color.rgb(6, 5, 9);
    private static final int COLOR_PANEL = Color.rgb(18, 16, 24);
    private static final int COLOR_PANEL_SOFT = Color.rgb(27, 22, 34);
    private static final int COLOR_PRIMARY = Color.rgb(255, 62, 0);
    private static final int COLOR_PINK = Color.rgb(255, 78, 136);
    private static final int COLOR_TEXT = Color.rgb(245, 242, 240);
    private static final int COLOR_MUTED = Color.argb(170, 245, 242, 240);

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final ExecutorService recordingExecutor = Executors.newFixedThreadPool(2);
    private final List<Channel> channels = new ArrayList<>();
    private final List<LibraryItem> libraryItems = new ArrayList<>();
    private final Set<String> scheduledRecordings = new LinkedHashSet<>();
    private final Set<String> activeRecordingKeys = new LinkedHashSet<>();
    private final Map<String, DvrJob> dvrJobs = new LinkedHashMap<>();
    private final List<DvrRecording> dvrRecordings = new ArrayList<>();
    private final Map<String, List<EpgProgram>> epgByChannel = new HashMap<>();
    private final Runnable dvrScheduler = new Runnable() {
        @Override
        public void run() {
            evaluateDvrSchedule(false);
            mainHandler.postDelayed(this, 30000);
        }
    };

    private enum ViewMode {
        GUIDE,
        VOD,
        ADULT,
        DVR,
        LIBRARY,
        SETTINGS
    }

    private SharedPreferences prefs;
    private ViewMode activeView = ViewMode.GUIDE;
    private String activeFilter = "All";
    private final List<TextView> navButtons = new ArrayList<>();
    private EditText playlistInput;
    private EditText epgInput;
    private EditText userAgentInput;
    private EditText libraryPathInput;
    private EditText dvrTargetInput;
    private EditText dvrSmbHostInput;
    private EditText dvrSmbShareInput;
    private EditText dvrSmbPathInput;
    private EditText dvrSmbUserInput;
    private EditText dvrSmbDomainInput;
    private EditText dvrSmbPasswordInput;
    private TextView statusText;
    private TextView summaryText;
    private TextView sectionTitleText;
    private TextView nowPlayingText;
    private TextView decoderBadge;
    private LinearLayout categoryRow;
    private LinearLayout channelList;
    private PlayerView playerView;
    private ExoPlayer player;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();
        buildUi();

        String savedPlaylist = prefs.getString("playlist_url", "");
        String savedEpg = prefs.getString("epg_url", "");
        String savedUserAgent = prefs.getString("user_agent", DEFAULT_USER_AGENT);
        playlistInput.setText(savedPlaylist);
        epgInput.setText(savedEpg);
        userAgentInput.setText(savedUserAgent == null || savedUserAgent.trim().isEmpty() ? DEFAULT_USER_AGENT : savedUserAgent);
        loadDvrSchedule();
        loadDvrRecordings();

        loadCachedChannels();
        loadCachedLibrary();
        loadCachedEpg();
        renderCurrentView();
        mainHandler.postDelayed(dvrScheduler, 5000);

        if (savedPlaylist != null && !savedPlaylist.trim().isEmpty()) {
            loadPlaylist(savedPlaylist.trim());
        }
        if (savedEpg != null && !savedEpg.trim().isEmpty()) {
            loadEpg(savedEpg.trim());
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUi();
        }
    }

    @Override
    protected void onDestroy() {
        mainHandler.removeCallbacks(dvrScheduler);
        releasePlayer();
        executor.shutdownNow();
        recordingExecutor.shutdownNow();
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_LIBRARY_TREE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri treeUri = data.getData();
            int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            try {
                getContentResolver().takePersistableUriPermission(treeUri, flags & Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {
            }
            prefs.edit().putString("library_tree_uri", treeUri.toString()).apply();
            scanLibraryTree(treeUri);
        } else if (requestCode == REQUEST_DVR_TREE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri treeUri = data.getData();
            int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            try {
                getContentResolver().takePersistableUriPermission(treeUri, flags);
            } catch (Exception ignored) {
            }
            prefs.edit()
                .putString("dvr_target_mode", DVR_TARGET_TREE)
                .putString("dvr_tree_uri", treeUri.toString())
                .apply();
            setStatus("DVR TARGET READY", false);
            if (activeView == ViewMode.DVR) {
                renderDvrView();
            }
        }
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }

    private void buildUi() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(COLOR_BLACK);
        setContentView(root);

        LinearLayout shell = new LinearLayout(this);
        shell.setOrientation(LinearLayout.HORIZONTAL);
        shell.setPadding(dp(22), dp(20), dp(22), dp(20));
        root.addView(shell, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        shell.addView(createSidebar(), new LinearLayout.LayoutParams(dp(108), LinearLayout.LayoutParams.MATCH_PARENT));

        LinearLayout main = new LinearLayout(this);
        main.setOrientation(LinearLayout.VERTICAL);
        main.setPadding(dp(18), 0, 0, 0);
        shell.addView(main, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));

        main.addView(createHeader(), new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(84)));
        main.addView(createPlayerPanel(), new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.15f));
        main.addView(createSetupPanel(), new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(198)));
        main.addView(createChannelPanel(), new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 0.95f));
    }

    private View createSidebar() {
        LinearLayout sidebar = new LinearLayout(this);
        sidebar.setOrientation(LinearLayout.VERTICAL);
        sidebar.setGravity(Gravity.CENTER_HORIZONTAL);
        sidebar.setPadding(dp(10), dp(14), dp(10), dp(14));
        sidebar.setBackground(card(COLOR_PANEL, Color.argb(40, 255, 255, 255), dp(18)));

        TextView logo = new TextView(this);
        logo.setText("AFTER\nGLOW");
        logo.setTextColor(COLOR_TEXT);
        logo.setTextSize(15);
        logo.setTypeface(Typeface.DEFAULT_BOLD);
        logo.setGravity(Gravity.CENTER);
        logo.setLetterSpacing(0.08f);
        sidebar.addView(logo, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(72)));

        addNavButton(sidebar, "GUIDE", ViewMode.GUIDE);
        addNavButton(sidebar, "VOD", ViewMode.VOD);
        addNavButton(sidebar, "XXX", ViewMode.ADULT);
        addNavButton(sidebar, "DVR", ViewMode.DVR);
        addNavButton(sidebar, "LIB", ViewMode.LIBRARY);
        addNavButton(sidebar, "SET", ViewMode.SETTINGS);

        SpaceView spacer = new SpaceView(this);
        sidebar.addView(spacer, new LinearLayout.LayoutParams(1, 0, 1f));

        TextView build = new TextView(this);
        build.setText("NATIVE\n0.2");
        build.setTextColor(Color.argb(110, 245, 242, 240));
        build.setTextSize(9);
        build.setGravity(Gravity.CENTER);
        build.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        sidebar.addView(build, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48)));
        return sidebar;
    }

    private void addNavButton(LinearLayout sidebar, String item, ViewMode mode) {
            TextView nav = new TextView(this);
            nav.setText(item);
            nav.setGravity(Gravity.CENTER);
            nav.setTextColor(activeView == mode ? COLOR_PRIMARY : COLOR_MUTED);
            nav.setTextSize(11);
            nav.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
            nav.setFocusable(true);
            nav.setPadding(0, dp(10), 0, dp(10));
            applyFocusBackground(nav, COLOR_PANEL, COLOR_PANEL_SOFT);
            nav.setOnClickListener(v -> switchView(mode));
            navButtons.add(nav);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
            params.setMargins(0, dp(8), 0, 0);
            sidebar.addView(nav, params);
    }

    private View createHeader() {
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout titleBlock = new LinearLayout(this);
        titleBlock.setOrientation(LinearLayout.VERTICAL);
        titleBlock.setGravity(Gravity.CENTER_VERTICAL);

        TextView eyebrow = label("ANDROID TV / FIRE TV DIRECT PLAY", 10, COLOR_PRIMARY, true);
        titleBlock.addView(eyebrow);

        TextView title = new TextView(this);
        title.setText("Afterglow TV Native");
        title.setTextColor(COLOR_TEXT);
        title.setTextSize(27);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        titleBlock.addView(title);

        header.addView(titleBlock, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));

        statusText = label("READY", 11, COLOR_MUTED, true);
        statusText.setGravity(Gravity.CENTER_VERTICAL | Gravity.RIGHT);
        header.addView(statusText, new LinearLayout.LayoutParams(dp(440), LinearLayout.LayoutParams.MATCH_PARENT));
        return header;
    }

    private View createPlayerPanel() {
        FrameLayout panel = new FrameLayout(this);
        panel.setPadding(dp(1), dp(1), dp(1), dp(1));
        panel.setBackground(card(COLOR_PANEL, Color.argb(60, 255, 255, 255), dp(18)));

        playerView = new PlayerView(this);
        playerView.setUseController(true);
        playerView.setControllerAutoShow(false);
        playerView.setKeepContentOnPlayerReset(true);
        playerView.setShutterBackgroundColor(Color.BLACK);
        panel.addView(playerView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        nowPlayingText = label("NO CHANNEL TUNED", 12, COLOR_TEXT, true);
        nowPlayingText.setPadding(dp(14), dp(8), dp(14), dp(8));
        nowPlayingText.setBackground(card(Color.argb(180, 0, 0, 0), Color.argb(45, 255, 255, 255), dp(22)));
        FrameLayout.LayoutParams nowParams = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, dp(42));
        nowParams.gravity = Gravity.TOP | Gravity.LEFT;
        nowParams.setMargins(dp(14), dp(14), 0, 0);
        panel.addView(nowPlayingText, nowParams);

        decoderBadge = label("GLOW_DECODER MEDIA3.READY", 10, COLOR_MUTED, true);
        decoderBadge.setPadding(dp(14), dp(7), dp(14), dp(7));
        decoderBadge.setBackground(card(Color.argb(185, 0, 0, 0), Color.argb(45, 255, 255, 255), dp(22)));
        FrameLayout.LayoutParams badgeParams = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, dp(38));
        badgeParams.gravity = Gravity.BOTTOM | Gravity.RIGHT;
        badgeParams.setMargins(0, 0, dp(14), dp(14));
        panel.addView(decoderBadge, badgeParams);
        return panel;
    }

    private View createSetupPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(16), dp(12), dp(16), dp(12));
        panel.setBackground(card(COLOR_PANEL, Color.argb(36, 255, 255, 255), dp(18)));

        TextView title = label("IPTV CONNECTION", 11, COLOR_PRIMARY, true);
        panel.addView(title, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(24)));

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        panel.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(58)));

        playlistInput = input("M3U / M3U_PLUS playlist URL");
        row.addView(playlistInput, new LinearLayout.LayoutParams(0, dp(58), 1.2f));

        userAgentInput = input(DEFAULT_USER_AGENT);
        LinearLayout.LayoutParams uaParams = new LinearLayout.LayoutParams(0, dp(58), 0.82f);
        uaParams.setMargins(dp(12), 0, 0, 0);
        row.addView(userAgentInput, uaParams);

        Button loadButton = actionButton("LOAD PLAYLIST");
        loadButton.setOnClickListener(v -> loadPlaylist(playlistInput.getText().toString().trim()));
        LinearLayout.LayoutParams loadParams = new LinearLayout.LayoutParams(dp(178), dp(58));
        loadParams.setMargins(dp(12), 0, 0, 0);
        row.addView(loadButton, loadParams);

        Button playButton = actionButton("PLAY FIRST");
        playButton.setOnClickListener(v -> {
            Channel firstPlayable = firstPlayableChannel();
            if (firstPlayable != null) {
                playChannel(firstPlayable);
            }
        });
        LinearLayout.LayoutParams playParams = new LinearLayout.LayoutParams(dp(148), dp(58));
        playParams.setMargins(dp(12), 0, 0, 0);
        row.addView(playButton, playParams);

        LinearLayout epgRow = new LinearLayout(this);
        epgRow.setOrientation(LinearLayout.HORIZONTAL);
        epgRow.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams epgRowParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(58));
        epgRowParams.setMargins(0, dp(10), 0, 0);
        panel.addView(epgRow, epgRowParams);

        epgInput = input("XMLTV EPG URL (normal guide only; XXX stays isolated)");
        epgRow.addView(epgInput, new LinearLayout.LayoutParams(0, dp(58), 1f));

        Button epgButton = actionButton("LOAD EPG");
        epgButton.setOnClickListener(v -> loadEpg(epgInput.getText().toString().trim()));
        LinearLayout.LayoutParams epgButtonParams = new LinearLayout.LayoutParams(dp(178), dp(58));
        epgButtonParams.setMargins(dp(12), 0, 0, 0);
        epgRow.addView(epgButton, epgButtonParams);
        return panel;
    }

    private View createChannelPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(16), dp(12), dp(16), dp(12));
        panel.setBackground(card(COLOR_PANEL, Color.argb(36, 255, 255, 255), dp(18)));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        panel.addView(header, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(30)));

        sectionTitleText = label("CHANNEL SIGNAL", 11, COLOR_PRIMARY, true);
        header.addView(sectionTitleText, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));

        summaryText = label("NO PLAYLIST LOADED", 10, COLOR_MUTED, true);
        summaryText.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        header.addView(summaryText, new LinearLayout.LayoutParams(dp(420), LinearLayout.LayoutParams.MATCH_PARENT));

        HorizontalScrollView categoryScroll = new HorizontalScrollView(this);
        categoryScroll.setHorizontalScrollBarEnabled(false);
        categoryRow = new LinearLayout(this);
        categoryRow.setOrientation(LinearLayout.HORIZONTAL);
        categoryScroll.addView(categoryRow);
        panel.addView(categoryScroll, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));

        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(false);
        channelList = new LinearLayout(this);
        channelList.setOrientation(LinearLayout.VERTICAL);
        scrollView.addView(channelList, new ScrollView.LayoutParams(ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.WRAP_CONTENT));
        panel.addView(scrollView, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        renderCurrentView();
        return panel;
    }

    private void loadPlaylist(String playlistUrl) {
        if (playlistUrl == null || playlistUrl.trim().isEmpty()) {
            setStatus("ENTER A PLAYLIST URL", true);
            return;
        }

        String normalizedUrl = playlistUrl.trim();
        String userAgent = getUserAgent();
        prefs.edit()
            .putString("playlist_url", normalizedUrl)
            .putString("user_agent", userAgent)
            .apply();

        setStatus("LOADING PLAYLIST WITH VLC UA", false);
        summaryText.setText("FETCHING PLAYLIST");
        renderEmptyState("Fetching channels from provider...");

        executor.execute(() -> {
            try {
                String m3u = fetchText(normalizedUrl, userAgent);
                List<Channel> parsed = parseM3u(m3u);
                mainHandler.post(() -> {
                    channels.clear();
                    channels.addAll(parsed);
                    saveChannelsCache();
                    activeView = ViewMode.GUIDE;
                    activeFilter = "All";
                    renderCurrentView();
                    setStatus("PLAYLIST LOADED", false);
                    Channel firstPlayable = firstPlayableChannel();
                    if (firstPlayable != null) {
                        playChannel(firstPlayable);
                    }
                });
            } catch (Exception error) {
                mainHandler.post(() -> {
                    setStatus("PLAYLIST LOAD FAILED", true);
                    renderEmptyState(error.getMessage() == null ? "Unable to load playlist." : error.getMessage());
                });
            }
        });
    }

    private void loadEpg(String epgUrl) {
        if (epgUrl == null || epgUrl.trim().isEmpty()) {
            setStatus("ENTER AN EPG URL", true);
            return;
        }

        String normalizedUrl = epgUrl.trim();
        String userAgent = getUserAgent();
        prefs.edit()
            .putString("epg_url", normalizedUrl)
            .putString("user_agent", userAgent)
            .apply();

        setStatus("LOADING XMLTV EPG", false);
        executor.execute(() -> {
            try {
                String xml = fetchText(normalizedUrl, userAgent);
                Map<String, List<EpgProgram>> parsed = parseXmltv(xml);
                saveEpgCache(parsed);
                mainHandler.post(() -> {
                    epgByChannel.clear();
                    epgByChannel.putAll(parsed);
                    setStatus("EPG LOADED", false);
                    renderCurrentView();
                });
            } catch (Exception error) {
                mainHandler.post(() -> setStatus("EPG LOAD FAILED", true));
            }
        });
    }

    private Map<String, List<EpgProgram>> parseXmltv(String xml) {
        Map<String, List<EpgProgram>> parsed = new HashMap<>();
        Pattern programmePattern = Pattern.compile("<programme\\s+([^>]*)>(.*?)</programme>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher programmeMatcher = programmePattern.matcher(xml);
        while (programmeMatcher.find()) {
            String attributes = programmeMatcher.group(1);
            String body = programmeMatcher.group(2);
            String channel = extractXmlAttribute(attributes, "channel");
            if (channel.isEmpty()) {
                continue;
            }

            Date start = parseXmltvDate(extractXmlAttribute(attributes, "start"));
            Date stop = parseXmltvDate(extractXmlAttribute(attributes, "stop"));
            String title = extractXmlTag(body, "title", "Program Schedule Broadcast");
            String description = extractXmlTag(body, "desc", "");
            if (start == null || stop == null) {
                continue;
            }

            List<EpgProgram> programs = parsed.get(channel);
            if (programs == null) {
                programs = new ArrayList<>();
                parsed.put(channel, programs);
            }
            programs.add(new EpgProgram(title, description, start, stop));
        }
        sortEpgMap(parsed);
        return parsed;
    }

    private Date parseXmltvDate(String value) {
        if (value == null || value.trim().length() < 14) {
            return null;
        }
        String normalized = value.trim();
        try {
            if (normalized.length() >= 20 && (normalized.charAt(14) == ' ' || normalized.charAt(14) == '+')) {
                if (normalized.charAt(14) != ' ') {
                    normalized = normalized.substring(0, 14) + " " + normalized.substring(14);
                }
                return new SimpleDateFormat("yyyyMMddHHmmss Z", Locale.US).parse(normalized.substring(0, Math.min(normalized.length(), 20)));
            }
            return new SimpleDateFormat("yyyyMMddHHmmss", Locale.US).parse(normalized.substring(0, 14));
        } catch (Exception ignored) {
            return null;
        }
    }

    private String extractXmlAttribute(String attrs, String name) {
        Matcher matcher = Pattern.compile(Pattern.quote(name) + "=\"([^\"]*)\"", Pattern.CASE_INSENSITIVE).matcher(attrs == null ? "" : attrs);
        return matcher.find() ? decodeXml(matcher.group(1)) : "";
    }

    private String extractXmlTag(String body, String tag, String fallback) {
        Matcher matcher = Pattern.compile("<" + Pattern.quote(tag) + "(?:\\s+[^>]*)?>(.*?)</" + Pattern.quote(tag) + ">", Pattern.CASE_INSENSITIVE | Pattern.DOTALL).matcher(body == null ? "" : body);
        return matcher.find() ? decodeXml(matcher.group(1).replaceAll("<[^>]+>", " ").trim()) : fallback;
    }

    private String decodeXml(String value) {
        return value == null ? "" : value
            .replace("&amp;", "&")
            .replace("&quot;", "\"")
            .replace("&apos;", "'")
            .replace("&lt;", "<")
            .replace("&gt;", ">");
    }

    private String fetchText(String sourceUrl, String userAgent) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(sourceUrl).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(20000);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("User-Agent", userAgent);
        connection.setRequestProperty("Accept", "application/x-mpegurl,audio/x-mpegurl,text/plain,*/*");
        connection.setRequestProperty("Accept-Language", "en-US,en;q=0.9");

        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 400 ? connection.getInputStream() : connection.getErrorStream();
        if (stream == null) {
            throw new IllegalStateException("Provider returned HTTP " + status);
        }

        try (InputStream inputStream = stream; ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }
            String body = outputStream.toString(StandardCharsets.UTF_8.name());
            if (status < 200 || status >= 400) {
                throw new IllegalStateException("Provider returned HTTP " + status + ": " + body.substring(0, Math.min(body.length(), 140)));
            }
            if (body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html")) {
                throw new IllegalStateException("Provider returned HTML instead of an M3U playlist.");
            }
            return body;
        } finally {
            connection.disconnect();
        }
    }

    private List<Channel> parseM3u(String m3u) {
        List<Channel> parsed = new ArrayList<>();
        String pendingName = "Unknown Channel";
        String pendingGroup = "General";
        String pendingTvgId = "";
        String pendingLogo = "";

        String[] lines = m3u.split("\\r?\\n");
        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty()) {
                continue;
            }

            if (line.toUpperCase(Locale.US).startsWith("#EXTINF:")) {
                pendingName = extractName(line);
                pendingGroup = extractAttribute(line, "group-title", "General");
                pendingTvgId = extractAttribute(line, "tvg-id", "");
                pendingLogo = extractAttribute(line, "tvg-logo", "");
            } else if (!line.startsWith("#") && looksLikeStreamUrl(line)) {
                parsed.add(classifyChannel(pendingName, pendingGroup, pendingTvgId, pendingLogo, line));
                pendingName = "Unknown Channel";
                pendingGroup = "General";
                pendingTvgId = "";
                pendingLogo = "";
            }
        }

        return parsed;
    }

    private void switchView(ViewMode mode) {
        activeView = mode;
        activeFilter = "All";
        renderCurrentView();
    }

    private void renderCurrentView() {
        updateNavStyles();

        if (activeView == ViewMode.LIBRARY) {
            renderLibraryView();
            return;
        }

        if (activeView == ViewMode.SETTINGS) {
            renderSettingsView();
            return;
        }

        if (activeView == ViewMode.DVR) {
            renderDvrView();
            return;
        }

        renderCategoryRibbon();
        List<Channel> visibleChannels = getVisibleChannels();
        renderChannels(visibleChannels);
    }

    private void updateNavStyles() {
        String activeLabel = activeView == ViewMode.GUIDE ? "GUIDE"
            : activeView == ViewMode.VOD ? "VOD"
            : activeView == ViewMode.ADULT ? "XXX"
            : activeView == ViewMode.DVR ? "DVR"
            : activeView == ViewMode.LIBRARY ? "LIB"
            : "SET";

        for (TextView navButton : navButtons) {
            navButton.setTextColor(activeLabel.contentEquals(navButton.getText()) ? COLOR_PRIMARY : COLOR_MUTED);
        }
    }

    private void renderCategoryRibbon() {
        categoryRow.removeAllViews();
        Set<String> filters = new LinkedHashSet<>();
        filters.add("All");

        if (activeView == ViewMode.GUIDE) {
            sectionTitleText.setText("LIVE GUIDE");
            for (Channel channel : channels) {
                if (channel.type == ChannelType.LIVE && !channel.adult) {
                    filters.add(channel.group);
                }
            }
        } else if (activeView == ViewMode.VOD) {
            sectionTitleText.setText("VOD CATALOG");
            filters.add("Movies");
            filters.add("Series");
            for (Channel channel : channels) {
                if (channel.type == ChannelType.VOD && !channel.adult) {
                    filters.add(channel.mediaCategory);
                }
            }
        } else if (activeView == ViewMode.ADULT) {
            sectionTitleText.setText("XXX VAULT");
            filters.add("Live");
            filters.add("VOD");
            for (Channel channel : channels) {
                if (channel.adult) {
                    filters.add(channel.group);
                }
            }
        }

        int added = 0;
        for (String filter : filters) {
            if (filter == null || filter.trim().isEmpty()) {
                continue;
            }
            addCategoryChip(filter);
            added++;
            if (added >= 42) {
                break;
            }
        }
    }

    private void addCategoryChip(String filter) {
        TextView chip = label(filter.toUpperCase(Locale.US), 10, filter.equals(activeFilter) ? COLOR_TEXT : COLOR_MUTED, true);
        chip.setGravity(Gravity.CENTER);
        chip.setFocusable(true);
        chip.setPadding(dp(16), 0, dp(16), 0);
        applyFocusBackground(chip, filter.equals(activeFilter) ? Color.argb(85, 255, 62, 0) : COLOR_PANEL_SOFT, Color.argb(85, 255, 62, 0));
        chip.setOnClickListener(v -> {
            activeFilter = filter;
            renderCurrentView();
        });
        LinearLayout.LayoutParams chipParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(34));
        chipParams.setMargins(0, dp(8), dp(8), dp(8));
        categoryRow.addView(chip, chipParams);
    }

    private List<Channel> getVisibleChannels() {
        List<Channel> visible = new ArrayList<>();
        for (Channel channel : channels) {
            if (activeView == ViewMode.GUIDE) {
                if (channel.type != ChannelType.LIVE || channel.adult) {
                    continue;
                }
                if (!activeFilter.equals("All") && !activeFilter.equals(channel.group)) {
                    continue;
                }
            } else if (activeView == ViewMode.VOD) {
                if (channel.type != ChannelType.VOD || channel.adult) {
                    continue;
                }
                if (activeFilter.equals("Movies") && channel.series) {
                    continue;
                }
                if (activeFilter.equals("Series") && !channel.series) {
                    continue;
                }
                if (!activeFilter.equals("All") && !activeFilter.equals("Movies") && !activeFilter.equals("Series") && !activeFilter.equals(channel.mediaCategory)) {
                    continue;
                }
            } else if (activeView == ViewMode.ADULT) {
                if (!channel.adult) {
                    continue;
                }
                if (activeFilter.equals("Live") && channel.type != ChannelType.LIVE) {
                    continue;
                }
                if (activeFilter.equals("VOD") && channel.type != ChannelType.VOD) {
                    continue;
                }
                if (!activeFilter.equals("All") && !activeFilter.equals("Live") && !activeFilter.equals("VOD") && !activeFilter.equals(channel.group)) {
                    continue;
                }
            }

            visible.add(channel);
        }
        return visible;
    }

    private void renderChannels(List<Channel> visibleChannels) {
        channelList.removeAllViews();

        if (visibleChannels.isEmpty()) {
            summaryText.setText("NO ITEMS FOUND");
            if (activeView == ViewMode.GUIDE) {
                renderEmptyState("No non-adult live channels found for this guide filter.");
            } else if (activeView == ViewMode.VOD) {
                renderEmptyState("No non-adult VOD items found for this catalog filter.");
            } else {
                renderEmptyState("No adult channels or VOD items found for this isolated XXX filter.");
            }
            return;
        }

        int renderCount = Math.min(visibleChannels.size(), MAX_RENDERED_CHANNELS);
        summaryText.setText("SHOWING " + renderCount + " OF " + visibleChannels.size() + " / TOTAL " + channels.size());

        if (activeView == ViewMode.GUIDE) {
            renderGuideRows(visibleChannels, renderCount);
            return;
        }

        for (int index = 0; index < renderCount; index++) {
            Channel channel = visibleChannels.get(index);
            channelList.addView(createMediaRow(channel), mediaRowParams());
        }
    }

    private View createMediaRow(Channel channel) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(14), dp(10), dp(14), dp(10));
        row.setFocusable(true);
        row.setClickable(true);
        applyFocusBackground(row, COLOR_PANEL_SOFT, Color.argb(95, channel.adult ? 255 : 255, channel.adult ? 78 : 62, channel.adult ? 136 : 0));
        row.setOnClickListener(v -> playChannel(channel));

        TextView badge = label(channel.adult ? "XXX" : (channel.type == ChannelType.VOD ? (channel.series ? "SER" : "VOD") : "LIVE"), 11, channel.adult ? COLOR_PINK : COLOR_PRIMARY, true);
        badge.setGravity(Gravity.CENTER);
        badge.setBackground(card(Color.argb(110, 0, 0, 0), channel.adult ? COLOR_PINK : COLOR_PRIMARY, dp(14)));
        row.addView(badge, new LinearLayout.LayoutParams(dp(64), dp(48)));

        LinearLayout textBlock = new LinearLayout(this);
        textBlock.setOrientation(LinearLayout.VERTICAL);
        textBlock.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        textParams.setMargins(dp(14), 0, dp(14), 0);
        row.addView(textBlock, textParams);

        TextView title = label(channel.name, 15, COLOR_TEXT, false);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        textBlock.addView(title, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(28)));

        String metadata = (channel.type == ChannelType.VOD ? channel.mediaCategory : channel.group);
        if (channel.releaseYear > 0) {
            metadata += " / " + channel.releaseYear;
        }
        if (channel.series) {
            metadata += " / Series";
        }
        TextView sub = label(metadata, 11, COLOR_MUTED, true);
        textBlock.addView(sub, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(22)));

        TextView action = label("DIRECT PLAY", 10, COLOR_MUTED, true);
        action.setGravity(Gravity.CENTER);
        row.addView(action, new LinearLayout.LayoutParams(dp(132), dp(46)));
        return row;
    }

    private LinearLayout.LayoutParams mediaRowParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(76));
        params.setMargins(0, 0, 0, dp(8));
        return params;
    }

    private void renderGuideRows(List<Channel> visibleChannels, int renderCount) {
        for (int index = 0; index < renderCount; index++) {
            Channel channel = visibleChannels.get(index);
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(0, 0, 0, 0);

            TextView channelCell = new TextView(this);
            channelCell.setText(channel.name + "\n" + channel.group);
            channelCell.setTextColor(COLOR_TEXT);
            channelCell.setTextSize(12);
            channelCell.setGravity(Gravity.CENTER_VERTICAL | Gravity.LEFT);
            channelCell.setPadding(dp(14), 0, dp(12), 0);
            channelCell.setFocusable(true);
            channelCell.setClickable(true);
            channelCell.setSingleLine(false);
            applyFocusBackground(channelCell, COLOR_PANEL_SOFT, Color.argb(95, 255, 62, 0));
            channelCell.setOnClickListener(v -> playChannel(channel));
            row.addView(channelCell, new LinearLayout.LayoutParams(dp(248), dp(76)));

            HorizontalScrollView programScroll = new HorizontalScrollView(this);
            programScroll.setHorizontalScrollBarEnabled(false);
            LinearLayout programRow = new LinearLayout(this);
            programRow.setOrientation(LinearLayout.HORIZONTAL);
            programScroll.addView(programRow);

            List<EpgProgram> programs = upcomingProgramsFor(channel, 6);
            for (EpgProgram program : programs) {
                TextView programCell = new TextView(this);
                programCell.setText(program.title + "\n" + formatProgramTime(program));
                programCell.setTextColor(COLOR_TEXT);
                programCell.setTextSize(12);
                programCell.setGravity(Gravity.CENTER_VERTICAL | Gravity.LEFT);
                programCell.setPadding(dp(14), 0, dp(14), 0);
                programCell.setFocusable(true);
                programCell.setSingleLine(false);
                applyFocusBackground(programCell, COLOR_PANEL, Color.argb(65, 255, 62, 0));
                programCell.setOnClickListener(v -> playChannel(channel));
                LinearLayout.LayoutParams programParams = new LinearLayout.LayoutParams(dp(285), dp(76));
                programParams.setMargins(dp(8), 0, 0, 0);
                programRow.addView(programCell, programParams);
            }

            row.addView(programScroll, new LinearLayout.LayoutParams(0, dp(76), 1f));

            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(84));
            rowParams.setMargins(0, 0, 0, dp(8));
            channelList.addView(row, rowParams);
        }
    }

    private String formatChannelRow(Channel channel) {
        String typeLabel = channel.adult ? "XXX" : (channel.type == ChannelType.VOD ? "VOD" : "LIVE");
        String metadata = typeLabel + " / " + (channel.type == ChannelType.VOD ? channel.mediaCategory : channel.group);
        if (channel.releaseYear > 0) {
            metadata += " / " + channel.releaseYear;
        }
        EpgProgram currentProgram = activeView == ViewMode.GUIDE && !channel.adult ? currentProgramFor(channel) : null;
        if (currentProgram != null) {
            metadata += " / NOW: " + currentProgram.title;
        }
        return channel.name + "\n" + metadata;
    }

    private EpgProgram currentProgramFor(Channel channel) {
        if (channel.tvgId.isEmpty()) {
            return null;
        }
        List<EpgProgram> programs = epgByChannel.get(channel.tvgId);
        if (programs == null || programs.isEmpty()) {
            return null;
        }
        Date now = new Date();
        for (EpgProgram program : programs) {
            if (!now.before(program.start) && now.before(program.stop)) {
                return program;
            }
        }
        return null;
    }

    private List<EpgProgram> upcomingProgramsFor(Channel channel, int limit) {
        List<EpgProgram> upcoming = new ArrayList<>();
        Date now = new Date();
        if (!channel.tvgId.isEmpty()) {
            List<EpgProgram> stored = epgByChannel.get(channel.tvgId);
            if (stored != null) {
                for (EpgProgram program : stored) {
                    if (!program.stop.before(now)) {
                        upcoming.add(program);
                        if (upcoming.size() >= limit) {
                            return upcoming;
                        }
                    }
                }
            }
        }

        if (upcoming.isEmpty()) {
            long start = now.getTime();
            for (int index = 0; index < limit; index++) {
                Date slotStart = new Date(start + (long) index * 60L * 60L * 1000L);
                Date slotEnd = new Date(slotStart.getTime() + 60L * 60L * 1000L);
                String title = index == 0 ? "Live Broadcast" : "Standard Broadcast Entertainment";
                upcoming.add(new EpgProgram(title, "Generated schedule placeholder", slotStart, slotEnd));
            }
        }

        return upcoming;
    }

    private String formatProgramTime(EpgProgram program) {
        SimpleDateFormat formatter = new SimpleDateFormat("HH:mm", Locale.US);
        return formatter.format(program.start) + " - " + formatter.format(program.stop);
    }

    private void renderLibraryView() {
        sectionTitleText.setText("MEDIA LIBRARY");
        summaryText.setText(libraryItems.isEmpty() ? "LOCAL SCANNER READY" : "IMPORTED " + libraryItems.size() + " FILES");
        categoryRow.removeAllViews();
        channelList.removeAllViews();

        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        controls.setGravity(Gravity.CENTER_VERTICAL);
        controls.setPadding(0, 0, 0, dp(10));

        libraryPathInput = input("Local folder path, e.g. /sdcard/Movies or mounted share path");
        libraryPathInput.setText(prefs.getString("library_path", ""));
        controls.addView(libraryPathInput, new LinearLayout.LayoutParams(0, dp(56), 1f));

        Button pickButton = actionButton("PICK FOLDER");
        pickButton.setOnClickListener(v -> openLibraryFolderPicker());
        LinearLayout.LayoutParams pickParams = new LinearLayout.LayoutParams(dp(168), dp(56));
        pickParams.setMargins(dp(12), 0, 0, 0);
        controls.addView(pickButton, pickParams);

        Button scanButton = actionButton("SCAN PATH");
        scanButton.setOnClickListener(v -> scanLibraryFolder(libraryPathInput.getText().toString().trim()));
        LinearLayout.LayoutParams scanParams = new LinearLayout.LayoutParams(dp(150), dp(56));
        scanParams.setMargins(dp(12), 0, 0, 0);
        controls.addView(scanButton, scanParams);
        channelList.addView(controls, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(72)));

        if (libraryItems.isEmpty()) {
            TextView hint = label("Use Pick Folder for Android TV storage access, or Scan Path for readable mounted shares. The native library classifier cleans titles, detects movies/TV episodes, and groups genres locally.", 13, COLOR_MUTED, false);
            hint.setGravity(Gravity.CENTER_VERTICAL);
            hint.setPadding(dp(18), 0, dp(18), 0);
            hint.setBackground(card(COLOR_PANEL_SOFT, Color.argb(34, 255, 255, 255), dp(16)));
            channelList.addView(hint, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(104)));
            return;
        }

        int renderCount = Math.min(libraryItems.size(), MAX_RENDERED_CHANNELS);
        for (int index = 0; index < renderCount; index++) {
            LibraryItem item = libraryItems.get(index);
            TextView row = new TextView(this);
            row.setText(item.displayTitle + "\n" + item.mediaType + " / " + item.genre + " / " + item.path);
            row.setTextColor(COLOR_TEXT);
            row.setTextSize(13);
            row.setGravity(Gravity.CENTER_VERTICAL | Gravity.LEFT);
            row.setPadding(dp(14), 0, dp(14), 0);
            row.setFocusable(true);
            applyFocusBackground(row, COLOR_PANEL_SOFT, Color.argb(95, 255, 62, 0));
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(62));
            params.setMargins(0, 0, 0, dp(8));
            channelList.addView(row, params);
        }
    }

    private void openLibraryFolderPicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        try {
            startActivityForResult(intent, REQUEST_LIBRARY_TREE);
        } catch (Exception error) {
            setStatus("FOLDER PICKER UNAVAILABLE", true);
        }
    }

    private void scanLibraryTree(Uri treeUri) {
        if (treeUri == null) {
            setStatus("NO FOLDER SELECTED", true);
            return;
        }

        setStatus("SCANNING PICKED FOLDER", false);
        summaryText.setText("SCANNING DOCUMENT TREE");
        executor.execute(() -> {
            List<LibraryItem> scanned = new ArrayList<>();
            DocumentFile root = DocumentFile.fromTreeUri(this, treeUri);
            scanDocumentTree(root, scanned, 0);
            mainHandler.post(() -> {
                libraryItems.clear();
                libraryItems.addAll(scanned);
                saveLibraryCache();
                setStatus(scanned.isEmpty() ? "NO FILES FOUND" : "LIBRARY SCAN COMPLETE", scanned.isEmpty());
                renderLibraryView();
            });
        });
    }

    private void scanDocumentTree(DocumentFile folder, List<LibraryItem> scanned, int depth) {
        if (folder == null || !folder.exists() || !folder.canRead() || depth > 6 || scanned.size() >= MAX_RENDERED_CHANNELS) {
            return;
        }

        DocumentFile[] files = folder.listFiles();
        for (DocumentFile file : files) {
            if (scanned.size() >= MAX_RENDERED_CHANNELS) {
                return;
            }
            if (file.isDirectory()) {
                scanDocumentTree(file, scanned, depth + 1);
            } else if (file.isFile() && isVideoFile(file.getName() == null ? "" : file.getName())) {
                scanned.add(classifyLibraryItem(file));
            }
        }
    }

    private void renderSettingsView() {
        sectionTitleText.setText("SETTINGS");
        categoryRow.removeAllViews();
        channelList.removeAllViews();

        int liveCount = 0;
        int vodCount = 0;
        int adultCount = 0;
        for (Channel channel : channels) {
            if (channel.adult) {
                adultCount++;
            } else if (channel.type == ChannelType.VOD) {
                vodCount++;
            } else {
                liveCount++;
            }
        }
        summaryText.setText("LIVE " + liveCount + " / VOD " + vodCount + " / XXX " + adultCount);

        addSettingsRow("Playback", "Direct-play only with Android Media3 / ExoPlayer. Unsupported codecs show a clean failure instead of requiring a server.");
        addSettingsRow("User-Agent", getUserAgent());
        addSettingsRow("Adult Handling", "XXX and adult groups are isolated from the normal live guide and VOD catalog.");
        addSettingsRow("Library", "Local folders and mounted network shares can be scanned when Android grants path access.");
        addSettingsRow("Premium Later", "Optional compatibility re-encode can live behind a server/premium feature without blocking the core APK.");
    }

    private void renderDvrView() {
        sectionTitleText.setText("DVR RECORDER");
        categoryRow.removeAllViews();
        channelList.removeAllViews();
        summaryText.setText("SCHEDULED " + dvrJobs.size() + " / RECORDING " + activeRecordingKeys.size() + " / SAVED " + dvrRecordings.size());

        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        controls.setGravity(Gravity.CENTER_VERTICAL);
        controls.setPadding(0, 0, 0, dp(10));

        Button refreshButton = actionButton("REFRESH EPG");
        refreshButton.setOnClickListener(v -> {
            String epgUrl = epgInput.getText().toString().trim();
            if (epgUrl.isEmpty()) {
                setStatus("ENTER AN EPG URL", true);
            } else {
                loadEpg(epgUrl);
            }
        });
        controls.addView(refreshButton, new LinearLayout.LayoutParams(dp(160), dp(54)));

        Button dueButton = actionButton("RECORD DUE");
        dueButton.setOnClickListener(v -> evaluateDvrSchedule(true));
        LinearLayout.LayoutParams dueParams = new LinearLayout.LayoutParams(dp(160), dp(54));
        dueParams.setMargins(dp(12), 0, 0, 0);
        controls.addView(dueButton, dueParams);

        Button clearButton = actionButton("CLEAR QUEUE");
        clearButton.setOnClickListener(v -> {
            if (!activeRecordingKeys.isEmpty()) {
                setStatus("RECORDING ACTIVE", true);
                return;
            }
            scheduledRecordings.clear();
            dvrJobs.clear();
            saveDvrSchedule();
            renderDvrView();
            setStatus("DVR QUEUE CLEARED", false);
        });
        LinearLayout.LayoutParams clearParams = new LinearLayout.LayoutParams(dp(160), dp(54));
        clearParams.setMargins(dp(12), 0, 0, 0);
        controls.addView(clearButton, clearParams);

        channelList.addView(controls, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(68)));
        renderDvrTargetControls();

        if (!dvrJobs.isEmpty()) {
            addDvrSectionHeader("PENDING CAPTURES");
            for (DvrJob job : new ArrayList<>(dvrJobs.values())) {
                channelList.addView(createScheduledJobRow(job), mediaRowParams());
            }
        }

        if (!dvrRecordings.isEmpty()) {
            addDvrSectionHeader("RECORDED LIBRARY");
            int count = Math.min(dvrRecordings.size(), 40);
            for (int index = 0; index < count; index++) {
                channelList.addView(createRecordingRow(dvrRecordings.get(index)), mediaRowParams());
            }
        }

        addDvrSectionHeader("GUIDE CAPTURE QUEUE");
        List<DvrCandidate> candidates = collectDvrCandidates(80);
        if (candidates.isEmpty()) {
            TextView hint = label("Load a playlist and EPG to populate DVR recording rows. Device storage is used by default; picked folders can point at USB disks or document-provider network shares.", 13, COLOR_MUTED, false);
            hint.setGravity(Gravity.CENTER_VERTICAL);
            hint.setPadding(dp(18), 0, dp(18), 0);
            hint.setBackground(card(COLOR_PANEL_SOFT, Color.argb(34, 255, 255, 255), dp(16)));
            channelList.addView(hint, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(104)));
            return;
        }

        for (DvrCandidate candidate : candidates) {
            channelList.addView(createDvrRow(candidate), mediaRowParams());
        }
    }

    private void renderDvrTargetControls() {
        LinearLayout targetRow = new LinearLayout(this);
        targetRow.setOrientation(LinearLayout.HORIZONTAL);
        targetRow.setGravity(Gravity.CENTER_VERTICAL);
        targetRow.setPadding(0, 0, 0, dp(10));

        dvrTargetInput = input("Mounted folder path for USB or network share");
        dvrTargetInput.setText(prefs.getString("dvr_manual_path", ""));
        targetRow.addView(dvrTargetInput, new LinearLayout.LayoutParams(0, dp(54), 1f));

        Button pathButton = actionButton("USE PATH");
        pathButton.setOnClickListener(v -> setDvrTargetPath(dvrTargetInput.getText().toString().trim()));
        LinearLayout.LayoutParams pathParams = new LinearLayout.LayoutParams(dp(132), dp(54));
        pathParams.setMargins(dp(12), 0, 0, 0);
        targetRow.addView(pathButton, pathParams);

        Button pickButton = actionButton("PICK TARGET");
        pickButton.setOnClickListener(v -> openDvrTargetPicker());
        LinearLayout.LayoutParams pickParams = new LinearLayout.LayoutParams(dp(154), dp(54));
        pickParams.setMargins(dp(12), 0, 0, 0);
        targetRow.addView(pickButton, pickParams);

        Button deviceButton = actionButton("DEVICE");
        deviceButton.setOnClickListener(v -> setDvrTargetDevice());
        LinearLayout.LayoutParams deviceParams = new LinearLayout.LayoutParams(dp(118), dp(54));
        deviceParams.setMargins(dp(12), 0, 0, 0);
        targetRow.addView(deviceButton, deviceParams);

        channelList.addView(targetRow, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(68)));

        TextView targetLabel = label("TARGET / " + getDvrTargetLabel(), 11, COLOR_MUTED, true);
        targetLabel.setPadding(dp(14), 0, dp(14), 0);
        targetLabel.setBackground(card(COLOR_PANEL_SOFT, Color.argb(34, 255, 255, 255), dp(12)));
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(44));
        labelParams.setMargins(0, 0, 0, dp(8));
        channelList.addView(targetLabel, labelParams);

        addDvrSectionHeader("SMB NETWORK SHARE");
        LinearLayout smbRowOne = new LinearLayout(this);
        smbRowOne.setOrientation(LinearLayout.HORIZONTAL);
        smbRowOne.setGravity(Gravity.CENTER_VERTICAL);
        smbRowOne.setPadding(0, 0, 0, dp(10));

        dvrSmbHostInput = input("SMB server or IP");
        dvrSmbHostInput.setText(prefs.getString("dvr_smb_host", ""));
        smbRowOne.addView(dvrSmbHostInput, new LinearLayout.LayoutParams(0, dp(54), 1.25f));

        dvrSmbShareInput = input("Share name");
        dvrSmbShareInput.setText(prefs.getString("dvr_smb_share", ""));
        LinearLayout.LayoutParams shareParams = new LinearLayout.LayoutParams(0, dp(54), 1f);
        shareParams.setMargins(dp(10), 0, 0, 0);
        smbRowOne.addView(dvrSmbShareInput, shareParams);

        dvrSmbPathInput = input("Folder inside share");
        dvrSmbPathInput.setText(prefs.getString("dvr_smb_path", ""));
        LinearLayout.LayoutParams remotePathParams = new LinearLayout.LayoutParams(0, dp(54), 1.25f);
        remotePathParams.setMargins(dp(10), 0, 0, 0);
        smbRowOne.addView(dvrSmbPathInput, remotePathParams);
        channelList.addView(smbRowOne, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(68)));

        LinearLayout smbRowTwo = new LinearLayout(this);
        smbRowTwo.setOrientation(LinearLayout.HORIZONTAL);
        smbRowTwo.setGravity(Gravity.CENTER_VERTICAL);
        smbRowTwo.setPadding(0, 0, 0, dp(10));

        dvrSmbUserInput = input("Username, blank for guest");
        dvrSmbUserInput.setText(prefs.getString("dvr_smb_user", ""));
        smbRowTwo.addView(dvrSmbUserInput, new LinearLayout.LayoutParams(0, dp(54), 1.15f));

        dvrSmbDomainInput = input("Domain, optional");
        dvrSmbDomainInput.setText(prefs.getString("dvr_smb_domain", ""));
        LinearLayout.LayoutParams domainParams = new LinearLayout.LayoutParams(0, dp(54), 0.9f);
        domainParams.setMargins(dp(10), 0, 0, 0);
        smbRowTwo.addView(dvrSmbDomainInput, domainParams);

        dvrSmbPasswordInput = input("Password, blank keeps saved");
        dvrSmbPasswordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        LinearLayout.LayoutParams passwordParams = new LinearLayout.LayoutParams(0, dp(54), 1.2f);
        passwordParams.setMargins(dp(10), 0, 0, 0);
        smbRowTwo.addView(dvrSmbPasswordInput, passwordParams);

        channelList.addView(smbRowTwo, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(68)));

        LinearLayout smbActionRow = new LinearLayout(this);
        smbActionRow.setOrientation(LinearLayout.HORIZONTAL);
        smbActionRow.setGravity(Gravity.CENTER_VERTICAL);
        smbActionRow.setPadding(0, 0, 0, dp(10));

        TextView passwordState = label(prefs.getString("dvr_smb_password_enc", "").isEmpty() ? "SMB PASSWORD / NOT SAVED" : "SMB PASSWORD / SAVED ENCRYPTED", 11, COLOR_MUTED, true);
        passwordState.setPadding(dp(14), 0, dp(14), 0);
        passwordState.setBackground(card(COLOR_PANEL_SOFT, Color.argb(34, 255, 255, 255), dp(12)));
        smbActionRow.addView(passwordState, new LinearLayout.LayoutParams(0, dp(54), 1f));

        Button testSmbButton = actionButton("TEST SMB");
        testSmbButton.setOnClickListener(v -> testDvrTargetSmb());
        LinearLayout.LayoutParams testParams = new LinearLayout.LayoutParams(dp(138), dp(54));
        testParams.setMargins(dp(12), 0, 0, 0);
        smbActionRow.addView(testSmbButton, testParams);

        Button smbButton = actionButton("USE SMB");
        smbButton.setOnClickListener(v -> setDvrTargetSmb());
        LinearLayout.LayoutParams smbButtonParams = new LinearLayout.LayoutParams(dp(138), dp(54));
        smbButtonParams.setMargins(dp(12), 0, 0, 0);
        smbActionRow.addView(smbButton, smbButtonParams);
        channelList.addView(smbActionRow, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(68)));
    }

    private void addDvrSectionHeader(String text) {
        TextView header = label(text, 10, COLOR_PRIMARY, true);
        header.setPadding(dp(4), dp(8), 0, 0);
        channelList.addView(header, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(34)));
    }

    private List<DvrCandidate> collectDvrCandidates(int limit) {
        List<DvrCandidate> candidates = new ArrayList<>();
        for (Channel channel : channels) {
            if (channel.adult || channel.type != ChannelType.LIVE) {
                continue;
            }
            List<EpgProgram> programs = upcomingProgramsFor(channel, 3);
            for (EpgProgram program : programs) {
                candidates.add(new DvrCandidate(channel, program, dvrKey(channel, program)));
                if (candidates.size() >= limit) {
                    return candidates;
                }
            }
        }
        return candidates;
    }

    private View createDvrRow(DvrCandidate candidate) {
        boolean scheduled = scheduledRecordings.contains(candidate.key);
        boolean active = activeRecordingKeys.contains(candidate.key);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(14), dp(10), dp(14), dp(10));
        row.setFocusable(true);
        row.setClickable(true);
        applyFocusBackground(row, COLOR_PANEL_SOFT, scheduled ? Color.argb(95, 255, 78, 136) : Color.argb(95, 255, 62, 0));
        row.setOnClickListener(v -> toggleDvrSchedule(candidate));

        TextView badge = label(active ? "REC" : (scheduled ? "DVR" : "PLAN"), 11, scheduled ? COLOR_PINK : COLOR_PRIMARY, true);
        badge.setGravity(Gravity.CENTER);
        badge.setBackground(card(Color.argb(110, 0, 0, 0), scheduled ? COLOR_PINK : COLOR_PRIMARY, dp(14)));
        row.addView(badge, new LinearLayout.LayoutParams(dp(64), dp(48)));

        LinearLayout textBlock = new LinearLayout(this);
        textBlock.setOrientation(LinearLayout.VERTICAL);
        textBlock.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        textParams.setMargins(dp(14), 0, dp(14), 0);
        row.addView(textBlock, textParams);

        TextView title = label(candidate.program.title, 15, COLOR_TEXT, false);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        textBlock.addView(title, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(28)));

        TextView sub = label(candidate.channel.name + " / " + formatDvrWindow(candidate.program.start.getTime(), candidate.program.stop.getTime()), 11, COLOR_MUTED, true);
        textBlock.addView(sub, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(22)));

        TextView action = label(active ? "RECORDING" : (scheduled ? "SCHEDULED" : "QUEUE"), 10, scheduled ? COLOR_PINK : COLOR_MUTED, true);
        action.setGravity(Gravity.CENTER);
        row.addView(action, new LinearLayout.LayoutParams(dp(132), dp(46)));
        return row;
    }

    private View createScheduledJobRow(DvrJob job) {
        boolean active = activeRecordingKeys.contains(job.key);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(14), dp(10), dp(14), dp(10));
        row.setFocusable(true);
        row.setClickable(true);
        applyFocusBackground(row, COLOR_PANEL_SOFT, active ? Color.argb(95, 255, 78, 136) : Color.argb(95, 255, 62, 0));
        row.setOnClickListener(v -> {
            if (active) {
                setStatus("RECORDING ACTIVE", true);
            } else {
                dvrJobs.remove(job.key);
                scheduledRecordings.remove(job.key);
                saveDvrSchedule();
                renderDvrView();
                setStatus("REMOVED FROM DVR QUEUE", false);
            }
        });

        TextView badge = label(active ? "REC" : "DVR", 11, active ? COLOR_PINK : COLOR_PRIMARY, true);
        badge.setGravity(Gravity.CENTER);
        badge.setBackground(card(Color.argb(110, 0, 0, 0), active ? COLOR_PINK : COLOR_PRIMARY, dp(14)));
        row.addView(badge, new LinearLayout.LayoutParams(dp(64), dp(48)));

        LinearLayout textBlock = new LinearLayout(this);
        textBlock.setOrientation(LinearLayout.VERTICAL);
        textBlock.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        textParams.setMargins(dp(14), 0, dp(14), 0);
        row.addView(textBlock, textParams);

        TextView title = label(job.title, 15, COLOR_TEXT, false);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        textBlock.addView(title, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(28)));

        TextView sub = label(job.channelName + " / " + formatDvrWindow(job.startMillis, job.stopMillis) + " / " + job.targetLabel, 11, COLOR_MUTED, true);
        textBlock.addView(sub, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(22)));

        TextView action = label(active ? "WRITING" : "CANCEL", 10, active ? COLOR_PINK : COLOR_MUTED, true);
        action.setGravity(Gravity.CENTER);
        row.addView(action, new LinearLayout.LayoutParams(dp(132), dp(46)));
        return row;
    }

    private View createRecordingRow(DvrRecording recording) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(14), dp(10), dp(14), dp(10));
        row.setFocusable(true);
        row.setClickable(true);
        applyFocusBackground(row, COLOR_PANEL_SOFT, Color.argb(95, 255, 62, 0));
        row.setOnClickListener(v -> playRecording(recording));

        TextView badge = label("FILE", 11, COLOR_PRIMARY, true);
        badge.setGravity(Gravity.CENTER);
        badge.setBackground(card(Color.argb(110, 0, 0, 0), COLOR_PRIMARY, dp(14)));
        row.addView(badge, new LinearLayout.LayoutParams(dp(64), dp(48)));

        LinearLayout textBlock = new LinearLayout(this);
        textBlock.setOrientation(LinearLayout.VERTICAL);
        textBlock.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        textParams.setMargins(dp(14), 0, dp(14), 0);
        row.addView(textBlock, textParams);

        TextView title = label(recording.title, 15, COLOR_TEXT, false);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        textBlock.addView(title, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(28)));

        TextView sub = label(recording.channelName + " / " + formatBytes(recording.bytesWritten) + " / " + recording.displayPath, 11, COLOR_MUTED, true);
        textBlock.addView(sub, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(22)));

        TextView action = label("PLAY", 10, COLOR_MUTED, true);
        action.setGravity(Gravity.CENTER);
        row.addView(action, new LinearLayout.LayoutParams(dp(132), dp(46)));
        return row;
    }

    private void toggleDvrSchedule(DvrCandidate candidate) {
        if (scheduledRecordings.contains(candidate.key)) {
            scheduledRecordings.remove(candidate.key);
            dvrJobs.remove(candidate.key);
            setStatus("REMOVED FROM DVR QUEUE", false);
        } else {
            DvrJob job = createDvrJob(candidate);
            scheduledRecordings.add(candidate.key);
            dvrJobs.put(candidate.key, job);
            setStatus("ADDED TO DVR QUEUE", false);
        }
        saveDvrSchedule();
        evaluateDvrSchedule(false);
        renderDvrView();
    }

    private DvrJob createDvrJob(DvrCandidate candidate) {
        long now = System.currentTimeMillis();
        long start = candidate.program.start.getTime();
        long stop = candidate.program.stop.getTime();
        if (stop <= now) {
            start = now;
            stop = now + 60L * 60L * 1000L;
        }
        return new DvrJob(
            candidate.key,
            candidate.program.title,
            candidate.channel.name,
            candidate.channel.url,
            start,
            stop,
            getDvrTargetMode(),
            getDvrTargetLocation(),
            getDvrTargetLabel(),
            "QUEUED"
        );
    }

    private String dvrKey(Channel channel, EpgProgram program) {
        String source = channel.tvgId.isEmpty() ? channel.url : channel.tvgId;
        return source + "|" + program.start.getTime() + "|" + program.stop.getTime();
    }

    private void loadDvrSchedule() {
        scheduledRecordings.clear();
        dvrJobs.clear();
        String savedJobs = prefs.getString("dvr_schedule_jobs", "");
        for (String line : savedJobs.split("\\n")) {
            if (line.trim().isEmpty()) {
                continue;
            }
            String[] fields = line.split("\\t", -1);
            if (fields.length < 9) {
                continue;
            }
            String targetLocation = fields.length >= 10 ? decodeCacheField(fields[7]) : "";
            String targetLabel = fields.length >= 10 ? decodeCacheField(fields[8]) : decodeCacheField(fields[7]);
            String status = fields.length >= 10 ? decodeCacheField(fields[9]) : decodeCacheField(fields[8]);
            DvrJob job = new DvrJob(
                decodeCacheField(fields[0]),
                decodeCacheField(fields[1]),
                decodeCacheField(fields[2]),
                decodeCacheField(fields[3]),
                parseLongSafe(decodeCacheField(fields[4])),
                parseLongSafe(decodeCacheField(fields[5])),
                decodeCacheField(fields[6]),
                targetLocation,
                targetLabel,
                status
            );
            if (!job.key.isEmpty() && !job.streamUrl.isEmpty()) {
                scheduledRecordings.add(job.key);
                dvrJobs.put(job.key, job);
            }
        }
    }

    private void saveDvrSchedule() {
        StringBuilder builder = new StringBuilder();
        for (DvrJob job : dvrJobs.values()) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append(joinCacheFields(
                job.key,
                job.title,
                job.channelName,
                job.streamUrl,
                String.valueOf(job.startMillis),
                String.valueOf(job.stopMillis),
                job.targetMode,
                job.targetLocation,
                job.targetLabel,
                job.status
            ));
        }
        prefs.edit()
            .putString("dvr_schedule_jobs", builder.toString())
            .putString("dvr_schedule_keys", String.join("\n", scheduledRecordings))
            .apply();
    }

    private void evaluateDvrSchedule(boolean userRequested) {
        long now = System.currentTimeMillis();
        int started = 0;
        int expired = 0;
        for (DvrJob job : new ArrayList<>(dvrJobs.values())) {
            if (activeRecordingKeys.contains(job.key)) {
                continue;
            }
            if (now >= job.startMillis && now < job.stopMillis) {
                startDvrRecording(job);
                started++;
            } else if (now >= job.stopMillis) {
                dvrJobs.remove(job.key);
                scheduledRecordings.remove(job.key);
                expired++;
            }
        }
        if (expired > 0) {
            saveDvrSchedule();
            if (activeView == ViewMode.DVR) {
                renderDvrView();
            }
        }
        if (userRequested) {
            setStatus(started > 0 ? "DVR RECORDING STARTED" : "NO DUE RECORDINGS", started == 0);
        }
    }

    private void startDvrRecording(DvrJob job) {
        if (activeRecordingKeys.contains(job.key)) {
            return;
        }
        activeRecordingKeys.add(job.key);
        job.status = "RECORDING";
        saveDvrSchedule();
        setStatus("RECORDING " + job.title, false);
        if (activeView == ViewMode.DVR) {
            renderDvrView();
        }

        recordingExecutor.execute(() -> {
            DvrOutput target = null;
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
            }

            DvrOutput finishedTarget = target;
            long finishedBytes = bytesWritten;
            Exception finishedFailure = failure;
            mainHandler.post(() -> {
                activeRecordingKeys.remove(job.key);
                dvrJobs.remove(job.key);
                scheduledRecordings.remove(job.key);
                job.status = finishedFailure == null && finishedBytes > 0 ? "COMPLETE" : "FAILED";
                if (finishedFailure == null && finishedBytes > 0 && finishedTarget != null) {
                    dvrRecordings.add(0, new DvrRecording(
                        job.key + "-" + System.currentTimeMillis(),
                        job.title,
                        job.channelName,
                        finishedTarget.uri,
                        finishedTarget.displayPath,
                        System.currentTimeMillis(),
                        finishedBytes,
                        Math.max(0L, Math.min(System.currentTimeMillis(), job.stopMillis) - job.startMillis)
                    ));
                    saveDvrRecordings();
                    setStatus("DVR SAVED " + formatBytes(finishedBytes), false);
                } else {
                    setStatus("DVR RECORDING FAILED", true);
                }
                saveDvrSchedule();
                if (activeView == ViewMode.DVR) {
                    renderDvrView();
                }
            });
        });
    }

    private long recordDvrStream(DvrJob job, OutputStream output) throws Exception {
        if (looksLikeHls(job.streamUrl)) {
            return recordHlsStream(job, output);
        }
        return recordHttpResource(job.streamUrl, output, job.stopMillis);
    }

    private long recordHttpResource(String streamUrl, OutputStream output, long stopMillis) throws Exception {
        HttpURLConnection connection = openDvrConnection(streamUrl);
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
            String manifest = fetchText(playlistUrl, getUserAgent());
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
                    bytesWritten += recordHttpResource(segmentUrl, output, job.stopMillis);
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

    private HttpURLConnection openDvrConnection(String streamUrl) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(streamUrl).openConnection();
        connection.setInstanceFollowRedirects(true);
        connection.setConnectTimeout(12000);
        connection.setReadTimeout(15000);
        connection.setRequestProperty("User-Agent", getUserAgent());
        connection.setRequestProperty("Accept", "*/*");
        connection.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
        return connection;
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
            String treeValue = job.targetLocation == null || job.targetLocation.isEmpty() ? prefs.getString("dvr_tree_uri", "") : job.targetLocation;
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

        File folder;
        if (DVR_TARGET_PATH.equals(mode)) {
            String folderPath = job.targetLocation == null || job.targetLocation.isEmpty() ? prefs.getString("dvr_manual_path", "") : job.targetLocation;
            if (folderPath.isEmpty()) {
                throw new IOException("No DVR path configured.");
            }
            folder = new File(folderPath);
        } else {
            folder = defaultDvrFolder();
        }
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
            AuthenticationContext auth = new AuthenticationContext(target.username, getSmbPassword().toCharArray(), target.domain);
            session = connection.authenticate(auth);
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

    private void closeAuto(AutoCloseable closeable) {
        if (closeable == null) {
            return;
        }
        try {
            closeable.close();
        } catch (Exception ignored) {
        }
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

    private void openDvrTargetPicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        try {
            startActivityForResult(intent, REQUEST_DVR_TREE);
        } catch (Exception error) {
            setStatus("DVR TARGET PICKER UNAVAILABLE", true);
        }
    }

    private void setDvrTargetDevice() {
        prefs.edit().putString("dvr_target_mode", DVR_TARGET_DEVICE).apply();
        setStatus("DVR TARGET DEVICE", false);
        renderDvrView();
    }

    private void setDvrTargetPath(String folderPath) {
        if (folderPath == null || folderPath.trim().isEmpty()) {
            setStatus("ENTER DVR PATH", true);
            return;
        }
        prefs.edit()
            .putString("dvr_target_mode", DVR_TARGET_PATH)
            .putString("dvr_manual_path", folderPath.trim())
            .apply();
        setStatus("DVR TARGET PATH", false);
        renderDvrView();
    }

    private void setDvrTargetSmb() {
        SmbTarget target = readSmbTargetFromInputs();
        if (target.host.isEmpty() || target.share.isEmpty()) {
            setStatus("ENTER SMB SERVER AND SHARE", true);
            return;
        }

        SharedPreferences.Editor editor = prefs.edit()
            .putString("dvr_target_mode", DVR_TARGET_SMB)
            .putString("dvr_smb_host", target.host)
            .putString("dvr_smb_share", target.share)
            .putString("dvr_smb_path", target.path)
            .putString("dvr_smb_user", target.username)
            .putString("dvr_smb_domain", target.domain);

        String typedPassword = dvrSmbPasswordInput == null ? "" : dvrSmbPasswordInput.getText().toString();
        if (!typedPassword.isEmpty()) {
            String encrypted = encryptPreferenceValue(typedPassword);
            if (encrypted.isEmpty()) {
                setStatus("SMB PASSWORD SAVE FAILED", true);
                return;
            }
            editor.putString("dvr_smb_password_enc", encrypted);
        }

        editor.apply();
        setStatus("DVR TARGET SMB", false);
        renderDvrView();
    }

    private String getDvrTargetMode() {
        return prefs.getString("dvr_target_mode", DVR_TARGET_DEVICE);
    }

    private String getDvrTargetLocation() {
        String mode = getDvrTargetMode();
        if (DVR_TARGET_TREE.equals(mode)) {
            return prefs.getString("dvr_tree_uri", "");
        }
        if (DVR_TARGET_PATH.equals(mode)) {
            return prefs.getString("dvr_manual_path", "");
        }
        if (DVR_TARGET_SMB.equals(mode)) {
            return encodeSmbTargetLocation(currentSmbTarget());
        }
        return defaultDvrFolder().getAbsolutePath();
    }

    private String getDvrTargetLabel() {
        String mode = getDvrTargetMode();
        if (DVR_TARGET_TREE.equals(mode)) {
            String uri = prefs.getString("dvr_tree_uri", "");
            return uri.isEmpty() ? "PICKED FOLDER NOT SET" : "PICKED FOLDER / USB OR NETWORK PROVIDER";
        }
        if (DVR_TARGET_PATH.equals(mode)) {
            String path = prefs.getString("dvr_manual_path", "");
            return path.isEmpty() ? "PATH NOT SET" : "PATH / " + path;
        }
        if (DVR_TARGET_SMB.equals(mode)) {
            SmbTarget target = currentSmbTarget();
            return target.host.isEmpty() || target.share.isEmpty()
                ? "SMB NOT SET"
                : "SMB / //" + target.host + "/" + target.share + (target.path.isEmpty() ? "" : "/" + target.path);
        }
        return "DEVICE / " + defaultDvrFolder().getAbsolutePath();
    }

    private SmbTarget readSmbTargetFromInputs() {
        return new SmbTarget(
            textFromInput(dvrSmbHostInput),
            textFromInput(dvrSmbShareInput),
            textFromInput(dvrSmbPathInput),
            textFromInput(dvrSmbUserInput),
            textFromInput(dvrSmbDomainInput)
        );
    }

    private SmbTarget currentSmbTarget() {
        return new SmbTarget(
            prefs.getString("dvr_smb_host", ""),
            prefs.getString("dvr_smb_share", ""),
            prefs.getString("dvr_smb_path", ""),
            prefs.getString("dvr_smb_user", ""),
            prefs.getString("dvr_smb_domain", "")
        );
    }

    private String textFromInput(EditText input) {
        return input == null ? "" : input.getText().toString().trim();
    }

    private String encodeSmbTargetLocation(SmbTarget target) {
        return encodeCacheField(target.host) + "|" + encodeCacheField(target.share) + "|" + encodeCacheField(target.path) + "|" + encodeCacheField(target.username) + "|" + encodeCacheField(target.domain);
    }

    private SmbTarget decodeSmbTargetLocation(String value) {
        if (value == null || value.trim().isEmpty()) {
            return currentSmbTarget();
        }
        String[] fields = value.split("\\|", -1);
        if (fields.length < 5) {
            return currentSmbTarget();
        }
        return new SmbTarget(
            decodeCacheField(fields[0]),
            decodeCacheField(fields[1]),
            decodeCacheField(fields[2]),
            decodeCacheField(fields[3]),
            decodeCacheField(fields[4])
        );
    }

    private String formatDvrWindow(long startMillis, long stopMillis) {
        SimpleDateFormat formatter = new SimpleDateFormat("MMM d HH:mm", Locale.US);
        return formatter.format(new Date(startMillis)) + " - " + formatter.format(new Date(stopMillis));
    }

    private String formatBytes(long value) {
        if (value >= 1024L * 1024L * 1024L) {
            return String.format(Locale.US, "%.1f GB", value / (1024f * 1024f * 1024f));
        }
        if (value >= 1024L * 1024L) {
            return String.format(Locale.US, "%.1f MB", value / (1024f * 1024f));
        }
        if (value >= 1024L) {
            return String.format(Locale.US, "%.1f KB", value / 1024f);
        }
        return value + " B";
    }

    private void playRecording(DvrRecording recording) {
        Channel recordingChannel = new Channel(recording.title, "DVR Recordings", "", "", recording.uri, ChannelType.VOD, false, false, "DVR", 0, recording.displayPath);
        playChannel(recordingChannel);
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

    private void addSettingsRow(String title, String body) {
        TextView row = new TextView(this);
        row.setText(title.toUpperCase(Locale.US) + "\n" + body);
        row.setTextColor(COLOR_TEXT);
        row.setTextSize(14);
        row.setGravity(Gravity.CENTER_VERTICAL | Gravity.LEFT);
        row.setPadding(dp(16), 0, dp(16), 0);
        row.setFocusable(true);
        applyFocusBackground(row, COLOR_PANEL_SOFT, Color.argb(75, 255, 62, 0));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(78));
        params.setMargins(0, 0, 0, dp(8));
        channelList.addView(row, params);
    }

    private void scanLibraryFolder(String folderPath) {
        if (folderPath == null || folderPath.trim().isEmpty()) {
            setStatus("ENTER A LIBRARY PATH", true);
            return;
        }

        prefs.edit().putString("library_path", folderPath).apply();
        setStatus("SCANNING LOCAL LIBRARY", false);
        summaryText.setText("SCANNING " + folderPath);

        executor.execute(() -> {
            List<LibraryItem> scanned = new ArrayList<>();
            scanFolderRecursive(new File(folderPath), scanned, 0);
            mainHandler.post(() -> {
                libraryItems.clear();
                libraryItems.addAll(scanned);
                saveLibraryCache();
                setStatus(scanned.isEmpty() ? "NO FILES FOUND" : "LIBRARY SCAN COMPLETE", scanned.isEmpty());
                renderLibraryView();
            });
        });
    }

    private void scanFolderRecursive(File folder, List<LibraryItem> scanned, int depth) {
        if (folder == null || !folder.exists() || !folder.canRead() || depth > 4 || scanned.size() >= MAX_RENDERED_CHANNELS) {
            return;
        }

        File[] files = folder.listFiles();
        if (files == null) {
            return;
        }

        for (File file : files) {
            if (scanned.size() >= MAX_RENDERED_CHANNELS) {
                return;
            }
            if (file.isDirectory()) {
                scanFolderRecursive(file, scanned, depth + 1);
            } else if (isVideoFile(file.getName())) {
                scanned.add(classifyLibraryItem(file));
            }
        }
    }

    private boolean isVideoFile(String name) {
        String lower = name.toLowerCase(Locale.US);
        return lower.endsWith(".mp4") || lower.endsWith(".mkv") || lower.endsWith(".m4v") || lower.endsWith(".mov") || lower.endsWith(".ts") || lower.endsWith(".avi") || lower.endsWith(".webm");
    }

    private LibraryItem classifyLibraryItem(File file) {
        String cleaned = cleanMediaTitle(file.getName().replaceFirst("\\.[^.]+$", ""));
        boolean series = isSeriesTitle(file.getName());
        String genre = classifyGenre(cleaned, file.getParent() == null ? "" : file.getParent());
        return new LibraryItem(cleaned, series ? "TV" : "MOVIE", genre, file.getAbsolutePath());
    }

    private LibraryItem classifyLibraryItem(DocumentFile file) {
        String name = file.getName() == null ? "Unknown Title" : file.getName();
        String cleaned = cleanMediaTitle(name.replaceFirst("\\.[^.]+$", ""));
        boolean series = isSeriesTitle(name);
        String genre = classifyGenre(cleaned, file.getUri().toString());
        return new LibraryItem(cleaned, series ? "TV" : "MOVIE", genre, file.getUri().toString());
    }

    private void saveChannelsCache() {
        try (OutputStreamWriter writer = new OutputStreamWriter(openFileOutput(CHANNEL_CACHE_FILE, Context.MODE_PRIVATE), StandardCharsets.UTF_8)) {
            for (Channel channel : channels) {
                writer.write(joinCacheFields(
                    channel.name,
                    channel.group,
                    channel.tvgId,
                    channel.logo,
                    channel.url,
                    channel.type.name(),
                    String.valueOf(channel.adult),
                    String.valueOf(channel.series),
                    channel.mediaCategory,
                    String.valueOf(channel.releaseYear),
                    channel.description
                ));
                writer.write("\n");
            }
        } catch (Exception ignored) {
        }
    }

    private void loadCachedChannels() {
        List<Channel> cached = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(openFileInput(CHANNEL_CACHE_FILE), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] fields = line.split("\\t", -1);
                if (fields.length < 11) {
                    continue;
                }
                cached.add(new Channel(
                    decodeCacheField(fields[0]),
                    decodeCacheField(fields[1]),
                    decodeCacheField(fields[2]),
                    decodeCacheField(fields[3]),
                    decodeCacheField(fields[4]),
                    ChannelType.valueOf(decodeCacheField(fields[5])),
                    Boolean.parseBoolean(decodeCacheField(fields[6])),
                    Boolean.parseBoolean(decodeCacheField(fields[7])),
                    decodeCacheField(fields[8]),
                    parseIntSafe(decodeCacheField(fields[9])),
                    decodeCacheField(fields[10])
                ));
            }
        } catch (Exception ignored) {
        }

        if (!cached.isEmpty()) {
            channels.clear();
            channels.addAll(cached);
            setStatus("RESTORED CACHED CATALOG", false);
        }
    }

    private void saveLibraryCache() {
        try (OutputStreamWriter writer = new OutputStreamWriter(openFileOutput(LIBRARY_CACHE_FILE, Context.MODE_PRIVATE), StandardCharsets.UTF_8)) {
            for (LibraryItem item : libraryItems) {
                writer.write(joinCacheFields(item.displayTitle, item.mediaType, item.genre, item.path));
                writer.write("\n");
            }
        } catch (Exception ignored) {
        }
    }

    private void loadCachedLibrary() {
        List<LibraryItem> cached = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(openFileInput(LIBRARY_CACHE_FILE), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] fields = line.split("\\t", -1);
                if (fields.length < 4) {
                    continue;
                }
                cached.add(new LibraryItem(
                    decodeCacheField(fields[0]),
                    decodeCacheField(fields[1]),
                    decodeCacheField(fields[2]),
                    decodeCacheField(fields[3])
                ));
            }
        } catch (Exception ignored) {
        }

        if (!cached.isEmpty()) {
            libraryItems.clear();
            libraryItems.addAll(cached);
        }
    }

    private void saveEpgCache(Map<String, List<EpgProgram>> source) {
        try (OutputStreamWriter writer = new OutputStreamWriter(openFileOutput(EPG_CACHE_FILE, Context.MODE_PRIVATE), StandardCharsets.UTF_8)) {
            for (Map.Entry<String, List<EpgProgram>> entry : source.entrySet()) {
                for (EpgProgram program : entry.getValue()) {
                    writer.write(joinCacheFields(
                        entry.getKey(),
                        program.title,
                        program.description,
                        String.valueOf(program.start.getTime()),
                        String.valueOf(program.stop.getTime())
                    ));
                    writer.write("\n");
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void loadCachedEpg() {
        Map<String, List<EpgProgram>> cached = new HashMap<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(openFileInput(EPG_CACHE_FILE), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] fields = line.split("\\t", -1);
                if (fields.length < 5) {
                    continue;
                }
                String channelId = decodeCacheField(fields[0]);
                long start = parseLongSafe(decodeCacheField(fields[3]));
                long stop = parseLongSafe(decodeCacheField(fields[4]));
                if (channelId.isEmpty() || start <= 0 || stop <= 0) {
                    continue;
                }
                List<EpgProgram> programs = cached.get(channelId);
                if (programs == null) {
                    programs = new ArrayList<>();
                    cached.put(channelId, programs);
                }
                programs.add(new EpgProgram(decodeCacheField(fields[1]), decodeCacheField(fields[2]), new Date(start), new Date(stop)));
            }
        } catch (Exception ignored) {
        }

        if (!cached.isEmpty()) {
            sortEpgMap(cached);
            epgByChannel.clear();
            epgByChannel.putAll(cached);
        }
    }

    private void saveDvrRecordings() {
        try (OutputStreamWriter writer = new OutputStreamWriter(openFileOutput(DVR_RECORDINGS_CACHE_FILE, Context.MODE_PRIVATE), StandardCharsets.UTF_8)) {
            for (DvrRecording recording : dvrRecordings) {
                writer.write(joinCacheFields(
                    recording.id,
                    recording.title,
                    recording.channelName,
                    recording.uri,
                    recording.displayPath,
                    String.valueOf(recording.createdMillis),
                    String.valueOf(recording.bytesWritten),
                    String.valueOf(recording.durationMillis)
                ));
                writer.write("\n");
            }
        } catch (Exception ignored) {
        }
    }

    private void loadDvrRecordings() {
        List<DvrRecording> cached = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(openFileInput(DVR_RECORDINGS_CACHE_FILE), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] fields = line.split("\\t", -1);
                if (fields.length < 8) {
                    continue;
                }
                cached.add(new DvrRecording(
                    decodeCacheField(fields[0]),
                    decodeCacheField(fields[1]),
                    decodeCacheField(fields[2]),
                    decodeCacheField(fields[3]),
                    decodeCacheField(fields[4]),
                    parseLongSafe(decodeCacheField(fields[5])),
                    parseLongSafe(decodeCacheField(fields[6])),
                    parseLongSafe(decodeCacheField(fields[7]))
                ));
            }
        } catch (Exception ignored) {
        }

        if (!cached.isEmpty()) {
            dvrRecordings.clear();
            dvrRecordings.addAll(cached);
        }
    }

    private void sortEpgMap(Map<String, List<EpgProgram>> map) {
        for (List<EpgProgram> programs : map.values()) {
            Collections.sort(programs, (left, right) -> left.start.compareTo(right.start));
        }
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

    private String encryptPreferenceValue(String value) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey());
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(encrypted, Base64.NO_WRAP);
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

    private int parseIntSafe(String value) {
        try {
            return Integer.parseInt(value);
        } catch (Exception ignored) {
            return 0;
        }
    }

    private long parseLongSafe(String value) {
        try {
            return Long.parseLong(value);
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private void renderEmptyState(String message) {
        if (channelList == null) {
            return;
        }
        channelList.removeAllViews();
        TextView empty = label(message, 14, COLOR_MUTED, false);
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(dp(20), dp(30), dp(20), dp(30));
        empty.setBackground(card(COLOR_PANEL_SOFT, Color.argb(34, 255, 255, 255), dp(16)));
        channelList.addView(empty, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(120)));
    }

    private void playChannel(Channel channel) {
        prefs.edit().putString("user_agent", getUserAgent()).apply();
        setStatus("TUNING " + channel.name, false);
        nowPlayingText.setText(channel.name.toUpperCase(Locale.US));
        decoderBadge.setText("GLOW_DECODER MEDIA3.CONNECTING");

        releasePlayer();

        Map<String, String> headers = new HashMap<>();
        headers.put("Accept", "*/*");
        headers.put("Accept-Language", "en-US,en;q=0.9");

        DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
            .setUserAgent(getUserAgent())
            .setAllowCrossProtocolRedirects(true)
            .setDefaultRequestProperties(headers);

        DefaultDataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(this, httpDataSourceFactory);
        player = new ExoPlayer.Builder(this)
            .setMediaSourceFactory(new DefaultMediaSourceFactory(dataSourceFactory))
            .build();

        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_READY) {
                    setStatus("DIRECT PLAY ACTIVE", false);
                    decoderBadge.setText("GLOW_DECODER MEDIA3.DIRECT");
                } else if (playbackState == Player.STATE_BUFFERING) {
                    decoderBadge.setText("GLOW_DECODER MEDIA3.BUFFERING");
                } else if (playbackState == Player.STATE_ENDED) {
                    decoderBadge.setText("GLOW_DECODER MEDIA3.ENDED");
                }
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                setStatus("UNSUPPORTED OR OFFLINE", true);
                decoderBadge.setText("GLOW_DECODER DIRECT.UNSUPPORTED");
                nowPlayingText.setText("DIRECT PLAY FAILED: " + error.getErrorCodeName());
            }
        });

        playerView.setPlayer(player);
        player.setMediaItem(new MediaItem.Builder().setUri(Uri.parse(channel.url)).build());
        player.prepare();
        player.play();
    }

    private Channel firstPlayableChannel() {
        for (Channel channel : channels) {
            if (!channel.adult && channel.type == ChannelType.LIVE) {
                return channel;
            }
        }
        for (Channel channel : channels) {
            if (!channel.adult) {
                return channel;
            }
        }
        return channels.isEmpty() ? null : channels.get(0);
    }

    private Channel classifyChannel(String rawName, String rawGroup, String tvgId, String logo, String url) {
        String sourceName = rawName == null || rawName.trim().isEmpty() ? "Unknown Channel" : rawName.trim();
        String sourceGroup = rawGroup == null || rawGroup.trim().isEmpty() ? "General" : rawGroup.trim();
        boolean adult = isAdultContent(sourceName, sourceGroup);
        boolean vod = isVodContent(sourceName, sourceGroup, url);
        boolean series = isSeriesTitle(sourceName) || sourceGroup.toLowerCase(Locale.US).contains("series") || sourceGroup.toLowerCase(Locale.US).contains("tv vod");
        int releaseYear = extractReleaseYear(sourceName);

        String displayName = vod ? cleanMediaTitle(sourceName) : sourceName;
        String mediaCategory = adult ? "Adult" : (vod ? classifyGenre(displayName, sourceGroup) : sourceGroup);
        ChannelType type = vod ? ChannelType.VOD : ChannelType.LIVE;
        String description = vod
            ? "On-demand direct-play item classified locally from IPTV metadata."
            : "Live direct-play IPTV channel.";

        return new Channel(displayName, sourceGroup, tvgId, logo, url, type, adult, series, mediaCategory, releaseYear, description);
    }

    private boolean isVodContent(String name, String group, String url) {
        String haystack = (name + " " + group + " " + url).toLowerCase(Locale.US);
        return haystack.contains("vod")
            || haystack.contains("movie")
            || haystack.contains("film")
            || haystack.contains("cinema")
            || haystack.contains("series")
            || haystack.contains("netflix")
            || haystack.contains("hbo")
            || haystack.contains("prime")
            || haystack.contains("disney")
            || haystack.contains(".mp4")
            || haystack.contains(".mkv")
            || haystack.contains(".avi")
            || haystack.contains(".mov")
            || haystack.contains("/movie/")
            || haystack.contains("/series/");
    }

    private boolean isAdultContent(String name, String group) {
        String haystack = (name + " " + group).toLowerCase(Locale.US);
        return haystack.contains("xxx")
            || haystack.contains("adult")
            || haystack.contains("18+")
            || haystack.contains("porn")
            || haystack.contains("erotic")
            || haystack.contains("erotica")
            || haystack.contains("playboy")
            || haystack.contains("hustler");
    }

    private boolean isSeriesTitle(String text) {
        return Pattern.compile("\\bS\\d{1,2}[- ._]?E\\d{1,3}\\b|\\b\\d{1,2}x\\d{1,3}\\b|\\bSeason[- ._]?\\d{1,2}\\b", Pattern.CASE_INSENSITIVE)
            .matcher(text == null ? "" : text)
            .find();
    }

    private String classifyGenre(String title, String group) {
        String haystack = (title + " " + group).toLowerCase(Locale.US);
        if (matchesAny(haystack, "action", "adventure", "mission", "fight", "war", "soldier", "bond", "wick", "fast", "furious", "hunter", "strike")) {
            return "Action & Adventure";
        }
        if (matchesAny(haystack, "sci-fi", "scifi", "fantasy", "space", "alien", "robot", "galaxy", "dune", "avatar", "matrix", "future", "time")) {
            return "Sci-Fi & Fantasy";
        }
        if (matchesAny(haystack, "comedy", "funny", "standup", "parody", "laugh", "show", "club")) {
            return "Comedy & Entertainment";
        }
        if (matchesAny(haystack, "drama", "romance", "love", "heart", "life", "story")) {
            return "Drama & Romance";
        }
        if (matchesAny(haystack, "thriller", "horror", "scary", "ghost", "evil", "blood", "scream", "crime", "mystery", "psycho")) {
            return "Thriller & Horror";
        }
        if (matchesAny(haystack, "documentary", "doc", "science", "nasa", "history", "nature", "wild", "cosmos", "biography")) {
            return "Documentary & Science";
        }
        if (matchesAny(haystack, "kids", "animation", "cartoon", "family", "anime", "disney", "pixar")) {
            return "Kids & Animation";
        }
        return "General VOD";
    }

    private boolean matchesAny(String haystack, String... keywords) {
        for (String keyword : keywords) {
            if (haystack.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private int extractReleaseYear(String text) {
        Matcher matcher = Pattern.compile("\\b(19\\d{2}|20\\d{2})\\b").matcher(text == null ? "" : text);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
    }

    private String cleanMediaTitle(String title) {
        String cleaned = title == null ? "" : title;
        cleaned = cleaned.replaceAll("\\[[^\\]]*\\]", " ");
        cleaned = cleaned.replaceAll("\\([^\\)]*\\)", " ");
        cleaned = cleaned.replaceAll("(?i)\\b(1080p|720p|480p|2160p|4k|2k|8k|fhd|uhd|hd|sd|hevc|h264|h265|x264|x265|bluray|webrip|web-dl|webdl|bdrip|dvdrip|camrip|hdrip|proper|repack|remux|multi|multisub|subbed|sub|dual[- ]audio|truehd|atmos|dd5\\.1|ac3|aac|dts|xvid|divx|h\\.264|h\\.265)\\b", " ");
        cleaned = cleaned.replaceAll("(?i)\\b(netflix|hbo|disney\\+?|amazon|prime|apple-tv|peacock|paramount\\+?|hulu|showtime|starz|vod|series|cinema|movie|film|latino|spanish|french|italian|german|english|multi-sub)\\b", " ");
        cleaned = cleaned.replaceAll("\\b(19\\d{2}|20\\d{2})\\b", " ");
        cleaned = cleaned.replaceAll("[_.\\-\\/\\\\|:+]+", " ");
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        if (cleaned.length() < 2) {
            cleaned = title == null ? "Unknown Title" : title.replaceAll("[\\[\\]]", " ").trim();
        }
        return titleCase(cleaned);
    }

    private String titleCase(String text) {
        String[] words = text.toLowerCase(Locale.US).split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (String word : words) {
            if (word.isEmpty()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(' ');
            }
            if (word.equals("tv") || word.equals("vod") || word.equals("fbi") || word.equals("cia")) {
                builder.append(word.toUpperCase(Locale.US));
            } else {
                builder.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
            }
        }
        return builder.length() == 0 ? "Unknown Title" : builder.toString();
    }

    private void releasePlayer() {
        if (player != null) {
            playerView.setPlayer(null);
            player.release();
            player = null;
        }
    }

    private String getUserAgent() {
        String value = userAgentInput == null ? DEFAULT_USER_AGENT : userAgentInput.getText().toString().trim();
        return value.isEmpty() ? DEFAULT_USER_AGENT : value;
    }

    private void setStatus(String text, boolean warning) {
        if (statusText == null) {
            return;
        }
        statusText.setText(text);
        statusText.setTextColor(warning ? COLOR_PINK : COLOR_MUTED);
    }

    private String extractName(String extInfLine) {
        int commaIndex = extInfLine.lastIndexOf(',');
        if (commaIndex >= 0 && commaIndex < extInfLine.length() - 1) {
            String name = extInfLine.substring(commaIndex + 1).trim();
            if (!name.isEmpty()) {
                return name;
            }
        }
        return extractAttribute(extInfLine, "tvg-name", "Unknown Channel");
    }

    private String extractAttribute(String line, String attribute, String fallback) {
        Pattern quotedPattern = Pattern.compile(Pattern.quote(attribute) + "=\\\"([^\\\"]*)\\\"", Pattern.CASE_INSENSITIVE);
        Matcher quotedMatcher = quotedPattern.matcher(line);
        if (quotedMatcher.find()) {
            return quotedMatcher.group(1).trim();
        }

        Pattern unquotedPattern = Pattern.compile(Pattern.quote(attribute) + "=([^,\\s]+)", Pattern.CASE_INSENSITIVE);
        Matcher unquotedMatcher = unquotedPattern.matcher(line);
        if (unquotedMatcher.find()) {
            return unquotedMatcher.group(1).trim();
        }

        return fallback;
    }

    private boolean looksLikeStreamUrl(String line) {
        String lower = line.toLowerCase(Locale.US);
        return lower.startsWith("http://") || lower.startsWith("https://") || lower.contains("://");
    }

    private TextView label(String text, int sp, int color, boolean mono) {
        TextView label = new TextView(this);
        label.setText(text);
        label.setTextColor(color);
        label.setTextSize(sp);
        label.setIncludeFontPadding(false);
        label.setGravity(Gravity.CENTER_VERTICAL);
        if (mono) {
            label.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        }
        return label;
    }

    private EditText input(String hint) {
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setHint(hint);
        input.setHintTextColor(Color.argb(90, 245, 242, 240));
        input.setTextColor(COLOR_TEXT);
        input.setTextSize(13);
        input.setPadding(dp(14), 0, dp(14), 0);
        input.setSelectAllOnFocus(false);
        input.setBackground(card(COLOR_PANEL_SOFT, Color.argb(45, 255, 255, 255), dp(12)));
        input.setFocusable(true);
        return input;
    }

    private Button actionButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(Color.WHITE);
        button.setTextSize(11);
        button.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        button.setAllCaps(false);
        button.setGravity(Gravity.CENTER);
        button.setFocusable(true);
        applyFocusBackground(button, COLOR_PRIMARY, COLOR_PINK);
        return button;
    }

    private GradientDrawable card(int color, int strokeColor, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        drawable.setStroke(dp(1), strokeColor);
        return drawable;
    }

    private void applyFocusBackground(View view, int normalColor, int focusColor) {
        view.setBackground(card(normalColor, Color.argb(38, 255, 255, 255), dp(12)));
        view.setOnFocusChangeListener((focusedView, hasFocus) -> {
            focusedView.setBackground(card(hasFocus ? focusColor : normalColor, hasFocus ? COLOR_PRIMARY : Color.argb(38, 255, 255, 255), dp(12)));
            focusedView.setScaleX(hasFocus ? 1.02f : 1f);
            focusedView.setScaleY(hasFocus ? 1.02f : 1f);
        });
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private enum ChannelType {
        LIVE,
        VOD
    }

    private static class Channel {
        final String name;
        final String group;
        final String tvgId;
        final String logo;
        final String url;
        final ChannelType type;
        final boolean adult;
        final boolean series;
        final String mediaCategory;
        final int releaseYear;
        final String description;

        Channel(
            String name,
            String group,
            String tvgId,
            String logo,
            String url,
            ChannelType type,
            boolean adult,
            boolean series,
            String mediaCategory,
            int releaseYear,
            String description
        ) {
            this.name = name == null || name.trim().isEmpty() ? "Unknown Channel" : name.trim();
            this.group = group == null || group.trim().isEmpty() ? "General" : group.trim();
            this.tvgId = tvgId == null ? "" : tvgId.trim();
            this.logo = logo == null ? "" : logo.trim();
            this.url = url == null ? "" : url.trim();
            this.type = type == null ? ChannelType.LIVE : type;
            this.adult = adult;
            this.series = series;
            this.mediaCategory = mediaCategory == null || mediaCategory.trim().isEmpty() ? "General VOD" : mediaCategory.trim();
            this.releaseYear = releaseYear;
            this.description = description == null ? "" : description.trim();
        }
    }

    private static class LibraryItem {
        final String displayTitle;
        final String mediaType;
        final String genre;
        final String path;

        LibraryItem(String displayTitle, String mediaType, String genre, String path) {
            this.displayTitle = displayTitle == null || displayTitle.trim().isEmpty() ? "Unknown Title" : displayTitle.trim();
            this.mediaType = mediaType == null ? "MOVIE" : mediaType;
            this.genre = genre == null || genre.trim().isEmpty() ? "General VOD" : genre.trim();
            this.path = path == null ? "" : path.trim();
        }
    }

    private static class EpgProgram {
        final String title;
        final String description;
        final Date start;
        final Date stop;

        EpgProgram(String title, String description, Date start, Date stop) {
            this.title = title == null || title.trim().isEmpty() ? "Program Schedule Broadcast" : title.trim();
            this.description = description == null ? "" : description.trim();
            this.start = start;
            this.stop = stop;
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
        String status;

        DvrJob(String key, String title, String channelName, String streamUrl, long startMillis, long stopMillis, String targetMode, String targetLocation, String targetLabel, String status) {
            this.key = key == null ? "" : key.trim();
            this.title = title == null || title.trim().isEmpty() ? "Afterglow DVR Recording" : title.trim();
            this.channelName = channelName == null || channelName.trim().isEmpty() ? "Unknown Channel" : channelName.trim();
            this.streamUrl = streamUrl == null ? "" : streamUrl.trim();
            this.startMillis = startMillis;
            this.stopMillis = stopMillis;
            this.targetMode = targetMode == null || targetMode.trim().isEmpty() ? DVR_TARGET_DEVICE : targetMode.trim();
            this.targetLocation = targetLocation == null ? "" : targetLocation.trim();
            this.targetLabel = targetLabel == null || targetLabel.trim().isEmpty() ? "Device Storage" : targetLabel.trim();
            this.status = status == null || status.trim().isEmpty() ? "QUEUED" : status.trim();
        }
    }

    private static class DvrRecording {
        final String id;
        final String title;
        final String channelName;
        final String uri;
        final String displayPath;
        final long createdMillis;
        final long bytesWritten;
        final long durationMillis;

        DvrRecording(String id, String title, String channelName, String uri, String displayPath, long createdMillis, long bytesWritten, long durationMillis) {
            this.id = id == null || id.trim().isEmpty() ? String.valueOf(System.currentTimeMillis()) : id.trim();
            this.title = title == null || title.trim().isEmpty() ? "Afterglow DVR Recording" : title.trim();
            this.channelName = channelName == null || channelName.trim().isEmpty() ? "Unknown Channel" : channelName.trim();
            this.uri = uri == null ? "" : uri.trim();
            this.displayPath = displayPath == null ? "" : displayPath.trim();
            this.createdMillis = createdMillis;
            this.bytesWritten = bytesWritten;
            this.durationMillis = durationMillis;
        }
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

    private static class DvrCandidate {
        final Channel channel;
        final EpgProgram program;
        final String key;

        DvrCandidate(Channel channel, EpgProgram program, String key) {
            this.channel = channel;
            this.program = program;
            this.key = key;
        }
    }

    private static class SpaceView extends View {
        SpaceView(Context context) {
            super(context);
        }
    }
}