package com.afterglowtv.nativeplayer;

import android.app.Activity;
import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.Context;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
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
import android.widget.ImageView;
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
import java.util.Calendar;
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

import org.json.JSONArray;
import org.json.JSONObject;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.KeyStore;

public class MainActivity extends Activity {
    private static final String DEFAULT_USER_AGENT = "VLC/3.0.18 LibVLC/3.0.18";
    private static final String USER_AGENT_TIVIMATE = "TiviMate/4.7.0 (Xiaomi MiTV-MSSP3; Android 9)";
    private static final String USER_AGENT_CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
    private static final String USER_AGENT_SMARTERS = "IPTVSmarters";
    private static final String USER_AGENT_STALKER = "Mozilla/5.0 (QtEmbedded; U; Linux; MAG250; en) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3";
    private static final String DEFAULT_STARTER_PLAYLIST_URL = "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8";
    private static final String PREFS_NAME = "afterglow_native_prefs";
    private static final String CHANNEL_CACHE_FILE = "afterglow_channels.cache";
    private static final String LIBRARY_CACHE_FILE = "afterglow_library.cache";
    private static final String EPG_CACHE_FILE = "afterglow_epg.cache";
    private static final String DVR_RECORDINGS_CACHE_FILE = "afterglow_dvr_recordings.cache";
    private static final String KEYSTORE_ALIAS_SMB_PASSWORD = "afterglow_dvr_smb_password";
    private static final int REQUEST_LIBRARY_TREE = 4510;
    private static final int REQUEST_DVR_TREE = 4511;
    private static final int REQUEST_NOTIFICATIONS = 4512;
    private static final int REQUEST_PLAYLIST_FILE = 4513;
    private static final int MAX_RENDERED_CHANNELS = 500;
    private static final String DVR_TARGET_DEVICE = "device";
    private static final String DVR_TARGET_TREE = "tree";
    private static final String DVR_TARGET_PATH = "path";
    private static final String DVR_TARGET_SMB = "smb";

    private int COLOR_BLACK = Color.rgb(5, 5, 5);
    private int COLOR_PANEL = Color.rgb(18, 18, 18);
    private int COLOR_PANEL_GLASS = Color.argb(230, 18, 18, 18);
    private int COLOR_PANEL_SOFT = Color.argb(102, 18, 18, 18);
    private int COLOR_INPUT = Color.argb(102, 0, 0, 0);
    private int COLOR_PRIMARY = Color.rgb(255, 62, 0);
    private int COLOR_SECONDARY = Color.rgb(255, 138, 0);
    private int COLOR_ACCENT = Color.rgb(0, 212, 255);
    private int COLOR_PINK = Color.rgb(255, 78, 136);
    private int COLOR_TEXT = Color.WHITE;
    private int COLOR_MUTED = Color.argb(102, 255, 255, 255);
    private int COLOR_TEXT_SOFT = Color.argb(153, 255, 255, 255);
    private int COLOR_BORDER = Color.argb(13, 255, 255, 255);
    private int COLOR_BORDER_STRONG = Color.argb(26, 255, 255, 255);
    private int COLOR_NAV_ACTIVE = Color.argb(26, 255, 255, 255);

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
    private final BroadcastReceiver dvrCompletionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || !DvrRecordingService.ACTION_DVR_RECORDING_FINISHED.equals(intent.getAction())) {
                return;
            }
            handleDvrRecordingFinished(intent);
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

    private enum SetupMode {
        M3U,
        XTREAM,
        STALKER,
        DEMO
    }

    private enum VodLayoutMode {
        EPG,
        GRID,
        SHELF
    }

    private enum LibraryTab {
        MOVIES,
        SHOWS,
        RECENT,
        SOURCES,
        NEEDS_REVIEW
    }

    private SharedPreferences prefs;
    private ViewMode activeView = ViewMode.GUIDE;
    private SetupMode setupMode = SetupMode.M3U;
    private VodLayoutMode vodLayoutMode = VodLayoutMode.EPG;
    private LibraryTab libraryTab = LibraryTab.MOVIES;
    private String activeFilter = "All";
    private String vodSearchQuery = "";
    private String librarySearchQuery = "";
    private final List<TextView> navButtons = new ArrayList<>();
    private final List<TextView> setupModeButtons = new ArrayList<>();
    private LinearLayout setupFields;
    private EditText playlistInput;
    private EditText epgInput;
    private EditText userAgentInput;
    private EditText xtreamHostInput;
    private EditText xtreamUserInput;
    private EditText xtreamPasswordInput;
    private EditText stalkerHostInput;
    private EditText stalkerMacInput;
    private EditText vodSearchInput;
    private EditText libraryPathInput;
    private EditText librarySearchInput;
    private EditText libraryEditMatchInput;
    private EditText libraryEditTitleInput;
    private EditText libraryEditGenreInput;
    private EditText dvrTargetInput;
    private EditText dvrManualChannelInput;
    private EditText dvrManualTitleInput;
    private EditText dvrManualStartInput;
    private EditText dvrManualDurationInput;
    private EditText dvrSmbHostInput;
    private EditText dvrSmbShareInput;
    private EditText dvrSmbPathInput;
    private EditText dvrSmbUserInput;
    private EditText dvrSmbDomainInput;
    private EditText dvrSmbPasswordInput;
    private EditText settingsUserAgentInput;
    private EditText settingsEpgUrlInput;
    private EditText settingsBackendInput;
    private EditText settingsEpgInjectChannelsInput;
    private EditText settingsEpgInjectDensityInput;
    private EditText settingsEpgInjectSlotChannelInput;
    private EditText settingsEpgInjectSlotHourInput;
    private EditText settingsEpgInjectSlotTitleInput;
    private EditText settingsBackupPathInput;
    private TextView statusText;
    private TextView summaryText;
    private TextView sectionTitleText;
    private TextView nowPlayingText;
    private TextView decoderBadge;
    private LinearLayout categoryRow;
    private LinearLayout channelList;
    private PlayerView playerView;
    private ExoPlayer player;
    private Typeface fontSans = Typeface.DEFAULT;
    private Typeface fontDisplay = Typeface.DEFAULT_BOLD;
    private Typeface fontMono = Typeface.MONOSPACE;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        vodSearchQuery = prefs.getString("vod_search_query", "");
        librarySearchQuery = prefs.getString("library_search_query", "");
        try {
            vodLayoutMode = VodLayoutMode.valueOf(prefs.getString("vod_layout_mode", VodLayoutMode.EPG.name()));
        } catch (Exception ignored) {
            vodLayoutMode = VodLayoutMode.EPG;
        }
        try {
            libraryTab = LibraryTab.valueOf(prefs.getString("library_tab", LibraryTab.MOVIES.name()));
        } catch (Exception ignored) {
            libraryTab = LibraryTab.MOVIES;
        }
        applyNativeTheme(prefs.getString("active_theme_id", "afterglow-original"));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();
        registerDvrCompletionReceiver();
        requestDvrNotificationPermissionIfNeeded();
        loadTypefaces();
        buildUi();

        String savedSourceType = prefs.getString("playlist_source_type", "");
        String savedPlaylist = prefs.getString("playlist_url", "");
        String startupPlaylist = savedPlaylist == null || savedPlaylist.trim().isEmpty() ? DEFAULT_STARTER_PLAYLIST_URL : savedPlaylist;
        String savedEpg = prefs.getString("epg_url", "");
        String savedUserAgent = prefs.getString("user_agent", DEFAULT_USER_AGENT);
        playlistInput.setText(startupPlaylist);
        epgInput.setText(savedEpg);
        userAgentInput.setText(savedUserAgent == null || savedUserAgent.trim().isEmpty() ? DEFAULT_USER_AGENT : savedUserAgent);
        loadDvrSchedule();
        loadDvrRecordings();

        loadCachedChannels();
        loadCachedLibrary();
        loadCachedEpg();
        renderCurrentView();
        mainHandler.postDelayed(dvrScheduler, 5000);

        if ("demo".equals(savedSourceType)) {
            loadDemoPlaylist();
        } else if ("file".equals(savedSourceType) && startupPlaylist != null && startupPlaylist.startsWith("content://")) {
            loadPlaylistFile(Uri.parse(startupPlaylist));
        } else if ("stalker".equals(savedSourceType)) {
            String portal = prefs.getString("stalker_portal", "");
            String mac = prefs.getString("stalker_mac", "");
            if (!portal.isEmpty() && !mac.isEmpty()) {
                fetchSavedStalkerPortal(portal, mac);
            }
        } else if (startupPlaylist != null && !startupPlaylist.trim().isEmpty()) {
            loadPlaylist(startupPlaylist.trim());
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
        try {
            unregisterReceiver(dvrCompletionReceiver);
        } catch (Exception ignored) {
        }
        releasePlayer();
        executor.shutdownNow();
        recordingExecutor.shutdownNow();
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_PLAYLIST_FILE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            loadPlaylistFile(data.getData());
        } else if (requestCode == REQUEST_LIBRARY_TREE && resultCode == RESULT_OK && data != null && data.getData() != null) {
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

    private void registerDvrCompletionReceiver() {
        IntentFilter filter = new IntentFilter(DvrRecordingService.ACTION_DVR_RECORDING_FINISHED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(dvrCompletionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(dvrCompletionReceiver, filter);
        }
    }

    private void handleDvrRecordingFinished(Intent intent) {
        String key = intent.getStringExtra(DvrRecordingService.EXTRA_KEY);
        boolean success = intent.getBooleanExtra(DvrRecordingService.EXTRA_SUCCESS, false);
        long bytes = intent.getLongExtra(DvrRecordingService.EXTRA_BYTES, 0L);
        if (key != null) {
            activeRecordingKeys.remove(key);
        }
        loadDvrSchedule();
        loadDvrRecordings();
        setStatus(success ? "DVR SAVED " + formatBytes(bytes) : "DVR RECORDING FAILED", !success);
        if (activeView == ViewMode.DVR) {
            renderDvrView();
        }
    }

    private void requestDvrNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return;
        }
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            return;
        }
        requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, REQUEST_NOTIFICATIONS);
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
        shell.setPadding(0, 0, 0, 0);
        root.addView(shell, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        shell.addView(createSidebar(), new LinearLayout.LayoutParams(dp(76), LinearLayout.LayoutParams.MATCH_PARENT));

        LinearLayout main = new LinearLayout(this);
        main.setOrientation(LinearLayout.VERTICAL);
        main.setPadding(0, 0, 0, 0);
        shell.addView(main, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));

        main.addView(createPlayerPanel(), new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 42f));

        LinearLayout workspace = new LinearLayout(this);
        workspace.setOrientation(LinearLayout.VERTICAL);
        workspace.setBackgroundColor(COLOR_BLACK);
        main.addView(workspace, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 58f));

        workspace.addView(createSetupPanel(), new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(210)));
        workspace.addView(createChannelPanel(), new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
    }

    private View createSidebar() {
        LinearLayout sidebar = new LinearLayout(this);
        sidebar.setOrientation(LinearLayout.VERTICAL);
        sidebar.setGravity(Gravity.CENTER_HORIZONTAL);
        sidebar.setPadding(dp(12), dp(32), dp(12), dp(18));
        sidebar.setBackground(card(COLOR_PANEL_GLASS, COLOR_BORDER, 0));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.afterglow_logo_mark);
        logo.setAdjustViewBounds(true);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(52));
        logoParams.setMargins(0, 0, 0, dp(44));
        sidebar.addView(logo, logoParams);

        addNavButton(sidebar, "GUIDE", ViewMode.GUIDE);
        addNavButton(sidebar, "VOD", ViewMode.VOD);
        addNavButton(sidebar, "XXX", ViewMode.ADULT);
        addNavButton(sidebar, "DVR", ViewMode.DVR);
        addNavButton(sidebar, "LIB", ViewMode.LIBRARY);
        addNavButton(sidebar, "SET", ViewMode.SETTINGS);

        SpaceView spacer = new SpaceView(this);
        sidebar.addView(spacer, new LinearLayout.LayoutParams(1, 0, 1f));

        TextView build = new TextView(this);
        build.setText("TV\nENGINE");
        build.setTextColor(Color.argb(76, 255, 255, 255));
        build.setTextSize(8);
        build.setGravity(Gravity.CENTER);
        build.setTypeface(styled(fontMono, Typeface.BOLD));
        build.setLetterSpacing(0.22f);
        sidebar.addView(build, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48)));
        return sidebar;
    }

    private void addNavButton(LinearLayout sidebar, String item, ViewMode mode) {
            TextView nav = new TextView(this);
            nav.setText(item);
            nav.setGravity(Gravity.CENTER);
            nav.setTextColor(activeView == mode ? COLOR_PRIMARY : COLOR_MUTED);
            nav.setTextSize(9);
            nav.setTypeface(styled(fontMono, Typeface.BOLD));
            nav.setLetterSpacing(0.14f);
            nav.setFocusable(true);
            nav.setPadding(0, 0, 0, 0);
            nav.setTag(mode);
            applyFocusBackground(nav, activeView == mode ? COLOR_NAV_ACTIVE : Color.TRANSPARENT, COLOR_NAV_ACTIVE, dp(12));
            nav.setOnClickListener(v -> switchView(mode));
            navButtons.add(nav);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
            params.setMargins(0, dp(4), 0, 0);
            sidebar.addView(nav, params);
    }

    private View createHeader() {
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.afterglow_logo_mark);
        mark.setAdjustViewBounds(true);
        mark.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams markParams = new LinearLayout.LayoutParams(dp(54), dp(54));
        markParams.setMargins(0, 0, dp(14), 0);
        header.addView(mark, markParams);

        LinearLayout titleBlock = new LinearLayout(this);
        titleBlock.setOrientation(LinearLayout.VERTICAL);
        titleBlock.setGravity(Gravity.CENTER_VERTICAL);

        TextView eyebrow = label("RECEIVER ENGINE / ANDROID TV / FIRE TV", 10, COLOR_PRIMARY, true);
        titleBlock.addView(eyebrow);

        TextView title = new TextView(this);
        title.setText("Afterglow TV");
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
        panel.setPadding(0, 0, 0, dp(1));
        panel.setBackground(card(Color.BLACK, COLOR_BORDER, 0));

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
        nowPlayingText.setBackground(card(Color.argb(185, 0, 0, 0), COLOR_BORDER_STRONG, dp(24)));
        nowPlayingText.setSingleLine(false);
        FrameLayout.LayoutParams nowParams = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, dp(42));
        nowParams.gravity = Gravity.TOP | Gravity.LEFT;
        nowParams.setMargins(dp(14), dp(14), 0, 0);
        panel.addView(nowPlayingText, nowParams);

        decoderBadge = label("GLOW_DECODER MEDIA3.READY", 10, COLOR_MUTED, true);
        decoderBadge.setPadding(dp(14), dp(7), dp(14), dp(7));
        decoderBadge.setBackground(card(Color.argb(185, 0, 0, 0), COLOR_BORDER_STRONG, dp(24)));
        FrameLayout.LayoutParams badgeParams = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, dp(38));
        badgeParams.gravity = Gravity.BOTTOM | Gravity.RIGHT;
        badgeParams.setMargins(0, 0, dp(14), dp(14));
        panel.addView(decoderBadge, badgeParams);

        statusText = label("READY", 10, COLOR_MUTED, true);
        statusText.setGravity(Gravity.CENTER);
        statusText.setPadding(dp(12), 0, dp(12), 0);
        statusText.setBackground(card(Color.argb(150, 0, 0, 0), COLOR_BORDER, dp(24)));
        FrameLayout.LayoutParams statusParams = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, dp(34));
        statusParams.gravity = Gravity.TOP | Gravity.RIGHT;
        statusParams.setMargins(0, dp(14), dp(14), 0);
        panel.addView(statusText, statusParams);
        return panel;
    }

    private View createSetupPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(16), dp(10), dp(16), dp(10));
        panel.setBackground(card(COLOR_BLACK, COLOR_BORDER, 0));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        panel.addView(header, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(26)));

        TextView title = label("SIGNAL INTERFACE", 11, COLOR_PRIMARY, true);
        header.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));

        LinearLayout presets = new LinearLayout(this);
        presets.setOrientation(LinearLayout.HORIZONTAL);
        presets.setGravity(Gravity.CENTER_VERTICAL | Gravity.RIGHT);
        header.addView(presets, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.MATCH_PARENT));
        addUserAgentPreset(presets, "VLC", DEFAULT_USER_AGENT);
        addUserAgentPreset(presets, "TIVIMATE", USER_AGENT_TIVIMATE);
        addUserAgentPreset(presets, "CHROME", USER_AGENT_CHROME);
        addUserAgentPreset(presets, "SMARTERS", USER_AGENT_SMARTERS);

        LinearLayout modeRow = new LinearLayout(this);
        modeRow.setOrientation(LinearLayout.HORIZONTAL);
        modeRow.setGravity(Gravity.CENTER_VERTICAL);
        modeRow.setPadding(dp(6), dp(4), dp(6), dp(4));
        modeRow.setBackground(card(Color.argb(102, 0, 0, 0), COLOR_BORDER, dp(12)));
        LinearLayout.LayoutParams modeParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        modeParams.setMargins(0, dp(6), 0, dp(6));
        panel.addView(modeRow, modeParams);

        addSetupModeButton(modeRow, "M3U URL", SetupMode.M3U);
        addSetupModeButton(modeRow, "XTREAM API", SetupMode.XTREAM);
        addSetupModeButton(modeRow, "STALKER MAC", SetupMode.STALKER);
        addSetupModeButton(modeRow, "INSTANT DEMO", SetupMode.DEMO);

        setupFields = new LinearLayout(this);
        setupFields.setOrientation(LinearLayout.VERTICAL);
        panel.addView(setupFields, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        renderSetupFields();
        updateSetupModeStyles();
        return panel;
    }

    private void addUserAgentPreset(LinearLayout row, String label, String value) {
        TextView chip = label(label, 9, COLOR_MUTED, true);
        chip.setGravity(Gravity.CENTER);
        chip.setPadding(dp(10), 0, dp(10), 0);
        chip.setFocusable(true);
        chip.setClickable(true);
        applyFocusBackground(chip, Color.TRANSPARENT, COLOR_NAV_ACTIVE, dp(10));
        chip.setOnClickListener(v -> {
            if (userAgentInput != null) {
                userAgentInput.setText(value);
            }
            setStatus("USER AGENT " + label, false);
        });
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(26));
        params.setMargins(dp(6), 0, 0, 0);
        row.addView(chip, params);
    }

    private void addSetupModeButton(LinearLayout row, String text, SetupMode mode) {
        TextView button = label(text, 10, COLOR_MUTED, true);
        button.setGravity(Gravity.CENTER);
        button.setFocusable(true);
        button.setClickable(true);
        button.setTag(mode);
        button.setOnClickListener(v -> setSetupMode(mode));
        setupModeButtons.add(button);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        params.setMargins(dp(3), 0, dp(3), 0);
        row.addView(button, params);
    }

    private void setSetupMode(SetupMode mode) {
        setupMode = mode;
        updateSetupModeStyles();
        renderSetupFields();
    }

    private void updateSetupModeStyles() {
        for (TextView button : setupModeButtons) {
            boolean active = button.getTag() == setupMode;
            button.setTextColor(active ? COLOR_PRIMARY : COLOR_MUTED);
            button.setBackground(card(active ? COLOR_NAV_ACTIVE : Color.TRANSPARENT, active ? COLOR_BORDER_STRONG : Color.TRANSPARENT, dp(10)));
        }
    }

    private void renderSetupFields() {
        if (setupFields == null) {
            return;
        }
        setupFields.removeAllViews();
        if (setupMode == SetupMode.M3U) {
            renderM3uSetupFields();
        } else if (setupMode == SetupMode.XTREAM) {
            renderXtreamSetupFields();
        } else if (setupMode == SetupMode.STALKER) {
            renderStalkerSetupFields();
        } else {
            renderDemoSetupFields();
        }
    }

    private void renderM3uSetupFields() {
        LinearLayout row = setupRow();
        playlistInput = input("M3U / M3U_PLUS playlist URL");
        row.addView(playlistInput, new LinearLayout.LayoutParams(0, dp(48), 1.25f));

        userAgentInput = input(DEFAULT_USER_AGENT);
        LinearLayout.LayoutParams uaParams = new LinearLayout.LayoutParams(0, dp(48), 0.8f);
        uaParams.setMargins(dp(10), 0, 0, 0);
        row.addView(userAgentInput, uaParams);

        Button loadButton = actionButton("LOAD");
        loadButton.setOnClickListener(v -> loadPlaylist(playlistInput.getText().toString().trim()));
        LinearLayout.LayoutParams loadParams = new LinearLayout.LayoutParams(dp(112), dp(48));
        loadParams.setMargins(dp(10), 0, 0, 0);
        row.addView(loadButton, loadParams);

        Button fileButton = actionButton("PICK M3U");
        fileButton.setOnClickListener(v -> openPlaylistFilePicker());
        LinearLayout.LayoutParams fileParams = new LinearLayout.LayoutParams(dp(132), dp(48));
        fileParams.setMargins(dp(10), 0, 0, 0);
        row.addView(fileButton, fileParams);

        setupFields.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)));

        LinearLayout epgRow = setupRow();
        epgInput = input("XMLTV EPG URL (normal guide only; XXX stays isolated)");
        epgRow.addView(epgInput, new LinearLayout.LayoutParams(0, dp(48), 1f));

        Button epgButton = actionButton("LOAD EPG");
        epgButton.setOnClickListener(v -> loadEpg(epgInput.getText().toString().trim()));
        LinearLayout.LayoutParams epgButtonParams = new LinearLayout.LayoutParams(dp(132), dp(48));
        epgButtonParams.setMargins(dp(10), 0, 0, 0);
        epgRow.addView(epgButton, epgButtonParams);

        Button playButton = actionButton("PLAY FIRST");
        playButton.setOnClickListener(v -> playFirstChannel());
        LinearLayout.LayoutParams playParams = new LinearLayout.LayoutParams(dp(132), dp(48));
        playParams.setMargins(dp(10), 0, 0, 0);
        epgRow.addView(playButton, playParams);

        LinearLayout.LayoutParams epgRowParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54));
        epgRowParams.setMargins(0, dp(6), 0, 0);
        setupFields.addView(epgRow, epgRowParams);
    }

    private void renderXtreamSetupFields() {
        LinearLayout row = setupRow();
        xtreamHostInput = input("Xtream host, e.g. http://line.example.com:8080");
        row.addView(xtreamHostInput, new LinearLayout.LayoutParams(0, dp(48), 1.25f));

        xtreamUserInput = input("Username");
        LinearLayout.LayoutParams userParams = new LinearLayout.LayoutParams(0, dp(48), 0.65f);
        userParams.setMargins(dp(10), 0, 0, 0);
        row.addView(xtreamUserInput, userParams);

        xtreamPasswordInput = input("Password");
        xtreamPasswordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        LinearLayout.LayoutParams passParams = new LinearLayout.LayoutParams(0, dp(48), 0.65f);
        passParams.setMargins(dp(10), 0, 0, 0);
        row.addView(xtreamPasswordInput, passParams);

        Button activateButton = actionButton("ACTIVATE");
        activateButton.setOnClickListener(v -> loadXtreamPortal());
        LinearLayout.LayoutParams activateParams = new LinearLayout.LayoutParams(dp(138), dp(48));
        activateParams.setMargins(dp(10), 0, 0, 0);
        row.addView(activateButton, activateParams);
        setupFields.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)));

        TextView hint = label("XTREAM builds both get.php M3U_PLUS and xmltv.php guide URLs locally, then uses the same native parser/player path.", 11, COLOR_MUTED, false);
        hint.setPadding(dp(12), 0, dp(12), 0);
        hint.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(12)));
        LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        hintParams.setMargins(0, dp(6), 0, 0);
        setupFields.addView(hint, hintParams);
    }

    private void renderStalkerSetupFields() {
        LinearLayout row = setupRow();
        stalkerHostInput = input("Stalker portal URL, e.g. http://portal.example.com/c/");
        row.addView(stalkerHostInput, new LinearLayout.LayoutParams(0, dp(48), 1.25f));

        stalkerMacInput = input("00:1A:79:00:11:22");
        stalkerMacInput.setText("00:1A:79:");
        LinearLayout.LayoutParams macParams = new LinearLayout.LayoutParams(0, dp(48), 0.72f);
        macParams.setMargins(dp(10), 0, 0, 0);
        row.addView(stalkerMacInput, macParams);

        Button activateButton = actionButton("SYNC PORTAL");
        activateButton.setOnClickListener(v -> loadStalkerPortal());
        LinearLayout.LayoutParams activateParams = new LinearLayout.LayoutParams(dp(148), dp(48));
        activateParams.setMargins(dp(10), 0, 0, 0);
        row.addView(activateButton, activateParams);
        setupFields.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)));

        TextView hint = label("STALKER attempts a direct MAG-style handshake and channel sync. Some providers block third-party clients or require portal-specific fields.", 11, COLOR_MUTED, false);
        hint.setPadding(dp(12), 0, dp(12), 0);
        hint.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(12)));
        LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        hintParams.setMargins(0, dp(6), 0, 0);
        setupFields.addView(hint, hintParams);
    }

    private void renderDemoSetupFields() {
        LinearLayout row = setupRow();
        TextView copy = label("Glow demo loads the same open live/VOD channels from the React app so Guide, VOD, DVR, and playback are usable immediately.", 12, COLOR_TEXT_SOFT, false);
        copy.setPadding(dp(12), 0, dp(12), 0);
        copy.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(12)));
        row.addView(copy, new LinearLayout.LayoutParams(0, dp(54), 1f));

        Button demoButton = actionButton("LAUNCH DEMO");
        demoButton.setOnClickListener(v -> loadDemoPlaylist());
        LinearLayout.LayoutParams demoParams = new LinearLayout.LayoutParams(dp(178), dp(54));
        demoParams.setMargins(dp(10), 0, 0, 0);
        row.addView(demoButton, demoParams);
        setupFields.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(60)));
    }

    private LinearLayout setupRow() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        return row;
    }

    private View createChannelPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(0, 0, 0, 0);
        panel.setBackgroundColor(COLOR_BLACK);

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(16), 0, dp(16), 0);
        header.setBackground(card(Color.argb(102, 0, 0, 0), COLOR_BORDER, 0));
        panel.addView(header, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(44)));

        sectionTitleText = label("CHANNEL SIGNAL", 11, COLOR_PRIMARY, true);
        header.addView(sectionTitleText, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));

        summaryText = label("NO PLAYLIST LOADED", 10, COLOR_MUTED, true);
        summaryText.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        header.addView(summaryText, new LinearLayout.LayoutParams(dp(420), LinearLayout.LayoutParams.MATCH_PARENT));

        HorizontalScrollView categoryScroll = new HorizontalScrollView(this);
        categoryScroll.setHorizontalScrollBarEnabled(false);
        categoryScroll.setBackground(card(Color.argb(102, 0, 0, 0), COLOR_BORDER, 0));
        categoryRow = new LinearLayout(this);
        categoryRow.setOrientation(LinearLayout.HORIZONTAL);
        categoryRow.setPadding(dp(16), 0, dp(16), 0);
        categoryScroll.addView(categoryRow);
        panel.addView(categoryScroll, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48)));

        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(false);
        channelList = new LinearLayout(this);
        channelList.setOrientation(LinearLayout.VERTICAL);
        scrollView.addView(channelList, new ScrollView.LayoutParams(ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.WRAP_CONTENT));
        panel.addView(scrollView, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        renderCurrentView();
        return panel;
    }

    private void openPlaylistFilePicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            startActivityForResult(intent, REQUEST_PLAYLIST_FILE);
        } catch (Exception error) {
            setStatus("FILE PICKER UNAVAILABLE", true);
        }
    }

    private void loadPlaylistFile(Uri uri) {
        if (uri == null) {
            setStatus("NO PLAYLIST FILE", true);
            return;
        }
        setStatus("READING LOCAL M3U", false);
        summaryText.setText("IMPORTING FILE");
        renderEmptyState("Reading local playlist file...");
        executor.execute(() -> {
            try {
                String m3u = readUriText(uri);
                List<Channel> parsed = parseM3u(m3u);
                if (parsed.isEmpty()) {
                    throw new IllegalStateException("No channels found in this M3U file.");
                }
                mainHandler.post(() -> {
                    try {
                        getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    } catch (Exception ignored) {
                    }
                    prefs.edit()
                        .putString("playlist_url", uri.toString())
                        .putString("playlist_source_type", "file")
                        .putString("user_agent", getUserAgent())
                        .apply();
                    applyImportedChannels(parsed, "LOCAL M3U IMPORTED", true);
                });
            } catch (Exception error) {
                mainHandler.post(() -> {
                    setStatus("M3U FILE FAILED", true);
                    renderEmptyState(error.getMessage() == null ? "Unable to read local playlist file." : error.getMessage());
                });
            }
        });
    }

    private String readUriText(Uri uri) throws IOException {
        InputStream stream = getContentResolver().openInputStream(uri);
        if (stream == null) {
            throw new IOException("Could not open selected playlist file.");
        }
        try (InputStream inputStream = stream; ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }
            return outputStream.toString(StandardCharsets.UTF_8.name());
        }
    }

    private void playFirstChannel() {
        Channel firstPlayable = firstPlayableChannel();
        if (firstPlayable != null) {
            playChannel(firstPlayable);
        } else {
            setStatus("NO PLAYABLE CHANNEL", true);
        }
    }

    private void loadXtreamPortal() {
        String host = textFromInput(xtreamHostInput).replaceAll("/+$", "");
        String username = textFromInput(xtreamUserInput);
        String password = xtreamPasswordInput == null ? "" : xtreamPasswordInput.getText().toString();
        if (host.isEmpty() || username.isEmpty() || password.isEmpty()) {
            setStatus("ENTER XTREAM HOST USER PASS", true);
            return;
        }
        String encodedUser = Uri.encode(username);
        String encodedPassword = Uri.encode(password);
        String playlistUrl = host + "/get.php?username=" + encodedUser + "&password=" + encodedPassword + "&output=m3u_plus";
        String epgUrl = host + "/xmltv.php?username=" + encodedUser + "&password=" + encodedPassword;
        prefs.edit()
            .putString("playlist_source_type", "xtream")
            .putString("xtream_host", host)
            .putString("xtream_user", username)
            .apply();
        setStatus("XTREAM LINK BUILT", false);
        loadPlaylist(playlistUrl);
        loadEpg(epgUrl);
    }

    private void loadStalkerPortal() {
        String portal = normalizeStalkerPortal(textFromInput(stalkerHostInput));
        String mac = textFromInput(stalkerMacInput).toUpperCase(Locale.US);
        if (portal.isEmpty() || mac.length() < 8) {
            setStatus("ENTER STALKER PORTAL MAC", true);
            return;
        }
        prefs.edit()
            .putString("playlist_source_type", "stalker")
            .putString("stalker_portal", portal)
            .putString("stalker_mac", mac)
            .putString("user_agent", USER_AGENT_STALKER)
            .apply();
        if (userAgentInput != null) {
            userAgentInput.setText(USER_AGENT_STALKER);
        }
        setStatus("STALKER HANDSHAKE", false);
        summaryText.setText("SYNCING PORTAL");
        renderEmptyState("Attempting direct MAG-style portal handshake...");
        executor.execute(() -> {
            try {
                List<Channel> parsed = fetchStalkerChannels(portal, mac);
                if (parsed.isEmpty()) {
                    throw new IllegalStateException("Portal returned no playable live channels.");
                }
                mainHandler.post(() -> applyImportedChannels(parsed, "STALKER PORTAL SYNCED", true));
            } catch (Exception error) {
                mainHandler.post(() -> {
                    setStatus("STALKER SYNC FAILED", true);
                    renderEmptyState(error.getMessage() == null ? "Stalker portal sync failed." : error.getMessage());
                });
            }
        });
    }

    private void loadDemoPlaylist() {
        List<Channel> demoChannels = new ArrayList<>();
        demoChannels.add(new Channel("Sintel Cinema Live", "Entertainment", "sintel.live", "https://upload.wikimedia.org/wikipedia/commons/e/e8/Sintel_logo.png", "https://test-streams.mux.dev/x36xhg/main.m3u8", ChannelType.LIVE, false, false, "Entertainment", 0, "An open CGI action-adventure fantasy broadcast from the Blender Foundation."));
        demoChannels.add(new Channel("Big Buck Bunny Interactive", "Kids & Animation", "bunny.live", "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_Buck_Bunny_Logo.png", "https://test-streams.mux.dev/pts_live/character_multi_sub.m3u8", ChannelType.LIVE, false, false, "Kids", 0, "Multi-layered high-definition broadcast of the beloved forest short film."));
        demoChannels.add(new Channel("Tears of Steel Sci-Fi Feed", "Science Fiction", "tears.live", "https://upload.wikimedia.org/wikipedia/commons/c/ca/Tears_of_steel_logo.png", "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8", ChannelType.LIVE, false, false, "Science Fiction", 0, "Futuristic dystopia broadcast set in Amsterdam with CGI VFX."));
        demoChannels.add(new Channel("BipBop Multirate Test Channel", "Technology & Feeds", "bipbop.live", "https://img.icons8.com/isometric/50/tv-server.png", "https://playertest.longtailvideo.com/adaptive/bipbop/bipbop_all.m3u8", ChannelType.LIVE, false, false, "Technology", 0, "Continuous adaptive bitrate test stream."));
        demoChannels.add(new Channel("NASA HD Public Broadcast", "Documentary & Science", "nasa.hd", "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg", "https://nasa-otv.akamaized.net/hls/live/2026135/NASA-OTV/master.m3u8", ChannelType.LIVE, false, false, "Documentary", 0, "Official public space and science broadcast."));
        demoChannels.add(new Channel("Sintel (Directors Cut)", "Fantasy Movies", "sintel.vod", "https://upload.wikimedia.org/wikipedia/commons/e/e8/Sintel_logo.png", "https://test-streams.mux.dev/x36xhg/main.m3u8", ChannelType.VOD, false, false, "Fantasy Movies", 2010, "A visually stunning tale of a lonely girl looking for her baby dragon."));
        demoChannels.add(new Channel("Tears of Steel (VFX Edition)", "Sci-Fi Movies", "tears.vod", "https://upload.wikimedia.org/wikipedia/commons/c/ca/Tears_of_steel_logo.png", "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8", ChannelType.VOD, false, false, "Sci-Fi Movies", 2012, "A crew reconstructs a memory to stop a giant robotic threat."));
        demoChannels.add(new Channel("Big Buck Bunny (UHD Special)", "Comedy & Family", "bunny.vod", "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_Buck_Bunny_Logo.png", "https://test-streams.mux.dev/pts_live/character_multi_sub.m3u8", ChannelType.VOD, false, false, "Comedy & Family", 2008, "A gentle rabbit sets clever traps for forest bullies."));
        demoChannels.add(new Channel("Cosmos Laundromat (First Cycle)", "Sci-Fi Movies", "cosmos.vod", "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg", "https://test-streams.mux.dev/x36xhg/main.m3u8", ChannelType.VOD, false, false, "Sci-Fi Movies", 2015, "An island encounter opens a strange cycle of alternate realities."));
        prefs.edit()
            .putString("playlist_source_type", "demo")
            .putString("playlist_url", "demo://glow-premium-demo-link")
            .putString("epg_url", "https://iptv-org.github.io/epg/guides/us.xml")
            .apply();
        applyImportedChannels(demoChannels, "DEMO BROADCAST READY", true);
    }

    private void applyImportedChannels(List<Channel> parsed, String status, boolean autoplay) {
        channels.clear();
        channels.addAll(parsed);
        saveChannelsCache();
        activeView = ViewMode.GUIDE;
        activeFilter = "All";
        renderCurrentView();
        setStatus(status, false);
        if (autoplay) {
            playFirstChannel();
        }
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

        setStatus("LOADING PLAYLIST", false);
        summaryText.setText("FETCHING PLAYLIST");
        renderEmptyState("Fetching channels from provider...");

        executor.execute(() -> {
            try {
                String m3u = fetchText(normalizedUrl, userAgent);
                List<Channel> parsed = parseM3u(m3u);
                if (parsed.isEmpty()) {
                    throw new IllegalStateException("No channels found in this IPTV playlist.");
                }
                mainHandler.post(() -> {
                    applyImportedChannels(parsed, "PLAYLIST LOADED", true);
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

    private void fetchSavedStalkerPortal(String portal, String mac) {
        setStatus("REFRESHING STALKER PORTAL", false);
        executor.execute(() -> {
            try {
                List<Channel> parsed = fetchStalkerChannels(portal, mac);
                if (parsed.isEmpty()) {
                    throw new IllegalStateException("Portal returned no playable live channels.");
                }
                mainHandler.post(() -> applyImportedChannels(parsed, "STALKER PORTAL SYNCED", true));
            } catch (Exception error) {
                mainHandler.post(() -> setStatus("STALKER REFRESH FAILED", true));
            }
        });
    }

    private String normalizeStalkerPortal(String portal) {
        String normalized = portal == null ? "" : portal.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (normalized.endsWith("/c")) {
            normalized = normalized.substring(0, normalized.length() - 2);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private List<Channel> fetchStalkerChannels(String portal, String mac) throws Exception {
        JSONObject handshake = fetchStalkerJson(portal, mac, "", "type=stb&action=handshake&token=&JsHttpRequest=1-xml");
        String token = extractStalkerToken(handshake);
        if (token.isEmpty()) {
            throw new IOException("Stalker handshake did not return an access token.");
        }

        try {
            fetchStalkerJson(portal, mac, token, "type=stb&action=get_profile&JsHttpRequest=1-xml");
        } catch (Exception ignored) {
        }

        JSONObject response = fetchStalkerJson(portal, mac, token, "type=itv&action=get_all_channels&JsHttpRequest=1-xml");
        JSONArray channelArray = findStalkerArray(response);
        if (channelArray == null) {
            throw new IOException("Stalker portal did not return a channel list.");
        }

        List<Channel> parsed = new ArrayList<>();
        for (int index = 0; index < channelArray.length() && parsed.size() < MAX_RENDERED_CHANNELS; index++) {
            JSONObject item = channelArray.optJSONObject(index);
            if (item == null) {
                continue;
            }
            String name = item.optString("name", item.optString("title", "Stalker Channel")).trim();
            String command = item.optString("cmd", item.optString("stream_url", "")).trim();
            String streamUrl = resolveStalkerStreamUrl(portal, mac, token, command);
            if (name.isEmpty() || streamUrl.isEmpty()) {
                continue;
            }
            String group = item.optString("tv_genre_title", item.optString("genre", item.optString("tv_genre_id", "Stalker Live")));
            String tvgId = item.optString("xmltv_id", item.optString("id", item.optString("number", "")));
            String logo = item.optString("logo", item.optString("icon", ""));
            parsed.add(classifyChannel(name, group, tvgId, logo, streamUrl));
        }
        return parsed;
    }

    private String resolveStalkerStreamUrl(String portal, String mac, String token, String command) {
        String direct = extractHttpFromStalkerCommand(command);
        if (!direct.isEmpty()) {
            return direct;
        }
        if (command == null || command.trim().isEmpty()) {
            return "";
        }
        try {
            JSONObject response = fetchStalkerJson(portal, mac, token, "type=itv&action=create_link&cmd=" + Uri.encode(command) + "&JsHttpRequest=1-xml");
            String linkedCommand = extractStalkerCommand(response);
            return extractHttpFromStalkerCommand(linkedCommand);
        } catch (Exception ignored) {
            return "";
        }
    }

    private JSONObject fetchStalkerJson(String portal, String mac, String token, String query) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(portal + "/portal.php?" + query).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(20000);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("User-Agent", USER_AGENT_STALKER);
        connection.setRequestProperty("Accept", "application/json,text/javascript,*/*");
        connection.setRequestProperty("X-User-Agent", "Model: MAG250; Link: Ethernet");
        connection.setRequestProperty("Cookie", "mac=" + mac + "; stb_lang=en; timezone=UTC");
        if (token != null && !token.isEmpty()) {
            connection.setRequestProperty("Authorization", "Bearer " + token);
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 400 ? connection.getInputStream() : connection.getErrorStream();
        if (stream == null) {
            connection.disconnect();
            throw new IOException("Stalker portal returned HTTP " + status);
        }
        try (InputStream inputStream = stream; ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }
            String body = outputStream.toString(StandardCharsets.UTF_8.name()).trim();
            if (status < 200 || status >= 400) {
                throw new IOException("Stalker portal returned HTTP " + status + ": " + body.substring(0, Math.min(body.length(), 140)));
            }
            int start = body.indexOf('{');
            int end = body.lastIndexOf('}');
            if (start < 0 || end <= start) {
                throw new IOException("Stalker portal returned non-JSON response.");
            }
            return new JSONObject(body.substring(start, end + 1));
        } finally {
            connection.disconnect();
        }
    }

    private String extractStalkerToken(JSONObject response) {
        JSONObject js = response.optJSONObject("js");
        if (js == null) {
            return "";
        }
        JSONObject data = js.optJSONObject("data");
        if (data != null) {
            String token = data.optString("token", "");
            if (!token.isEmpty()) {
                return token;
            }
        }
        return js.optString("token", "");
    }

    private JSONArray findStalkerArray(JSONObject response) {
        JSONObject js = response.optJSONObject("js");
        if (js == null) {
            return null;
        }
        JSONArray direct = js.optJSONArray("data");
        if (direct != null) {
            return direct;
        }
        JSONObject dataObject = js.optJSONObject("data");
        if (dataObject != null) {
            JSONArray nested = dataObject.optJSONArray("data");
            if (nested != null) {
                return nested;
            }
            JSONArray channels = dataObject.optJSONArray("channels");
            if (channels != null) {
                return channels;
            }
        }
        return js.optJSONArray("channels");
    }

    private String extractStalkerCommand(JSONObject response) {
        JSONObject js = response.optJSONObject("js");
        if (js == null) {
            return "";
        }
        JSONObject data = js.optJSONObject("data");
        if (data != null) {
            String command = data.optString("cmd", data.optString("stream_url", ""));
            if (!command.isEmpty()) {
                return command;
            }
        }
        return js.optString("cmd", js.optString("stream_url", ""));
    }

    private String extractHttpFromStalkerCommand(String command) {
        String normalized = command == null ? "" : command.trim().replace("\\/", "/");
        int httpIndex = normalized.indexOf("http://");
        int httpsIndex = normalized.indexOf("https://");
        int start = -1;
        if (httpIndex >= 0 && httpsIndex >= 0) {
            start = Math.min(httpIndex, httpsIndex);
        } else if (httpIndex >= 0) {
            start = httpIndex;
        } else if (httpsIndex >= 0) {
            start = httpsIndex;
        }
        if (start < 0) {
            return "";
        }
        String stream = normalized.substring(start).trim();
        int space = stream.indexOf(' ');
        if (space > 0) {
            stream = stream.substring(0, space);
        }
        return stream;
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
        for (TextView navButton : navButtons) {
            boolean active = navButton.getTag() == activeView;
            navButton.setTextColor(active ? COLOR_PRIMARY : COLOR_MUTED);
            navButton.setBackground(card(active ? COLOR_NAV_ACTIVE : Color.TRANSPARENT, active ? COLOR_BORDER_STRONG : Color.TRANSPARENT, dp(12)));
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
                if (!vodMatchesSearch(channel)) {
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

    private boolean vodMatchesSearch(Channel channel) {
        String query = vodSearchQuery == null ? "" : vodSearchQuery.trim().toLowerCase(Locale.US);
        if (query.isEmpty()) {
            return true;
        }
        return safeLower(channel.name).contains(query)
            || safeLower(channel.description).contains(query)
            || safeLower(channel.mediaCategory).contains(query)
            || safeLower(channel.group).contains(query);
    }

    private String safeLower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.US);
    }

    private void renderChannels(List<Channel> visibleChannels) {
        channelList.removeAllViews();

        if (activeView == ViewMode.VOD) {
            int renderCount = Math.min(visibleChannels.size(), MAX_RENDERED_CHANNELS);
            summaryText.setText("SHOWING " + renderCount + " OF " + visibleChannels.size() + " / TOTAL " + channels.size());
            renderVodCatalog(visibleChannels, renderCount);
            return;
        }

        if (visibleChannels.isEmpty()) {
            summaryText.setText("NO ITEMS FOUND");
            if (activeView == ViewMode.GUIDE) {
                renderEmptyState("No non-adult live channels found for this guide filter.");
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

    private void renderVodCatalog(List<Channel> visibleChannels, int renderCount) {
        addVodToolbar();
        if (visibleChannels.isEmpty()) {
            TextView empty = label("No VOD items match this search and category filter.", 14, COLOR_MUTED, false);
            empty.setGravity(Gravity.CENTER);
            empty.setPadding(dp(20), dp(30), dp(20), dp(30));
            empty.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(16)));
            LinearLayout.LayoutParams emptyParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(120));
            emptyParams.setMargins(dp(16), 0, dp(16), 0);
            channelList.addView(empty, emptyParams);
            return;
        }
        if (vodLayoutMode == VodLayoutMode.GRID) {
            renderVodGrid(visibleChannels, renderCount);
        } else if (vodLayoutMode == VodLayoutMode.SHELF) {
            renderVodShelves(visibleChannels, renderCount);
        } else {
            for (int index = 0; index < renderCount; index++) {
                channelList.addView(createMediaRow(visibleChannels.get(index)), mediaRowParams());
            }
        }
    }

    private void addVodToolbar() {
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(14), dp(8), dp(14), dp(8));
        toolbar.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(16)));

        vodSearchInput = input("Search movie title or metadata...");
        vodSearchInput.setText(vodSearchQuery);
        toolbar.addView(vodSearchInput, new LinearLayout.LayoutParams(0, dp(46), 1f));

        Button searchButton = actionButton("SEARCH");
        searchButton.setOnClickListener(v -> {
            vodSearchQuery = textFromInput(vodSearchInput);
            prefs.edit().putString("vod_search_query", vodSearchQuery).apply();
            renderCurrentView();
        });
        LinearLayout.LayoutParams searchParams = new LinearLayout.LayoutParams(dp(112), dp(46));
        searchParams.setMargins(dp(10), 0, 0, 0);
        toolbar.addView(searchButton, searchParams);

        Button clearButton = actionButton("CLEAR");
        clearButton.setOnClickListener(v -> {
            vodSearchQuery = "";
            prefs.edit().putString("vod_search_query", "").apply();
            renderCurrentView();
        });
        LinearLayout.LayoutParams clearParams = new LinearLayout.LayoutParams(dp(98), dp(46));
        clearParams.setMargins(dp(10), 0, 0, 0);
        toolbar.addView(clearButton, clearParams);

        addVodLayoutButton(toolbar, "GRID", VodLayoutMode.GRID);
        addVodLayoutButton(toolbar, "VOD-GUIDE", VodLayoutMode.EPG);
        addVodLayoutButton(toolbar, "SHELVES", VodLayoutMode.SHELF);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64));
        params.setMargins(dp(16), dp(10), dp(16), dp(10));
        channelList.addView(toolbar, params);
    }

    private void addVodLayoutButton(LinearLayout toolbar, String text, VodLayoutMode mode) {
        TextView button = label(text, 9, vodLayoutMode == mode ? COLOR_PRIMARY : COLOR_MUTED, true);
        button.setGravity(Gravity.CENTER);
        button.setFocusable(true);
        button.setClickable(true);
        button.setBackground(card(vodLayoutMode == mode ? COLOR_NAV_ACTIVE : Color.TRANSPARENT, vodLayoutMode == mode ? COLOR_BORDER_STRONG : COLOR_BORDER, dp(10)));
        button.setOnClickListener(v -> {
            vodLayoutMode = mode;
            prefs.edit().putString("vod_layout_mode", mode.name()).apply();
            renderCurrentView();
        });
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(108), dp(46));
        params.setMargins(dp(10), 0, 0, 0);
        toolbar.addView(button, params);
    }

    private void renderVodGrid(List<Channel> visibleChannels, int renderCount) {
        int index = 0;
        while (index < renderCount) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(dp(16), 0, dp(16), 0);
            for (int column = 0; column < 3 && index < renderCount; column++, index++) {
                View card = createVodCard(visibleChannels.get(index));
                LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(0, dp(132), 1f);
                if (column > 0) {
                    cardParams.setMargins(dp(12), 0, 0, 0);
                }
                row.addView(card, cardParams);
            }
            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(144));
            rowParams.setMargins(0, 0, 0, dp(10));
            channelList.addView(row, rowParams);
        }
    }

    private View createVodCard(Channel channel) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(14), dp(12), dp(14), dp(12));
        card.setFocusable(true);
        card.setClickable(true);
        applyFocusBackground(card, COLOR_PANEL_SOFT, Color.argb(65, 255, 62, 0), dp(16));
        card.setOnClickListener(v -> playChannel(channel));

        TextView badge = label(channel.series ? "SERIES" : "MOVIE", 9, COLOR_PRIMARY, true);
        card.addView(badge, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(20)));

        TextView title = label(channel.name, 14, COLOR_TEXT, false);
        title.setTypeface(styled(fontSans, Typeface.BOLD));
        title.setSingleLine(false);
        card.addView(title, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        String meta = channel.mediaCategory + (channel.releaseYear > 0 ? " / " + channel.releaseYear : "");
        TextView sub = label(meta, 10, COLOR_MUTED, true);
        card.addView(sub, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(22)));
        return card;
    }

    private void renderVodShelves(List<Channel> visibleChannels, int renderCount) {
        Map<String, List<Channel>> shelves = new LinkedHashMap<>();
        for (int index = 0; index < renderCount; index++) {
            Channel channel = visibleChannels.get(index);
            List<Channel> shelf = shelves.get(channel.mediaCategory);
            if (shelf == null) {
                shelf = new ArrayList<>();
                shelves.put(channel.mediaCategory, shelf);
            }
            shelf.add(channel);
        }

        for (Map.Entry<String, List<Channel>> entry : shelves.entrySet()) {
            TextView shelfTitle = label(entry.getKey().toUpperCase(Locale.US), 10, COLOR_PRIMARY, true);
            shelfTitle.setPadding(dp(16), dp(4), dp(16), 0);
            channelList.addView(shelfTitle, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(34)));

            HorizontalScrollView shelfScroll = new HorizontalScrollView(this);
            shelfScroll.setHorizontalScrollBarEnabled(false);
            LinearLayout shelfRow = new LinearLayout(this);
            shelfRow.setOrientation(LinearLayout.HORIZONTAL);
            shelfRow.setPadding(dp(16), 0, dp(16), 0);
            shelfScroll.addView(shelfRow);

            int count = Math.min(entry.getValue().size(), 16);
            for (int index = 0; index < count; index++) {
                View card = createVodCard(entry.getValue().get(index));
                LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(dp(260), dp(132));
                if (index > 0) {
                    cardParams.setMargins(dp(12), 0, 0, 0);
                }
                shelfRow.addView(card, cardParams);
            }
            LinearLayout.LayoutParams shelfParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(144));
            shelfParams.setMargins(0, 0, 0, dp(12));
            channelList.addView(shelfScroll, shelfParams);
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
        addGuideTimeHeader();
        List<Date> hours = guideHours();
        for (int index = 0; index < renderCount; index++) {
            Channel channel = visibleChannels.get(index);
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(0, 0, 0, 0);

            TextView channelCell = new TextView(this);
            channelCell.setText(channel.name + "\n" + channel.group);
            channelCell.setTextColor(COLOR_TEXT);
            channelCell.setTextSize(11);
            channelCell.setTypeface(styled(fontSans, Typeface.BOLD));
            channelCell.setGravity(Gravity.CENTER_VERTICAL | Gravity.LEFT);
            channelCell.setPadding(dp(14), 0, dp(12), 0);
            channelCell.setFocusable(true);
            channelCell.setClickable(true);
            channelCell.setSingleLine(false);
            applyFocusBackground(channelCell, COLOR_PANEL_SOFT, Color.argb(95, 255, 62, 0));
            channelCell.setOnClickListener(v -> playChannel(channel));
            row.addView(channelCell, new LinearLayout.LayoutParams(dp(192), dp(80)));

            HorizontalScrollView programScroll = new HorizontalScrollView(this);
            programScroll.setHorizontalScrollBarEnabled(false);
            LinearLayout programRow = new LinearLayout(this);
            programRow.setOrientation(LinearLayout.HORIZONTAL);
            programScroll.addView(programRow);

            for (Date hour : hours) {
                EpgProgram program = programForGuideHour(channel, hour);
                TextView programCell = new TextView(this);
                programCell.setText(program.title + "\n" + formatProgramTime(program));
                programCell.setTextColor(COLOR_TEXT);
                programCell.setTextSize(12);
                programCell.setTypeface(fontSans);
                programCell.setGravity(Gravity.CENTER_VERTICAL | Gravity.LEFT);
                programCell.setPadding(dp(14), 0, dp(14), 0);
                programCell.setFocusable(true);
                programCell.setSingleLine(false);
                applyFocusBackground(programCell, COLOR_PANEL, Color.argb(65, 255, 62, 0));
                programCell.setOnClickListener(v -> playChannel(channel));
                LinearLayout.LayoutParams programParams = new LinearLayout.LayoutParams(dp(300), dp(80));
                programRow.addView(programCell, programParams);
            }

            row.addView(programScroll, new LinearLayout.LayoutParams(0, dp(80), 1f));

            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(80));
            channelList.addView(row, rowParams);
        }
    }

    private void addGuideTimeHeader() {
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, 0));

        TextView channelHeader = label("CHANNEL SIGNAL", 10, COLOR_MUTED, true);
        channelHeader.setGravity(Gravity.CENTER);
        header.addView(channelHeader, new LinearLayout.LayoutParams(dp(192), dp(40)));

        HorizontalScrollView timeScroll = new HorizontalScrollView(this);
        timeScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout timeRow = new LinearLayout(this);
        timeRow.setOrientation(LinearLayout.HORIZONTAL);
        timeScroll.addView(timeRow);

        SimpleDateFormat formatter = new SimpleDateFormat("HH:mm", Locale.US);
        for (Date hour : guideHours()) {
            TextView time = label(formatter.format(hour), 9, Color.argb(76, 255, 255, 255), true);
            time.setGravity(Gravity.CENTER);
            timeRow.addView(time, new LinearLayout.LayoutParams(dp(300), dp(40)));
        }
        header.addView(timeScroll, new LinearLayout.LayoutParams(0, dp(40), 1f));
        channelList.addView(header, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(40)));
    }

    private List<Date> guideHours() {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        List<Date> hours = new ArrayList<>();
        for (int index = 0; index < 24; index++) {
            hours.add(calendar.getTime());
            calendar.add(Calendar.HOUR_OF_DAY, 1);
        }
        return hours;
    }

    private EpgProgram programForGuideHour(Channel channel, Date hourStart) {
        Date hourEnd = new Date(hourStart.getTime() + 60L * 60L * 1000L);
        EpgProgram selected = null;
        if (!channel.tvgId.isEmpty()) {
            List<EpgProgram> stored = epgByChannel.get(channel.tvgId);
            if (stored != null) {
                for (EpgProgram program : stored) {
                    if (program.start.before(hourEnd) && program.stop.after(hourStart)) {
                        selected = program;
                        break;
                    }
                }
            }
        }
        if (selected == null) {
            selected = new EpgProgram("Program Schedule Broadcast...", "Generated schedule placeholder", hourStart, hourEnd);
        }
        return maybeInjectGuideProgram(channel, selected, hourStart);
    }

    private EpgProgram maybeInjectGuideProgram(Channel channel, EpgProgram baseProgram, Date hourStart) {
        if (!prefs.getBoolean("epg_inject_enabled", true) || channel == null || channel.adult || libraryItems.isEmpty()) {
            return baseProgram;
        }
        if (!channelAllowedForInjection(channel)) {
            return baseProgram;
        }

        Calendar calendar = Calendar.getInstance();
        calendar.setTime(hourStart);
        int hour = calendar.get(Calendar.HOUR_OF_DAY);
        String mode = prefs.getString("epg_inject_mode", "algorithmic");
        if ("manual".equals(mode)) {
            String manualTitle = manualInjectionTitle(channel, hour);
            if (!manualTitle.isEmpty()) {
                return new EpgProgram(manualTitle, "Vault manual schedule insertion", baseProgram.start, baseProgram.stop);
            }
            return baseProgram;
        }

        int density = Math.max(0, Math.min(100, prefs.getInt("epg_inject_density", 30)));
        String hashInput = (channel.tvgId.isEmpty() ? channel.name : channel.tvgId) + "-" + hourStart.getTime();
        int hash = Math.abs(hashInput.hashCode());
        if (hash % 100 >= density) {
            return baseProgram;
        }
        LibraryItem chosen = libraryItems.get(hash % libraryItems.size());
        return new EpgProgram(chosen.displayTitle, "Vault auto-substitute selection", baseProgram.start, baseProgram.stop);
    }

    private boolean channelAllowedForInjection(Channel channel) {
        String allowed = prefs.getString("epg_inject_channels", "nasa.hd,bunny.live").trim().toLowerCase(Locale.US);
        if (allowed.isEmpty()) {
            return true;
        }
        String tvgId = channel.tvgId.toLowerCase(Locale.US);
        String name = channel.name.toLowerCase(Locale.US);
        for (String entry : allowed.split(",")) {
            String value = entry.trim();
            if (value.isEmpty()) {
                continue;
            }
            if (tvgId.equals(value) || name.contains(value) || value.contains(tvgId)) {
                return true;
            }
        }
        return false;
    }

    private String manualInjectionTitle(Channel channel, int hour) {
        String saved = prefs.getString("epg_inject_slots", "");
        if (saved.trim().isEmpty()) {
            return "";
        }
        String tvgId = channel.tvgId.toLowerCase(Locale.US);
        String name = channel.name.toLowerCase(Locale.US);
        for (String line : saved.split("\\n")) {
            String[] fields = line.split("\\t", -1);
            if (fields.length < 3) {
                continue;
            }
            String channelMatch = decodeCacheField(fields[0]).toLowerCase(Locale.US);
            int slotHour = parseIntSafe(fields[1]);
            if (slotHour == hour && (tvgId.equals(channelMatch) || name.contains(channelMatch) || channelMatch.contains(tvgId))) {
                return decodeCacheField(fields[2]);
            }
        }
        return "";
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
        categoryRow.removeAllViews();
        channelList.removeAllViews();

        List<LibraryItem> visible = filteredLibraryItems();
        summaryText.setText(libraryItems.isEmpty() ? "LOCAL SCANNER READY" : "SHOWING " + visible.size() + " OF " + libraryItems.size());

        renderLibrarySourceControls();
        renderLibraryTabsAndSearch();
        renderLibraryCorrectionControls();

        if (libraryTab == LibraryTab.SOURCES) {
            renderLibrarySourcesSummary();
            return;
        }

        if (libraryItems.isEmpty()) {
            TextView hint = label("Use Pick Folder for Android TV storage access, or Scan Path for readable mounted shares. The native classifier cleans titles, detects movies/TV episodes, groups genres locally, and keeps the database on device.", 13, COLOR_MUTED, false);
            hint.setGravity(Gravity.CENTER_VERTICAL);
            hint.setPadding(dp(18), 0, dp(18), 0);
            hint.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(16)));
            LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(104));
            hintParams.setMargins(dp(16), 0, dp(16), 0);
            channelList.addView(hint, hintParams);
            return;
        }

        if (visible.isEmpty()) {
            TextView empty = label("No library items match this tab and search query.", 14, COLOR_MUTED, false);
            empty.setGravity(Gravity.CENTER);
            empty.setPadding(dp(20), dp(30), dp(20), dp(30));
            empty.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(16)));
            LinearLayout.LayoutParams emptyParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(120));
            emptyParams.setMargins(dp(16), 0, dp(16), 0);
            channelList.addView(empty, emptyParams);
            return;
        }

        int renderCount = Math.min(visible.size(), MAX_RENDERED_CHANNELS);
        for (int index = 0; index < renderCount; index++) {
            channelList.addView(createLibraryItemRow(visible.get(index)), mediaRowParams());
        }
    }

    private void renderLibrarySourceControls() {
        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        controls.setGravity(Gravity.CENTER_VERTICAL);
        controls.setPadding(dp(16), 0, dp(16), dp(10));

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
    }

    private void renderLibraryTabsAndSearch() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(16), 0, dp(16), dp(10));

        addLibraryTabButton(row, "MOVIES", LibraryTab.MOVIES);
        addLibraryTabButton(row, "TV SHOWS", LibraryTab.SHOWS);
        addLibraryTabButton(row, "RECENT", LibraryTab.RECENT);
        addLibraryTabButton(row, "SOURCES", LibraryTab.SOURCES);
        addLibraryTabButton(row, "NEEDS REVIEW", LibraryTab.NEEDS_REVIEW);

        librarySearchInput = input("Search sorted library...");
        librarySearchInput.setText(librarySearchQuery);
        LinearLayout.LayoutParams searchParams = new LinearLayout.LayoutParams(0, dp(46), 1f);
        searchParams.setMargins(dp(12), 0, 0, 0);
        row.addView(librarySearchInput, searchParams);

        Button searchButton = actionButton("SEARCH");
        searchButton.setOnClickListener(v -> {
            librarySearchQuery = textFromInput(librarySearchInput);
            prefs.edit().putString("library_search_query", librarySearchQuery).apply();
            renderLibraryView();
        });
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(dp(112), dp(46));
        buttonParams.setMargins(dp(10), 0, 0, 0);
        row.addView(searchButton, buttonParams);

        channelList.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(62)));
    }

    private void addLibraryTabButton(LinearLayout row, String text, LibraryTab tab) {
        TextView button = label(text, 8, libraryTab == tab ? COLOR_PRIMARY : COLOR_MUTED, true);
        button.setGravity(Gravity.CENTER);
        button.setFocusable(true);
        button.setClickable(true);
        button.setBackground(card(libraryTab == tab ? COLOR_NAV_ACTIVE : Color.TRANSPARENT, libraryTab == tab ? COLOR_BORDER_STRONG : COLOR_BORDER, dp(10)));
        button.setOnClickListener(v -> {
            libraryTab = tab;
            prefs.edit().putString("library_tab", tab.name()).apply();
            renderLibraryView();
        });
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(tab == LibraryTab.NEEDS_REVIEW ? 126 : 104), dp(46));
        params.setMargins(0, 0, dp(8), 0);
        row.addView(button, params);
    }

    private void renderLibraryCorrectionControls() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(16), 0, dp(16), dp(10));

        libraryEditMatchInput = input("Item title/path contains");
        row.addView(libraryEditMatchInput, new LinearLayout.LayoutParams(0, dp(46), 0.9f));

        libraryEditTitleInput = input("Corrected title");
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, dp(46), 1f);
        titleParams.setMargins(dp(10), 0, 0, 0);
        row.addView(libraryEditTitleInput, titleParams);

        libraryEditGenreInput = input("Genre");
        LinearLayout.LayoutParams genreParams = new LinearLayout.LayoutParams(0, dp(46), 0.65f);
        genreParams.setMargins(dp(10), 0, 0, 0);
        row.addView(libraryEditGenreInput, genreParams);

        Button applyButton = actionButton("APPLY EDIT");
        applyButton.setOnClickListener(v -> applyLibraryCorrection());
        LinearLayout.LayoutParams applyParams = new LinearLayout.LayoutParams(dp(140), dp(46));
        applyParams.setMargins(dp(10), 0, 0, 0);
        row.addView(applyButton, applyParams);

        Button clearButton = actionButton("CLEAR DB");
        clearButton.setOnClickListener(v -> {
            libraryItems.clear();
            saveLibraryCache();
            renderLibraryView();
            setStatus("LIBRARY CLEARED", false);
        });
        LinearLayout.LayoutParams clearParams = new LinearLayout.LayoutParams(dp(118), dp(46));
        clearParams.setMargins(dp(10), 0, 0, 0);
        row.addView(clearButton, clearParams);

        channelList.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(62)));
    }

    private void renderLibrarySourcesSummary() {
        TextView summary = label("ACTIVE SOURCE / " + prefs.getString("library_path", "No manual path saved") + "\nSCANNED ITEMS / " + libraryItems.size() + " / SAF TREE / " + prefs.getString("library_tree_uri", "None"), 13, COLOR_TEXT_SOFT, false);
        summary.setGravity(Gravity.CENTER_VERTICAL | Gravity.LEFT);
        summary.setPadding(dp(18), 0, dp(18), 0);
        summary.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(16)));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(104));
        params.setMargins(dp(16), 0, dp(16), 0);
        channelList.addView(summary, params);
    }

    private List<LibraryItem> filteredLibraryItems() {
        List<LibraryItem> visible = new ArrayList<>();
        for (LibraryItem item : libraryItems) {
            if (!libraryMatchesTab(item) || !libraryMatchesSearch(item)) {
                continue;
            }
            visible.add(item);
        }
        if (libraryTab == LibraryTab.RECENT) {
            Collections.reverse(visible);
        }
        return visible;
    }

    private boolean libraryMatchesTab(LibraryItem item) {
        if (libraryTab == LibraryTab.MOVIES) {
            return item.mediaType.equalsIgnoreCase("MOVIE");
        }
        if (libraryTab == LibraryTab.SHOWS) {
            return item.mediaType.equalsIgnoreCase("TV");
        }
        if (libraryTab == LibraryTab.NEEDS_REVIEW) {
            return item.displayTitle.toLowerCase(Locale.US).contains("unknown") || item.genre.equalsIgnoreCase("General VOD");
        }
        return true;
    }

    private boolean libraryMatchesSearch(LibraryItem item) {
        String query = librarySearchQuery == null ? "" : librarySearchQuery.trim().toLowerCase(Locale.US);
        if (query.isEmpty()) {
            return true;
        }
        return item.displayTitle.toLowerCase(Locale.US).contains(query)
            || item.mediaType.toLowerCase(Locale.US).contains(query)
            || item.genre.toLowerCase(Locale.US).contains(query)
            || item.path.toLowerCase(Locale.US).contains(query);
    }

    private View createLibraryItemRow(LibraryItem item) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(14), dp(10), dp(14), dp(10));
        row.setFocusable(true);
        row.setClickable(true);
        applyFocusBackground(row, COLOR_PANEL_SOFT, Color.argb(95, 255, 62, 0));
        row.setOnClickListener(v -> playLibraryItem(item));

        TextView badge = label(item.mediaType, 10, COLOR_PRIMARY, true);
        badge.setGravity(Gravity.CENTER);
        badge.setBackground(card(Color.argb(110, 0, 0, 0), COLOR_PRIMARY, dp(14)));
        row.addView(badge, new LinearLayout.LayoutParams(dp(64), dp(48)));

        LinearLayout textBlock = new LinearLayout(this);
        textBlock.setOrientation(LinearLayout.VERTICAL);
        textBlock.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        textParams.setMargins(dp(14), 0, dp(14), 0);
        row.addView(textBlock, textParams);

        TextView title = label(item.displayTitle, 15, COLOR_TEXT, false);
        title.setTypeface(styled(fontSans, Typeface.BOLD));
        textBlock.addView(title, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(28)));

        TextView sub = label(item.genre + " / " + item.path, 11, COLOR_MUTED, true);
        textBlock.addView(sub, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(22)));

        TextView edit = label("EDIT", 10, COLOR_MUTED, true);
        edit.setGravity(Gravity.CENTER);
        edit.setFocusable(true);
        edit.setClickable(true);
        applyFocusBackground(edit, Color.argb(24, 255, 255, 255), COLOR_NAV_ACTIVE, dp(12));
        edit.setOnClickListener(v -> seedLibraryEditFields(item));
        row.addView(edit, new LinearLayout.LayoutParams(dp(96), dp(46)));
        return row;
    }

    private void seedLibraryEditFields(LibraryItem item) {
        if (libraryEditMatchInput != null) {
            libraryEditMatchInput.setText(item.displayTitle);
        }
        if (libraryEditTitleInput != null) {
            libraryEditTitleInput.setText(item.displayTitle);
        }
        if (libraryEditGenreInput != null) {
            libraryEditGenreInput.setText(item.genre);
        }
        setStatus("LIBRARY EDIT TARGET SET", false);
    }

    private void applyLibraryCorrection() {
        String match = textFromInput(libraryEditMatchInput).toLowerCase(Locale.US);
        String title = textFromInput(libraryEditTitleInput);
        String genre = textFromInput(libraryEditGenreInput);
        if (match.isEmpty() || (title.isEmpty() && genre.isEmpty())) {
            setStatus("ENTER LIBRARY EDIT VALUES", true);
            return;
        }
        for (int index = 0; index < libraryItems.size(); index++) {
            LibraryItem item = libraryItems.get(index);
            if (item.displayTitle.toLowerCase(Locale.US).contains(match) || item.path.toLowerCase(Locale.US).contains(match)) {
                libraryItems.set(index, new LibraryItem(title.isEmpty() ? item.displayTitle : title, item.mediaType, genre.isEmpty() ? item.genre : genre, item.path));
                saveLibraryCache();
                renderLibraryView();
                setStatus("LIBRARY METADATA UPDATED", false);
                return;
            }
        }
        setStatus("LIBRARY ITEM NOT FOUND", true);
    }

    private void playLibraryItem(LibraryItem item) {
        Channel channel = new Channel(item.displayTitle, item.genre, "", "", item.path, ChannelType.VOD, false, item.mediaType.equalsIgnoreCase("TV"), item.genre, 0, item.path);
        playChannel(channel);
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

        renderSettingsSignalSection();
        renderSettingsThemeSection();
        renderSettingsFeatureToggles();
        renderSettingsVirtualBroadcaster();
        renderSettingsTrialSection();
        renderSettingsBackupSection();
        renderSettingsDangerSection();
        addSettingsRow("Playback", "Direct-play only with Android Media3 / ExoPlayer. Unsupported codecs show a clean failure without requiring a PC server.");
        addSettingsRow("Adult Handling", "XXX and adult groups are isolated from the normal live guide and VOD catalog.");
    }

    private void renderSettingsSignalSection() {
        addSettingsSectionHeader("SIGNAL / GATEWAY");
        LinearLayout uaRow = settingsRow();
        settingsUserAgentInput = input("Custom User-Agent");
        settingsUserAgentInput.setText(prefs.getString("user_agent", DEFAULT_USER_AGENT));
        uaRow.addView(settingsUserAgentInput, new LinearLayout.LayoutParams(0, dp(50), 1f));
        addSettingsButton(uaRow, "SAVE UA", dp(118), v -> saveSettingsUserAgent());
        addSettingsButton(uaRow, "VLC", dp(84), v -> setSettingsUserAgentPreset(DEFAULT_USER_AGENT));
        addSettingsButton(uaRow, "TIVIMATE", dp(118), v -> setSettingsUserAgentPreset(USER_AGENT_TIVIMATE));
        addSettingsButton(uaRow, "SMARTERS", dp(118), v -> setSettingsUserAgentPreset(USER_AGENT_SMARTERS));
        channelList.addView(uaRow, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));

        LinearLayout epgRow = settingsRow();
        settingsEpgUrlInput = input("XMLTV EPG URL");
        settingsEpgUrlInput.setText(prefs.getString("epg_url", ""));
        epgRow.addView(settingsEpgUrlInput, new LinearLayout.LayoutParams(0, dp(50), 1f));
        addSettingsButton(epgRow, "SYNC EPG", dp(132), v -> syncSettingsEpg());
        settingsBackendInput = input("Optional backend origin");
        settingsBackendInput.setText(prefs.getString("server_url", ""));
        LinearLayout.LayoutParams backendParams = new LinearLayout.LayoutParams(0, dp(50), 0.8f);
        backendParams.setMargins(dp(10), 0, 0, 0);
        epgRow.addView(settingsBackendInput, backendParams);
        addSettingsButton(epgRow, "SAVE SERVER", dp(150), v -> saveSettingsBackend());
        channelList.addView(epgRow, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));
    }

    private void renderSettingsThemeSection() {
        addSettingsSectionHeader("THEME / LANGUAGE");
        LinearLayout row = settingsRow();
        addSettingsButton(row, "AFTERGLOW", dp(132), v -> setThemePreference("afterglow-original"));
        addSettingsButton(row, "VAPOR", dp(104), v -> setThemePreference("vaporwave-dark"));
        addSettingsButton(row, "SYNTH", dp(104), v -> setThemePreference("synthwave-dark"));
        addSettingsButton(row, "MONO", dp(96), v -> setThemePreference("monochrome-dark"));
        addSettingsButton(row, "PHOENIX", dp(116), v -> setThemePreference("phoenix-dark"));
        addSettingsButton(row, "LIGHT", dp(104), v -> setThemePreference("vaporwave-light"));
        addSettingsButton(row, "EN", dp(70), v -> setLanguagePreference("en"));
        addSettingsButton(row, "ES", dp(70), v -> setLanguagePreference("es"));
        addSettingsButton(row, "FR", dp(70), v -> setLanguagePreference("fr"));
        channelList.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));
    }

    private void renderSettingsFeatureToggles() {
        addSettingsSectionHeader("MEDIA FEATURES");
        LinearLayout row = settingsRow();
        addToggleButton(row, "TITLE CLEAN", "title_cleaning_enabled", true, dp(142));
        addToggleButton(row, "MARQUEE", "marquee_enabled", true, dp(118));
        addToggleButton(row, "BG ENRICH", "background_enrichment_enabled", false, dp(136));
        addToggleButton(row, "VAULT SUB", "vault_substitution_enabled", true, dp(132));
        addSettingsButton(row, "VOD GRID", dp(116), v -> setVodLayoutPreference(VodLayoutMode.GRID));
        addSettingsButton(row, "VOD GUIDE", dp(126), v -> setVodLayoutPreference(VodLayoutMode.EPG));
        addSettingsButton(row, "VOD SHELF", dp(126), v -> setVodLayoutPreference(VodLayoutMode.SHELF));
        channelList.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));
    }

    private void renderSettingsVirtualBroadcaster() {
        addSettingsSectionHeader("EPG VAULT INJECTOR / VIRTUAL BROADCASTER");
        LinearLayout configRow = settingsRow();
        addToggleButton(configRow, "ENABLED", "epg_inject_enabled", true, dp(120));
        addSettingsButton(configRow, prefs.getString("epg_inject_mode", "algorithmic").equals("manual") ? "MODE MANUAL" : "MODE AUTO", dp(148), v -> toggleEpgInjectMode());
        settingsEpgInjectChannelsInput = input("Allowed tvg-id/channel names, comma separated");
        settingsEpgInjectChannelsInput.setText(prefs.getString("epg_inject_channels", "nasa.hd,bunny.live"));
        LinearLayout.LayoutParams channelsParams = new LinearLayout.LayoutParams(0, dp(50), 1f);
        channelsParams.setMargins(dp(10), 0, 0, 0);
        configRow.addView(settingsEpgInjectChannelsInput, channelsParams);
        settingsEpgInjectDensityInput = input("Density %");
        settingsEpgInjectDensityInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        settingsEpgInjectDensityInput.setText(String.valueOf(prefs.getInt("epg_inject_density", 30)));
        LinearLayout.LayoutParams densityParams = new LinearLayout.LayoutParams(dp(116), dp(50));
        densityParams.setMargins(dp(10), 0, 0, 0);
        configRow.addView(settingsEpgInjectDensityInput, densityParams);
        addSettingsButton(configRow, "SAVE", dp(96), v -> saveEpgInjectorSettings());
        channelList.addView(configRow, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));

        LinearLayout slotRow = settingsRow();
        settingsEpgInjectSlotChannelInput = input("Manual slot tvg-id/channel");
        slotRow.addView(settingsEpgInjectSlotChannelInput, new LinearLayout.LayoutParams(0, dp(50), 0.9f));
        settingsEpgInjectSlotHourInput = input("Hour 0-23");
        settingsEpgInjectSlotHourInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        LinearLayout.LayoutParams hourParams = new LinearLayout.LayoutParams(dp(116), dp(50));
        hourParams.setMargins(dp(10), 0, 0, 0);
        slotRow.addView(settingsEpgInjectSlotHourInput, hourParams);
        settingsEpgInjectSlotTitleInput = input("Injected media title");
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, dp(50), 1f);
        titleParams.setMargins(dp(10), 0, 0, 0);
        slotRow.addView(settingsEpgInjectSlotTitleInput, titleParams);
        addSettingsButton(slotRow, "ADD SLOT", dp(126), v -> addEpgInjectSlot());
        addSettingsButton(slotRow, "CLEAR SLOTS", dp(142), v -> clearEpgInjectSlots());
        channelList.addView(slotRow, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));
    }

    private void renderSettingsTrialSection() {
        addSettingsSectionHeader("LICENSE / TRIAL");
        LinearLayout row = settingsRow();
        TextView status = label(settingsTrialStatus(), 12, COLOR_TEXT_SOFT, false);
        status.setPadding(dp(14), 0, dp(14), 0);
        status.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(12)));
        row.addView(status, new LinearLayout.LayoutParams(0, dp(50), 1f));
        addSettingsButton(row, "ACTIVATE", dp(120), v -> {
            prefs.edit().putBoolean("is_premium", true).apply();
            renderSettingsView();
            setStatus("PREMIUM ACTIVE", false);
        });
        addSettingsButton(row, "RESET TRIAL", dp(148), v -> {
            prefs.edit()
                .putBoolean("is_premium", false)
                .putLong("trial_start_ms", System.currentTimeMillis())
                .apply();
            renderSettingsView();
            setStatus("TRIAL RESET", false);
        });
        channelList.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));
    }

    private void renderSettingsBackupSection() {
        addSettingsSectionHeader("BACKUP / RESTORE");
        LinearLayout row = settingsRow();
        settingsBackupPathInput = input("Backup JSON path");
        settingsBackupPathInput.setText(defaultBackupPath().getAbsolutePath());
        row.addView(settingsBackupPathInput, new LinearLayout.LayoutParams(0, dp(50), 1f));
        addSettingsButton(row, "EXPORT", dp(112), v -> exportSettingsBackup());
        addSettingsButton(row, "IMPORT", dp(112), v -> importSettingsBackup());
        channelList.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));
    }

    private void renderSettingsDangerSection() {
        addSettingsSectionHeader("DATA RESET");
        LinearLayout row = settingsRow();
        TextView warning = label("Clear playlists, EPG cache, library cache, DVR queues, recordings list, settings, and local prefs.", 12, COLOR_MUTED, false);
        warning.setPadding(dp(14), 0, dp(14), 0);
        warning.setBackground(card(COLOR_PANEL_SOFT, COLOR_BORDER, dp(12)));
        row.addView(warning, new LinearLayout.LayoutParams(0, dp(50), 1f));
        addSettingsButton(row, "RESET ALL", dp(142), v -> resetAllNativeData());
        channelList.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));
    }

    private LinearLayout settingsRow() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(16), 0, dp(16), dp(10));
        return row;
    }

    private void addSettingsSectionHeader(String text) {
        TextView header = label(text, 10, COLOR_PRIMARY, true);
        header.setPadding(dp(16), dp(10), dp(16), 0);
        channelList.addView(header, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(38)));
    }

    private void addSettingsButton(LinearLayout row, String text, int width, View.OnClickListener listener) {
        Button button = actionButton(text);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(width, dp(50));
        params.setMargins(dp(10), 0, 0, 0);
        row.addView(button, params);
    }

    private void addToggleButton(LinearLayout row, String label, String key, boolean defaultValue, int width) {
        boolean enabled = prefs.getBoolean(key, defaultValue);
        Button button = actionButton(label + " " + (enabled ? "ON" : "OFF"));
        button.setTextColor(enabled ? Color.WHITE : COLOR_MUTED);
        button.setOnClickListener(v -> {
            prefs.edit().putBoolean(key, !prefs.getBoolean(key, defaultValue)).apply();
            renderSettingsView();
            setStatus(label + " " + (prefs.getBoolean(key, defaultValue) ? "ON" : "OFF"), false);
        });
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(width, dp(50));
        params.setMargins(dp(10), 0, 0, 0);
        row.addView(button, params);
    }

    private void saveSettingsUserAgent() {
        String value = textFromInput(settingsUserAgentInput);
        if (value.isEmpty()) {
            value = DEFAULT_USER_AGENT;
        }
        prefs.edit().putString("user_agent", value).apply();
        if (userAgentInput != null) {
            userAgentInput.setText(value);
        }
        setStatus("USER AGENT SAVED", false);
    }

    private void setSettingsUserAgentPreset(String value) {
        if (settingsUserAgentInput != null) {
            settingsUserAgentInput.setText(value);
        }
        prefs.edit().putString("user_agent", value).apply();
        if (userAgentInput != null) {
            userAgentInput.setText(value);
        }
        setStatus("USER AGENT PRESET SAVED", false);
    }

    private void syncSettingsEpg() {
        String value = textFromInput(settingsEpgUrlInput);
        if (epgInput != null) {
            epgInput.setText(value);
        }
        loadEpg(value);
    }

    private void saveSettingsBackend() {
        prefs.edit().putString("server_url", textFromInput(settingsBackendInput)).apply();
        setStatus("BACKEND GATEWAY SAVED", false);
    }

    private void setThemePreference(String themeId) {
        prefs.edit().putString("active_theme_id", themeId).apply();
        applyNativeTheme(themeId);
        setStatus("THEME SAVED", false);
        recreate();
    }

    private void setLanguagePreference(String language) {
        prefs.edit().putString("language", language).apply();
        setStatus("LANGUAGE " + language.toUpperCase(Locale.US) + " SAVED", false);
    }

    private void setVodLayoutPreference(VodLayoutMode mode) {
        vodLayoutMode = mode;
        prefs.edit().putString("vod_layout_mode", mode.name()).apply();
        setStatus("VOD LAYOUT " + mode.name(), false);
    }

    private void toggleEpgInjectMode() {
        String current = prefs.getString("epg_inject_mode", "algorithmic");
        String next = current.equals("manual") ? "algorithmic" : "manual";
        prefs.edit().putString("epg_inject_mode", next).apply();
        renderSettingsView();
        setStatus("EPG INJECT MODE " + next.toUpperCase(Locale.US), false);
    }

    private void saveEpgInjectorSettings() {
        int density = Math.max(0, Math.min(100, parseIntSafe(textFromInput(settingsEpgInjectDensityInput))));
        prefs.edit()
            .putString("epg_inject_channels", textFromInput(settingsEpgInjectChannelsInput))
            .putInt("epg_inject_density", density)
            .apply();
        setStatus("EPG INJECTOR SAVED", false);
    }

    private void addEpgInjectSlot() {
        String channel = textFromInput(settingsEpgInjectSlotChannelInput);
        int hour = Math.max(0, Math.min(23, parseIntSafe(textFromInput(settingsEpgInjectSlotHourInput))));
        String title = textFromInput(settingsEpgInjectSlotTitleInput);
        if (channel.isEmpty() || title.isEmpty()) {
            setStatus("ENTER SLOT CHANNEL AND TITLE", true);
            return;
        }
        String saved = prefs.getString("epg_inject_slots", "");
        String line = encodeCacheField(channel) + "\t" + hour + "\t" + encodeCacheField(title);
        prefs.edit().putString("epg_inject_slots", saved.isEmpty() ? line : saved + "\n" + line).apply();
        setStatus("EPG SLOT ADDED", false);
    }

    private void clearEpgInjectSlots() {
        prefs.edit().putString("epg_inject_slots", "").apply();
        setStatus("EPG SLOTS CLEARED", false);
    }

    private String settingsTrialStatus() {
        if (prefs.getBoolean("is_premium", false)) {
            return "PREMIUM ACTIVE / AFTERGLOW LICENSE ENABLED";
        }
        long start = prefs.getLong("trial_start_ms", System.currentTimeMillis());
        long elapsedDays = Math.max(0L, (System.currentTimeMillis() - start) / (24L * 60L * 60L * 1000L));
        long remaining = Math.max(0L, 15L - elapsedDays);
        return "TRIAL ACTIVE / " + remaining + " DAYS REMAINING";
    }

    private File defaultBackupPath() {
        File docs = getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
        File root = docs == null ? getFilesDir() : docs;
        return new File(root, "afterglow-tv-backup.json");
    }

    private void exportSettingsBackup() {
        try {
            File target = new File(textFromInput(settingsBackupPathInput));
            File parent = target.getParentFile();
            if (parent != null && !parent.exists() && !parent.mkdirs()) {
                throw new IOException("Could not create backup folder.");
            }
            JSONObject backup = new JSONObject();
            JSONObject prefJson = new JSONObject();
            for (Map.Entry<String, ?> entry : prefs.getAll().entrySet()) {
                Object value = entry.getValue();
                if (value instanceof Boolean || value instanceof Number || value instanceof String) {
                    prefJson.put(entry.getKey(), value);
                }
            }
            backup.put("version", 1);
            backup.put("timestamp", new Date().toString());
            backup.put("prefs", prefJson);
            backup.put("channels", readInternalFile(CHANNEL_CACHE_FILE));
            backup.put("library", readInternalFile(LIBRARY_CACHE_FILE));
            backup.put("epg", readInternalFile(EPG_CACHE_FILE));
            backup.put("dvrRecordings", readInternalFile(DVR_RECORDINGS_CACHE_FILE));
            writeTextFile(target, backup.toString(2));
            setStatus("BACKUP EXPORTED", false);
        } catch (Exception error) {
            setStatus("BACKUP EXPORT FAILED", true);
        }
    }

    private void importSettingsBackup() {
        try {
            File source = new File(textFromInput(settingsBackupPathInput));
            JSONObject backup = new JSONObject(readTextFile(source));
            JSONObject prefJson = backup.optJSONObject("prefs");
            SharedPreferences.Editor editor = prefs.edit().clear();
            if (prefJson != null) {
                JSONArray names = prefJson.names();
                if (names != null) {
                    for (int index = 0; index < names.length(); index++) {
                        String key = names.getString(index);
                        Object value = prefJson.get(key);
                        if (value instanceof Boolean) {
                            editor.putBoolean(key, (Boolean) value);
                        } else if (value instanceof Integer) {
                            editor.putInt(key, (Integer) value);
                        } else if (value instanceof Long) {
                            editor.putLong(key, (Long) value);
                        } else if (value instanceof Number) {
                            editor.putLong(key, ((Number) value).longValue());
                        } else {
                            editor.putString(key, String.valueOf(value));
                        }
                    }
                }
            }
            editor.apply();
            writeInternalFile(CHANNEL_CACHE_FILE, backup.optString("channels", ""));
            writeInternalFile(LIBRARY_CACHE_FILE, backup.optString("library", ""));
            writeInternalFile(EPG_CACHE_FILE, backup.optString("epg", ""));
            writeInternalFile(DVR_RECORDINGS_CACHE_FILE, backup.optString("dvrRecordings", ""));
            loadCachedChannels();
            loadCachedLibrary();
            loadCachedEpg();
            loadDvrSchedule();
            loadDvrRecordings();
            applyNativeTheme(prefs.getString("active_theme_id", "afterglow-original"));
            setStatus("BACKUP IMPORTED", false);
            recreate();
        } catch (Exception error) {
            setStatus("BACKUP IMPORT FAILED", true);
        }
    }

    private String readInternalFile(String fileName) {
        return readTextFile(new File(getFilesDir(), fileName));
    }

    private void writeInternalFile(String fileName, String text) throws IOException {
        writeTextFile(new File(getFilesDir(), fileName), text == null ? "" : text);
    }

    private String readTextFile(File file) {
        if (file == null || !file.exists()) {
            return "";
        }
        try (InputStream input = new java.io.FileInputStream(file); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        } catch (Exception ignored) {
            return "";
        }
    }

    private void writeTextFile(File file, String text) throws IOException {
        try (OutputStreamWriter writer = new OutputStreamWriter(new FileOutputStream(file), StandardCharsets.UTF_8)) {
            writer.write(text == null ? "" : text);
        }
    }

    private void resetAllNativeData() {
        prefs.edit().clear().apply();
        deleteInternalFile(CHANNEL_CACHE_FILE);
        deleteInternalFile(LIBRARY_CACHE_FILE);
        deleteInternalFile(EPG_CACHE_FILE);
        deleteInternalFile(DVR_RECORDINGS_CACHE_FILE);
        channels.clear();
        libraryItems.clear();
        epgByChannel.clear();
        scheduledRecordings.clear();
        activeRecordingKeys.clear();
        dvrJobs.clear();
        dvrRecordings.clear();
        setStatus("ALL DATA RESET", false);
        recreate();
    }

    private void deleteInternalFile(String fileName) {
        try {
            new File(getFilesDir(), fileName).delete();
        } catch (Exception ignored) {
        }
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
        renderDvrManualScheduler();
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

    private void renderDvrManualScheduler() {
        addDvrSectionHeader("BOOK LIVE CAPTURE");
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(0, 0, 0, dp(10));

        dvrManualChannelInput = input("Channel name or #");
        row.addView(dvrManualChannelInput, new LinearLayout.LayoutParams(0, dp(54), 0.95f));

        dvrManualTitleInput = input("Recording segment name");
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, dp(54), 1.25f);
        titleParams.setMargins(dp(10), 0, 0, 0);
        row.addView(dvrManualTitleInput, titleParams);

        dvrManualStartInput = input("Starts in min");
        dvrManualStartInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        dvrManualStartInput.setText("1");
        LinearLayout.LayoutParams startParams = new LinearLayout.LayoutParams(dp(132), dp(54));
        startParams.setMargins(dp(10), 0, 0, 0);
        row.addView(dvrManualStartInput, startParams);

        dvrManualDurationInput = input("Duration min");
        dvrManualDurationInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        dvrManualDurationInput.setText("30");
        LinearLayout.LayoutParams durationParams = new LinearLayout.LayoutParams(dp(132), dp(54));
        durationParams.setMargins(dp(10), 0, 0, 0);
        row.addView(dvrManualDurationInput, durationParams);

        Button scheduleButton = actionButton("SCHEDULE");
        scheduleButton.setOnClickListener(v -> scheduleManualDvrRecording());
        LinearLayout.LayoutParams scheduleParams = new LinearLayout.LayoutParams(dp(138), dp(54));
        scheduleParams.setMargins(dp(10), 0, 0, 0);
        row.addView(scheduleButton, scheduleParams);

        channelList.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(68)));
    }

    private void scheduleManualDvrRecording() {
        Channel channel = findDvrManualChannel(textFromInput(dvrManualChannelInput));
        if (channel == null) {
            setStatus("DVR CHANNEL NOT FOUND", true);
            return;
        }
        long startDelayMinutes = Math.max(1L, parseLongSafe(textFromInput(dvrManualStartInput)));
        long durationMinutes = Math.max(1L, parseLongSafe(textFromInput(dvrManualDurationInput)));
        long startMillis = System.currentTimeMillis() + startDelayMinutes * 60L * 1000L;
        long stopMillis = startMillis + durationMinutes * 60L * 1000L;
        String title = textFromInput(dvrManualTitleInput);
        if (title.isEmpty()) {
            title = channel.name + " - Recorded Schedule";
        }
        DvrJob job = new DvrJob(
            "manual|" + channel.url + "|" + startMillis + "|" + stopMillis,
            title,
            channel.name,
            channel.url,
            startMillis,
            stopMillis,
            getDvrTargetMode(),
            getDvrTargetLocation(),
            getDvrTargetLabel(),
            "QUEUED"
        );
        scheduledRecordings.add(job.key);
        dvrJobs.put(job.key, job);
        saveDvrSchedule();
        evaluateDvrSchedule(false);
        setStatus("DVR CAPTURE SCHEDULED", false);
        renderDvrView();
    }

    private Channel findDvrManualChannel(String value) {
        List<Channel> live = new ArrayList<>();
        for (Channel channel : channels) {
            if (!channel.adult && channel.type == ChannelType.LIVE) {
                live.add(channel);
            }
        }
        if (live.isEmpty()) {
            return null;
        }
        String query = value == null ? "" : value.trim().toLowerCase(Locale.US);
        if (query.isEmpty()) {
            return live.get(0);
        }
        try {
            int index = Integer.parseInt(query);
            if (index > 0 && index <= live.size()) {
                return live.get(index - 1);
            }
        } catch (Exception ignored) {
        }
        for (Channel channel : live) {
            if (channel.name.toLowerCase(Locale.US).contains(query) || channel.group.toLowerCase(Locale.US).contains(query)) {
                return channel;
            }
        }
        return null;
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
        row.addView(action, new LinearLayout.LayoutParams(dp(96), dp(46)));

        TextView delete = label("DELETE", 10, COLOR_PINK, true);
        delete.setGravity(Gravity.CENTER);
        delete.setFocusable(true);
        delete.setClickable(true);
        applyFocusBackground(delete, Color.argb(35, 255, 78, 136), Color.argb(90, 255, 78, 136), dp(12));
        delete.setOnClickListener(v -> deleteDvrRecording(recording));
        LinearLayout.LayoutParams deleteParams = new LinearLayout.LayoutParams(dp(106), dp(46));
        deleteParams.setMargins(dp(10), 0, 0, 0);
        row.addView(delete, deleteParams);
        return row;
    }

    private void deleteDvrRecording(DvrRecording recording) {
        dvrRecordings.remove(recording);
        saveDvrRecordings();
        renderDvrView();
        setStatus("DVR RECORDING REMOVED", false);
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
        Intent recordIntent = new Intent(this, DvrRecordingService.class)
            .setAction(DvrRecordingService.ACTION_RECORD)
            .putExtra(DvrRecordingService.EXTRA_KEY, job.key)
            .putExtra(DvrRecordingService.EXTRA_TITLE, job.title)
            .putExtra(DvrRecordingService.EXTRA_CHANNEL_NAME, job.channelName)
            .putExtra(DvrRecordingService.EXTRA_STREAM_URL, job.streamUrl)
            .putExtra(DvrRecordingService.EXTRA_START_MILLIS, job.startMillis)
            .putExtra(DvrRecordingService.EXTRA_STOP_MILLIS, job.stopMillis)
            .putExtra(DvrRecordingService.EXTRA_TARGET_MODE, job.targetMode)
            .putExtra(DvrRecordingService.EXTRA_TARGET_LOCATION, job.targetLocation)
            .putExtra(DvrRecordingService.EXTRA_TARGET_LABEL, job.targetLabel)
            .putExtra(DvrRecordingService.EXTRA_USER_AGENT, getUserAgent());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(recordIntent);
        } else {
            startService(recordIntent);
        }
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
            AuthenticationContext auth = createSmbAuthenticationContext(target, getSmbPassword());
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

    private void testSmbTarget(SmbTarget target, String password) throws Exception {
        if (target.host.isEmpty() || target.share.isEmpty()) {
            throw new IOException("SMB server or share is missing.");
        }

        SMBClient client = new SMBClient();
        Connection connection = null;
        Session session = null;
        DiskShare share = null;
        try {
            connection = client.connect(target.host);
            session = connection.authenticate(createSmbAuthenticationContext(target, password));
            share = (DiskShare) session.connectShare(target.share);
            String remoteFolder = normalizeSmbFolder(target.path);
            ensureSmbDirectories(share, remoteFolder);
            if (!remoteFolder.isEmpty() && !share.folderExists(remoteFolder)) {
                throw new IOException("SMB folder was not created.");
            }
        } finally {
            closeAuto(share);
            closeAuto(session);
            closeAuto(connection);
            closeAuto(client);
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

        if (!saveSmbTarget(target, true)) {
            return;
        }

        setStatus("DVR TARGET SMB", false);
        renderDvrView();
    }

    private void testDvrTargetSmb() {
        SmbTarget target = readSmbTargetFromInputs();
        if (target.host.isEmpty() || target.share.isEmpty()) {
            setStatus("ENTER SMB SERVER AND SHARE", true);
            return;
        }
        String password = passwordFromSmbInputOrSaved();
        setStatus("TESTING SMB SHARE", false);
        executor.execute(() -> {
            try {
                testSmbTarget(target, password);
                mainHandler.post(() -> setStatus("SMB TARGET READY", false));
            } catch (Exception error) {
                mainHandler.post(() -> setStatus("SMB TEST FAILED", true));
            }
        });
    }

    private boolean saveSmbTarget(SmbTarget target, boolean activate) {
        SharedPreferences.Editor editor = prefs.edit();
        if (activate) {
            editor.putString("dvr_target_mode", DVR_TARGET_SMB);
        }
        editor
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
                return false;
            }
            editor.putString("dvr_smb_password_enc", encrypted);
        }

        editor.apply();
        return true;
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

    private String passwordFromSmbInputOrSaved() {
        String typed = dvrSmbPasswordInput == null ? "" : dvrSmbPasswordInput.getText().toString();
        return typed.isEmpty() ? getSmbPassword() : typed;
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
        nowPlayingText.setText(nowPlayingLabel(channel));
        decoderBadge.setText("GLOW_DECODER MEDIA3.CONNECTING / " + playbackFormatLabel(channel.url));

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
                    decoderBadge.setText("GLOW_DECODER MEDIA3.DIRECT / " + playbackFormatLabel(channel.url));
                } else if (playbackState == Player.STATE_BUFFERING) {
                    decoderBadge.setText("GLOW_DECODER MEDIA3.BUFFERING / " + playbackFormatLabel(channel.url));
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
        Uri mediaUri = channel.url.startsWith("/") ? Uri.fromFile(new File(channel.url)) : Uri.parse(channel.url);
        player.setMediaItem(new MediaItem.Builder().setUri(mediaUri).build());
        player.prepare();
        player.play();
    }

    private String nowPlayingLabel(Channel channel) {
        if (channel == null) {
            return "NO CHANNEL TUNED";
        }
        String base = channel.name.toUpperCase(Locale.US);
        if (channel.type == ChannelType.VOD) {
            String year = channel.releaseYear > 0 ? " / " + channel.releaseYear : "";
            return base + "\n" + channel.mediaCategory.toUpperCase(Locale.US) + year;
        }
        EpgProgram program = currentProgramFor(channel);
        if (program != null) {
            return base + "\nNOW / " + program.title.toUpperCase(Locale.US);
        }
        return base + "\n" + (channel.group == null ? "LIVE BROADCAST" : channel.group.toUpperCase(Locale.US));
    }

    private String playbackFormatLabel(String url) {
        String lower = url == null ? "" : url.toLowerCase(Locale.US);
        if (lower.contains(".m3u8") || lower.contains("format=m3u8") || lower.contains("output=m3u")) {
            return "HLS";
        }
        if (lower.contains(".mp4") || lower.contains(".m4v")) {
            return "MP4";
        }
        if (lower.contains(".ts") || lower.contains("mpegts")) {
            return "MPEGTS";
        }
        return "DIRECT";
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

    private void applyNativeTheme(String themeId) {
        String id = themeId == null ? "afterglow-original" : themeId;
        if (id.equals("vaporwave-dark")) {
            setThemeTokens("#1f1c2d", "#2e2942", "#ff5e00", "#ff007f", "#8d81ae", "#ffffff");
        } else if (id.equals("synthwave-dark")) {
            setThemeTokens("#0e0419", "#1a0b36", "#ff007f", "#7b1fa2", "#ff00e6", "#ffffff");
        } else if (id.equals("monochrome-dark")) {
            setThemeTokens("#404040", "#525252", "#ffffff", "#d4d4d4", "#a3a3a3", "#ffffff");
        } else if (id.equals("phoenix-dark")) {
            setThemeTokens("#0d0400", "#200b05", "#ff4500", "#ffaa00", "#ff0000", "#ffffff");
        } else if (id.equals("vaporwave-light")) {
            setThemeTokens("#f6f5fa", "#e8e5f2", "#ff5e00", "#ff007f", "#65558f", "#1a142c");
        } else {
            setThemeTokens("#050505", "#121212", "#ff3e00", "#ff8a00", "#00d4ff", "#ffffff");
        }
    }

    private void setThemeTokens(String bg, String cardColor, String primary, String secondary, String accent, String text) {
        COLOR_BLACK = Color.parseColor(bg);
        COLOR_PANEL = Color.parseColor(cardColor);
        COLOR_PRIMARY = Color.parseColor(primary);
        COLOR_SECONDARY = Color.parseColor(secondary);
        COLOR_ACCENT = Color.parseColor(accent);
        COLOR_TEXT = Color.parseColor(text);
        COLOR_PANEL_GLASS = withAlpha(COLOR_PANEL, 230);
        COLOR_PANEL_SOFT = withAlpha(COLOR_PANEL, 102);
        COLOR_INPUT = withAlpha(COLOR_BLACK, 150);
        COLOR_MUTED = withAlpha(COLOR_TEXT, 102);
        COLOR_TEXT_SOFT = withAlpha(COLOR_TEXT, 153);
        COLOR_BORDER = withAlpha(COLOR_TEXT, 13);
        COLOR_BORDER_STRONG = withAlpha(COLOR_TEXT, 26);
        COLOR_NAV_ACTIVE = withAlpha(COLOR_TEXT, 26);
        COLOR_PINK = COLOR_SECONDARY;
    }

    private int withAlpha(int color, int alpha) {
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }

    private void loadTypefaces() {
        fontSans = assetTypeface("fonts/Inter.ttf", Typeface.create("sans-serif", Typeface.NORMAL));
        fontDisplay = assetTypeface("fonts/Outfit.ttf", Typeface.create("sans-serif", Typeface.BOLD));
        fontMono = assetTypeface("fonts/JetBrainsMono.ttf", Typeface.MONOSPACE);
    }

    private Typeface assetTypeface(String assetPath, Typeface fallback) {
        try {
            return Typeface.createFromAsset(getAssets(), assetPath);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private Typeface styled(Typeface base, int style) {
        return Typeface.create(base == null ? Typeface.DEFAULT : base, style);
    }

    private TextView label(String text, int sp, int color, boolean mono) {
        TextView label = new TextView(this);
        label.setText(text);
        label.setTextColor(color);
        label.setTextSize(sp);
        label.setIncludeFontPadding(false);
        label.setGravity(Gravity.CENTER_VERTICAL);
        if (mono) {
            label.setTypeface(styled(fontMono, Typeface.BOLD));
            label.setLetterSpacing(0.12f);
        } else {
            label.setTypeface(fontSans);
            label.setLetterSpacing(0f);
        }
        return label;
    }

    private EditText input(String hint) {
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setHint(hint);
        input.setHintTextColor(Color.argb(51, 255, 255, 255));
        input.setTextColor(COLOR_TEXT);
        input.setTextSize(14);
        input.setTypeface(fontSans);
        input.setPadding(dp(16), 0, dp(16), 0);
        input.setSelectAllOnFocus(false);
        input.setBackground(card(COLOR_INPUT, COLOR_BORDER, dp(12)));
        input.setFocusable(true);
        input.setOnFocusChangeListener((focusedView, hasFocus) -> {
            focusedView.setBackground(card(COLOR_INPUT, hasFocus ? COLOR_PRIMARY : COLOR_BORDER, dp(12), hasFocus ? dp(2) : dp(1)));
            focusedView.setScaleX(hasFocus ? 1.02f : 1f);
            focusedView.setScaleY(hasFocus ? 1.02f : 1f);
        });
        return input;
    }

    private Button actionButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(Color.WHITE);
        button.setTextSize(10);
        button.setTypeface(styled(fontMono, Typeface.BOLD));
        button.setLetterSpacing(0.14f);
        button.setIncludeFontPadding(false);
        button.setAllCaps(false);
        button.setGravity(Gravity.CENTER);
        button.setPadding(dp(14), 0, dp(14), 0);
        button.setMinHeight(0);
        button.setMinimumHeight(0);
        button.setMinWidth(0);
        button.setMinimumWidth(0);
        button.setStateListAnimator(null);
        button.setFocusable(true);
        applyGradientButtonBackground(button);
        return button;
    }

    private GradientDrawable card(int color, int strokeColor, int radius) {
        return card(color, strokeColor, radius, dp(1));
    }

    private GradientDrawable card(int color, int strokeColor, int radius, int strokeWidth) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        drawable.setStroke(strokeWidth, strokeColor);
        return drawable;
    }

    private void applyFocusBackground(View view, int normalColor, int focusColor) {
        applyFocusBackground(view, normalColor, focusColor, dp(12));
    }

    private void applyFocusBackground(View view, int normalColor, int focusColor, int radius) {
        view.setBackground(card(normalColor, COLOR_BORDER, radius));
        view.setOnFocusChangeListener((focusedView, hasFocus) -> {
            focusedView.setBackground(card(hasFocus ? focusColor : normalColor, hasFocus ? COLOR_PRIMARY : COLOR_BORDER, radius, hasFocus ? dp(3) : dp(1)));
            focusedView.setScaleX(hasFocus ? 1.05f : 1f);
            focusedView.setScaleY(hasFocus ? 1.05f : 1f);
        });
    }

    private void applyGradientButtonBackground(Button button) {
        button.setBackground(afterglowGradient(COLOR_BORDER_STRONG, dp(12), dp(1)));
        button.setOnFocusChangeListener((focusedView, hasFocus) -> {
            focusedView.setBackground(afterglowGradient(hasFocus ? Color.argb(190, 255, 255, 255) : COLOR_BORDER_STRONG, dp(12), hasFocus ? dp(3) : dp(1)));
            focusedView.setScaleX(hasFocus ? 1.05f : 1f);
            focusedView.setScaleY(hasFocus ? 1.05f : 1f);
        });
    }

    private GradientDrawable afterglowGradient(int strokeColor, int radius, int strokeWidth) {
        GradientDrawable drawable = new GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            new int[] { COLOR_PRIMARY, COLOR_SECONDARY }
        );
        drawable.setCornerRadius(radius);
        drawable.setStroke(strokeWidth, strokeColor);
        return drawable;
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