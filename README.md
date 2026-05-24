# <p align="center"><img src="https://raw.githubusercontent.com/username/repo/main/logo.png" alt="Afterglow TV" width="120" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\' width=\'120\' height=\'120\' style=\'background:radial-gradient(circle at 50% 25%, #151025 0%, #080512 100%); border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);\'><defs><linearGradient id=\'brand-grad\' x1=\'0%\' y1=\'100%\' x2=\'100%\' y2=\'0%\'><stop offset=\'0%\' stopColor=\'%23ff8a00\'/><stop offset=\'55%\' stopColor=\'%23ff3e00\'/><stop offset=\'100%\' stopColor=\'%2300d4ff\'/></linearGradient><linearGradient id=\'swoop-grad\' x1=\'10%\' y1=\'80%\' x2=\'90%\' y2=\'20%\'><stop offset=\'0%\' stopColor=\'%2300d4ff\'/><stop offset=\'100%\' stopColor=\'%23ff3e00\'/></linearGradient><filter id=\'glow\' x=\'-20%\' y=\'-20%\' width=\'140%\' height=\'140%\'><feGaussianBlur stdDeviation=\'3\' result=\'blur\'/><feMerge><feMergeNode in=\'blur\'/><feMergeNode in=\'SourceGraphic\'/></feMerge></filter></defs><g filter=\'url(%23glow)\' transform=\'translate(-20, -17) scale(1.4)\'><path d=\'M 50 16 C 42.5 16, 31.5 42, 25 74 L 37 74 C 40.5 54, 46.5 38.5, 50 38.5 C 53.5 38.5, 59.5 54, 63 74 L 75 74 C 68.5 42, 57.5 16, 50 16 Z\' fill=\'url(%23brand-grad)\'/><path d=\'M 22.5 56.5 C 29.5 51.5, 39.5 58, 51.5 50.5 C 61 44.5, 70 31.5, 78 28.5 C 74.5 42, 65.5 56.5, 54.5 60.5 C 42 65, 30.5 62, 22.5 56.5 Z\' fill=\'url(%23swoop-grad)\'/></g></svg>'"></p>

<h1 align="center">AFTERGLOW TV</h1>
<p align="center"><b>STATION-CLASS MULTIMEDIA RECEIVER ENGINE</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Build-CI%20Verified-brightgreen?style=flat-square" alt="Build Status">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Runtime-HLS%20Fluid-red?style=flat-square" alt="Runtime">
  <img src="https://img.shields.io/badge/Stack-React%2019%20%2B%20Vite-61dafb?style=flat-square" alt="Stack">
  <img src="https://img.shields.io/badge/Form-TV%20Full%20%2B%20Mobile-darkviolet?style=flat-square" alt="Design">
</p>

---

**Afterglow TV** is a high-fidelity, station-class multimedia receiver engine built to consume, parse, and play high-definition live IPTV feeds, XMLTV EPG data, and customized video-on-demand lists. Featuring immersive fluid animations, custom-engineered responsive audio visualizers, tactile keyboard controls for a complete Smart TV interface, and persistent visual theme rendering templates, Afterglow provides a cinematic streaming environment.

---

## 📺 Application Feature Matrix

### 1. Unified Setup Engine (`/src/components/SetupScreen.tsx`)
- **Dual-Mode Configurations**: Bootstrap instantly using built-in high-performance **Demo Feeds** (including Sintel, Big Buck Bunny, Tears of Steel, and NASA global feeds) or link your custom M3U playlists and external EPG JSON APIs.
- **Fast Parsing Architecture**: Processes channels, descriptions, classifications, and category grids incrementally with local buffering.

### 2. Live Electronic Programming Guide (EPG) TV Guide (`/src/components/guide/`)
- **Virtual Grid Guide Timeline**: Dynamically loaded timeline tracker enabling high-performance grid rendering for thousands of channels.
- **Auto-Sync Time Markers**: Displays upcoming and live programs with status countdown loops.

### 3. Dedicated Video-on-Demand (VOD) Cinema Hub (`/src/components/vod/`)
- **Immersive Bento Layout**: Beautiful grids highlighting titles, categories, and progress bars.
- **Dynamic Quick Searches**: Filter VOD directories instantly by tag, language, or rating index.

### 4. Interactive Digital Video Recorder (DVR) Panel (`/src/components/dvr/`)
- **Live Program Capture**: Schedule upcoming programs or record live broadcasts directly in-browser.
- **Persistent Local Records**: Quick-reference storage tracking scheduled titles and active recordings.

### 5. Multi-Palette UI Theme Customizer (`/src/components/settings/`)
- Swaps layout styles instantly via unified global CSS attributes, supporting:
  - **Afterglow Classic**: Slate background with orange & glowing cyan highlights.
  - **Vaporwave Slate (Dark)**: Glowing sunset neon orange & tropical magenta.
  - **Synthwave Twilight (Dark)**: Neon violet with retro-reflective elements.
  - **Pure Slate Gray (Dark & Light)**: Clean, high-fidelity anthracite look.
  - **Phoenix Ember / Sunrise**: Deep charcoal with fire-fused red highlights.

### 6. Dynamic Simulator Controls & Remote Simulation (`/src/components/video/`)
- Simulated handheld remote overlay representing tactile joystick, channel flippers, guide shortcuts, and hardware play controls.

---

## ⌨️ Tactical Navigation & Remote Controller Map

Afterglow has been design-optimized for tactile controls to feel exactly like navigating on a set-top box.

| Keyboard Input | Simulated Remote Control Button | Action Triggered |
| :--- | :--- | :--- |
| `KeyW` / `ArrowUp` | **▲ D-Pad Up** | Move up in Guide Grid, menu cards, or playlist items |
| `KeyS` / `ArrowDown` | **▼ D-Pad Down** | Move down in Guide Grid, menu cards, or playlist items |
| `KeyA` / `ArrowLeft` | **◀ D-Pad Left** | Scroll back timeline, exit menus, or toggle settings left |
| `KeyD` / `ArrowRight`| **▶ D-Pad Right** | Scroll ahead timeline, enter components, toggle settings right |
| `Enter` / `Space` | **◯ OK Center Select** | Activate channels, play selected VOD/streams, check items |
| `Escape` / `Backspace`| **↩ BACK Button** | Back out of live player, exit guide overlay, return to main |
| `KeyM` | **🔊 Mute Indicator** | Mute or unmute active video player stream instantly |
| `KeyG` | **🗓️ GUIDE Button** | Toggle Live EPG Overlay panel over current active stream |
| `KeyS` | **⚙️ SETTINGS Panel** | Toggle Theme Selection and developer control panels |

---

## 🚀 Scripting, Workflows & Deployment Setup

### Local Run Commands

#### Development Sandbox Engine
Runs the local proxy server with active Vite livereload middleware modules:
```bash
npm run dev
```

#### Production Bundle Builder
Triggers the TypeScript compiler, outputs React web code to `dist/`, and CJS packages the Custom Server:
```bash
npm run build
```

#### standalone Production Server startup
Launches the built high-performance proxy server:
```bash
npm run start
```

### GitHub Actions Integration (`/.github/workflows/build-and-test.yml`)
The workflow operates automatically on every branch `push` and `pull_request` targeting default branches. It automatically checks:
1. Code compiling stability and TypeScript compiler type-safety checks (`tsc --noEmit`).
2. Bundling speed and validation mapping of both Web (`vite build`) and Server (`esbuild`).
