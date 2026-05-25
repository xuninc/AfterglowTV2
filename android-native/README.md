# Afterglow TV Native

Native Android TV / Fire TV branch focused on direct device playback.

This project is intentionally separate from the Capacitor proof-of-life app. The product direction here is an all-in-one TV APK that talks directly to user-supplied IPTV providers and only supports codecs the target Android TV / Fire TV device can decode natively.

## Current Slice

- Java native Android app, no WebView playback dependency.
- AndroidX Media3 / ExoPlayer playback.
- VLC default User-Agent sent by native networking and player requests.
- M3U loading and basic channel parsing in-app.
- XMLTV EPG loading in-app for the normal live guide.
- EPG-style horizontal guide rows with current/upcoming programme cells and generated placeholders when XMLTV is missing.
- Afterglow-inspired dark TV layout with player surface, sidebar navigation, category ribbon, and native rows.
- Separate native surfaces for Guide, VOD, XXX, DVR, Library, and Settings.
- XXX/adult groups are isolated from the normal live guide and VOD catalog.
- VOD title cleanup and local genre classification copied from the web prototype direction.
- VOD/XXX catalog rows with type badges, cleaned titles, year hints, and direct-play actions.
- Local library scanner for Android Storage Access Framework folders plus readable local/mounted paths, with filename cleanup and movie/TV detection.
- Lightweight native cache for parsed channel catalogs, XMLTV programme rows, scanned library items, queued DVR jobs, and saved DVR recordings so the app can reopen with the last known data before refresh.
- DVR recorder surface with guide-based queued captures, automatic due-job recording, and a saved recordings library.
- DVR output targets include device/app movie storage by default, Android Storage Access Framework folders for external disks or provider-backed network folders, manual paths for mounted USB/network shares, and credentialed SMB2/SMB3 shares through SMBJ.
- SMB DVR targets collect server, share, folder, username, optional domain, and password in-app. The password is stored encrypted with Android Keystore and is not written into DVR job records.
- Direct HTTP streams are captured to `.ts`; HLS playlist streams are captured by appending media segments when the provider exposes normal segment playlists.
- Android TV / Fire TV manifest support, including Leanback launcher and touch-optional hardware flags.

## Build

From the repo root:

```powershell
android\gradlew -p android-native assembleDebug
```

Debug APK output:

```text
android-native/app/build/outputs/apk/debug/app-debug.apk
```

## Product Line

Core app should be direct-play only. Unsupported codecs should show a clear compatibility message. Optional premium/server features can add transcoding later, but the base APK should not require a PC server.

## Next Native Work

- Replace the simple native row list with a true time-grid guide.
- Add SMB/WebDAV/NFS network-share support for local library scanning.
- Persist parsed playlist, EPG, and library catalog in SQLite/Room instead of lightweight internal cache files.
- Move long-running DVR capture into a foreground service with notifications/wake locks for store-ready unattended recording.
- Add WebDAV/NFS credentialed DVR targets after the SMB2/SMB3 path is device-tested.