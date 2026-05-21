# Afterglow TV Developer Reference Manual
### Technical Architecture, Engine Specifications, and Under-The-Hood Design Document
`VERSION: 1.4.0-DEV` | `AUTHOR: AFTERGLOW ENGINEERING` | `TARGET: FULL-STACK / EMBEDDED ENGINE`

---

## 📖 Introduction & Philosophy
**Afterglow TV** is a high-performance, station-class multimedia receiver engine designed for IPTV stream reception, XMLTV EPG scheduling, VOD library metadata enrichment, and in-browser digital video recording (DVR). It is designed to work seamlessly in web browsers and Smart TV environments (such as Android TV, Tizen, and WebOS), and can be wrapped as a native mobile application using Capacitor.

This document serves as the absolute source of truth for the codebase, detailing every architectural layer, algorithmic implementation, state management loop, and physical layout behavior.

---

## 🛠️ Section 1: System Architecture & Run Environments

```
                                    +--------------------------------+
                                    |     IPTV Providers / APIs      |
                                    |  (HLS Streams, M3U Playlists,  |
                                    |          XMLTV Feeds)          |
                                    +---------------+----------------+
                                                    | (HLS Streams over proxy)
                                                    v
+------------------+                +---------------+----------------+
|  Vite Dev Server |                |     Node.js Express Server     |
| (Dev Middleware, | <------------> |  - Active CORS Bypass Proxy    |
|   HMR Mocked)    |                |  - Bundle Server (server.ts)   |
+------------------+                +---------------+----------------+
                                                    |
                                                    v
                                    +---------------+----------------+
                                    |     HLS.js Receiver Engine     |
                                    | (MPEG-TS/FMP4 chunk buffering) |
                                    +---------------+----------------+
                                                    |
                                                    v
                                    +---------------+----------------+
                                    |  Afterglow TV Web Application |
                                    |  - TV Navigation System         |
                                    |  - EPG Grid Engine             |
                                    |  - React 19 Frontend UI        |
                                    +--------------------------------+
```

### 1.1 Full-Stack Build Pipelines
Afterglow TV is architected as a hybrid modular full-stack application comprised of a single-page application (SPA) client-side and a high-performance HTTP proxy server:

*   **Vite Native Frontend Bundler**: Operates in `esm` mode during development. Vite compiles all client assets inside the `/src` folder, outputs statically optimized HTML, CSS (using Tailwind CSS 4), and highly tree-shaken JS scripts to the output `/dist` folder.
*   **Express Proxy Server (`/server.ts`)**: Solves a critical limitation inherent to modern browsers — CORS (Cross-Origin Resource Sharing) restrictions on live stream playback. Many IPTV providers broadcast `.m3u8` streams and TS (Transport Stream) files with strict CORS constraints. The custom backend server proxies both playlist retrievals and stream chunks directly, routing them safely over the client domain.
*   **Compile Bundler Configuration (`npx esbuild` integration)**:
    We bundle the Node/Express server `server.ts` into a unified CommonJS file `dist/server.cjs` via `esbuild`. The compile command is:
    ```bash
    esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
    ```
    This completely bypasses strict runtime environment module limitations (ESM relative imports check) by transforming the TS server, and maintains light container images when deployed on platforms like Cloud Run.

### 1.2 Port and Ingress Routing Constraints
*   **Port Mapping Requirements**: Outward ingress traffic is routed exclusively over **Port 3000** via an Nginx reverse proxy layer.
*   **Dev Ingress Routing**: In development, `app.use(vite.middlewares)` maps Vite assets on port `3000` while Express API endpoints run synchronously on the same thread, guaranteeing access without port switching.

### 1.3 CI/CD Workflow (`/.github/workflows/build-and-test.yml`)
The automated verification framework runs on Ubuntu-Latest containers upon pushes or pull requests to key branches. It performs:
1.  **Strict Lint Verification**: Runs `tsc --noEmit` and TypeScript syntax validations. Do not allow type discrepancies or unknown implicit `any` assignments.
2.  **Double Compiler Check**: Compiles the web bundle (`vite build`) and server binary (`esbuild`) with a diagnostic post-build workspace checker to verify that `/dist/index.html` and `/dist/server.cjs` both exist before checking off a release.

---

## 🗄️ Section 2: Core State Engine (`/src/store/useStore.ts`)

At the absolute center of Afterglow is its state-synchronization layer powered by **Zustand**. It manages state reactively and binds key features together:

### 2.1 The Core States Model (`AppState`)
The Zustand store operates an atomic model grouped into several system categories:

```typescript
export interface AppState {
  // Playlist Storage
  playlists: Playlist[];
  currentPlaylistId: string | null;
  currentChannel: Channel | null;

  // Layout View States
  isSidebarOpen: boolean;
  focusedElementId: string | null;
  activeView: 'guide' | 'vod' | 'settings' | 'dvr' | 'library';
  activeCategory: string;

  // DVR Tracker States
  dvrSchedule: DVRJob[];
  dvrRecordings: DVRRecording[];

  // Local Media Metadata Library Database
  mediaLibrary: MediaMetadata[];
  libraryScannerStatus: 'idle' | 'scanning' | 'completed';
  monitoredFolders: MonitoredFolder[];

  // Multi-Palette Theming Layout State
  activeThemeId: string;
  isPremium: boolean;
}
```

### 2.2 EPG Vault Injector (Virtual Broadcaster)
One of Afterglow's highest-fidelity features is the **EPG Vault Injector** (a virtual algorithmic programming scheduler). 
*   **Algorithmic and Manual Override Matrices**: It automatically modifies received provider schedules to inject local media from your scanned libraries directly into empty EPG slots on live TV channels.
*   **Densification Factor**: Governed by `epgInjectAlgoDensity` (0% to 100%). If enabled, the engine automatically traverses XMLTV data, finds gap slots, and schedules matching films or series from the user's local metadata vault, mimicking personal network broadcasting.

### 2.3 Subscription and Trial Paywall Hook
The receiver limits specific station-class features for trial versions (e.g., unlimited VOD streams, recording schedules).
*   **Trial Period Calculations**: Tracked via `trialStartDate` stored in standard localStorage. It computes the active time elapsed.
*   **Paywall States**: If `isPremium` is false and the trial has expired, a premium-grade Paywall is rendered overlays-first, prompting membership activations.

---

## 🕹️ Section 3: Android TV D-Pad Remote and Spatial Navigation

Unlike conventional point-and-click websites, a professional Smart TV interface MUST support keyboard arrow keys and remote-control arrows seamlessly using **Spatial Navigation (2D Key Mapping)**.

```
       [ArrowUp] -> Delta-Y (-)
           ^
           |
[ArrowLeft] <----> [Focused Element] <----> [ArrowRight] Delta-X (+)
           |
           v
      [ArrowDown] -> Delta-Y (+)
```

### 3.1 The Spatial Distance Calculation Hook (`/src/hooks/useTVNavigation.ts`)
When focusable element targets are active, pressing arrow keys triggers the spatial-navigation selector:
1.  **Retrieve Client Coordinate Bounding Boxes**:
    Calls `getBoundingClientRect()` on the currently focused element (`current`) and all other interactive nodes on the screen (queries components matching `[tabindex="-1"]`, `button`, custom inputs, channels, etc.).
2.  **Calculate Projected Distance Math (Manhattan Distance with 2D Weights)**:
    Rather than calculating standard Euclidean distance, the engine calculates directional Manhattan distance. It assigns heavy penalties (multiplying by 2) to elements located *opposite* to the chosen vector to prevent unnatural diagonal jumps:
    ```typescript
    const getDistance = (r1: DOMRect, r2: DOMRect, direction: string) => {
      const c1 = { x: r1.left + r1.width / 2, y: r1.top + r1.height / 2 };
      const c2 = { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
      
      switch (direction) {
        case 'ArrowUp':
          if (c2.y >= c1.y) return Infinity; // Must move upwards
          return Math.abs(c2.x - c1.x) + Math.abs(c2.y - c1.y) * 2; // Penalize horizontal skew
        case 'ArrowDown':
          if (c2.y <= c1.y) return Infinity;
          return Math.abs(c2.x - c1.x) + Math.abs(c2.y - c1.y) * 2;
        case 'ArrowLeft':
          if (c2.x >= c1.x) return Infinity;
          return Math.abs(c2.x - c1.x) * 2 + Math.abs(c2.y - c1.y); // Penalize vertical skew
        case 'ArrowRight':
          if (c2.x <= c1.x) return Infinity;
          return Math.abs(c2.x - c1.x) * 2 + Math.abs(c2.y - c1.y);
        default:
          return Infinity;
      }
    };
    ```
3.  **Active Element Switching**: The closest element matches is selected and its ID is pushed to the global `useStore` active ID state, automatically highlighting the new focus area on-screen.

### 3.2 Focus Integration (`/src/components/common/Focusable.tsx`)
A custom wrapper enclosing React components that injects structural event hookups:
*   Binds CSS scaling (`scale-105Scale`, active rings, custom glows using theme variables).
*   Registers keyboard click callbacks when standard `Enter` keys are captured.
*   Enforces visual focus indicators to make UI tracking flawless on actual Android TVs.

---

## 📹 Section 4: HLS Streaming Engine & Video Player (`/src/components/video/Player.tsx`)

The video rendering system abstracts and controls HLS media playbacks on low-spec hardware.

### 4.1 HLS.js Lifecycle Routines
*   **Native HTML5 vs Buffer Injection**: Many mobile Chrome browsers and Safari support native `.m3u8` direct streaming via the standard `<video src="...">` tag. However, Chrome, Firefox, and Android-Chromium frameworks do not.
*   **Media Source Extensions (MSE) Buffer Mapping**: If MSE is enabled, the player initializes `Hls.js`:
    ```typescript
    import Hls from 'hls.js';
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferSize: 30 * 1024 * 1024, // 30 MB local cache limit
        maxMaxBufferLength: 45,          // 45 seconds buffer ahead
        enableWorker: true,              // Parallelize parsing in Web Workers
        lowLatencyMode: true             // Real-time synchronization
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(videoElement);
    }
    ```
*   **Disposal Routines**: When channel swapping builds or screens change, active streaming instances are explicitly detached, and event listeners are unbound via `.destroy()` to prevent severe memory leaks in long-running installations.

### 4.2 Stream Resolution Fallback Hooks
IPTV feeds often exhibit variable bitrates (ABR). The player captures Hls.js events to negotiate output quality:
*   Handles buffer stalls and automatically triggers step-down fallback routines to load lower resolution playlist files instead of hanging or spinning.
*   Reports real-time network conditions (latencies, decoding frame rates, buffer lengths) directly to the technical telemetry overlay.

---

## 🗓️ Section 5: Ultimate Live EPG Grid & Virtual Timeline (`/src/components/guide/GuideGrid.tsx`)

A critical challenge of TV Guide timelines is rendering endless program lists (often 500+ channels showing 24 hours of programming each) without generating massive DOM-tree performance bottlenecks.

```
+------------+-----------------------------------------------------+
| Channel    |                      Timeline                       |
| Header     | [ 14:00 ] [ 14:30 ] [ 15:00 ] [ 15:30 ] [ 16:00 ]   |
+------------+-----------------------------------------------------+
| HBO HD     |  News Broadcast (Live)  | Movie Blockbuster          |
+------------+-----------------------------------------------------+
| ESPN       |  Sports Live Coverage   | Recap Show                 |
+------------+-----------------------------------------------------+
```

### 5.1 Dynamic Grid Rendering
Rather than loading separate DOM wrapper divs for every calendar hour, Afterglow scales the timeline mathematically:
*   **Pixel-To-Time Constants**: The system defines a constant scale, such as `600px` for every program hour.
*   **Relative Start and Width Geometry Rendering**:
    Programs are drawn as absolute blocks with customized left offsets and widths based on structural calculations:
    ```typescript
    const programStart = new Date(program.start);
    const startOffsetMinutes = (programStart.getTime() - timelineStart.getTime()) / (1000 * 60);
    const widthMinutes = (new Date(program.end).getTime() - programStart.getTime()) / (1000 * 60);
    
    const leftOffsetInPx = startOffsetMinutes * (pixelsPerMin);
    const totalWidthInPx = widthMinutes * (pixelsPerMin);
    ```
*   **Virtual Performance Culling**: Only horizontal cells visible within the viewport are actively rendered inside the grid, keeping frame rates at a smooth 60 FPS even when scrolling huge IPTV setups.

### 5.2 IPTV EPG XML Parser Engine (`/src/lib/epgParser.ts`)
A dedicated utility that parses standard IPTV XMLTV files:
*   Extracts channel configurations via `<channel id="...">` metadata.
*   Parses hierarchical schedule configurations (`<programme start="..." stop="...">`).
*   Cleans dates and merges outputs into a reactive map indexed by channel ID.

---

## 📁 Section 6: Media Library Scanner & VOD Classifier

To build a flawless hybrid interface, Afterglow integrates a local workspace index parser.

### 6.1 Indexed Folder Simulation & Scan Engines (`/src/hooks/useMediaLibraryScanner.ts`)
*   **Monitored Folder Directories**: Targets local directories, recursively indexing files to identify video elements.
*   **Incremental Sync Pools**: Scan results are processed in micro-batches to prevent UI frames from dropping during heavy operations.

### 6.2 Regex Title Optimization (`/src/utils/vodClassifier.ts`)
Files are named with complex tags, codecs, and release groups (e.g., `Sintel.2010.1080p.BluRay.x264-VEXT.mkv`). A clean regex parser optimizes titles for presentation layers:
*   Removes quality flags (4K, 1080p, x265, HEVC), release groups, and audio descriptors.
*   Extracts year configurations (e.g., `2010`) and maps clean titles directly to UI rendering cells.

---

## 🎨 Section 7: Scalable Theme Customizer (`/src/utils/theme.ts`)

Afterglow does not rely on rigid, hardcoded class colors. Instead, it utilizes a modular, dynamic design token layout based on custom CSS variables mapped in global scope.

### 7.1 Modern Design Token CSS Variable Mapping
Key CSS variables are mapped inside `/src/index.css`:
```css
:root {
  --afterglow-bg: #050505;
  --afterglow-card: #121212;
  --afterglow-primary: #ff3e00;
  --afterglow-secondary: #ff8a00;
  --afterglow-accent: #00d4ff;
}
```

### 7.2 Theme Presets
Themes are represented by programmatic palette presets:

| Preset Name | Background Color | Primary Color | Accent Color | Visual Theme Aura |
| :--- | :--- | :--- | :--- | :--- |
| **Afterglow Classic** | `#050505` | `#ff3e00` | `#00d4ff` | Cyberpunk cinematic slate theme |
| **Vaporwave Slate (Dark)** | `#0a0518` | `#ff5e00` | `#ff00a0` | Synth neon sunset aura |
| **Synthwave Twilight (Dark)** | `#070214` | `#ff007f` | `#39ff14` | Dark twilight, fluorescent glow |
| **Pure Slate Gray (Dark)** | `#121212` | `#ffffff` | `#5c5c5c` | Minimalist professional anthracite |
| **Phoenix Ember (Dark)**| `#0a0404` | `#ff4500` | `#ffd700` | Warm fire, molten lava orange |
| **Misty Slate Purple (Light)** | `#f4f0fa` | `#ff5e00` | `#9c27b0` | Safe light pastel twilight mode |
| **Pure Slate Gray (Light)** | `#f9f9f9` | `#171717` | `#737373` | Crisp high-fidelity editorial ivory |

When users select a theme, a utility function (`applyThemePreset`) dynamically overrides these CSS variables on the `:root` element. This instantly changes the design look across all elements, SVG vectors, gradients, and shadows without requiring page reloads!

---

## 🎨 Section 8: Vector Logo Engines & Design Mathematics

Rather than relying on static images, the Afterglow logo asset is rendered dynamically using high-precision vector equations mapped in React components:

*   `/src/components/common/StylizedLogo.tsx`
*   `/src/components/common/AfterglowLogo.tsx`

```
                +-------------------+
                |     Logo Peak     |
                |      (50, 16)     |
                |        / \        |
                |       /   \       |
                |      /     \      |
                |     /       \     |
                |    /   (A)   \    |
                |   *-----------*   |
                |  /  S-Swoosh   \  |
                | /   Ribbon      \ |
                |/                 \|
          +-----+-------------------+-----+
          | Left Base           Right Base|
          |  (25, 74)             (75, 74)|
          +-------------------------------+
```

### 8.1 Stylized Logo Math & SVG Geometry Coordinates
The core shape is a mathematically mapped capital **"A"** constructed with organic bezier curves and a dynamic crossbar sweep:
1.  **High-Precision Legs Path**:
    ```xml
    <path d="M 50 16 C 42.5 16, 31.5 42, 25 74 L 37 74 C 40.5 54, 46.5 38.5, 50 38.5 C 53.5 38.5, 59.5 54, 63 74 L 75 74 C 68.5 42, 57.5 16, 50 16 Z" />
    ```
    This creates elegant, curved legs widening symmetrically towards the base rather than typical straight line columns.
2.  **S-Swoop Organic Ribbon Crossbar Path**:
    ```xml
    <path d="M 22.5 56.5 C 29.5 51.5, 39.5 58, 51.5 50.5 C 61 44.5, 70 31.5, 78 28.5 C 74.5 42, 65.5 56.5, 54.5 60.5 C 42 65, 30.5 62, 22.5 56.5 Z" />
    ```
    Replaces the flat, rigid, historical crossbar with a fluid ribbon swoosh. It sweeps like a dynamic wave, highlighting motion.
3.  **Visual Effects Filters**:
    *   **Vibrant Volumetric Glow**: Implemented using a dual-gaussian blur filter (`stdDeviation="3.5"` and `"1.5"` combined via `feMerge`). This produces a high-fidelity neon-tube physical glow.
    *   **Theme Integration**: The paths are filled with Linear Gradients linked directly to `--afterglow-primary` and `--afterglow-secondary` CSS variables. When colors change, the logo's inner gradients update dynamically, matching the selected UI styling.

---

## 📱 Section 9: Complete Ionic Capacitor APK Compiling Setup

This section details how to compile the web application into an offline, performance-safe Android Native APK:

### 9.1 Asset Mapping Configurations
Ensure `capacitor.config.json` targets the optimized Vite bundle folder:
```json
{
  "appId": "tv.afterglow.app",
  "appName": "Afterglow TV",
  "webDir": "dist",
  "bundledWebRuntime": false
}
```

### 9.2 Build and Sync CLI Command Pipeline
1.  **Generate Production Web Assets**:
    ```bash
    npm run build
    ```
    *Result*: Vite produces minified code in `/dist`.
2.  **Synchronize Native Folder Wrappers**:
    ```bash
    npx cap sync android
    ```
    *Result*: Pushes everything into local `/android` Gradle trees.
3.  **Android Studio APK Compliances**:
    Open native code in Android Studio:
    ```bash
    npx cap open android
    ```
    Within Android Studio, select: **Build** ➡️ **Build Bundle(s) / APK(s)** ➡️ **Build APK(s)**. This compiles optimized executable files ready to run on any physical Android TV!

---

## 🔒 Section 10: Security Rules & Persistent Database Hardening

If deployed or synced with backends, the security schema protects users' systems and configuration profiles:
*   **IPTV Credential Isolation**: M3U playlist file inputs, local authorization codes, and proxy credentials remain local inside secure local database indices (IndexedDB/KV store) and are never leaked to external public endpoints.
*   **Secure Tunnel Proxying**: The server-side proxy route `/api/proxy` rejects non-whitelisted protocols, protecting against server-side request forgery (SSRF).

---

## 🌐 Section 11: Internationalization (i18n) & Reactive Translation Architecture

To make Afterglow TV eligible for global distribution (specifically on multi-language platforms like Amazon TV or standard Android TV markets), we've implemented a fully integrated translation pipeline. This engine functions without heavy external libraries (like `react-i18next`), maintaining a lightweight and extremely quick load profile.

### 11.1 Supporting Language Types & Dictionary Mapping
All available languages are strictly defined under `SupportedLanguage` union type:
```typescript
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja';
```
A robust dictionary map is declared in `/src/utils/translations.ts` as `TRANSLATIONS`. Each language has a complete `TranslationDict` containing navigation labels, paywalls, setup forms, and panel descriptions to avoid any unlocalized text.

### 11.2 Reactivity through Zustand & State Streams
1. **Persistent State Storage**: The active language state is stored as `language` inside `useStore`, backed by local storage persistence.
2. **Component Translation Destructuring**: Every component accesses the dictionary instantly by fetching the active map:
   ```typescript
   const language = useStore(state => state.language);
   const t = TRANSLATIONS[language];
   ```
3. **Instant Hot Swapping**: When the state is mutated via `setLanguage`, all active UI nodes re-render instantly with the new translated words, requiring zero reload operations or socket refreshes.

---

## 📐 Section 12: Advanced Vector Logo Scaling & Translation Offsets

Understanding how Afterglow's premium vector "A" fits into various small containers (such as a 76px wide collapsed sidebar) requires analyzing its underlying coordinate systems and transformation mathematics.

### 12.1 The SVG ViewBox Matrix
The root vector element in `/src/components/common/StylizedLogo.tsx` is defined with a standard coordinate bounding box:
* **viewBox**: `0 0 100 100`

### 12.2 Scale Transformation Formula (S=1.6)
To maximize the visually stunning capital "A" and its flowing swoosh crossbar (ensuring it never appears small), we scale the relative coordinates up from their base definitions by a scale factor $S = 1.6$.

To keep the shape perfectly centered in the horizontal space, we solve for the translation offset $T_x$ using the horizontal midpoint equation:
$$x_{\text{center}} \cdot S + T_x = x_{\text{center}}$$

Since the midpoint of our 100x100 viewport is $x_{\text{center}} = 50$:
$$50 \cdot 1.6 + T_x = 50 \implies 80 + T_x = 50 \implies T_x = -30$$

To calculate the Y-axis alignment offset $T_y$ so that the top curves of the neon glow reside exactly with a $5\%$ safety gutter at the top margin ($y_{\text{target}} = 5$):
The top-most vertex of the base "A" legs is defined at $y_{\text{initial}} = 16$. Thus, we solve for $T_y$:
$$y_{\text{initial}} \cdot S + T_y = y_{\text{target}}$$
$$16 \cdot 1.6 + T_y = 5 \implies 25.6 + T_y = 5 \implies T_y = -20.6$$

This yields perfect symmetry:
* **Maximum scale factor**: `scale(1.6)`
* **Precise geometric shift**: `translate(-30, -20.6)`

This ensures the organic legs (extending down to $y = 74$, which maps to $74 \cdot 1.6 - 20.6 = 97.8$) do not exceed the $100$ viewport limit, guaranteeing that the stylized neon shape is beautifully visible and does not appear small.

---

## 🎖️ Conclusion
This file documents every critical aspect of Afterglow TV. Its blend of desktop-first responsiveness, Android TV spatial keyboard control, and flexible theme architecture provides a solid, highly polished foundation for users and developers alike.
