# Afterglow TV Android

Native Android TV / Fire TV branch focused on direct device playback.

This project is intentionally separate from the Capacitor proof-of-life app. The product direction here is an all-in-one TV APK that talks directly to user-supplied IPTV providers and only supports codecs the target Android TV / Fire TV device can decode natively.

## Current Slice

- Java native Android app, no WebView playback dependency.
- AndroidX Media3 / ExoPlayer playback.
- VLC default User-Agent sent by native networking and player requests.
- First launch preloads the Free-TV starter playlist (`https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8`) so Guide/player surfaces are populated immediately, while user-supplied playlists still replace it when loaded.
- M3U loading and basic channel parsing in-app.
- XMLTV EPG loading in-app for the normal live guide.
- 24-hour EPG-style horizontal guide rows with current/upcoming programme cells, generated placeholders when XMLTV is missing, and optional vault/library programme injection.
- React prototype visual language ported to native TV controls, including Inter/Outfit/JetBrains Mono fonts, compact spacing, focus glow, sidebar layout, player surface, category ribbon, native rows, and the restored React SVG-derived logo mark in the header/sidebar/launcher banner.
- Separate native surfaces for Guide, VOD, XXX, DVR, Library, and Settings.
- XXX/adult groups are isolated from the normal live guide and VOD catalog.
- VOD title cleanup and local genre classification copied from the web prototype direction.
- VOD/XXX catalog rows with type badges, cleaned titles, year hints, and direct-play actions.
- Local library scanner for Android Storage Access Framework folders plus readable local/mounted paths, with filename cleanup and movie/TV detection.
- Lightweight native cache for parsed channel catalogs, XMLTV programme rows, scanned library items, queued DVR jobs, and saved DVR recordings so the app can reopen with the last known data before refresh.
- DVR recorder surface with guide-based queued captures, automatic due-job recording, and a saved recordings library.
- DVR output targets include device/app movie storage by default, Android Storage Access Framework folders for external disks or provider-backed network folders, manual paths for mounted USB/network shares, and credentialed SMB2/SMB3 shares through SMBJ.
- SMB DVR targets collect server, share, folder, username, optional domain, and password in-app. The password is stored encrypted with Android Keystore and is not written into DVR job records.
- SMB targets can be validated from the DVR screen with `TEST SMB`; blank username/password uses SMB guest authentication.
- Direct HTTP streams are captured to `.ts`; HLS playlist streams are captured by appending media segments when the provider exposes normal segment playlists.
- Manifest permissions are in place for foreground DVR recording and notifications on modern Android TV / Fire OS builds.
- Due DVR jobs now run through `DvrRecordingService`, a foreground data-sync service that keeps capture work outside the Activity lifecycle and reports completion back to the DVR screen.
- DVR recording requests notification permission on Android 13+ and holds a partial wake lock during active capture to reduce mid-recording sleep failures.
- Settings are editable in-app: User-Agent presets/custom value, XMLTV sync URL, optional backend origin, theme/language selection, feature toggles, VOD layout preference, EPG vault injector mode/channels/density/manual slots, trial/premium state, JSON backup/export/import, and full native data reset.
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

- Add SMB/WebDAV/NFS network-share support for local library scanning.
- Persist parsed playlist, EPG, and library catalog in SQLite/Room instead of lightweight internal cache files.
- Move shared DVR serialization/recording helpers out of `MainActivity`/`DvrRecordingService` duplication into a small common Java utility package.
- Add WebDAV/NFS credentialed DVR targets after the SMB2/SMB3 path is device-tested.