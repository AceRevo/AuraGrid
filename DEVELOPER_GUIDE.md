# 🛠️ AuraGrid — Developer & Extension Guide

Welcome to the **AuraGrid Developer & Architecture Guide**. This document explains how the AuraGrid desktop ecosystem is designed, how its core engines operate, and how you can edit the codebase, create new custom widgets, design ricing themes, and package bundles for release.

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Project File Structure](#2-project-file-structure)
3. [The Core Engines Explained](#3-the-core-engines-explained)
   - [A. DirectComposition Windows Host (`main.js`)](#a-directcomposition-windows-host-mainjs)
   - [B. Kinetic Snap & Clustering Engine (`snap-engine.js`)](#b-kinetic-snap--clustering-engine-snap-enginejs)
   - [C. High-Performance Audio Engine (`audio-engine.js`)](#c-high-performance-audio-engine-audio-enginejs)
   - [D. Reactive Settings Hub (`settings-manager.js`)](#d-reactive-settings-hub-settings-managerjs)
4. [Tutorial: Creating a New Custom Widget](#4-tutorial-creating-a-new-custom-widget)
5. [Creating Community `.cubepack` Plugins](#5-creating-community-cubepack-plugins)
6. [CSS Architecture & Design Tokens](#6-css-architecture--design-tokens)
7. [Building and Packaging for Release](#7-building-and-packaging-for-release)

---

## 1. Architecture Overview

AuraGrid runs as an ultra-lightweight, 100% transparent DirectComposition hardware overlay on top of the Windows desktop:

```
┌────────────────────────────────────────────────────────┐
│               Windows 11 / 10 Desktop                  │
└──────────────────────────┬─────────────────────────────┘
                           │ (DirectComposition D3D11)
┌──────────────────────────▼─────────────────────────────┐
│                 AuraGrid Transparent Host              │
│      (Frameless, Always-Visible / Click-Through)       │
└──────────────────────────┬─────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  SnapEngine  │    │ AudioEngine  │    │  Telemetry   │
│  Clustering  │    │ 60 FPS CAVA  │    │ Hardware API │
│  Kinetic Box │    │ WASAPI DSP   │    │  Sparklines  │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Key Performance Rules:
* **Zero Polling:** Never poll in infinite `setInterval` loops. Use event-driven listeners or adaptive requestAnimationFrame with smart sleep.
* **Low-Power PC Optimization:** Chromium flags in `main.js` constrain V8 heap to 128MB (`--max-old-space-size=128`), enable zero-copy hardware transfers (`--enable-zero-copy`), and activate GPU rasterization.

---

## 2. Project File Structure

```text
AuraGrid/
├── assets/                       # High-res brand graphics, banners, and preview screenshots
│   ├── auragrid-promo-showcase.jpg
│   ├── auragrid-desktop-preview.png
│   ├── auragrid-banner.jpg
│   ├── auragrid-icon.jpg
│   └── auragrid-mark.jpg
├── app.js                        # Master UI orchestrator & widget lifecycle coordinator
├── audio-engine.js               # Web Audio API DSP, CAVA FFT analyzer, WASAPI capture
├── icons.js                      # Scalable SVG vector icon registry
├── index.html                    # Root DOM structure and modal dialogs
├── Lanzar-AuraGrid.bat           # 1-Click execution script for Windows
├── LICENSE                       # MIT License
├── main.js                       # Electron native window lifecycle & DirectComposition flags
├── package.json                  # Project manifest, metadata, and start scripts
├── README.md                     # Bilingual master repository showcase
├── settings-manager.js           # Configuration persistence, themes, and font cascade
├── snap-engine.js                # Proximity detection, clustering & magnetic snapping
├── style.css                     # Bento glassmorphism design system & widget layouts
├── themes.css                    # Color palettes and visual styles
└── widgets-data.js               # Seed configuration data
```

---

## 3. The Core Engines Explained

### A. DirectComposition Windows Host (`main.js`)
Creates a frameless, transparent BrowserWindow that behaves like a native desktop layer:
* `transparent: true` and `backgroundColor: '#00000000'` ensure zero opaque borders.
* `type: 'desktop'` or topmost mode allows the HUD to rest directly behind open windows or float above them based on user preference.
* Native system audio capture bridge via `desktopCapturer` IPC for real-time WASAPI sound analysis.

### B. Kinetic Snap & Clustering Engine (`snap-engine.js`)
Manages widget position, drag-and-drop kinetics, and automatic geometric clustering:
* **`WidgetCube` class:** Encapsulates an individual 200x200 Bento cube with its DOM element, pins, resize handles, and coordinates.
* **`SnapEngine` class:** Evaluates edge proximity during movement. When the distance between two cubes falls below `SNAP_THRESHOLD` (default 45px), cubes snap together.
* **Clustering:** Snapped cubes form a unified `WidgetCluster` that moves cohesively as a single acrylic panel with shared backdrop blur and hairline dividers.

### C. High-Performance Audio Engine (`audio-engine.js`)
* Provides a 128-sample low-latency `AnalyserNode`.
* Produces logarithmically scaled 16-band musical frequency buffers (`log16Data`) from 30 Hz to 16 kHz.
* Built-in 3-band parametric EQ:
  - **Bajos (Bass):** LowShelf filter @ 120 Hz (-12dB to +12dB).
  - **Medios (Mids):** Peaking filter @ 1000 Hz, Q=1.0 (-12dB to +12dB).
  - **Agudos (Treble):** HighShelf filter @ 3800 Hz (-12dB to +12dB).
* **System Capture (WASAPI):** Uses loopback capture from Windows so Spotify or YouTube can drive the CAVA spectrum without echoing back into the speakers.

### D. Reactive Settings Hub (`settings-manager.js`)
* Persists configuration in `localStorage` under `cubeworld_config_v2`.
* Dynamically updates CSS custom properties on `:root` and `<html>` (`--panel-bg`, `--accent-primary`, `--blur-intensity`, `--border-radius`).
* Applies typography and window style attributes (`data-font-style`, `data-window-style`) universally to all DOM children with instant cascade.

---

## 4. Tutorial: Creating a New Custom Widget

Follow these 3 easy steps to add a new permanent widget into AuraGrid:

### Step 1: Define Your Widget HTML Template
In `app.js` (or in a dedicated module), define the HTML string for your widget body:

```javascript
const timerWidgetHtml = `
  <div class="timer-widget-content" style="display:flex; flex-direction:column; justify-content:space-between; height:100%; text-align:center;">
    <div style="font-size:10px; font-weight:700; color:var(--text-dim);">CRONÓMETRO</div>
    <div id="timer-display" style="font-family:var(--font-mono); font-size:28px; font-weight:800; color:#fff;">
      00:00.0
    </div>
    <div style="display:flex; gap:6px;">
      <button id="timer-start-btn" class="source-pill active">Iniciar</button>
      <button id="timer-reset-btn" class="source-pill">Reiniciar</button>
    </div>
  </div>
`;
```

### Step 2: Instantiate and Register
Instantiate a new `WidgetCube` and register it with `snapEngine`:

```javascript
import { WidgetCube } from './snap-engine.js';

// 1. Create the WidgetCube instance (id, title, badge, htmlContent)
const timerWidget = new WidgetCube('timer', 'Cronómetro Digital', 'TIME', timerWidgetHtml);

// 2. Set default dimensions and position (standard is 200x200)
timerWidget.setDimensions(200, 200);
timerWidget.setPosition(400, 200);

// 3. Register with SnapEngine
snapEngine.registerWidget(timerWidget);
defaultWidgets.push(timerWidget);
```

### Step 3: Wire Event Listeners
Bind your buttons after registration:

```javascript
let timerInterval = null;
let timerSeconds = 0;

const startBtn = timerWidget.element.querySelector('#timer-start-btn');
const resetBtn = timerWidget.element.querySelector('#timer-reset-btn');
const displayEl = timerWidget.element.querySelector('#timer-display');

startBtn.addEventListener('click', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    startBtn.textContent = 'Iniciar';
  } else {
    timerInterval = setInterval(() => {
      timerSeconds += 0.1;
      displayEl.textContent = timerSeconds.toFixed(1) + 's';
    }, 100);
    startBtn.textContent = 'Pausar';
  }
});

resetBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = 0;
  displayEl.textContent = '00:00.0';
  startBtn.textContent = 'Iniciar';
});
```

---

## 5. Creating Community `.cubepack` Plugins

A `.cubepack` is a portable JSON or zip package allowing users to share custom widgets and complete ricing setups:

```json
{
  "name": "Pomodoro Focus Cube",
  "version": "1.0.0",
  "author": "YourName",
  "template": "pomodoro",
  "shape": "1:1",
  "defaultSettings": {
    "focusTime": 25,
    "breakTime": 5,
    "accentColor": "#ff5555"
  },
  "contentHtml": "<div class='pomo-content'>...</div>",
  "stylesCss": ".pomo-content { ... }"
}
```

Users can install `.cubepack` files by dragging them directly into the **Ecosistema & Plugins** tab in Settings.

---

## 6. CSS Architecture & Design Tokens

AuraGrid uses a reactive set of CSS variables defined in `style.css` and `themes.css`:

| CSS Variable | Description | Default Value |
| :--- | :--- | :--- |
| `--panel-bg` | Background acrylic base tint | `rgba(24, 26, 32, 0.88)` |
| `--accent-primary` | Dominant vibrant neon highlight | `#00f0ff` |
| `--accent-secondary` | Secondary complementary tone | `#a855f7` |
| `--blur-intensity` | Hardware backdrop blur radius | `30px` |
| `--border-radius` | Cube & Bento corner curvature | `16px` |
| `--panel-border` | Subtle translucent edge border | `rgba(255, 255, 255, 0.10)` |
| `--font-main` | Primary UI typography stack | `'Plus Jakarta Sans', system-ui` |
| `--font-mono` | Hardware & code typography stack | `'JetBrains Mono', 'Cascadia Code'` |

---

## 7. Building and Packaging for Release

### Step 1: Update Staging Files
When modifying source files, update the staging directory:
```powershell
Copy-Item index.html staging-app/index.html -Force
Copy-Item style.css staging-app/style.css -Force
Copy-Item app.js staging-app/app.js -Force
Copy-Item settings-manager.js staging-app/settings-manager.js -Force
Copy-Item main.js staging-app/main.js -Force
Copy-Item audio-engine.js staging-app/audio-engine.js -Force
Copy-Item snap-engine.js staging-app/snap-engine.js -Force
Copy-Item icons.js staging-app/icons.js -Force
Copy-Item package.json staging-app/package.json -Force
Copy-Item -Recurse -Force assets staging-app/
```

### Step 2: Compile the Production ASAR
```powershell
npx --yes @electron/asar pack staging-app dist/CubeWorld-win32-x64/resources/app.asar
```

### Step 3: Run Syntax & Quality Check
```powershell
node --check main.js
node --check app.js
node --check audio-engine.js
node --check settings-manager.js
node --check snap-engine.js
```

---

<div align="center">
  <sub><b>AuraGrid Architecture</b> • Built for performance, modularity, and visual delight.</sub>
</div>
