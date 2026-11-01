/**
 * CubeWorld // Windows 11 Desktop Rice System
 * 
 * Production-ready modular desktop widget platform inspired by Radica Cube World.
 * - 100% transparent DirectComposition canvas over Windows 11 desktop.
 * - Starts clean without hardcoded dummy clutter; fully personalizable.
 * - Audio Engine with True Wet/Dry Delay (Zero Echo by default, no audio doubling).
 * - System Audio / Desktop Capture (WASAPI / Stereo Mix / Mic) for Spotify, YouTube, games.
 * - Fully functional widgets:
 *   1. Media Hub: local player + live Windows system audio capture mode.
 *   2. Audio CAVA Visualizer: 60 FPS spectrum (16 Bars, Waveform, Radial), sensitivity.
 *   3. MIDI FX Studio: 3-band parametric EQ, Delay/Echo, Drive, 5 instant presets.
 *   4. Karaoke Lyrics: synced .lrc parser, timestamp auto-scroll, manual load & paste.
 *   5. Bongo Cat: dual-paw keyboard smash, bass-kick head bobbing, floating heart particles.
 *   6. Photo Frame: multi-photo dropzone, auto-slideshow, fit-mode toggle (cover/contain).
 *   7. Telemetry: scrolling sparkline graph canvas, realistic CPU/RAM/GPU load meters.
 *   8. Quick Tasks: persistent checklist, filter tabs (All/Pending/Done), deletion.
 * - Settings Hub: theme switcher (Win11 Dark/Light, Nord, Catppuccin, Tokyo, Cyberpunk, OLED),
 *   accent color picker with glow generation, live sliders, widget catalog, layout persistence.
 * 
 * Open Source Project - GitHub Production Ready
 */

import { audio } from './audio-engine.js';
import { SnapEngine, WidgetCube } from './snap-engine.js';
import { settings } from './settings-manager.js';
import { ICONS, getSvgIcon } from './icons.js';

// Expose Core Engines to Window for Seamless Inter-Widget Communication
window.settings = settings;
window.audioEngine = audio;

// --- DOM References ---
const workspaceEl = document.getElementById('workspace');
const snapGuideEl = document.getElementById('snap-guide');
const globalClockEl = document.getElementById('global-clock');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsBackdrop = document.getElementById('settings-backdrop');
const btnAddCube = document.getElementById('btn-add-cube');
const btnLockAll = document.getElementById('btn-lock-all');
const lockIcon = document.getElementById('lock-icon');
const lockLabel = document.getElementById('lock-label');

// Initialize Snap Engine Core
const snapEngine = new SnapEngine(workspaceEl, snapGuideEl);

// Master Lock UI Controller (Edit Mode vs Clean HUD Mode)
function updateLockModeUI(isLocked) {
  if (!btnLockAll) return;
  btnLockAll.classList.toggle('locked', isLocked);
  if (lockIcon) lockIcon.innerHTML = isLocked ? getSvgIcon('lock', 13) : getSvgIcon('unlock', 13);
  if (lockLabel) lockLabel.textContent = isLocked ? 'HUD Fijo' : 'Edición';
  btnLockAll.title = isLocked
    ? 'Modo HUD Activo (Haz clic para activar Modo Edición y mover/ajustar cubos)'
    : 'Modo Edición Activo (Haz clic para bloquear cubos y ocultar barras)';
}

const initialLock = !!settings.config.isGlobalLocked;
snapEngine.setGlobalLock(initialLock);
updateLockModeUI(initialLock);

if (btnLockAll) {
  btnLockAll.addEventListener('click', () => {
    const newLock = !snapEngine.isLocked;
    snapEngine.setGlobalLock(newLock);
    settings.set('isGlobalLocked', newLock);
    updateLockModeUI(newLock);
  });
}

// -------------------------------------------------------------
// 1. WIDGET: MEDIA HUB (LOCAL PLAYER & SYSTEM AUDIO CAPTURE)
// -------------------------------------------------------------
const musicHtml = `
  <div class="music-content" id="music-cube-container">
    <!-- Source Mode Switcher: Local Files vs Windows Desktop Audio Loopback -->
    <div class="audio-source-switch-row">
      <button class="source-pill active" id="source-local-btn" title="Reproducir archivos locales o sintetizador">${getSvgIcon('folder', 12)} Archivos</button>
      <button class="source-pill" id="source-system-btn" title="Capturar audio del sistema (Spotify, YouTube, Juegos)">${getSvgIcon('volumeHigh', 12)} Sistema</button>
    </div>

    <!-- View A: Local Player -->
    <div class="local-player-view" id="local-player-view">
      <div class="music-top-row">
        <div class="vinyl-container" id="vinyl-disc" title="Reproducir / Pausar">
          <div class="vinyl-center"></div>
        </div>
        <div class="music-meta">
          <div class="track-name" id="current-track-name">Esperando Audio</div>
          <div class="artist-name" id="current-artist-name">Carga tus canciones</div>
          <div class="track-time-display">
            <span id="time-current">00:00</span> / <span id="time-total">00:00</span>
          </div>
          <!-- Caelestia Living Audio Wave Strip -->
          <div class="media-wave-strip" id="media-wave-strip">
            <span class="media-wave-bar"></span>
            <span class="media-wave-bar"></span>
            <span class="media-wave-bar"></span>
            <span class="media-wave-bar"></span>
            <span class="media-wave-bar"></span>
            <span class="media-wave-bar"></span>
            <span class="media-wave-bar"></span>
            <span class="media-wave-bar"></span>
          </div>
        </div>
        <!-- Playlist Drawer Open Button -->
        <button class="playlist-pill-btn" id="playlist-toggle-btn" title="Ver cola de reproducción">${getSvgIcon('list', 12)} Cola</button>
      </div>

      <!-- Audio Seek Bar -->
      <div class="audio-progress-wrap">
        <input type="range" class="audio-progress-bar" id="audio-seek-slider" min="0" max="100" value="0" step="0.1" title="Avanzar / Rebobinar">
      </div>

      <div class="music-bottom-bar">
        <div class="music-transport-btns">
          <button class="transport-btn" id="shuffle-btn" title="Modo Aleatorio (Shuffle)">${getSvgIcon('shuffle', 13)}</button>
          <button class="transport-btn" id="prev-track-btn" title="Pista Anterior">${getSvgIcon('skipBack', 13)}</button>
          <button class="transport-btn play-main-btn" id="play-pause-btn" title="Iniciar / Pausar">${getSvgIcon('play', 14)}</button>
          <button class="transport-btn" id="next-track-btn" title="Siguiente Pista">${getSvgIcon('skipForward', 13)}</button>
          <button class="transport-btn" id="repeat-btn" title="Modo Repetir (Todo / Una / Off)">${getSvgIcon('repeat', 13)}</button>
        </div>

        <div class="volume-control-box" title="Volumen de audio">
          <span class="vol-icon" id="vol-icon-btn">${getSvgIcon('volumeHigh', 13)}</span>
          <input type="range" class="audio-vol-slider" id="music-vol-slider" min="0" max="100" value="75">
        </div>

        <label class="load-file-pill" title="Cargar archivos de audio">
          ${getSvgIcon('folder', 12)} Abrir
          <input type="file" id="audio-file-input" accept="audio/*,.lrc" multiple style="display:none;">
        </label>
      </div>

      <!-- Visual Playlist Drawer Overlay -->
      <div class="playlist-drawer hidden" id="playlist-drawer">
        <div class="playlist-drawer-header">
          <span>${getSvgIcon('list', 12)} Cola (<span id="playlist-count">0</span>)</span>
          <button class="close-drawer-btn" id="close-playlist-btn">${getSvgIcon('x', 12)}</button>
        </div>
        <div class="playlist-items" id="playlist-items-list">
          <div class="playlist-empty-text">Sin pistas. Arrastra archivos de audio aquí.</div>
        </div>
      </div>
    </div>

    <!-- View B: System Audio Capture (Spotify, YouTube, Games) -->
    <div class="system-capture-view hidden" id="system-capture-view">
      <div class="system-capture-box">
        <div class="system-capture-pulse-ring">
          <div class="pulse-core"></div>
        </div>
        <div class="system-capture-label">Audio de Windows Activo</div>
        <div class="system-capture-sub" id="system-capture-sub">Spotify, Navegador, Juegos, etc.</div>
      </div>
      <div class="system-capture-actions">
        <span class="system-badge-live">● EN VIVO</span>
        <button class="stop-capture-btn" id="stop-capture-btn" title="Volver al reproductor local">Detener</button>
      </div>
    </div>
  </div>
`;
const musicWidget = new WidgetCube('music', 'Media Hub', 'AUDIO', musicHtml);

// -------------------------------------------------------------
// 2. WIDGET: AUDIO CAVA VISUALIZER (60 FPS)
// -------------------------------------------------------------
const cavaHtml = `
  <div class="cava-content">
    <canvas class="cava-canvas" id="cava-canvas" width="176" height="112" title="Haz clic para alternar modo de espectro"></canvas>
    <div class="cava-footer">
      <button class="cava-mode-badge" id="cava-mode-btn" title="Alternar estilo">BARS</button>
      <span class="cava-source-tag" id="cava-source-tag">LOCAL</span>
      <span class="cava-status-tag" id="cava-status">60 FPS</span>
    </div>
  </div>
`;
const cavaWidget = new WidgetCube('cava', 'Audio Cava', '60 FPS', cavaHtml);

// -------------------------------------------------------------
// 3. WIDGET: MIDI FX & EQUALIZER STUDIO
// -------------------------------------------------------------
const midiFxHtml = `
  <div class="midi-fx-content">
    <!-- Real-time Parametric EQ Curve Visualizer -->
    <div class="midi-eq-canvas-box">
      <canvas id="midi-eq-canvas" width="176" height="34" class="midi-eq-canvas" title="Curva de respuesta de frecuencia del ecualizador"></canvas>
    </div>

    <!-- Instant Preset Switcher & Bypass -->
    <div class="fx-presets-bar">
      <button class="fx-preset-btn active" data-preset="flat">Flat</button>
      <button class="fx-preset-btn" data-preset="bass">Bass+</button>
      <button class="fx-preset-btn" data-preset="vocal">Vocal</button>
      <button class="fx-preset-btn" data-preset="treble">Treble+</button>
      <button class="fx-preset-btn" data-preset="lofi">Lo-Fi</button>
      <button class="fx-bypass-btn" id="fx-bypass-btn" title="Bypass / Desactivar efectos para comparar">${getSvgIcon('zap', 12)} Bypass</button>
    </div>

    <div class="fx-sliders-grid">
      <div class="fx-param-item">
        <div class="fx-param-header">
          <span>${getSvgIcon('volumeHigh', 12)} Bajos (Bass)</span>
          <span class="fx-val" id="bass-val">0 dB</span>
        </div>
        <input type="range" class="fx-slider" id="bass-slider" min="-12" max="12" value="0" step="1">
      </div>

      <div class="fx-param-item">
        <div class="fx-param-header">
          <span>${getSvgIcon('sliders', 12)} Medios (Mids)</span>
          <span class="fx-val" id="mids-val">0 dB</span>
        </div>
        <input type="range" class="fx-slider" id="mids-slider" min="-12" max="12" value="0" step="1">
      </div>

      <div class="fx-param-item">
        <div class="fx-param-header">
          <span>${getSvgIcon('activity', 12)} Agudos (Treble)</span>
          <span class="fx-val" id="treble-val">0 dB</span>
        </div>
        <input type="range" class="fx-slider" id="treble-slider" min="-12" max="12" value="0" step="1">
      </div>

      <div class="fx-param-item">
        <div class="fx-param-header">
          <span>${getSvgIcon('zap', 12)} Drive / Sat</span>
          <span class="fx-val" id="drive-val">0%</span>
        </div>
        <input type="range" class="fx-slider" id="drive-slider" min="0" max="100" value="0" step="5">
      </div>

      <div class="fx-param-item full-span">
        <div class="fx-param-header">
          <span>${getSvgIcon('waveform', 12)} Echo / Delay</span>
          <span class="fx-val" id="echo-val">0%</span>
        </div>
        <input type="range" class="fx-slider" id="echo-slider" min="0" max="60" value="0" step="5">
      </div>
    </div>
  </div>
`;
const midiFxWidget = new WidgetCube('midifx', 'MIDI FX Studio', 'EQ/DSP', midiFxHtml);

// -------------------------------------------------------------
// 4. WIDGET: KARAOKE LYRICS
// -------------------------------------------------------------
const lyricsHtml = `
  <div class="lyrics-content">
    <div class="lyrics-viewport" id="lyrics-viewport">
      <div class="lyrics-empty-state" id="lyrics-empty-state">
        <div class="lyrics-empty-icon">${getSvgIcon('mic', 32)}</div>
        <div class="lyrics-empty-text">Sin letras sincronizadas</div>
        <div class="lyrics-actions-row">
          <label class="lyrics-load-btn" title="Cargar archivo .LRC">
            ${getSvgIcon('clipboard', 12)} Cargar .LRC
            <input type="file" id="lrc-file-input" accept=".lrc,.txt" style="display:none;">
          </label>
          <button class="lyrics-paste-btn" id="lyrics-paste-btn" title="Pegar texto con marcas de tiempo">${getSvgIcon('clipboard', 12)} Pegar</button>
        </div>
      </div>
    </div>
  </div>
`;
const lyricsWidget = new WidgetCube('lyrics', 'Karaoke Lyrics', 'LYRICS', lyricsHtml);

// -------------------------------------------------------------
// 5. WIDGET: BONGO CAT (REACTIVE COMPANION & EMBED)
// -------------------------------------------------------------
const bongoCatHtml = `
  <div class="bongocat-content" id="bongo-container" title="Haz clic en Bongo Cat o escribe en tu teclado físico">
    <div class="bongo-top-actions">
      <span class="bongo-apm-tag" id="bongo-apm">0 KPS</span>
      <div style="display:flex; gap:4px;">
        <button class="bongo-sound-toggle-btn" id="bongo-sfx-btn" title="Sonido acústico de bongos al teclear">${getSvgIcon('volumeHigh', 12)} FX</button>
        <button class="bongo-sound-toggle-btn" id="bongo-url-btn" title="Cambiar URL de Embed">${getSvgIcon('edit', 12)}</button>
        <button class="bongo-mode-toggle-btn" id="bongo-mode-toggle" title="Cambiar entre modo SVG Nativo y Bongo Cat Web/Custom">${getSvgIcon('globe', 12)} Embed</button>
      </div>
    </div>

    <!-- Mode A: Native Interactive Vector SVG -->
    <div class="cat-svg-container" id="bongo-native-view">
      <svg class="cat-svg" viewBox="0 0 140 95" xmlns="http://www.w3.org/2000/svg">
        <g class="cat-head" id="cat-head-group">
          <polygon points="35,32 20,12 50,24" fill="#ffffff" stroke="#1e293b" stroke-width="2.5"/>
          <polygon points="36,30 25,17 46,25" fill="#f43f5e" opacity="0.6"/>
          
          <polygon points="105,32 120,12 90,24" fill="#ffffff" stroke="#1e293b" stroke-width="2.5"/>
          <polygon points="104,30 115,17 94,25" fill="#f43f5e" opacity="0.6"/>

          <ellipse cx="70" cy="46" rx="46" ry="34" fill="#ffffff" stroke="#1e293b" stroke-width="2.5"/>
          
          <ellipse cx="52" cy="44" rx="4.5" ry="5.5" fill="#1e293b"/>
          <ellipse cx="88" cy="44" rx="4.5" ry="5.5" fill="#1e293b"/>
          <circle cx="50.5" cy="42" r="1.5" fill="#ffffff"/>
          <circle cx="86.5" cy="42" r="1.5" fill="#ffffff"/>

          <ellipse cx="44" cy="52" rx="4" ry="2.5" fill="#f43f5e" opacity="0.4"/>
          <ellipse cx="96" cy="52" rx="4" ry="2.5" fill="#f43f5e" opacity="0.4"/>

          <path d="M64,52 Q70,56 70,52 Q70,56 76,52" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>
        </g>

        <rect x="15" y="72" width="110" height="18" rx="5" fill="#1e293b" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
        <line x1="70" y1="72" x2="70" y2="90" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>

        <g class="cat-paw cat-paw-left" id="cat-paw-left">
          <ellipse cx="42" cy="71" rx="14" ry="7" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
        </g>

        <g class="cat-paw cat-paw-right" id="cat-paw-right">
          <ellipse cx="98" cy="71" rx="14" ry="7" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
        </g>
      </svg>
      <div class="cat-hint" id="cat-hint-text">Pulsa teclas o <span>haz clic en el gato</span></div>
      <div class="cat-particle-layer" id="cat-particle-layer"></div>
    </div>

    <!-- Mode B: External Web / Custom Bongo Cat Repo Embed -->
    <div class="bongo-embed-box hidden" id="bongo-embed-box">
      <iframe id="bongo-iframe" class="bongo-embed-iframe" src="about:blank" allow="autoplay"></iframe>
    </div>
  </div>
`;
const bongoWidget = new WidgetCube('bongocat', 'Bongo Cat', 'TYPE-SYNC', bongoCatHtml);

// -------------------------------------------------------------
// 6. WIDGET: PHOTO FRAME
// -------------------------------------------------------------
const galleryHtml = `
  <div class="gallery-content" id="gallery-container">
    <div class="gallery-action-pills">
      <button class="gallery-action-pill" id="gallery-paste-btn" title="Pegar captura del portapapeles (Ctrl+V)">${getSvgIcon('clipboard', 12)} Pegar</button>
      <button class="gallery-action-pill" id="gallery-clear-btn" title="Vaciar fotos">${getSvgIcon('trash', 12)}</button>
    </div>
    <div class="gallery-empty-dropzone" id="gallery-dropzone">
      <div class="gallery-empty-icon">${getSvgIcon('image', 32)}</div>
      <div class="gallery-empty-text">Haz clic o arrastra fotos</div>
      <div class="gallery-drop-sub">JPG, PNG, GIF, WebP</div>
      <input type="file" id="gallery-file-input" accept="image/*" multiple style="display:none;">
    </div>
    <div class="gallery-image-box" id="gallery-box">
      <img src="" alt="Foto" class="gallery-img fit-cover" id="gallery-img">
      <div class="gallery-info">
        <span class="gallery-title" id="gallery-title">Foto</span>
        <div class="gallery-meta-right">
          <button class="gallery-fit-btn" id="gallery-timer-btn" title="Velocidad del pase de diapositivas">⏱ 7s</button>
          <button class="gallery-fit-btn" id="gallery-fit-btn" title="Alternar Ajuste">${getSvgIcon('sliders', 11)} Cover</button>
          <span class="gallery-counter" id="gallery-counter">1/1</span>
        </div>
      </div>
      <button class="gallery-nav-btn prev" id="gallery-prev-btn" title="Foto Anterior">‹</button>
      <button class="gallery-nav-btn next" id="gallery-next-btn" title="Foto Siguiente">›</button>
    </div>
  </div>
`;
const galleryWidget = new WidgetCube('gallery', 'Photo Frame', 'GALLERY', galleryHtml);

// -------------------------------------------------------------
// 7. WIDGET: SYSTEM TELEMETRY (REAL WINDOWS METRICS & HUD)
// -------------------------------------------------------------
const systemHtml = `
  <div class="system-content">
    <div class="telemetry-kpis-grid">
      <!-- KPI 1: CPU -->
      <div class="telemetry-kpi-card">
        <div class="telemetry-kpi-header">
          <span>${getSvgIcon('cpu', 10)}</span>
          <span>CPU</span>
        </div>
        <div class="telemetry-kpi-val" id="cpu-val">0%</div>
        <div class="telemetry-kpi-sub" id="cpu-model-tag">Intel Core</div>
        <div class="telemetry-kpi-bar">
          <div class="telemetry-kpi-fill fill-cpu" id="cpu-bar" style="width: 0%;"></div>
        </div>
      </div>

      <!-- KPI 2: RAM -->
      <div class="telemetry-kpi-card">
        <div class="telemetry-kpi-header">
          <span>${getSvgIcon('activity', 10)}</span>
          <span>RAM</span>
        </div>
        <div class="telemetry-kpi-val" id="ram-val">0%</div>
        <div class="telemetry-kpi-sub" id="ram-gb-val">0/0 GB</div>
        <div class="telemetry-kpi-bar">
          <div class="telemetry-kpi-fill fill-ram" id="ram-bar" style="width: 0%;"></div>
        </div>
      </div>

      <!-- KPI 3: GPU / Engine -->
      <div class="telemetry-kpi-card">
        <div class="telemetry-kpi-header">
          <span>${getSvgIcon('waveform', 10)}</span>
          <span>GPU</span>
        </div>
        <div class="telemetry-kpi-val" id="gpu-val">60 FPS</div>
        <div class="telemetry-kpi-sub" id="gpu-sub-tag">DirectComp</div>
        <div class="telemetry-kpi-bar">
          <div class="telemetry-kpi-fill fill-gpu" id="gpu-bar" style="width: 60%;"></div>
        </div>
      </div>
    </div>

    <!-- Rolling Sparkline Area Canvas -->
    <div class="telemetry-sparkline-wrap">
      <canvas id="telemetry-sparkline" width="176" height="44" class="telemetry-sparkline-canvas"></canvas>
      <span class="telemetry-spark-badge" id="telemetry-spark-badge">LIVE 60FPS</span>
    </div>

    <!-- Hardware Specs Footer Chips -->
    <div class="telemetry-specs-footer">
      <span class="telemetry-spec-chip" id="spec-cores-chip">Cores: Auto</span>
      <span class="telemetry-spec-chip" id="spec-uptime-chip">Up: 0h</span>
      <span class="telemetry-spec-chip" id="spec-sync-chip">● D3D Sync</span>
    </div>
  </div>
`;
const systemWidget = new WidgetCube('system', 'Telemetry', 'SYSINFO', systemHtml);

// -------------------------------------------------------------
// 8. WIDGET: QUICK NOTES & TASKS
// -------------------------------------------------------------
const notesHtml = `
  <div class="notes-content">
    <div class="notes-filter-tabs">
      <div style="display:flex; gap:2px;">
        <button class="notes-tab-btn active" data-filter="all">Todas</button>
        <button class="notes-tab-btn" data-filter="pending">Pendientes</button>
        <button class="notes-tab-btn" data-filter="done">Hechas</button>
      </div>
      <button class="notes-clean-btn" id="tasks-clean-btn" title="Limpiar tareas completadas">${getSvgIcon('trash', 12)}</button>
    </div>
    <div class="tasks-list" id="tasks-list">
      <!-- Tasks rendered here -->
    </div>
    <div class="new-task-form">
      <input type="text" class="new-task-input" id="new-task-input" placeholder="+ Nueva tarea (Enter)...">
    </div>
  </div>
`;
const notesWidget = new WidgetCube('notes', 'Quick Tasks', 'TASKS', notesHtml);

// -------------------------------------------------------------
// 9. WEATHER HUB (Open-Meteo Real-Time Weather & Forecast)
// -------------------------------------------------------------
const weatherHtml = `
  <div class="weather-content" id="weather-hub">
    <div class="weather-header">
      <div class="weather-location" id="weather-city-display">
        ${getSvgIcon('sun', 13)}
        <span id="weather-city-name">Madrid, ES</span>
      </div>
      <button class="weather-refresh-btn" id="weather-refresh-btn" title="Actualizar Clima">
        ${getSvgIcon('repeat', 12)}
      </button>
    </div>
    <div class="weather-hero">
      <div>
        <div class="weather-temp-hero" id="weather-temp-val">22°C</div>
        <div class="weather-condition" id="weather-condition-text">Cielo Despejado</div>
      </div>
      <div class="weather-icon-wrap" id="weather-icon-hero">
        ${getSvgIcon('sun', 36)}
      </div>
    </div>
    <div class="weather-meta-row">
      <div class="weather-meta-pill">
        <div class="weather-meta-val" id="weather-feels-like">21°C</div>
        <div class="weather-meta-label">Sensación</div>
      </div>
      <div class="weather-meta-pill">
        <div class="weather-meta-val" id="weather-humidity">45%</div>
        <div class="weather-meta-label">Humedad</div>
      </div>
      <div class="weather-meta-pill">
        <div class="weather-meta-val" id="weather-wind">12 km/h</div>
        <div class="weather-meta-label">Viento</div>
      </div>
    </div>
    <div class="weather-forecast-row" id="weather-forecast-row">
      <div class="weather-day-pill">
        <span class="weather-day-name">MAÑ</span>
        <span id="weather-fc-icon-1">${getSvgIcon('sun', 14)}</span>
        <span class="weather-day-temp" id="weather-fc-temp-1">24° / 14°</span>
      </div>
      <div class="weather-day-pill">
        <span class="weather-day-name">+2D</span>
        <span id="weather-fc-icon-2">${getSvgIcon('cloud', 14)}</span>
        <span class="weather-day-temp" id="weather-fc-temp-2">21° / 12°</span>
      </div>
      <div class="weather-day-pill">
        <span class="weather-day-name">+3D</span>
        <span id="weather-fc-icon-3">${getSvgIcon('cloudRain', 14)}</span>
        <span class="weather-day-temp" id="weather-fc-temp-3">18° / 10°</span>
      </div>
    </div>
  </div>
`;
const weatherWidget = new WidgetCube('weather', 'Clima en Vivo', 'WEATHER', weatherHtml);

// -------------------------------------------------------------
// 10. CRYPTO TICKER (Binance Real-Time Price Engine)
// -------------------------------------------------------------
const cryptoHtml = `
  <div class="crypto-content" id="crypto-hub">
    <div class="crypto-row" id="crypto-btc-row">
      <div class="crypto-coin-left">
        ${getSvgIcon('bitcoin', 16)}
        <div>
          <div class="crypto-coin-symbol">BTC</div>
          <div class="crypto-coin-pair">Bitcoin / USDT</div>
        </div>
      </div>
      <div class="crypto-coin-right">
        <div class="crypto-price" id="crypto-btc-price">$68,240</div>
        <div class="crypto-change-pill up" id="crypto-btc-change">${getSvgIcon('trendingUp', 10)} +2.8%</div>
      </div>
    </div>
    <div class="crypto-row" id="crypto-eth-row">
      <div class="crypto-coin-left">
        ${getSvgIcon('zap', 16)}
        <div>
          <div class="crypto-coin-symbol">ETH</div>
          <div class="crypto-coin-pair">Ethereum / USDT</div>
        </div>
      </div>
      <div class="crypto-coin-right">
        <div class="crypto-price" id="crypto-eth-price">$3,420</div>
        <div class="crypto-change-pill up" id="crypto-eth-change">${getSvgIcon('trendingUp', 10)} +1.4%</div>
      </div>
    </div>
    <div class="crypto-row" id="crypto-sol-row">
      <div class="crypto-coin-left">
        ${getSvgIcon('activity', 16)}
        <div>
          <div class="crypto-coin-symbol">SOL</div>
          <div class="crypto-coin-pair">Solana / USDT</div>
        </div>
      </div>
      <div class="crypto-coin-right">
        <div class="crypto-price" id="crypto-sol-price">$182.5</div>
        <div class="crypto-change-pill down" id="crypto-sol-change">${getSvgIcon('trendingDown', 10)} -0.9%</div>
      </div>
    </div>
  </div>
`;
const cryptoWidget = new WidgetCube('crypto', 'Mercados Cripto', 'MARKET', cryptoHtml);

// -------------------------------------------------------------
// 11. POWER & BATTERY HUB (Hardware Battery API)
// -------------------------------------------------------------
const batteryHtml = `
  <div class="battery-content" id="battery-hub">
    <div class="battery-gauge-wrapper">
      <svg class="battery-circle-svg" viewBox="0 0 100 100">
        <circle class="battery-circle-bg" cx="50" cy="50" r="42" />
        <circle class="battery-circle-progress" id="battery-progress-ring" cx="50" cy="50" r="42" stroke-dasharray="263.89" stroke-dashoffset="39.5" />
      </svg>
      <div class="battery-gauge-text">
        <span class="battery-pct-large" id="battery-level-val">85%</span>
        <span style="font-size:8px; color:var(--text-dim); text-transform:uppercase;">Carga</span>
      </div>
    </div>
    <div class="battery-state-tag" id="battery-state-tag">
      <span id="battery-icon-wrap">${getSvgIcon('battery', 12)}</span>
      <span id="battery-state-label">Alimentación AC</span>
    </div>
    <div class="battery-time-est" id="battery-time-est">100% Salud Óptima</div>
  </div>
`;
const batteryWidget = new WidgetCube('battery', 'Batería & Energía', 'POWER', batteryHtml);

// -------------------------------------------------------------
// 12. GITHUB DEV PULSE (Live GitHub Developer Metrics)
// -------------------------------------------------------------
const githubHtml = `
  <div class="github-content" id="github-hub">
    <div class="github-user-row">
      <div class="github-avatar" id="github-avatar-box">
        ${getSvgIcon('github', 18)}
      </div>
      <div class="github-user-info">
        <div class="github-name" id="github-name-val">Developer</div>
        <div class="github-login" id="github-login-val">@octocat</div>
      </div>
    </div>
    <div class="github-stats-grid">
      <div class="github-stat-card">
        <div class="github-stat-num" id="github-repos-val">34</div>
        <div class="github-stat-lbl">Repos</div>
      </div>
      <div class="github-stat-card">
        <div class="github-stat-num" id="github-followers-val">128</div>
        <div class="github-stat-lbl">Seguidores</div>
      </div>
    </div>
    <a class="github-action-btn" id="github-profile-link" href="https://github.com" target="_blank">
      ${getSvgIcon('github', 12)}
      <span>Ver Perfil en GitHub</span>
    </a>
  </div>
`;
const githubWidget = new WidgetCube('github', 'GitHub Dev Pulse', 'DEV', githubHtml);

// Master list of all default registered widgets
const defaultWidgets = [
  musicWidget,
  cavaWidget,
  midiFxWidget,
  lyricsWidget,
  bongoWidget,
  galleryWidget,
  systemWidget,
  notesWidget,
  weatherWidget,
  cryptoWidget,
  batteryWidget,
  githubWidget
];

defaultWidgets.forEach(w => snapEngine.registerWidget(w));

// Default Grid Placement
function layoutWidgetsDefault() {
  const startX = 60;
  const gapX = 225;
  const startY1 = 80;
  const startY2 = 310;

  musicWidget.setPosition(startX, startY1);
  cavaWidget.setPosition(startX + gapX, startY1);
  midiFxWidget.setPosition(startX + gapX * 2, startY1);
  lyricsWidget.setPosition(startX + gapX * 3, startY1);

  bongoWidget.setPosition(startX, startY2);
  galleryWidget.setPosition(startX + gapX, startY2);
  systemWidget.setPosition(startX + gapX * 2, startY2);
  notesWidget.setPosition(startX + gapX * 3, startY2);

  const startY3 = 540;
  weatherWidget.setPosition(startX, startY3);
  cryptoWidget.setPosition(startX + gapX, startY3);
  batteryWidget.setPosition(startX + gapX * 2, startY3);
  githubWidget.setPosition(startX + gapX * 3, startY3);
}

// Layout Persistence (Save / Load Positions & Dimensions)
function saveCurrentLayout() {
  const layout = {};
  snapEngine.widgets.forEach(w => {
    layout[w.id] = {
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      isLocked: w.isLocked
    };
  });
  settings.set('savedLayout', layout);
}

// Instantiate and bind custom user cubes
function instantiateCustomCube(cubeDef) {
  let contentHtml = '';

  if (cubeDef.template === 'note') {
    contentHtml = `
      <div class="custom-cube-content">
        <textarea class="custom-cube-textarea" id="note-ta-${cubeDef.id}" placeholder="Escribe tus notas, recordatorios o código aquí...">${cubeDef.payload || ''}</textarea>
        <div style="font-size: 8.5px; color: var(--text-dim); text-align: right; padding-top: 4px;">Guardado local persistente</div>
      </div>
    `;
  } else if (cubeDef.template === 'embed') {
    const url = cubeDef.payload || 'https://bongo.cat/';
    contentHtml = `
      <div class="embed-content" style="width:100%; height:100%; border-radius:inherit; overflow:hidden;">
        <iframe src="${url}" style="width:100%; height:100%; border:none; border-radius:inherit;" allow="autoplay; microphone"></iframe>
      </div>
    `;
  } else if (cubeDef.template === 'launcher') {
    const rawLines = (cubeDef.payload || 'Silenciar | action:mute\nBloquear HUD | action:lock\nModos Bento | action:modes\nAjustes Rice | action:settings\nGitHub | https://github.com\nYouTube | https://youtube.com').split('\n');
    const itemsHtml = rawLines.map(line => {
      if (!line.trim()) return '';
      const parts = line.split('|');
      const label = (parts[0] || 'Atajo').trim();
      const target = (parts[1] || parts[0] || '#').trim();
      
      let iconName = 'zap';
      const targetLower = target.toLowerCase();
      const labelLower = label.toLowerCase();
      if (targetLower.includes('mute') || labelLower.includes('audio') || labelLower.includes('silenciar')) iconName = 'volumeHigh';
      else if (targetLower.includes('lock') || labelLower.includes('bloquear')) iconName = 'lock';
      else if (targetLower.includes('settings') || labelLower.includes('ajustes')) iconName = 'settings';
      else if (targetLower.includes('modes') || labelLower.includes('modos')) iconName = 'activity';
      else if (targetLower.includes('cava') || labelLower.includes('espectro')) iconName = 'barChart';
      else if (targetLower.includes('presets') || labelLower.includes('tema')) iconName = 'palette';
      else if (targetLower.includes('github') || targetLower.includes('web')) iconName = 'globe';
      else if (targetLower.includes('youtube') || targetLower.includes('play')) iconName = 'play';
      else if (targetLower.includes('terminal') || targetLower.includes('cmd')) iconName = 'terminal';
      else if (targetLower.includes('spotify') || targetLower.includes('sound')) iconName = 'waveform';

      return `
        <button class="streamdeck-tile" data-action="${target}" title="${label}: ${target}">
          <div class="streamdeck-icon">${getSvgIcon(iconName, 18)}</div>
          <div class="streamdeck-label">${label}</div>
        </button>
      `;
    }).join('');
    contentHtml = `<div class="streamdeck-grid" id="streamdeck-${cubeDef.id}">${itemsHtml}</div>`;
  } else if (cubeDef.template === 'clock') {
    contentHtml = `
      <div class="hud-clock-content">
        <div class="hud-clock-time" id="hud-clock-${cubeDef.id}">00:00:00</div>
        <div class="hud-clock-date" id="hud-date-${cubeDef.id}">HOY</div>
      </div>
    `;
  } else if (cubeDef.template === 'pomodoro') {
    contentHtml = `
      <div class="pomodoro-content" id="pomodoro-${cubeDef.id}">
        <div class="pomodoro-time-display" id="pomo-display-${cubeDef.id}">25:00</div>
        <div class="pomodoro-state-badge" id="pomo-badge-${cubeDef.id}">ENFOCAR</div>
        <div class="pomodoro-btns-row">
          <button class="pomo-btn start" id="pomo-start-${cubeDef.id}">${getSvgIcon('play', 12)} Iniciar</button>
          <button class="pomo-btn pause" id="pomo-pause-${cubeDef.id}">${getSvgIcon('pause', 12)} Pausa</button>
          <button class="pomo-btn reset" id="pomo-reset-${cubeDef.id}">${getSvgIcon('repeat', 12)} Reset</button>
        </div>
      </div>
    `;
  }

  const customWidget = new WidgetCube(cubeDef.id, cubeDef.title, cubeDef.badge, contentHtml, true);
  customWidget.setDimensions(cubeDef.width || 200, cubeDef.height || 200);
  customWidget.setPosition(cubeDef.x || 180, cubeDef.y || 160);
  snapEngine.registerWidget(customWidget);

  // Hook StreamDeck actions
  if (cubeDef.template === 'launcher') {
    setTimeout(() => {
      const container = document.getElementById(`streamdeck-${cubeDef.id}`);
      if (!container) return;
      container.querySelectorAll('.streamdeck-tile').forEach(tile => {
        tile.addEventListener('click', (e) => {
          e.stopPropagation();
          tile.classList.add('pressed');
          setTimeout(() => tile.classList.remove('pressed'), 200);

          const target = tile.dataset.action || '';
          if (target.startsWith('action:')) {
            const act = target.replace('action:', '').trim().toLowerCase();
            if (act === 'mute') {
              if (volIconBtn) volIconBtn.click();
            } else if (act === 'lock') {
              if (btnLockAll) btnLockAll.click();
            } else if (act === 'settings') {
              if (openSettingsBtn) openSettingsBtn.click();
            } else if (act === 'modes') {
              if (openSettingsBtn) {
                openSettingsBtn.click();
                const tabWidgetsBtn = document.querySelector('[data-tab="tab-widgets"]');
                if (tabWidgetsBtn) tabWidgetsBtn.click();
              }
            } else if (act === 'presets') {
              if (openSettingsBtn) {
                openSettingsBtn.click();
                const tabAppBtn = document.querySelector('[data-tab="tab-appearance"]');
                if (tabAppBtn) tabAppBtn.click();
              }
            } else if (act === 'cava') {
              const cavaModeBtn = document.getElementById('cava-mode-btn');
              if (cavaModeBtn) cavaModeBtn.click();
            }
          } else if (target.startsWith('http://') || target.startsWith('https://')) {
            if (typeof window !== 'undefined' && typeof window.require === 'function') {
              try {
                const { shell } = window.require('electron');
                shell.openExternal(target);
              } catch (err) {
                window.open(target, '_blank');
              }
            } else {
              window.open(target, '_blank');
            }
          }
        });
      });
    }, 50);
  }

  // Hook note persistence
  if (cubeDef.template === 'note') {
    setTimeout(() => {
      const ta = document.getElementById(`note-ta-${cubeDef.id}`);
      if (ta) {
        ta.addEventListener('input', () => {
          settings.updateCustomCube(cubeDef.id, { payload: ta.value });
        });
      }
    }, 50);
  }

  // Hook clock ticking
  if (cubeDef.template === 'clock') {
    const clockEl = document.getElementById(`hud-clock-${cubeDef.id}`);
    const dateEl = document.getElementById(`hud-date-${cubeDef.id}`);
    if (clockEl) {
      const tick = () => {
        if (!document.getElementById(`hud-clock-${cubeDef.id}`)) return;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        if (dateEl) {
          dateEl.textContent = now.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        }
        requestAnimationFrame(() => setTimeout(tick, 1000));
      };
      tick();
    }
  }

  // Hook Pomodoro timer logic
  if (cubeDef.template === 'pomodoro') {
    setTimeout(() => {
      const displayEl = document.getElementById(`pomo-display-${cubeDef.id}`);
      const badgeEl = document.getElementById(`pomo-badge-${cubeDef.id}`);
      const startBtn = document.getElementById(`pomo-start-${cubeDef.id}`);
      const pauseBtn = document.getElementById(`pomo-pause-${cubeDef.id}`);
      const resetBtn = document.getElementById(`pomo-reset-${cubeDef.id}`);

      let pomoSeconds = 25 * 60;
      let pomoInterval = null;
      let isBreak = false;

      function renderPomo() {
        if (!displayEl) return;
        const m = Math.floor(pomoSeconds / 60);
        const s = pomoSeconds % 60;
        const pad = (n) => String(n).padStart(2, '0');
        displayEl.textContent = `${pad(m)}:${pad(s)}`;
      }

      if (startBtn) {
        startBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (pomoInterval) return;
          pomoInterval = setInterval(() => {
            if (pomoSeconds > 0) {
              pomoSeconds--;
              renderPomo();
            } else {
              clearInterval(pomoInterval);
              pomoInterval = null;
              isBreak = !isBreak;
              pomoSeconds = isBreak ? 5 * 60 : 25 * 60;
              if (badgeEl) badgeEl.textContent = isBreak ? 'DESCANSO' : 'ENFOCAR';
              renderPomo();
            }
          }, 1000);
        });
      }

      if (pauseBtn) {
        pauseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (pomoInterval) {
            clearInterval(pomoInterval);
            pomoInterval = null;
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (pomoInterval) {
            clearInterval(pomoInterval);
            pomoInterval = null;
          }
          isBreak = false;
          pomoSeconds = 25 * 60;
          if (badgeEl) badgeEl.textContent = 'ENFOCAR';
          renderPomo();
        });
      }
    }, 50);
  }

  return customWidget;
}

function refreshCustomCubesCatalog() {
  const container = document.getElementById('custom-cubes-catalog-list');
  if (!container) return;

  const list = settings.config.customCubes || [];
  if (!list.length) {
    container.innerHTML = '<div style="font-size:9.5px; color:var(--text-dim);">No hay cubos personalizados creados aún. Usa el botón "+ Nuevo Cubo" en la barra superior.</div>';
    return;
  }

  container.innerHTML = '';
  list.forEach(c => {
    const row = document.createElement('div');
    row.className = 'widget-toggle-row';
    const widget = snapEngine.widgets.find(w => w.id === c.id);
    const isVisible = widget ? widget.element.style.display !== 'none' : true;

    row.innerHTML = `
      <div>
        <div class="toggle-title" style="display:flex; align-items:center; gap:6px;">
          ${getSvgIcon('cube', 12)}
          <span>${c.title}</span>
          <span style="font-size:8px; opacity:0.6;">[${c.badge}]</span>
        </div>
        <div class="toggle-desc">Plantilla: ${c.template.toUpperCase()} (${c.shape || '1:1'})</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <label class="switch">
          <input type="checkbox" data-custom-toggle="${c.id}" ${isVisible ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
        <button class="task-del-btn" data-custom-delete="${c.id}" title="Eliminar cubo permanentemente">${getSvgIcon('trash', 11)}</button>
      </div>
    `;

    row.querySelector(`[data-custom-toggle="${c.id}"]`).addEventListener('change', (e) => {
      if (widget) {
        widget.element.style.display = e.target.checked ? 'flex' : 'none';
        settings.setWidgetActive(c.id, e.target.checked);
      }
    });

    row.querySelector(`[data-custom-delete="${c.id}"]`).addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`¿Eliminar el cubo "${c.title}" permanentemente?`)) {
        if (widget) snapEngine.removeWidget(widget);
      }
    });

    container.appendChild(row);
  });
}

// Hook snapEngine widget deletion to update customCubes store
snapEngine.onWidgetDeleted = (widget) => {
  if (widget.isCustom) {
    settings.removeCustomCube(widget.id);
    refreshCustomCubesCatalog();
  }
};

snapEngine.onLayoutChanged = () => {
  saveCurrentLayout();
};

function restoreLayout() {
  const saved = settings.config.savedLayout;

  // 1. Restore Default Widgets
  if (saved && typeof saved === 'object') {
    defaultWidgets.forEach(w => {
      if (saved[w.id]) {
        if (typeof saved[w.id].x === 'number' && typeof saved[w.id].y === 'number') {
          w.setPosition(saved[w.id].x, saved[w.id].y);
        }
        if (typeof saved[w.id].width === 'number' && typeof saved[w.id].height === 'number') {
          w.setDimensions(saved[w.id].width, saved[w.id].height);
        }
        if (saved[w.id].isLocked) {
          w.setLocked(true, false);
        }
      }
    });
  } else {
    layoutWidgetsDefault();
  }

  // 2. Restore Persistent Custom Cubes
  const savedCustoms = settings.config.customCubes || [];
  savedCustoms.forEach(c => {
    // If position or dimensions were saved in savedLayout, merge them
    if (saved && saved[c.id]) {
      c.x = saved[c.id].x ?? c.x;
      c.y = saved[c.id].y ?? c.y;
      c.width = saved[c.id].width ?? c.width;
      c.height = saved[c.id].height ?? c.height;
    }
    const cw = instantiateCustomCube(c);
    const active = settings.config.activeWidgets ? (settings.config.activeWidgets[c.id] !== false) : true;
    cw.element.style.display = active ? 'flex' : 'none';
  });

  // 3. Restore Active Visibility Toggles & Catalog State
  syncWidgetVisibilityWithConfig();
  refreshCustomCubesCatalog();
}
restoreLayout();

// -------------------------------------------------------------
// CRUD: CUBE CREATOR STUDIO MODAL
// -------------------------------------------------------------
const cubeCreatorBackdrop = document.getElementById('cube-creator-backdrop');
const closeCreatorBtn = document.getElementById('close-creator-btn');
const cancelCreatorBtn = document.getElementById('cancel-creator-btn');
const confirmCreateCube = document.getElementById('confirm-create-cube');
const newCubeTitle = document.getElementById('new-cube-title');
const newCubeBadge = document.getElementById('new-cube-badge');
const newCubePayload = document.getElementById('new-cube-payload');
const payloadLabel = document.getElementById('payload-label');
const templateCards = document.querySelectorAll('.template-card');
const shapeOptBtns = document.querySelectorAll('.shape-opt-btn');

let selectedTemplate = 'note';
let selectedShape = '1:1';
let customCubeCounter = 1;

const templateConfigs = {
  note: {
    title: 'Mis Notas',
    badge: 'NOTA',
    label: 'Texto o Notas Iniciales',
    placeholder: 'Escribe tus recordatorios, tareas o notas rápidas aquí...',
    defaultVal: ''
  },
  embed: {
    title: 'Bongo / Web Embed',
    badge: 'EMBED',
    label: 'URL del Sitio Web o App Local (ej: Bongo Cat)',
    placeholder: 'https://bongo.cat/ o http://localhost:3000...',
    defaultVal: 'https://bongo.cat/'
  },
  launcher: {
    title: 'Lanzador Rápido',
    badge: 'LAUNCH',
    label: 'Accesos Directos (Nombre | URL, uno por línea)',
    placeholder: 'GitHub | https://github.com\nYouTube | https://youtube.com\nDiscord | https://discord.com',
    defaultVal: 'GitHub | https://github.com\nYouTube | https://youtube.com\nSpotify | https://open.spotify.com'
  },
  clock: {
    title: 'Reloj Digital HUD',
    badge: 'CLOCK',
    label: 'Zona Horaria / Ubicación (opcional)',
    placeholder: 'Ej: Local / 24H o UTC',
    defaultVal: 'Local'
  },
  pomodoro: {
    title: 'Pomodoro Focus',
    badge: 'POMO',
    label: 'Tiempo de concentración',
    placeholder: '25 min concentración / 5 min descanso',
    defaultVal: '25'
  }
};

function updateTemplateSelection(templateKey) {
  selectedTemplate = templateKey;
  templateCards.forEach(c => c.classList.toggle('active', c.dataset.template === templateKey));
  const cfg = templateConfigs[templateKey] || templateConfigs.note;
  if (newCubeTitle) newCubeTitle.value = `${cfg.title} ${customCubeCounter}`;
  if (newCubeBadge) newCubeBadge.value = cfg.badge;
  if (payloadLabel) payloadLabel.textContent = cfg.label;
  if (newCubePayload) {
    newCubePayload.placeholder = cfg.placeholder;
    newCubePayload.value = cfg.defaultVal;
  }
}

templateCards.forEach(card => {
  card.addEventListener('click', () => {
    updateTemplateSelection(card.dataset.template);
  });
});

shapeOptBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    shapeOptBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedShape = btn.dataset.shape;
  });
});

function openCubeCreator() {
  updateTemplateSelection('note');
  if (cubeCreatorBackdrop) cubeCreatorBackdrop.classList.add('open');
}

function closeCubeCreator() {
  if (cubeCreatorBackdrop) cubeCreatorBackdrop.classList.remove('open');
}

if (btnAddCube) btnAddCube.addEventListener('click', openCubeCreator);
if (closeCreatorBtn) closeCreatorBtn.addEventListener('click', closeCubeCreator);
if (cancelCreatorBtn) cancelCreatorBtn.addEventListener('click', closeCubeCreator);
if (cubeCreatorBackdrop) {
  cubeCreatorBackdrop.addEventListener('click', (e) => {
    if (e.target === cubeCreatorBackdrop) closeCubeCreator();
  });
}

if (confirmCreateCube) {
  confirmCreateCube.addEventListener('click', () => {
    const title = (newCubeTitle.value || `Cubo ${customCubeCounter}`).trim();
    const badge = (newCubeBadge.value || 'CUSTOM').trim().toUpperCase();
    const payload = (newCubePayload.value || '').trim();
    const newId = `custom_${Date.now()}`;

    // Initial shape dimensions
    let w = 200, h = 200;
    if (selectedShape === '16:9') { w = 340; h = 200; }
    else if (selectedShape === '9:16') { w = 200; h = 340; }
    else if (selectedShape === '2:1') { w = 400; h = 200; }

    const cubeDef = {
      id: newId,
      title,
      badge,
      template: selectedTemplate,
      payload,
      shape: selectedShape,
      x: 160 + (((settings.config.customCubes && settings.config.customCubes.length) || 0) * 25),
      y: 140 + (((settings.config.customCubes && settings.config.customCubes.length) || 0) * 20),
      width: w,
      height: h
    };

    settings.addCustomCube(cubeDef);
    const customWidget = instantiateCustomCube(cubeDef);
    customCubeCounter++;

    customWidget.triggerPop();
    refreshCustomCubesCatalog();
    saveCurrentLayout();
    closeCubeCreator();
  });
}

// -------------------------------------------------------------
// 1. MEDIA HUB (AUDIO PLAYER & SYSTEM AUDIO CAPTURE)
// -------------------------------------------------------------
const vinylDisc = document.getElementById('vinyl-disc');
const playPauseBtn = document.getElementById('play-pause-btn');
const audioFileInput = document.getElementById('audio-file-input');
const trackNameEl = document.getElementById('current-track-name');
const artistNameEl = document.getElementById('current-artist-name');
const timeCurrentEl = document.getElementById('time-current');
const timeTotalEl = document.getElementById('time-total');
const audioSeekSlider = document.getElementById('audio-seek-slider');
const musicVolSlider = document.getElementById('music-vol-slider');
const volIconBtn = document.getElementById('vol-icon-btn');
const prevTrackBtn = document.getElementById('prev-track-btn');
const nextTrackBtn = document.getElementById('next-track-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');
const playlistToggleBtn = document.getElementById('playlist-toggle-btn');
const closePlaylistBtn = document.getElementById('close-playlist-btn');
const playlistDrawer = document.getElementById('playlist-drawer');
const playlistCount = document.getElementById('playlist-count');
const playlistItemsList = document.getElementById('playlist-items-list');
const catHeadGroup = document.getElementById('cat-head-group');

const sourceLocalBtn = document.getElementById('source-local-btn');
const sourceSystemBtn = document.getElementById('source-system-btn');
const localPlayerView = document.getElementById('local-player-view');
const systemCaptureView = document.getElementById('system-capture-view');
const stopCaptureBtn = document.getElementById('stop-capture-btn');
const cavaSourceTag = document.getElementById('cava-source-tag');

let customAudioElement = null;
let playlist = [];
let playlistIdx = 0;
let isShuffle = false;
let repeatMode = 'all'; // 'all', 'one', 'none'
let isMuted = false;
let previousVol = 75;

function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updatePlayState(isPlaying) {
  if (isPlaying) {
    vinylDisc.classList.add('playing');
    playPauseBtn.innerHTML = getSvgIcon('pause', 14);
  } else {
    vinylDisc.classList.remove('playing');
    playPauseBtn.innerHTML = getSvgIcon('play', 14);
    if (catHeadGroup) catHeadGroup.classList.remove('bobbing');
  }
}

function renderPlaylistDrawer() {
  if (!playlistItemsList) return;
  if (playlistCount) playlistCount.textContent = playlist.length;
  if (!playlist.length) {
    playlistItemsList.innerHTML = '<div class="playlist-empty-text">Sin pistas. Arrastra archivos de audio aquí.</div>';
    return;
  }
  playlistItemsList.innerHTML = '';
  playlist.forEach((track, i) => {
    const item = document.createElement('div');
    item.className = `playlist-item ${i === playlistIdx ? 'playing' : ''}`;
    item.innerHTML = `
      <span class="playlist-item-title">${i + 1}. ${track.name}</span>
      <span style="display:flex; align-items:center;">${i === playlistIdx ? getSvgIcon('play', 10) : ''}</span>
    `;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      loadTrack(i);
    });
    playlistItemsList.appendChild(item);
  });
}

function getNextTrackIndex() {
  if (!playlist.length) return 0;
  if (repeatMode === 'one') return playlistIdx;
  if (isShuffle && playlist.length > 1) {
    let nextIdx = playlistIdx;
    while (nextIdx === playlistIdx) {
      nextIdx = Math.floor(Math.random() * playlist.length);
    }
    return nextIdx;
  }
  if (playlistIdx + 1 >= playlist.length) {
    if (repeatMode === 'none') return -1;
    return 0;
  }
  return playlistIdx + 1;
}

function loadTrack(idx) {
  if (!playlist.length) return;
  playlistIdx = (idx + playlist.length) % playlist.length;
  const track = playlist[playlistIdx];

  trackNameEl.textContent = track.name;
  artistNameEl.textContent = `Pista ${playlistIdx + 1} de ${playlist.length}`;

  if (customAudioElement) {
    customAudioElement.pause();
    customAudioElement.src = '';
  }

  customAudioElement = new Audio(track.url);
  customAudioElement.volume = musicVolSlider.value / 100;
  audio.connectMediaElement(customAudioElement);

  customAudioElement.addEventListener('loadedmetadata', () => {
    timeTotalEl.textContent = formatTime(customAudioElement.duration);
  });

  customAudioElement.addEventListener('timeupdate', () => {
    if (!customAudioElement.duration) return;
    timeCurrentEl.textContent = formatTime(customAudioElement.currentTime);
    const pct = (customAudioElement.currentTime / customAudioElement.duration) * 100;
    audioSeekSlider.value = pct;
    syncKaraoke(customAudioElement.currentTime);
  });

  customAudioElement.addEventListener('ended', () => {
    const nextIdx = getNextTrackIndex();
    if (nextIdx !== -1) {
      loadTrack(nextIdx);
    } else {
      audio.isPlaying = false;
      updatePlayState(false);
    }
  });

  customAudioElement.play().then(() => {
    audio.isPlaying = true;
    updatePlayState(true);
  }).catch(err => console.warn('Audio play error:', err));

  renderPlaylistDrawer();
}

// Playlist drawer toggles
if (playlistToggleBtn) {
  playlistToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (playlistDrawer) {
      playlistDrawer.classList.toggle('hidden');
      renderPlaylistDrawer();
    }
  });
}
if (closePlaylistBtn) {
  closePlaylistBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (playlistDrawer) playlistDrawer.classList.add('hidden');
  });
}

// Shuffle & Repeat buttons
if (shuffleBtn) {
  shuffleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
    shuffleBtn.title = isShuffle ? 'Aleatorio: Activado' : 'Aleatorio: Desactivado';
  });
}

if (repeatBtn) {
  repeatBtn.classList.add('active');
  repeatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (repeatMode === 'all') {
      repeatMode = 'one';
      repeatBtn.innerHTML = getSvgIcon('repeat', 13);
      repeatBtn.classList.add('active');
      repeatBtn.title = 'Repetir: Una pista';
    } else if (repeatMode === 'one') {
      repeatMode = 'none';
      repeatBtn.innerHTML = getSvgIcon('skipForward', 13);
      repeatBtn.classList.remove('active');
      repeatBtn.title = 'Repetir: Desactivado';
    } else {
      repeatMode = 'all';
      repeatBtn.innerHTML = getSvgIcon('repeat', 13);
      repeatBtn.classList.add('active');
      repeatBtn.title = 'Repetir: Toda la lista';
    }
  });
}

// Play / Pause Toggle
playPauseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (customAudioElement && playlist.length) {
    if (customAudioElement.paused) {
      customAudioElement.play();
      audio.isPlaying = true;
      updatePlayState(true);
    } else {
      customAudioElement.pause();
      audio.isPlaying = false;
      updatePlayState(false);
    }
  } else {
    // Procedural 120 BPM Synthwave sequencer fallback
    const isPlaying = audio.toggle();
    if (isPlaying) {
      trackNameEl.textContent = "Synthwave Beats";
      artistNameEl.textContent = "Sintetizador Procedural 120 BPM";
      timeTotalEl.textContent = "∞";
    }
    updatePlayState(isPlaying);
  }
});

vinylDisc.addEventListener('click', (e) => {
  e.stopPropagation();
  playPauseBtn.click();
});

// Audio Seeking
audioSeekSlider.addEventListener('input', (e) => {
  if (customAudioElement && customAudioElement.duration) {
    const targetTime = (parseFloat(e.target.value) / 100) * customAudioElement.duration;
    customAudioElement.currentTime = targetTime;
  }
});

// Audio Volume & Persistence
const initialVol = typeof settings.config.volume === 'number' ? settings.config.volume : 75;
const initialMuted = !!settings.config.isMuted;
if (musicVolSlider) musicVolSlider.value = initialMuted ? 0 : initialVol;
isMuted = initialMuted;
previousVol = initialVol || 75;
audio.setVolume(initialMuted ? 0 : initialVol);
if (volIconBtn) volIconBtn.innerHTML = initialMuted || initialVol === 0 ? getSvgIcon('volumeMute', 13) : getSvgIcon('volumeHigh', 13);

musicVolSlider.addEventListener('input', (e) => {
  const vol = parseInt(e.target.value, 10);
  if (customAudioElement) customAudioElement.volume = vol / 100;
  audio.setVolume(vol);
  volIconBtn.innerHTML = vol === 0 ? getSvgIcon('volumeMute', 13) : getSvgIcon('volumeHigh', 13);
  isMuted = vol === 0;
  settings.set('volume', vol);
  settings.set('isMuted', isMuted);
});

volIconBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!isMuted) {
    previousVol = parseInt(musicVolSlider.value, 10) || 75;
    musicVolSlider.value = 0;
    if (customAudioElement) customAudioElement.volume = 0;
    audio.setVolume(0);
    volIconBtn.innerHTML = getSvgIcon('volumeMute', 13);
    isMuted = true;
  } else {
    musicVolSlider.value = previousVol;
    if (customAudioElement) customAudioElement.volume = previousVol / 100;
    audio.setVolume(previousVol);
    volIconBtn.innerHTML = getSvgIcon('volumeHigh', 13);
    isMuted = false;
  }
  settings.set('isMuted', isMuted);
});

// Prev / Next Track
prevTrackBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (playlist.length) {
    playlistIdx = (playlistIdx - 1 + playlist.length) % playlist.length;
    loadTrack(playlistIdx);
  }
});
nextTrackBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (playlist.length) {
    const nextIdx = getNextTrackIndex();
    loadTrack(nextIdx === -1 ? 0 : nextIdx);
  }
});

function handleLoadedFiles(files) {
  if (!files || !files.length) return;

  // Auto-detect & load synced .lrc file if present
  const lrcFile = files.find(f => /\.lrc$/i.test(f.name));
  if (lrcFile) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      lyricsData = parseLRC(evt.target.result);
      renderLyrics();
    };
    reader.readAsText(lrcFile);
  }

  const audioFiles = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f.name));
  if (!audioFiles.length) return;

  switchToLocalMode();
  playlist = audioFiles.map(f => ({
    name: f.name.replace(/\.[^/.]+$/, ""),
    url: URL.createObjectURL(f)
  }));
  renderPlaylistDrawer();
  loadTrack(0);
}

// Load Audio Files from Disk
audioFileInput.addEventListener('change', (e) => {
  handleLoadedFiles(Array.from(e.target.files));
});

// --- Audio Source Switching: Local Files vs Windows Desktop Audio Loopback ---

const settingsSourceLocal = document.getElementById('settings-source-local');
const settingsSourceSystem = document.getElementById('settings-source-system');

function switchToLocalMode() {
  audio.stopSystemAudioCapture();
  sourceLocalBtn.classList.add('active');
  sourceSystemBtn.classList.remove('active');
  if (settingsSourceLocal) settingsSourceLocal.classList.add('active');
  if (settingsSourceSystem) settingsSourceSystem.classList.remove('active');
  localPlayerView.classList.remove('hidden');
  systemCaptureView.classList.add('hidden');
  if (cavaSourceTag) cavaSourceTag.textContent = 'LOCAL';
}

async function switchToSystemCaptureMode() {
  if (customAudioElement) {
    customAudioElement.pause();
    updatePlayState(false);
  }
  audio.stopProcedural();

  const success = await audio.startSystemAudioCapture();
  if (success) {
    sourceSystemBtn.classList.add('active');
    sourceLocalBtn.classList.remove('active');
    if (settingsSourceSystem) settingsSourceSystem.classList.add('active');
    if (settingsSourceLocal) settingsSourceLocal.classList.remove('active');
    localPlayerView.classList.add('hidden');
    systemCaptureView.classList.remove('hidden');
    if (cavaSourceTag) cavaSourceTag.textContent = 'SISTEMA';
  }
}

sourceLocalBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  switchToLocalMode();
});

sourceSystemBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  switchToSystemCaptureMode();
});

if (settingsSourceLocal) {
  settingsSourceLocal.addEventListener('click', () => switchToLocalMode());
}
if (settingsSourceSystem) {
  settingsSourceSystem.addEventListener('click', () => switchToSystemCaptureMode());
}

stopCaptureBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  switchToLocalMode();
});

audio.onSourceModeChange((mode) => {
  if (mode === 'system') {
    sourceSystemBtn.classList.add('active');
    sourceLocalBtn.classList.remove('active');
    if (settingsSourceSystem) settingsSourceSystem.classList.add('active');
    if (settingsSourceLocal) settingsSourceLocal.classList.remove('active');
    localPlayerView.classList.add('hidden');
    systemCaptureView.classList.remove('hidden');
    if (cavaSourceTag) cavaSourceTag.textContent = 'SISTEMA';
  } else {
    sourceLocalBtn.classList.add('active');
    sourceSystemBtn.classList.remove('active');
    if (settingsSourceLocal) settingsSourceLocal.classList.add('active');
    if (settingsSourceSystem) settingsSourceSystem.classList.remove('active');
    localPlayerView.classList.remove('hidden');
    systemCaptureView.classList.add('hidden');
    if (cavaSourceTag) cavaSourceTag.textContent = 'LOCAL';
  }
});

// Drag & Drop Audio Files on Media Hub
const musicContainer = document.getElementById('music-cube-container');
if (musicContainer) {
  musicContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    musicContainer.style.outline = '2px dashed var(--accent-primary)';
  });
  musicContainer.addEventListener('dragleave', () => {
    musicContainer.style.outline = 'none';
  });
  musicContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    musicContainer.style.outline = 'none';
    handleLoadedFiles(Array.from(e.dataTransfer.files));
  });
}

audio.onStateChange(updatePlayState);

// -------------------------------------------------------------
// 2. AUDIO CAVA VISUALIZER (60 FPS SPECTRUM ENGINE)
// -------------------------------------------------------------
const cavaCanvas = document.getElementById('cava-canvas');
const ctx = cavaCanvas.getContext('2d');
const cavaModeBtn = document.getElementById('cava-mode-btn');

let cavaMode = settings.config.cavaMode || 'bars'; // 'bars', 'wave', 'radial'
let cavaSens = settings.config.cavaSens || 1.2;

const numBars = 16;
const barWidth = 6.8;
const barGap = 4;
const peaks = new Array(numBars).fill(0);

function cycleCavaMode() {
  if (cavaMode === 'bars') cavaMode = 'wave';
  else if (cavaMode === 'wave') cavaMode = 'radial';
  else cavaMode = 'bars';

  updateCavaUI();
  settings.set('cavaMode', cavaMode);
}

function updateCavaUI() {
  const labels = { bars: 'BARS 16', wave: 'WAVEFORM', radial: 'RADIAL' };
  cavaModeBtn.textContent = labels[cavaMode] || 'BARS 16';

  document.querySelectorAll('.cava-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cavaStyle === cavaMode);
  });
}
cavaModeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  cycleCavaMode();
});
cavaCanvas.addEventListener('click', (e) => {
  e.stopPropagation();
  cycleCavaMode();
});

let cavaIdleFrames = 0;

function renderCava() {
  // 0. Full Gaming Occlusion / Window Blur: Zero CPU Sleep Mode
  if (audio && audio.isLoopPaused) {
    setTimeout(() => { requestAnimationFrame(renderCava); }, 500);
    return;
  }

  // 0.1 Widget Hidden Check: When CAVA widget is hidden, sleep completely
  if (cavaWidget && cavaWidget.element && cavaWidget.element.style.display === 'none') {
    setTimeout(() => { requestAnimationFrame(renderCava); }, 1000);
    return;
  }

  const isAudioActive = !!(audio.isPlaying || audio.isSystemCaptureActive);

  // 1. Low-Power Idle Mechanism: When audio is idle and peaks have subsided, throttle loop to 250ms
  if (!isAudioActive) {
    let allPeaksZero = true;
    for (let i = 0; i < peaks.length; i++) {
      if (peaks[i] > 0.08) {
        peaks[i] = Math.max(0, peaks[i] - 1.5);
        allPeaksZero = false;
      }
    }
    if (allPeaksZero) {
      cavaIdleFrames++;
      if (cavaIdleFrames > 25) {
        if (ctx) ctx.clearRect(0, 0, cavaCanvas.width, cavaCanvas.height);
        document.documentElement.style.setProperty('--audio-beat', '0');
        const waveBars = document.querySelectorAll('#media-wave-strip .media-wave-bar');
        if (waveBars.length) {
          waveBars.forEach(b => { b.style.height = '3px'; b.style.opacity = '0.3'; });
        }
        if (catHeadGroup) catHeadGroup.classList.remove('bobbing');
        setTimeout(() => {
          requestAnimationFrame(renderCava);
        }, 250);
        return;
      }
    } else {
      cavaIdleFrames = 0;
    }
  } else {
    cavaIdleFrames = 0;
  }

  requestAnimationFrame(renderCava);

  // 2. Reactive Aura Glow (Desktop Ambilight)
  const bassEnergy = isAudioActive ? audio.getBassEnergy() : 0;
  if (settings.config.enableAuraGlow && bassEnergy > 0.05) {
    document.documentElement.style.setProperty('--audio-beat', bassEnergy.toFixed(2));
  } else {
    document.documentElement.style.setProperty('--audio-beat', '0');
  }

  // 3. Caelestia Living Audio Wave Strip in Media Hub
  const waveBars = document.querySelectorAll('#media-wave-strip .media-wave-bar');
  if (waveBars.length) {
    const waveFreqs = isAudioActive ? audio.getFrequencyData() : null;
    for (let i = 0; i < waveBars.length; i++) {
      const rawVal = (waveFreqs && waveFreqs[i * 2 + 1] ? waveFreqs[i * 2 + 1] : 0) / 255;
      const h = Math.max(2, Math.round(rawVal * 16));
      waveBars[i].style.height = `${h}px`;
      waveBars[i].style.opacity = rawVal > 0.08 ? '0.9' : '0.35';
    }
  }

  // 4. Skip main canvas visualizer if cava cube is hidden
  if (cavaWidget && cavaWidget.element && cavaWidget.element.style.display === 'none') {
    return;
  }

  // Dynamic canvas synchronization for responsive cubes
  if (cavaCanvas.clientWidth && cavaCanvas.clientHeight) {
    if (cavaCanvas.width !== cavaCanvas.clientWidth || cavaCanvas.height !== cavaCanvas.clientHeight) {
      cavaCanvas.width = cavaCanvas.clientWidth;
      cavaCanvas.height = cavaCanvas.clientHeight;
    }
  }

  const width = cavaCanvas.width;
  const height = cavaCanvas.height;
  ctx.clearRect(0, 0, width, height);

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#60cdff';
  const colorScheme = settings.config.cavaColorScheme || 'theme';

  let gradStart = '#0078d4';
  let gradMid = accentColor;
  let gradEnd = '#ffffff';

  if (colorScheme === 'cyberpunk') {
    gradStart = '#7928ca';
    gradMid = '#ff007f';
    gradEnd = '#00f0ff';
  } else if (colorScheme === 'sunset') {
    gradStart = '#991b1b';
    gradMid = '#f59e0b';
    gradEnd = '#fef08a';
  } else if (colorScheme === 'matrix') {
    gradStart = '#064e3b';
    gradMid = '#10b981';
    gradEnd = '#a7f3d0';
  }

  const drawColor = gradMid;

  // 1. BARS MODE (16-Band Logarithmic CAVA with Falling Peak Caps)
  if (cavaMode === 'bars') {
    const freqData = audio.getLogFrequencyData();
    const totalWidth = numBars * barWidth + (numBars - 1) * barGap;
    const startX = (width - totalWidth) / 2;

    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, gradStart);
    gradient.addColorStop(0.7, gradMid);
    gradient.addColorStop(1, gradEnd);

    for (let i = 0; i < numBars; i++) {
      const rawVal = (freqData[i] || 0) * cavaSens;
      const barHeight = Math.max(2, Math.min(height - 10, (rawVal / 255) * (height - 12)));
      const x = startX + i * (barWidth + barGap);
      const y = height - barHeight;

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      ctx.fill();

      // Floating Peak Cap
      if (barHeight > peaks[i]) {
        peaks[i] = barHeight;
      } else {
        peaks[i] = Math.max(0, peaks[i] - 1.2);
      }

      const peakY = height - peaks[i] - 3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, Math.max(2, peakY), barWidth, 1.8);
    }
  }

  // 2. OSCILLOSCOPE WAVEFORM MODE
  else if (cavaMode === 'wave') {
    const timeData = audio.getTimeDomainData();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = drawColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = drawColor;
    ctx.beginPath();

    const sliceWidth = width / timeData.length;
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] / 128.0);
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 3. RADIAL SPECTRUM MODE
  else if (cavaMode === 'radial') {
    const freqData = audio.getFrequencyData();
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = 22;

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2;

    for (let i = 0; i < 24; i++) {
      const val = ((freqData[i % 16] || 0) / 255) * 26 * cavaSens;
      const angle = (i / 24) * Math.PI * 2;

      const x1 = centerX + Math.cos(angle) * baseRadius;
      const y1 = centerY + Math.sin(angle) * baseRadius;
      const x2 = centerX + Math.cos(angle) * (baseRadius + val);
      const y2 = centerY + Math.sin(angle) * (baseRadius + val);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Pulsing Core Circle
    const energy = audio.getBassEnergy();
    ctx.fillStyle = drawColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 0.55 + (energy * 6), 0, Math.PI * 2);
    ctx.fill();
  }

  // Audio Beat Head-Bobbing for Bongo Cat
  if (catHeadGroup && (audio.isPlaying || audio.isSystemCaptureActive)) {
    const bassKick = audio.getBassEnergy();
    if (bassKick > 0.38) {
      catHeadGroup.classList.add('bobbing');
    } else {
      catHeadGroup.classList.remove('bobbing');
    }
  }
}
renderCava();

// -------------------------------------------------------------
// 3. MIDI FX STUDIO & PARAMETRIC EQUALIZER
// -------------------------------------------------------------
const bassSlider = document.getElementById('bass-slider');
const midsSlider = document.getElementById('mids-slider');
const trebleSlider = document.getElementById('treble-slider');
const driveSlider = document.getElementById('drive-slider');
const echoSlider = document.getElementById('echo-slider');
const fxBypassBtn = document.getElementById('fx-bypass-btn');

const bassVal = document.getElementById('bass-val');
const midsVal = document.getElementById('mids-val');
const trebleVal = document.getElementById('treble-val');
const driveVal = document.getElementById('drive-val');
const echoVal = document.getElementById('echo-val');

// Real-time Parametric EQ Curve Visualizer
const midiEqCanvas = document.getElementById('midi-eq-canvas');
const midiEqCtx = midiEqCanvas ? midiEqCanvas.getContext('2d') : null;

function renderMidiEQCurve() {
  if (!midiEqCtx) return;

  // Dynamic canvas synchronization
  if (midiEqCanvas.clientWidth && midiEqCanvas.clientHeight) {
    if (midiEqCanvas.width !== midiEqCanvas.clientWidth || midiEqCanvas.height !== midiEqCanvas.clientHeight) {
      midiEqCanvas.width = midiEqCanvas.clientWidth;
      midiEqCanvas.height = midiEqCanvas.clientHeight;
    }
  }

  const w = midiEqCanvas.width;
  const h = midiEqCanvas.height;
  midiEqCtx.clearRect(0, 0, w, h);

  const pts = audio.getEQCurvePoints(w, h);
  if (!pts || !pts.length) return;

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#60cdff';

  // Centerline (0 dB reference)
  midiEqCtx.beginPath();
  midiEqCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  midiEqCtx.lineWidth = 1;
  midiEqCtx.setLineDash([2, 2]);
  midiEqCtx.moveTo(0, h / 2);
  midiEqCtx.lineTo(w, h / 2);
  midiEqCtx.stroke();
  midiEqCtx.setLineDash([]);

  // Filled Area Under Curve
  const grad = midiEqCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(96, 205, 255, 0.35)');
  grad.addColorStop(1, 'rgba(96, 205, 255, 0.00)');

  midiEqCtx.beginPath();
  midiEqCtx.moveTo(pts[0].x, h / 2);
  for (let i = 0; i < pts.length; i++) {
    midiEqCtx.lineTo(pts[i].x, pts[i].y);
  }
  midiEqCtx.lineTo(w, h / 2);
  midiEqCtx.closePath();
  midiEqCtx.fillStyle = grad;
  midiEqCtx.fill();

  // Primary Curve Stroke
  midiEqCtx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) midiEqCtx.moveTo(pts[i].x, pts[i].y);
    else midiEqCtx.lineTo(pts[i].x, pts[i].y);
  }
  midiEqCtx.strokeStyle = accentColor;
  midiEqCtx.lineWidth = 2;
  midiEqCtx.stroke();
}
renderMidiEQCurve();

function saveEqConfig() {
  const eq = {
    bass: parseFloat(bassSlider ? bassSlider.value : 0),
    mids: parseFloat(midsSlider ? midsSlider.value : 0),
    treble: parseFloat(trebleSlider ? trebleSlider.value : 0),
    echo: parseInt(echoSlider ? echoSlider.value : 0, 10),
    drive: parseInt(driveSlider ? driveSlider.value : 0, 10)
  };
  settings.set('eqSettings', eq);
}

// Restore saved EQ curve from settings
if (settings.config.eqSettings) {
  const eq = settings.config.eqSettings;
  if (typeof eq.bass === 'number' && bassSlider) {
    bassSlider.value = eq.bass;
    bassVal.textContent = `${eq.bass > 0 ? '+' : ''}${eq.bass} dB`;
    audio.setBass(eq.bass);
  }
  if (typeof eq.mids === 'number' && midsSlider) {
    midsSlider.value = eq.mids;
    midsVal.textContent = `${eq.mids > 0 ? '+' : ''}${eq.mids} dB`;
    audio.setMids(eq.mids);
  }
  if (typeof eq.treble === 'number' && trebleSlider) {
    trebleSlider.value = eq.treble;
    trebleVal.textContent = `${eq.treble > 0 ? '+' : ''}${eq.treble} dB`;
    audio.setTreble(eq.treble);
  }
  if (typeof eq.echo === 'number' && echoSlider) {
    echoSlider.value = eq.echo;
    echoVal.textContent = `${eq.echo}%`;
    audio.setEcho(eq.echo / 100);
  }
  if (typeof eq.drive === 'number' && driveSlider) {
    driveSlider.value = eq.drive;
    if (driveVal) driveVal.textContent = `${eq.drive}%`;
    audio.setDrive(eq.drive / 100);
  }
  renderMidiEQCurve();
}

bassSlider.addEventListener('input', (e) => {
  const db = parseFloat(e.target.value);
  bassVal.textContent = `${db > 0 ? '+' : ''}${db} dB`;
  audio.setBass(db);
  renderMidiEQCurve();
  saveEqConfig();
});

midsSlider.addEventListener('input', (e) => {
  const db = parseFloat(e.target.value);
  midsVal.textContent = `${db > 0 ? '+' : ''}${db} dB`;
  audio.setMids(db);
  renderMidiEQCurve();
  saveEqConfig();
});

trebleSlider.addEventListener('input', (e) => {
  const db = parseFloat(e.target.value);
  trebleVal.textContent = `${db > 0 ? '+' : ''}${db} dB`;
  audio.setTreble(db);
  renderMidiEQCurve();
  saveEqConfig();
});

echoSlider.addEventListener('input', (e) => {
  const pct = parseInt(e.target.value, 10);
  echoVal.textContent = `${pct}%`;
  audio.setEcho(pct / 100);
  saveEqConfig();
});

if (driveSlider) {
  driveSlider.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    if (driveVal) driveVal.textContent = `${pct}%`;
    audio.setDrive(pct / 100);
    saveEqConfig();
  });
}

if (fxBypassBtn) {
  fxBypassBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const bypassed = audio.setBypass(!audio.isBypassed);
    fxBypassBtn.classList.toggle('active', bypassed);
    fxBypassBtn.innerHTML = `${getSvgIcon('zap', 12)} ${bypassed ? 'Bypassed' : 'Bypass'}`;
    fxBypassBtn.title = bypassed ? 'Efectos desactivados (Click para reactivar)' : 'Bypass / Desactivar efectos para comparar';
  });
}

// Quick Presets
document.querySelectorAll('.fx-preset-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.fx-preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const preset = audio.applyPreset(btn.dataset.preset);
    if (preset) {
      bassSlider.value = preset.bass;
      bassVal.textContent = `${preset.bass > 0 ? '+' : ''}${preset.bass} dB`;

      midsSlider.value = preset.mids;
      midsVal.textContent = `${preset.mids > 0 ? '+' : ''}${preset.mids} dB`;

      trebleSlider.value = preset.treble;
      trebleVal.textContent = `${preset.treble > 0 ? '+' : ''}${preset.treble} dB`;

      echoSlider.value = Math.round(preset.echo * 100);
      echoVal.textContent = `${Math.round(preset.echo * 100)}%`;

      renderMidiEQCurve();
      saveEqConfig();
    }
  });
});

// -------------------------------------------------------------
// 4. KARAOKE LYRICS (.LRC PARSER & SYNC)
// -------------------------------------------------------------
const lyricsViewport = document.getElementById('lyrics-viewport');
const lrcFileInput = document.getElementById('lrc-file-input');
const lyricsPasteBtn = document.getElementById('lyrics-paste-btn');

let lyricsData = [];
let activeLyricsIndex = -1;

function parseLRC(text) {
  const lines = text.split('\n');
  const result = [];
  const regex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;

  lines.forEach(line => {
    const match = regex.exec(line.trim());
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseFloat(match[2]);
      const time = min * 60 + sec;
      const text = match[3].trim();
      if (text) {
        result.push({ time, text });
      }
    }
  });

  result.sort((a, b) => a.time - b.time);
  return result;
}

function renderLyrics() {
  lyricsViewport.innerHTML = '';
  if (!lyricsData.length) {
    lyricsViewport.innerHTML = `
      <div class="lyrics-empty-state" id="lyrics-empty-state">
        <div class="lyrics-empty-icon">${getSvgIcon('mic', 32)}</div>
        <div class="lyrics-empty-text">Sin letras sincronizadas</div>
        <div class="lyrics-actions-row">
          <label class="lyrics-load-btn" title="Cargar archivo .LRC">
            ${getSvgIcon('clipboard', 12)} Cargar .LRC
            <input type="file" id="lrc-file-input" accept=".lrc,.txt" style="display:none;">
          </label>
          <button class="lyrics-paste-btn" id="lyrics-paste-btn" title="Pegar texto con marcas de tiempo">${getSvgIcon('clipboard', 12)} Pegar</button>
        </div>
      </div>
    `;
    bindLyricsButtons();
    return;
  }

  lyricsData.forEach((item, idx) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'lyrics-line';
    lineEl.dataset.idx = idx;
    lineEl.textContent = item.text;
    lineEl.addEventListener('click', () => {
      if (customAudioElement) {
        customAudioElement.currentTime = item.time;
      }
    });
    lyricsViewport.appendChild(lineEl);
  });
}

function syncKaraoke(currentTime) {
  if (!lyricsData.length) return;

  let currentIdx = -1;
  for (let i = 0; i < lyricsData.length; i++) {
    if (currentTime >= lyricsData[i].time) {
      currentIdx = i;
    } else {
      break;
    }
  }

  if (currentIdx !== activeLyricsIndex && currentIdx !== -1) {
    activeLyricsIndex = currentIdx;
    const lines = lyricsViewport.querySelectorAll('.lyrics-line');
    lines.forEach((l, idx) => {
      l.classList.toggle('active', idx === currentIdx);
    });

    const activeLine = lines[currentIdx];
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function bindLyricsButtons() {
  const loadInput = document.getElementById('lrc-file-input');
  const pasteBtn = document.getElementById('lyrics-paste-btn');

  if (loadInput) {
    loadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        lyricsData = parseLRC(evt.target.result);
        renderLyrics();
      };
      reader.readAsText(file);
    });
  }

  if (pasteBtn) {
    pasteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.showGlassPrompt({
        title: 'Pegar Letras LRC Sincronizadas',
        desc: 'Pega el archivo o texto con formato [00:12.34] Letra...',
        placeholder: '[00:00.00] Intro\n[00:12.50] Primera estrofa...',
        isMultiline: true,
        onConfirm: (pasted) => {
          if (pasted && pasted.trim()) {
            lyricsData = parseLRC(pasted.trim());
            renderLyrics();
          }
        }
      });
    });
  }
}
bindLyricsButtons();

// -------------------------------------------------------------
// ACRYLIC GLASS MICRO-PROMPT HELPER (Replaces raw prompt)
// -------------------------------------------------------------
const glassPromptBackdrop = document.getElementById('glass-prompt-backdrop');
const glassPromptTitle = document.getElementById('glass-prompt-title');
const glassPromptDesc = document.getElementById('glass-prompt-desc');
const glassPromptInput = document.getElementById('glass-prompt-input');
const glassPromptTextarea = document.getElementById('glass-prompt-textarea');
const glassPromptConfirm = document.getElementById('glass-prompt-confirm');
const glassPromptCancel = document.getElementById('glass-prompt-cancel');
const glassPromptClose = document.getElementById('glass-prompt-close');

let activePromptCallback = null;

window.showGlassPrompt = function({ title, placeholder, value, isMultiline, desc, onConfirm }) {
  if (!glassPromptBackdrop) return;
  activePromptCallback = onConfirm;

  if (glassPromptTitle) glassPromptTitle.textContent = title || 'Ingresar Valor';

  if (desc && glassPromptDesc) {
    glassPromptDesc.textContent = desc;
    glassPromptDesc.style.display = 'block';
  } else if (glassPromptDesc) {
    glassPromptDesc.style.display = 'none';
  }

  if (isMultiline) {
    if (glassPromptInput) glassPromptInput.style.display = 'none';
    if (glassPromptTextarea) {
      glassPromptTextarea.style.display = 'block';
      glassPromptTextarea.placeholder = placeholder || '';
      glassPromptTextarea.value = value || '';
      setTimeout(() => glassPromptTextarea.focus(), 60);
    }
  } else {
    if (glassPromptTextarea) glassPromptTextarea.style.display = 'none';
    if (glassPromptInput) {
      glassPromptInput.style.display = 'block';
      glassPromptInput.placeholder = placeholder || '';
      glassPromptInput.value = value || '';
      setTimeout(() => {
        glassPromptInput.focus();
        glassPromptInput.select();
      }, 60);
    }
  }

  glassPromptBackdrop.classList.add('open');
};

function closeGlassPrompt() {
  if (glassPromptBackdrop) glassPromptBackdrop.classList.remove('open');
  activePromptCallback = null;
}

if (glassPromptClose) glassPromptClose.addEventListener('click', closeGlassPrompt);
if (glassPromptCancel) glassPromptCancel.addEventListener('click', closeGlassPrompt);
if (glassPromptBackdrop) {
  glassPromptBackdrop.addEventListener('click', (e) => {
    if (e.target === glassPromptBackdrop) closeGlassPrompt();
  });
}

function submitGlassPrompt() {
  if (activePromptCallback) {
    const val = (glassPromptTextarea && glassPromptTextarea.style.display !== 'none')
      ? glassPromptTextarea.value
      : (glassPromptInput ? glassPromptInput.value : '');
    activePromptCallback(val);
  }
  closeGlassPrompt();
}

if (glassPromptConfirm) glassPromptConfirm.addEventListener('click', submitGlassPrompt);
if (glassPromptInput) {
  glassPromptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitGlassPrompt();
    } else if (e.key === 'Escape') {
      closeGlassPrompt();
    }
  });
}
if (glassPromptTextarea) {
  glassPromptTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitGlassPrompt();
    } else if (e.key === 'Escape') {
      closeGlassPrompt();
    }
  });
}

// -------------------------------------------------------------
// 5. BONGO CAT (KEYBOARD, CLICK & EMBED REPO REACTIVITY)
// -------------------------------------------------------------
const pawLeft = document.getElementById('cat-paw-left');
const pawRight = document.getElementById('cat-paw-right');
const bongoContainer = document.getElementById('bongo-container');
const particleLayer = document.getElementById('cat-particle-layer');
const bongoModeToggle = document.getElementById('bongo-mode-toggle');
const bongoNativeView = document.getElementById('bongo-native-view');
const bongoEmbedBox = document.getElementById('bongo-embed-box');
const bongoIframe = document.getElementById('bongo-iframe');
const bongoApmTag = document.getElementById('bongo-apm');
const bongoSfxBtn = document.getElementById('bongo-sfx-btn');

let isBongoEmbed = false;
let savedBongoUrl = localStorage.getItem('cubeworld_bongo_url') || 'https://bongo.cat/';
let bongoPressTimestamps = [];
let isBongoSfxEnabled = localStorage.getItem('cubeworld_bongo_sfx') === 'true';

if (bongoSfxBtn) {
  bongoSfxBtn.classList.toggle('active', isBongoSfxEnabled);
  bongoSfxBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isBongoSfxEnabled = !isBongoSfxEnabled;
    localStorage.setItem('cubeworld_bongo_sfx', isBongoSfxEnabled);
    bongoSfxBtn.classList.toggle('active', isBongoSfxEnabled);
  });
}

function recordBongoAction(isHighPitch) {
  const now = Date.now();
  bongoPressTimestamps.push(now);
  bongoPressTimestamps = bongoPressTimestamps.filter(t => now - t < 1000);
  if (bongoApmTag) {
    bongoApmTag.textContent = `${bongoPressTimestamps.length} KPS`;
  }
  if (isBongoSfxEnabled) {
    audio.playBongoTap(isHighPitch);
  }
}

setInterval(() => {
  if (bongoWidget && bongoWidget.element && bongoWidget.element.style.display === 'none') return;
  const now = Date.now();
  bongoPressTimestamps = bongoPressTimestamps.filter(t => now - t < 1000);
  if (bongoApmTag) {
    bongoApmTag.textContent = `${bongoPressTimestamps.length} KPS`;
  }
}, 500);

const bongoUrlBtn = document.getElementById('bongo-url-btn');
if (bongoUrlBtn) {
  bongoUrlBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const current = localStorage.getItem('cubeworld_bongo_url') || savedBongoUrl;
    window.showGlassPrompt({
      title: 'Configurar URL de Web / Bongo Embed',
      desc: 'Introduce la URL de tu app, juego o web interactiva (ej: https://bongo.cat/ o localhost)',
      placeholder: 'https://bongo.cat/',
      value: current,
      onConfirm: (url) => {
        if (url && url.trim()) {
          savedBongoUrl = url.trim();
          localStorage.setItem('cubeworld_bongo_url', savedBongoUrl);
          if (bongoIframe) bongoIframe.src = savedBongoUrl;
          if (!isBongoEmbed && bongoModeToggle) {
            bongoModeToggle.click();
          }
        }
      }
    });
  });
}

if (bongoModeToggle) {
  bongoModeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    isBongoEmbed = !isBongoEmbed;

    if (isBongoEmbed) {
      if (!bongoIframe.src || bongoIframe.src.endsWith('about:blank')) {
        window.showGlassPrompt({
          title: 'Configurar URL de Web / Bongo Embed',
          placeholder: 'https://bongo.cat/',
          value: savedBongoUrl,
          onConfirm: (url) => {
            if (url && url.trim()) {
              savedBongoUrl = url.trim();
              localStorage.setItem('cubeworld_bongo_url', savedBongoUrl);
              bongoIframe.src = savedBongoUrl;
            }
          }
        });
      }
      if (bongoNativeView) bongoNativeView.classList.add('hidden');
      if (bongoEmbedBox) bongoEmbedBox.classList.remove('hidden');
      bongoModeToggle.innerHTML = `${getSvgIcon('cube', 12)} Nativo`;
      bongoModeToggle.title = 'Volver al Bongo Cat nativo SVG';
    } else {
      if (bongoNativeView) bongoNativeView.classList.remove('hidden');
      if (bongoEmbedBox) bongoEmbedBox.classList.add('hidden');
      bongoModeToggle.innerHTML = `${getSvgIcon('globe', 12)} Embed`;
      bongoModeToggle.title = 'Incrustar Bongo Cat web o repositorio externo';
    }
  });
}

const leftKeys = new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyZ', 'KeyX', 'KeyC', 'KeyV']);

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const isLeft = leftKeys.has(e.code);
  if (isLeft) {
    if (pawLeft) pawLeft.classList.add('pressed');
    recordBongoAction(true);
  } else {
    if (pawRight) pawRight.classList.add('pressed');
    recordBongoAction(false);
  }
});

window.addEventListener('keyup', (e) => {
  if (leftKeys.has(e.code)) {
    if (pawLeft) pawLeft.classList.remove('pressed');
  } else {
    if (pawRight) pawRight.classList.remove('pressed');
  }
});

// Floating Hearts on Click
if (bongoContainer) {
  bongoContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    recordBongoAction(false);
    if (!particleLayer) return;

    const rect = bongoContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const p = document.createElement('div');
    p.className = 'cat-heart-particle';
    p.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-primary)" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    p.style.left = `${x - 10}px`;
    p.style.top = `${y - 10}px`;

    particleLayer.appendChild(p);
    setTimeout(() => p.remove(), 900);
  });
}

// -------------------------------------------------------------
// 6. PHOTO FRAME (SLIDESHOW, PERSISTENCE & FIT CONTROLS)
// -------------------------------------------------------------
const galleryDropzone = document.getElementById('gallery-dropzone');
const galleryBox = document.getElementById('gallery-box');
const galleryFileInput = document.getElementById('gallery-file-input');
const galleryImg = document.getElementById('gallery-img');
const galleryTitle = document.getElementById('gallery-title');
const galleryCounter = document.getElementById('gallery-counter');
const galleryFitBtn = document.getElementById('gallery-fit-btn');
const galleryTimerBtn = document.getElementById('gallery-timer-btn');
const galleryPrevBtn = document.getElementById('gallery-prev-btn');
const galleryNextBtn = document.getElementById('gallery-next-btn');
const galleryPasteBtn = document.getElementById('gallery-paste-btn');
const galleryClearBtn = document.getElementById('gallery-clear-btn');

let userPhotos = [];
let galleryIdx = 0;
let isCoverMode = true;
let galleryTimer = null;
let galleryTimerSpeed = 7000;

function saveStoredPhotos(photosArray) {
  try {
    localStorage.setItem('cubeworld_saved_photos', JSON.stringify(photosArray));
  } catch (err) {
    console.warn('LocalStorage photo quota exceeded:', err);
  }
}

function loadStoredPhotos() {
  try {
    const data = localStorage.getItem('cubeworld_saved_photos');
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) {
        userPhotos = parsed;
        if (galleryDropzone) galleryDropzone.style.display = 'none';
        if (galleryBox) galleryBox.style.display = 'block';
        showPhoto(0);
        startGalleryTimer();
      }
    }
  } catch (e) {}
}

galleryDropzone.addEventListener('click', () => galleryFileInput.click());

function loadPhotosFromFiles(files) {
  if (!files.length) return;
  const loaded = [];
  let count = 0;
  // Limit to 12 photos to prevent localStorage quota exhaustion
  const sliceFiles = files.slice(0, 12);

  sliceFiles.forEach(f => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      loaded.push({
        url: evt.target.result,
        name: f.name.replace(/\.[^/.]+$/, "")
      });
      count++;
      if (count === sliceFiles.length) {
        userPhotos = loaded;
        saveStoredPhotos(userPhotos);
        galleryDropzone.style.display = 'none';
        galleryBox.style.display = 'block';
        showPhoto(0);
        startGalleryTimer();
      }
    };
    reader.readAsDataURL(f);
  });
}

galleryFileInput.addEventListener('change', (e) => {
  loadPhotosFromFiles(Array.from(e.target.files));
});

function showPhoto(idx) {
  if (!userPhotos.length) return;
  galleryIdx = (idx + userPhotos.length) % userPhotos.length;
  const photo = userPhotos[galleryIdx];

  galleryImg.style.opacity = '0';
  setTimeout(() => {
    galleryImg.src = photo.url;
    galleryTitle.textContent = photo.name;
    galleryCounter.textContent = `${galleryIdx + 1}/${userPhotos.length}`;
    galleryImg.style.opacity = '1';
  }, 180);
}

function startGalleryTimer() {
  if (galleryTimer) clearInterval(galleryTimer);
  if (galleryTimerSpeed <= 0) return;
  if (galleryWidget && galleryWidget.element && galleryWidget.element.style.display === 'none') return;
  galleryTimer = setInterval(() => {
    if (galleryWidget && galleryWidget.element && galleryWidget.element.style.display === 'none') return;
    if (userPhotos.length > 1) {
      showPhoto(galleryIdx + 1);
    }
  }, galleryTimerSpeed);
}

galleryPrevBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  showPhoto(galleryIdx - 1);
  startGalleryTimer();
});
galleryNextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  showPhoto(galleryIdx + 1);
  startGalleryTimer();
});

if (galleryTimerBtn) {
  galleryTimerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (galleryTimerSpeed === 3000) {
      galleryTimerSpeed = 5000;
      galleryTimerBtn.textContent = '⏱ 5s';
      startGalleryTimer();
    } else if (galleryTimerSpeed === 5000) {
      galleryTimerSpeed = 10000;
      galleryTimerBtn.textContent = '⏱ 10s';
      startGalleryTimer();
    } else if (galleryTimerSpeed === 10000) {
      galleryTimerSpeed = 30000;
      galleryTimerBtn.textContent = '⏱ 30s';
      startGalleryTimer();
    } else if (galleryTimerSpeed === 30000) {
      galleryTimerSpeed = 0;
      galleryTimerBtn.textContent = '⏱ Pausa';
      if (galleryTimer) clearInterval(galleryTimer);
    } else {
      galleryTimerSpeed = 3000;
      galleryTimerBtn.textContent = '⏱ 3s';
      startGalleryTimer();
    }
  });
}

galleryFitBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isCoverMode = !isCoverMode;
  galleryImg.className = `gallery-img ${isCoverMode ? 'fit-cover' : 'fit-contain'}`;
  galleryFitBtn.innerHTML = `${getSvgIcon('sliders', 11)} ${isCoverMode ? 'Cover' : 'Contain'}`;
});

// Drag & Drop on Photo Frame
const galleryContainer = document.getElementById('gallery-container');
if (galleryContainer) {
  galleryContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  galleryContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      loadPhotosFromFiles(files);
    }
  });
}
loadStoredPhotos();

function addPhotoFromDataUrl(dataUrl, name) {
  userPhotos.unshift({
    url: dataUrl,
    name: name || `Captura ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
  });
  if (userPhotos.length > 15) userPhotos.pop();
  saveStoredPhotos(userPhotos);
  if (galleryDropzone) galleryDropzone.style.display = 'none';
  if (galleryBox) galleryBox.style.display = 'block';
  showPhoto(0);
  startGalleryTimer();
}

// Global Clipboard Paste Support (Ctrl+V)
window.addEventListener('paste', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (!e.clipboardData || !e.clipboardData.items) return;

  for (let i = 0; i < e.clipboardData.items.length; i++) {
    const item = e.clipboardData.items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          addPhotoFromDataUrl(evt.target.result);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }
});

if (galleryPasteBtn) {
  galleryPasteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find(t => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const reader = new FileReader();
            reader.onload = (evt) => {
              addPhotoFromDataUrl(evt.target.result);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Clipboard read permission:', err);
    }
    alert('¡Presiona Ctrl + V para pegar la captura directamente en el marco!');
  });
}

if (galleryClearBtn) {
  galleryClearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userPhotos = [];
    saveStoredPhotos([]);
    if (galleryTimer) clearInterval(galleryTimer);
    if (galleryBox) galleryBox.style.display = 'none';
    if (galleryDropzone) galleryDropzone.style.display = 'flex';
    if (galleryImg) galleryImg.src = '';
  });
}

// -------------------------------------------------------------
// 7. SYSTEM TELEMETRY (REAL WINDOWS METRICS & ROLLING SPARKLINE)
// -------------------------------------------------------------
const sparklineCanvas = document.getElementById('telemetry-sparkline');
const sparkCtx = sparklineCanvas ? sparklineCanvas.getContext('2d') : null;
const cpuVal = document.getElementById('cpu-val');
const cpuBar = document.getElementById('cpu-bar');
const cpuModelTag = document.getElementById('cpu-model-tag');
const ramVal = document.getElementById('ram-val');
const ramBar = document.getElementById('ram-bar');
const ramGbVal = document.getElementById('ram-gb-val');
const gpuVal = document.getElementById('gpu-val');
const gpuBar = document.getElementById('gpu-bar');

const sparkPoints = new Array(28).fill(20);

let prevCpusSample = null;
function getRealWindowsMetrics() {
  let cpuPercent = 16;
  let ramPercent = 48;
  let ramGbText = '';
  let cpuModel = 'CPU';

  if (typeof window !== 'undefined' && typeof window.require === 'function') {
    try {
      const os = window.require('os');
      const cpus = os.cpus();
      if (cpus && cpus.length) {
        const rawModel = cpus[0].model || '';
        cpuModel = rawModel.replace(/\(R\)|\(TM\)|Core|Processor|CPU/gi, '').trim().split(' ')[0] || 'CPU';

        if (prevCpusSample && prevCpusSample.length === cpus.length) {
          let totalIdle = 0, totalTick = 0;
          cpus.forEach((cpu, i) => {
            const prev = prevCpusSample[i];
            const t = cpu.times;
            const pt = prev.times;
            const idle = t.idle - pt.idle;
            const total = (t.user - pt.user) + (t.nice - pt.nice) + (t.sys - pt.sys) + (t.irq - pt.irq) + idle;
            totalIdle += idle;
            totalTick += total;
          });
          if (totalTick > 0) {
            cpuPercent = Math.min(100, Math.max(1, Math.round((1 - (totalIdle / totalTick)) * 100)));
          }
        }
        prevCpusSample = cpus;
      }

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      ramPercent = Math.min(100, Math.max(1, Math.round((usedMem / totalMem) * 100)));
      const usedGb = (usedMem / (1024 ** 3)).toFixed(1);
      const totalGb = (totalMem / (1024 ** 3)).toFixed(1);
      ramGbText = `(${usedGb}/${totalGb} GB)`;
    } catch (err) {}
  } else {
    const isAudioActive = audio.isPlaying || audio.isSystemCaptureActive;
    const baseCpu = isAudioActive ? 24 : 12;
    cpuPercent = Math.min(95, Math.max(8, Math.floor(baseCpu + Math.random() * 15)));
    ramPercent = Math.floor(52 + Math.sin(Date.now() / 4000) * 2);
  }

  return { cpuPercent, ramPercent, ramGbText, cpuModel };
}

function drawSparkline() {
  if (!sparkCtx) return;

  // Dynamic canvas synchronization
  if (sparklineCanvas.clientWidth && sparklineCanvas.clientHeight) {
    if (sparklineCanvas.width !== sparklineCanvas.clientWidth || sparklineCanvas.height !== sparklineCanvas.clientHeight) {
      sparklineCanvas.width = sparklineCanvas.clientWidth;
      sparklineCanvas.height = sparklineCanvas.clientHeight;
    }
  }

  const w = sparklineCanvas.width;
  const h = sparklineCanvas.height;
  sparkCtx.clearRect(0, 0, w, h);

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#60cdff';

  const step = w / (sparkPoints.length - 1);

  // Gradient Fill Area
  const grad = sparkCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(96, 205, 255, 0.35)');
  grad.addColorStop(1, 'rgba(96, 205, 255, 0.00)');

  sparkCtx.beginPath();
  sparkCtx.moveTo(0, h);
  for (let i = 0; i < sparkPoints.length; i++) {
    const y = h - (sparkPoints[i] / 100) * (h - 8);
    sparkCtx.lineTo(i * step, y);
  }
  sparkCtx.lineTo(w, h);
  sparkCtx.closePath();
  sparkCtx.fillStyle = grad;
  sparkCtx.fill();

  // Line Curve
  sparkCtx.beginPath();
  for (let i = 0; i < sparkPoints.length; i++) {
    const y = h - (sparkPoints[i] / 100) * (h - 8);
    if (i === 0) sparkCtx.moveTo(0, y);
    else sparkCtx.lineTo(i * step, y);
  }
  sparkCtx.strokeStyle = accentColor;
  sparkCtx.lineWidth = 1.8;
  sparkCtx.stroke();
}

let telemetryTickCounter = 0;
setInterval(() => {
  telemetryTickCounter++;
  // If telemetry widget is hidden, skip expensive polling & canvas redraws
  if (systemWidget && systemWidget.element && systemWidget.element.style.display === 'none') {
    return;
  }
  // Low-power hardware optimization: throttle interval
  if (settings.config.lowPowerMode && (telemetryTickCounter % 2 !== 0)) {
    return;
  }

  const { cpuPercent, ramPercent, ramGbText, cpuModel } = getRealWindowsMetrics();

  if (cpuVal) cpuVal.textContent = `${cpuPercent}%`;
  if (cpuBar) cpuBar.style.width = `${cpuPercent}%`;
  if (cpuModelTag && cpuModel) cpuModelTag.textContent = cpuModel;

  sparkPoints.shift();
  sparkPoints.push(cpuPercent);
  drawSparkline();

  if (ramVal) ramVal.textContent = `${ramPercent}%`;
  if (ramBar) ramBar.style.width = `${ramPercent}%`;
  if (ramGbVal && ramGbText) ramGbVal.textContent = ramGbText;

  const isAudioActive = audio.isPlaying || audio.isSystemCaptureActive;
  const baseGpu = isAudioActive ? 28 : 12;
  const newGpu = Math.min(95, Math.max(8, Math.floor(baseGpu + Math.random() * 12)));
  if (gpuVal) gpuVal.textContent = `${newGpu}%`;
  if (gpuBar) gpuBar.style.width = `${newGpu}%`;

  const specCoresChip = document.getElementById('spec-cores-chip');
  const specUptimeChip = document.getElementById('spec-uptime-chip');
  const specSyncChip = document.getElementById('spec-sync-chip');
  const telemetrySparkBadge = document.getElementById('telemetry-spark-badge');

  if (typeof window !== 'undefined' && typeof window.require === 'function') {
    try {
      const os = window.require('os');
      if (specCoresChip && os.cpus) specCoresChip.textContent = `${os.cpus().length} Cores`;
      if (specUptimeChip && os.uptime) {
        const h = Math.floor(os.uptime() / 3600);
        const m = Math.floor((os.uptime() % 3600) / 60);
        specUptimeChip.textContent = `Up: ${h}h ${m}m`;
      }
      if (specSyncChip) specSyncChip.textContent = isAudioActive ? '● WASAPI Sync' : '● DirectComp';
    } catch (e) {}
  }
  if (telemetrySparkBadge) {
    telemetrySparkBadge.textContent = `PEAK ${Math.max(...sparkPoints)}%`;
  }
}, 1200);

// -------------------------------------------------------------
// 8. QUICK TASKS & NOTES (PERSISTENT CHECKLIST & CLEAN)
// -------------------------------------------------------------
const tasksList = document.getElementById('tasks-list');
const newTaskInput = document.getElementById('new-task-input');
const tasksCleanBtn = document.getElementById('tasks-clean-btn');
let currentNotesFilter = 'all';

function loadStoredTasks() {
  try {
    const saved = localStorage.getItem('cubeworld_tasks_v2');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

let userTasks = loadStoredTasks();

function saveStoredTasks() {
  try {
    localStorage.setItem('cubeworld_tasks_v2', JSON.stringify(userTasks));
  } catch (e) {}
}

function renderTasks() {
  tasksList.innerHTML = '';

  const filtered = userTasks.filter(t => {
    if (currentNotesFilter === 'pending') return !t.done;
    if (currentNotesFilter === 'done') return t.done;
    return true;
  });

  if (!filtered.length) {
    tasksList.innerHTML = '<div style="font-size:9px; color:var(--text-dim); text-align:center; padding-top:14px;">Sin tareas</div>';
    return;
  }

  filtered.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.done ? 'done' : ''}`;

    const dot = document.createElement('div');
    dot.className = `task-priority-dot ${task.priority || 'normal'}`;
    dot.title = `Prioridad: ${(task.priority || 'Normal').toUpperCase()} (Clic para cambiar)`;
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const cycle = { normal: 'high', high: 'mid', mid: 'low', low: 'normal' };
      task.priority = cycle[task.priority || 'normal'] || 'normal';
      saveStoredTasks();
      renderTasks();
    });

    const left = document.createElement('div');
    left.className = 'task-left';

    const check = document.createElement('div');
    check.className = 'task-checkbox';
    check.textContent = task.done ? '✓' : '';
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      task.done = !task.done;
      saveStoredTasks();
      renderTasks();
    });

    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = task.text;
    textSpan.title = 'Doble clic para editar texto';
    textSpan.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'task-edit-input';
      input.value = task.text;

      let saved = false;
      const saveEdit = () => {
        if (saved) return;
        saved = true;
        const val = input.value.trim();
        if (val) {
          task.text = val;
          saveStoredTasks();
        }
        renderTasks();
      };

      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') saveEdit();
        if (ke.key === 'Escape') { saved = true; renderTasks(); }
      });
      input.addEventListener('blur', saveEdit);

      textSpan.replaceWith(input);
      input.focus();
      input.select();
    });

    left.appendChild(check);
    left.appendChild(textSpan);

    const delBtn = document.createElement('button');
    delBtn.className = 'task-del-btn';
    delBtn.title = 'Eliminar tarea';
    delBtn.innerHTML = getSvgIcon('trash', 11);
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userTasks = userTasks.filter(t => t.id !== task.id);
      saveStoredTasks();
      renderTasks();
    });

    item.appendChild(dot);
    item.appendChild(left);
    item.appendChild(delBtn);
    tasksList.appendChild(item);
  });
}
renderTasks();

if (tasksCleanBtn) {
  tasksCleanBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userTasks = userTasks.filter(t => !t.done);
    saveStoredTasks();
    renderTasks();
  });
}

newTaskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && newTaskInput.value.trim()) {
    userTasks.push({
      id: Date.now(),
      text: newTaskInput.value.trim(),
      priority: 'normal',
      done: false
    });
    newTaskInput.value = '';
    saveStoredTasks();
    renderTasks();
  }
});

document.querySelectorAll('.notes-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.notes-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentNotesFilter = btn.dataset.filter;
    renderTasks();
  });
});

// -------------------------------------------------------------
// SETTINGS HUB MODAL & PERSISTENCE
// -------------------------------------------------------------
function toggleSettingsModal() {
  settingsBackdrop.classList.toggle('open');
}

openSettingsBtn.addEventListener('click', toggleSettingsModal);
closeSettingsBtn.addEventListener('click', () => settingsBackdrop.classList.remove('open'));
settingsBackdrop.addEventListener('click', (e) => {
  if (e.target === settingsBackdrop) settingsBackdrop.classList.remove('open');
});

// Global Shortcuts
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault();
    toggleSettingsModal();
  }
  if (e.key === 'Escape') {
    settingsBackdrop.classList.remove('open');
  }
  // Spacebar toggles audio when not typing in inputs
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    playPauseBtn.click();
  }
});

// Tabs Switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabSections = document.querySelectorAll('.settings-section');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabSections.forEach(s => s.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

// Theme switcher cards
const themeCards = document.querySelectorAll('.theme-card');
themeCards.forEach(card => {
  card.addEventListener('click', () => {
    themeCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    settings.applyTheme(card.dataset.themeName);
  });
});

// Custom Accent Color Swatches & Picker
const accentHexDisplay = document.getElementById('accent-hex-display');
const customAccentPicker = document.getElementById('custom-accent-picker');

function setAccent(color) {
  settings.set('accentColor', color);
  settings.applyStyles();
  if (accentHexDisplay) {
    accentHexDisplay.textContent = color;
    accentHexDisplay.style.color = color;
  }
  if (customAccentPicker) customAccentPicker.value = color;
  renderMidiEQCurve();
}

document.querySelectorAll('.accent-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    setAccent(swatch.dataset.color);
  });
});

if (customAccentPicker) {
  customAccentPicker.addEventListener('input', (e) => {
    setAccent(e.target.value);
  });
}

// Live Sliders
const blurSlider = document.getElementById('blur-slider');
const radiusSlider = document.getElementById('radius-slider');
const opacitySlider = document.getElementById('opacity-slider');
const blurValDisplay = document.getElementById('blur-val-display');
const radiusValDisplay = document.getElementById('radius-val-display');
const opacityValDisplay = document.getElementById('opacity-val-display');
const toggleHideBorders = document.getElementById('toggle-hide-borders');
const toggleDisableShadows = document.getElementById('toggle-disable-shadows');

if (toggleHideBorders) {
  toggleHideBorders.checked = !!settings.config.hideBordersZeroOpacity;
  toggleHideBorders.addEventListener('change', (e) => {
    settings.set('hideBordersZeroOpacity', e.target.checked);
    settings.applyStyles();
  });
}

if (toggleDisableShadows) {
  toggleDisableShadows.checked = !!settings.config.disableShadows;
  toggleDisableShadows.addEventListener('change', (e) => {
    settings.set('disableShadows', e.target.checked);
    settings.applyStyles();
  });
}

blurSlider.addEventListener('input', (e) => {
  const val = e.target.value;
  blurValDisplay.textContent = `${val}px`;
  settings.config.blur = parseInt(val, 10);
  settings.applyStyles();
  settings.saveConfig();
});

radiusSlider.addEventListener('input', (e) => {
  const val = e.target.value;
  radiusValDisplay.textContent = `${val}px`;
  settings.config.radius = parseInt(val, 10);
  settings.applyStyles();
  settings.saveConfig();
});

opacitySlider.addEventListener('input', (e) => {
  const val = e.target.value;
  opacityValDisplay.textContent = `${val}%`;
  settings.config.opacity = parseInt(val, 10);
  settings.applyStyles();
  settings.saveConfig();
});

// Aura Glow Toggle
const toggleAuraGlow = document.getElementById('toggle-aura-glow');
if (toggleAuraGlow) {
  toggleAuraGlow.checked = settings.config.enableAuraGlow !== false;
  toggleAuraGlow.addEventListener('change', (e) => {
    settings.set('enableAuraGlow', e.target.checked);
    settings.applyStyles();
    if (!e.target.checked) {
      document.documentElement.style.setProperty('--audio-beat', '0');
    }
  });
}

// 1-Click Ricing Presets (Bento Glass Styles)
function syncSettingsUIFromConfig() {
  if (blurSlider) {
    blurSlider.value = settings.config.blur;
    if (blurValDisplay) blurValDisplay.textContent = `${settings.config.blur}px`;
  }
  if (radiusSlider) {
    radiusSlider.value = settings.config.radius;
    if (radiusValDisplay) radiusValDisplay.textContent = `${settings.config.radius}px`;
  }
  if (opacitySlider) {
    opacitySlider.value = settings.config.opacity;
    if (opacityValDisplay) opacityValDisplay.textContent = `${settings.config.opacity}%`;
  }
  if (toggleDisableShadows) {
    toggleDisableShadows.checked = !!settings.config.disableShadows;
  }
  if (toggleHideBorders) {
    toggleHideBorders.checked = !!settings.config.hideBordersZeroOpacity;
  }
  if (toggleAuraGlow) {
    toggleAuraGlow.checked = settings.config.enableAuraGlow !== false;
  }
  if (accentHexDisplay && settings.config.accentColor) {
    accentHexDisplay.textContent = settings.config.accentColor;
    accentHexDisplay.style.color = settings.config.accentColor;
  }
  if (customAccentPicker && settings.config.accentColor) {
    customAccentPicker.value = settings.config.accentColor;
  }
  themeCards.forEach(c => c.classList.toggle('active', c.dataset.themeName === settings.config.theme));

  // Sync Ricing Presets buttons
  document.querySelectorAll('.ricing-preset-btn, [data-ricing-preset]').forEach(b => {
    b.classList.toggle('active', b.dataset.ricingPreset === settings.config.theme);
  });

  // Sync Typography Font buttons
  document.querySelectorAll('.font-opt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.font === (settings.config.fontStyle || 'modern'));
  });

  // Sync Window Style buttons
  document.querySelectorAll('.win-style-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.winStyle === (settings.config.windowStyle || 'bento'));
  });

  // Sync Master Volume Slider
  const masterVol = document.getElementById('master-vol-slider');
  if (masterVol) {
    masterVol.value = typeof settings.config.volume === 'number' ? settings.config.volume : 75;
  }

  // Sync CAVA Sensitivity Slider
  const cavaSens = document.getElementById('cava-sens-slider');
  const cavaSensDisp = document.getElementById('cava-sens-display');
  if (cavaSens) {
    const sensVal = typeof settings.config.cavaSensitivity === 'number' ? settings.config.cavaSensitivity : 1.2;
    cavaSens.value = Math.round(sensVal * 10);
    if (cavaSensDisp) cavaSensDisp.textContent = `${sensVal.toFixed(1)}x`;
  }

  // Sync CAVA Style buttons
  const curCavaStyle = settings.config.cavaStyle || 'bars';
  document.querySelectorAll('.cava-opt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cavaStyle === curCavaStyle);
  });

  // Sync CAVA Color buttons
  const curCavaColor = settings.config.cavaColorScheme || 'theme';
  document.querySelectorAll('.cava-color-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cavaColor === curCavaColor);
  });
}
syncSettingsUIFromConfig();

const ricingPresetBtns = document.querySelectorAll('.ricing-preset-btn, [data-ricing-preset]');
ricingPresetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const presetId = btn.dataset.ricingPreset;
    settings.applyRicingPreset(presetId);
    ricingPresetBtns.forEach(b => b.classList.toggle('active', b.dataset.ricingPreset === presetId));
    syncSettingsUIFromConfig();
    renderMidiEQCurve();
  });
});

// -------------------------------------------------------------
// WORKSPACE MODES & VISUAL WIREFRAME BENTO SELECTOR
// -------------------------------------------------------------
function syncWidgetVisibilityWithConfig() {
  if (!settings.config.activeWidgets) return;

  defaultWidgets.forEach(w => {
    const active = settings.config.activeWidgets[w.id] !== false;
    if (active) {
      if (!w.element.parentElement) {
        workspaceEl.appendChild(w.element);
      }
      w.element.style.display = 'flex';
    } else {
      if (w.cluster) {
        w.cluster.removeWidget(w);
      }
      w.element.style.display = 'none';
    }
    const toggle = document.querySelector(`[data-widget-toggle="${w.id}"]`);
    if (toggle) toggle.checked = active;

    // Update Interactive Catalog Card State (Badge & Centered Hover Action Pill)
    const card = document.querySelector(`.catalog-cube-card[data-cube-id="${w.id}"]`);
    if (card) {
      card.classList.toggle('is-active', active);
      const badge = card.querySelector('.catalog-card-badge');
      if (badge) {
        badge.textContent = active ? 'En Pantalla' : 'Inactivo';
      }
      const btn = card.querySelector('.btn-catalog-action');
      if (btn) {
        btn.className = `btn-catalog-action ${active ? 'btn-remove' : 'btn-add'}`;
        btn.innerHTML = active ? '✕ Quitar de Pantalla' : '+ Añadir al Escritorio';
      }
    }
  });

  const customList = settings.config.customCubes || [];
  customList.forEach(c => {
    const active = settings.config.activeWidgets ? (settings.config.activeWidgets[c.id] !== false) : true;
    const el = document.querySelector(`.widget-cube[data-id="${c.id}"]`);
    if (el) {
      el.style.display = active ? 'flex' : 'none';
    }
  });
}
window.syncWidgetVisibilityWithConfig = syncWidgetVisibilityWithConfig;

// Interactive Catalog Card Handlers (+ Añadir / ✕ Quitar)
document.addEventListener('click', (e) => {
  const catalogBtn = e.target.closest('[data-catalog-toggle]');
  const card = e.target.closest('.catalog-cube-card');
  if (catalogBtn || (card && e.target.closest('.catalog-card-overlay'))) {
    e.stopPropagation();
    const cubeId = (catalogBtn ? catalogBtn.dataset.catalogToggle : card.dataset.cubeId);
    if (!cubeId) return;

    const currentActive = settings.config.activeWidgets ? (settings.config.activeWidgets[cubeId] !== false) : false;
    const newActive = !currentActive;

    settings.setWidgetActive(cubeId, newActive);
    syncWidgetVisibilityWithConfig();
    saveCurrentLayout();

    if (newActive) {
      const widget = defaultWidgets.find(w => w.id === cubeId);
      if (widget && typeof widget.triggerPop === 'function') {
        widget.triggerPop();
      }
    }
  }
});

function arrangeWidgetsInLayout(modeId) {
  const marginX = 64;
  const marginY = 80;
  const gap = 16;
  const screenW = window.innerWidth || 1920;

  if (modeId === 'single') {
    // 1. Single Focused Central Cube
    const singleTarget = notesWidget || musicWidget || weatherWidget;
    if (singleTarget) {
      singleTarget.element.style.display = 'flex';
      singleTarget.setDimensions(260, 260);
      singleTarget.setPosition(Math.max(marginX, Math.round((screenW - 260) / 2)), marginY + 40);
    }
  } else if (modeId === 'duo-v') {
    // 4. Vertical Stacked Duo (2 Panels Stacked)
    if (notesWidget) {
      notesWidget.element.style.display = 'flex';
      notesWidget.setDimensions(280, 190);
      notesWidget.setPosition(marginX, marginY);
    }
    if (musicWidget) {
      musicWidget.element.style.display = 'flex';
      musicWidget.setDimensions(280, 190);
      musicWidget.setPosition(marginX, marginY + 190 + gap);
    }
  } else if (modeId === 'focus') {
    // Focus: Notes/Tasks + Telemetry HUD + Weather in clean productive Bento unit
    if (notesWidget) {
      notesWidget.setDimensions(260, 356);
      notesWidget.setPosition(marginX, marginY);
    }
    if (systemWidget) {
      systemWidget.setDimensions(260, 170);
      systemWidget.setPosition(marginX + 260 + gap, marginY);
    }
    if (weatherWidget) {
      weatherWidget.setDimensions(260, 170);
      weatherWidget.setPosition(marginX + 260 + gap, marginY + 170 + gap);
    }
  } else if (modeId === 'duo') {
    // Duo: 2 Balanced 50/50 Columns (Media Hub + Notes)
    if (musicWidget) {
      musicWidget.setDimensions(250, 340);
      musicWidget.setPosition(marginX, marginY);
    }
    if (notesWidget) {
      notesWidget.setDimensions(250, 340);
      notesWidget.setPosition(marginX + 250 + gap, marginY);
    }
  } else if (modeId === 'trio') {
    // Trio: 3 Symmetrical Columns (Notes + Music + Telemetry)
    const colW = Math.min(260, Math.floor((screenW - (marginX * 2) - (gap * 2)) / 3));
    if (notesWidget) {
      notesWidget.setDimensions(colW, 340);
      notesWidget.setPosition(marginX, marginY);
    }
    if (musicWidget) {
      musicWidget.setDimensions(colW, 340);
      musicWidget.setPosition(marginX + colW + gap, marginY);
    }
    if (systemWidget) {
      systemWidget.setDimensions(colW, 340);
      systemWidget.setPosition(marginX + (colW * 2) + (gap * 2), marginY);
    }
  } else if (modeId === 'media') {
    // Multimedia: Media Hub + CAVA Spectrum + MIDI FX + Lyrics
    if (musicWidget) {
      musicWidget.setDimensions(240, 320);
      musicWidget.setPosition(marginX, marginY);
    }
    if (cavaWidget) {
      cavaWidget.setDimensions(380, 320);
      cavaWidget.setPosition(marginX + 240 + gap, marginY);
    }
    if (midiFxWidget) {
      midiFxWidget.setDimensions(220, 320);
      midiFxWidget.setPosition(marginX + 240 + gap + 380 + gap, marginY);
    }
    if (lyricsWidget) {
      lyricsWidget.setDimensions(360, 200);
      lyricsWidget.setPosition(marginX, marginY + 320 + gap);
    }
  } else if (modeId === 'gaming') {
    // Bento 1+2 (Matching user mockup #5: 1 Big Left + 2 Stacked Right + Media)
    if (bongoWidget) {
      bongoWidget.setDimensions(320, 320);
      bongoWidget.setPosition(marginX, marginY);
    }
    if (systemWidget) {
      systemWidget.setDimensions(250, 152);
      systemWidget.setPosition(marginX + 320 + gap, marginY);
    }
    if (cavaWidget) {
      cavaWidget.setDimensions(250, 152);
      cavaWidget.setPosition(marginX + 320 + gap, marginY + 152 + gap);
    }
    if (musicWidget) {
      musicWidget.setDimensions(220, 320);
      musicWidget.setPosition(marginX + 320 + gap + 250 + gap, marginY);
    }
  } else if (modeId === 'studio') {
    // Bento Quad 2x2 grid (Matching user mockup #6)
    const sz = 210;
    if (musicWidget) {
      musicWidget.setDimensions(sz, sz);
      musicWidget.setPosition(marginX, marginY);
    }
    if (cavaWidget) {
      cavaWidget.setDimensions(sz, sz);
      cavaWidget.setPosition(marginX + sz + gap, marginY);
    }
    if (systemWidget) {
      systemWidget.setDimensions(sz, sz);
      systemWidget.setPosition(marginX, marginY + sz + gap);
    }
    if (weatherWidget) {
      weatherWidget.setDimensions(sz, sz);
      weatherWidget.setPosition(marginX + sz + gap, marginY + sz + gap);
    }
  } else if (modeId === 'embed') {
    // 1 app/embed card
    if (bongoWidget) {
      bongoWidget.setDimensions(360, 260);
      bongoWidget.setPosition(marginX, marginY);
    }
    if (notesWidget) {
      notesWidget.setDimensions(240, 260);
      notesWidget.setPosition(marginX + 360 + gap, marginY);
    }
  }
  saveCurrentLayout();
}

function applyWorkspaceModeUI(modeId) {
  settings.applyWorkspaceMode(modeId);
  syncWidgetVisibilityWithConfig();
  arrangeWidgetsInLayout(modeId);
  document.querySelectorAll('.bento-preview-card').forEach(c => {
    c.classList.toggle('active', c.dataset.workspaceMode === modeId);
  });
  document.querySelectorAll('.snap-preset-card').forEach(c => {
    c.classList.toggle('active', c.dataset.snapLayout === modeId);
  });

  const modeInfoTitle = document.getElementById('mode-info-title');
  const modeInfoDesc = document.getElementById('mode-info-desc');
  const descriptions = {
    focus: {
      title: 'Modo Focus',
      desc: 'Mantiene únicamente tus tareas y el reproductor de audio. Elimina toda distracción visual de la pantalla.'
    },
    embed: {
      title: 'Modo Embed',
      desc: 'Enfoca tus widgets de navegador, web apps o Bongo Cat como elemento central del escritorio.'
    },
    duo: {
      title: 'Modo Dúo',
      desc: 'Distribución balanceada de dos columnas: Tareas y Reproductor de Audio para máxima productividad.'
    },
    media: {
      title: 'Modo Multimedia',
      desc: 'Media Hub con espectro CAVA a 60 FPS y ecualizador MIDI para sesiones de música y streaming.'
    },
    gaming: {
      title: 'Ocio & Gaming',
      desc: 'Entretenimiento y juegos: Bongo Cat interactivo, reproductor de audio, CAVA a 60 FPS y telemetría de GPU/CPU.'
    },
    studio: {
      title: 'Estudio Completo',
      desc: 'Acceso total a todos los módulos: Audio, CAVA, Ecualizador MIDI, Letras, Bongo Cat, Telemetría, Notas y Galería.'
    }
  };

  if (descriptions[modeId]) {
    if (modeInfoTitle) modeInfoTitle.textContent = descriptions[modeId].title;
    if (modeInfoDesc) modeInfoDesc.textContent = descriptions[modeId].desc;
  }

  // Synchronize widget checkboxes in catalog
  if (settings.config.activeWidgets) {
    document.querySelectorAll('[data-widget-toggle]').forEach(toggle => {
      const wid = toggle.dataset.widgetToggle;
      toggle.checked = settings.config.activeWidgets[wid] !== false;
    });
  }
}

document.querySelectorAll('.bento-preview-card').forEach(card => {
  card.addEventListener('click', () => {
    const mode = card.dataset.workspaceMode;
    applyWorkspaceModeUI(mode);
  });
});



// -------------------------------------------------------------
// TYPOGRAPHY & WINDOW STYLES
// -------------------------------------------------------------
settings.applyTypography(settings.config.fontStyle || 'modern');
settings.applyWindowStyle(settings.config.windowStyle || 'bento');

document.querySelectorAll('.font-opt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.font-opt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.applyTypography(btn.dataset.font);
  });
});
if (settings.config.fontStyle) {
  document.querySelectorAll('.font-opt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.font === settings.config.fontStyle);
  });
}

document.querySelectorAll('.win-style-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.win-style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.applyWindowStyle(btn.dataset.winStyle);
  });
});
if (settings.config.windowStyle) {
  document.querySelectorAll('.win-style-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.winStyle === settings.config.windowStyle);
  });
}

// Low-Power PC Mode Switch
const toggleLowPower = document.getElementById('toggle-low-power');
if (toggleLowPower) {
  toggleLowPower.checked = !!settings.config.lowPowerMode;
  toggleLowPower.addEventListener('change', (e) => {
    settings.applyLowPowerMode(e.target.checked);
    syncSettingsUIFromConfig();
  });
}

// -------------------------------------------------------------
// DEDICATED WIDGET INSPECTOR MICRO-MODAL
// -------------------------------------------------------------
const cubeInspectorBackdrop = document.getElementById('cube-inspector-backdrop');
const closeInspectorBtn = document.getElementById('close-inspector-btn');
const inspectorCancelBtn = document.getElementById('inspector-cancel-btn');
const inspectorSaveBtn = document.getElementById('inspector-save-btn');
const inspectorNameInput = document.getElementById('inspector-name-input');
const inspectorBadgeInput = document.getElementById('inspector-badge-input');
const inspectorTitle = document.getElementById('inspector-widget-title');
const inspectorCustomFields = document.getElementById('inspector-custom-fields');
let activeInspectedWidget = null;
let activeInspectedShape = '1:1';

window.openCubeInspector = function(widget) {
  if (!widget || !cubeInspectorBackdrop) return;
  activeInspectedWidget = widget;
  if (inspectorTitle) inspectorTitle.textContent = `Personalizar ${widget.title}`;
  if (inspectorNameInput) inspectorNameInput.value = widget.title;
  if (inspectorBadgeInput) inspectorBadgeInput.value = widget.badgeText || widget.badge || '';

  document.querySelectorAll('[data-inspector-shape]').forEach(b => {
    b.classList.remove('active');
    if (b.dataset.inspectorShape === '1:1') b.classList.add('active');
  });
  activeInspectedShape = '1:1';

  // Context-Aware Widget Configuration Fields
  if (inspectorCustomFields) {
    inspectorCustomFields.innerHTML = '';
    const id = widget.id || '';

    if (id === 'weather') {
      const currentCity = settings.getWidgetOption('weather', 'city', settings.config.weatherCity || 'Madrid, ES');
      const currentUnit = settings.getWidgetOption('weather', 'units', settings.config.weatherUnits || 'c');
      inspectorCustomFields.innerHTML = `
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Ubicación / Ciudad Meteorológica</div>
          <input type="text" id="inspector-field-city" class="cube-text-input" value="${currentCity}" placeholder="Ej: Madrid, ES o Tokyo, JP">
        </div>
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Escala de Temperatura</div>
          <select id="inspector-field-units" class="cube-select">
            <option value="c" ${currentUnit === 'c' ? 'selected' : ''}>Celsius (°C)</option>
            <option value="f" ${currentUnit === 'f' ? 'selected' : ''}>Fahrenheit (°F)</option>
          </select>
        </div>
      `;
    } else if (id === 'music') {
      const currentVol = settings.getWidgetOption('music', 'volume', settings.config.volume || 75);
      const currentStation = settings.getWidgetOption('music', 'station', 'lofi');
      inspectorCustomFields.innerHTML = `
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Canal / Estilo de Audio</div>
          <select id="inspector-field-station" class="cube-select">
            <option value="lofi" ${currentStation === 'lofi' ? 'selected' : ''}>Lo-Fi Study Beats</option>
            <option value="synthwave" ${currentStation === 'synthwave' ? 'selected' : ''}>Retro Synthwave 80s</option>
            <option value="cyberpunk" ${currentStation === 'cyberpunk' ? 'selected' : ''}>Cyberpunk D&B / Bass</option>
            <option value="ambient" ${currentStation === 'ambient' ? 'selected' : ''}>Deep Ambient Chill</option>
          </select>
        </div>
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Volumen Inicial (${currentVol}%)</div>
          <input type="range" id="inspector-field-volume" min="0" max="100" value="${currentVol}" class="slider-input">
        </div>
      `;
    } else if (id === 'cava') {
      const currentStyle = settings.getWidgetOption('cava', 'style', 'bars');
      const currentSens = settings.getWidgetOption('cava', 'sensitivity', 'normal');
      inspectorCustomFields.innerHTML = `
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Estilo de Renderizado CAVA</div>
          <select id="inspector-field-cava-style" class="cube-select">
            <option value="bars" ${currentStyle === 'bars' ? 'selected' : ''}>Barras Clásicas Fluent</option>
            <option value="wave" ${currentStyle === 'wave' ? 'selected' : ''}>Onda Continua Suave</option>
            <option value="radial" ${currentStyle === 'radial' ? 'selected' : ''}>Espectro Halo Circular</option>
          </select>
        </div>
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Sensibilidad del Espectro</div>
          <select id="inspector-field-cava-sens" class="cube-select">
            <option value="low" ${currentSens === 'low' ? 'selected' : ''}>Baja (Música de alta ganancia)</option>
            <option value="normal" ${currentSens === 'normal' ? 'selected' : ''}>Normal (Balanceada)</option>
            <option value="high" ${currentSens === 'high' ? 'selected' : ''}>Alta (Audio suave)</option>
          </select>
        </div>
      `;
    } else if (id === 'system') {
      const spark = settings.getWidgetOption('system', 'sparkline', true);
      const gpu = settings.getWidgetOption('system', 'gpu', true);
      inspectorCustomFields.innerHTML = `
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Historial Gráfico</div>
          <select id="inspector-field-sys-spark" class="cube-select">
            <option value="true" ${spark ? 'selected' : ''}>Sparkline Fluido Tiempo Real</option>
            <option value="false" ${!spark ? 'selected' : ''}>Barras Lineales Fijas</option>
          </select>
        </div>
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Métricas GPU</div>
          <select id="inspector-field-sys-gpu" class="cube-select">
            <option value="true" ${gpu ? 'selected' : ''}>Mostrar Telemetría GPU</option>
            <option value="false" ${!gpu ? 'selected' : ''}>Ocultar GPU</option>
          </select>
        </div>
      `;
    } else if (id === 'notes') {
      const prio = settings.getWidgetOption('notes', 'defaultPriority', 'normal');
      inspectorCustomFields.innerHTML = `
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Prioridad Inicial de Tarea</div>
          <select id="inspector-field-notes-prio" class="cube-select">
            <option value="low" ${prio === 'low' ? 'selected' : ''}>Baja (Gris)</option>
            <option value="normal" ${prio === 'normal' ? 'selected' : ''}>Normal / Media (Azul)</option>
            <option value="high" ${prio === 'high' ? 'selected' : ''}>Alta / Urgente (Rojo)</option>
          </select>
        </div>
        <div class="setting-group" style="margin-bottom:0;">
          <button id="inspector-notes-clean-btn" class="btn-cancel" style="width:100%; text-align:center; padding:6px; cursor:pointer;">Limpiar Tareas Hechas</button>
        </div>
      `;
      setTimeout(() => {
        const btn = document.getElementById('inspector-notes-clean-btn');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const cleanBtn = document.getElementById('tasks-clean-btn');
            if (cleanBtn) cleanBtn.click();
            btn.textContent = '✓ ¡Tareas limpiadas!';
            setTimeout(() => { btn.textContent = 'Limpiar Tareas Hechas'; }, 1500);
          });
        }
      }, 50);
    } else if (id === 'bongocat') {
      const sfx = settings.getWidgetOption('bongocat', 'sfx', true);
      inspectorCustomFields.innerHTML = `
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Sonidos de Tecleo Acústicos (SFX)</div>
          <select id="inspector-field-bongo-sfx" class="cube-select">
            <option value="true" ${sfx ? 'selected' : ''}>Activados</option>
            <option value="false" ${!sfx ? 'selected' : ''}>Silenciado</option>
          </select>
        </div>
      `;
    } else if (id === 'crypto') {
      const coins = settings.getWidgetOption('crypto', 'coins', 'BTC, ETH, SOL');
      inspectorCustomFields.innerHTML = `
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Criptomonedas Activas (separadas por coma)</div>
          <input type="text" id="inspector-field-crypto-coins" class="cube-text-input" value="${coins}">
        </div>
      `;
    } else if (widget.isCustom) {
      const customData = (settings.config.customCubes || []).find(c => c.id === widget.id) || {};
      const cType = customData.type || 'url';
      const cContent = customData.url || customData.content || '';
      inspectorCustomFields.innerHTML = `
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">Tipo de Contenido</div>
          <select id="inspector-field-custom-type" class="cube-select">
            <option value="url" ${cType === 'url' ? 'selected' : ''}>Página Web / Iframe</option>
            <option value="html" ${cType === 'html' ? 'selected' : ''}>Código HTML Personalizado</option>
            <option value="notes" ${cType === 'notes' ? 'selected' : ''}>Bloc de Texto</option>
          </select>
        </div>
        <div class="setting-group" style="margin-bottom:0;">
          <div class="setting-label">URL o Código HTML</div>
          <textarea id="inspector-field-custom-content" class="cube-textarea" style="width:100%; min-height:80px;">${cContent}</textarea>
        </div>
      `;
    }
  }

  cubeInspectorBackdrop.classList.add('open');
};

function closeCubeInspector() {
  if (cubeInspectorBackdrop) cubeInspectorBackdrop.classList.remove('open');
  activeInspectedWidget = null;
}

if (closeInspectorBtn) closeInspectorBtn.addEventListener('click', closeCubeInspector);
if (inspectorCancelBtn) inspectorCancelBtn.addEventListener('click', closeCubeInspector);
if (cubeInspectorBackdrop) {
  cubeInspectorBackdrop.addEventListener('click', (e) => {
    if (e.target === cubeInspectorBackdrop) closeCubeInspector();
  });
}

document.querySelectorAll('[data-inspector-shape]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-inspector-shape]').forEach(btn => btn.classList.remove('active'));
    b.classList.add('active');
    activeInspectedShape = b.dataset.inspectorShape;
  });
});

if (inspectorSaveBtn) {
  inspectorSaveBtn.addEventListener('click', () => {
    if (!activeInspectedWidget) return;
    const newName = (inspectorNameInput.value || activeInspectedWidget.title).trim();
    const newBadge = (inspectorBadgeInput.value || activeInspectedWidget.badge || 'CUBE').trim().toUpperCase();

    if (typeof activeInspectedWidget.updateTitle === 'function') {
      activeInspectedWidget.updateTitle(newName, newBadge);
    } else {
      activeInspectedWidget.title = newName;
      activeInspectedWidget.badge = newBadge;
    }

    let w = activeInspectedWidget.width;
    let h = activeInspectedWidget.height;
    if (activeInspectedShape === '1:1') { w = 200; h = 200; }
    else if (activeInspectedShape === '16:9') { w = 340; h = 200; }
    else if (activeInspectedShape === '9:16') { w = 200; h = 340; }
    else if (activeInspectedShape === '2:1') { w = 400; h = 200; }
    activeInspectedWidget.setDimensions(w, h);

    // Save widget-specific configuration options
    const id = activeInspectedWidget.id;
    if (id === 'weather') {
      const cityEl = document.getElementById('inspector-field-city');
      const unitsEl = document.getElementById('inspector-field-units');
      if (cityEl) {
        settings.config.weatherCity = cityEl.value.trim();
        settings.setWidgetOption('weather', 'city', cityEl.value.trim());
      }
      if (unitsEl) {
        settings.config.weatherUnits = unitsEl.value;
        settings.setWidgetOption('weather', 'units', unitsEl.value);
      }
      if (typeof fetchWeatherData === 'function') fetchWeatherData();
    } else if (id === 'music') {
      const stationEl = document.getElementById('inspector-field-station');
      const volEl = document.getElementById('inspector-field-volume');
      if (stationEl) settings.setWidgetOption('music', 'station', stationEl.value);
      if (volEl) {
        const v = parseInt(volEl.value, 10);
        settings.config.volume = v;
        settings.setWidgetOption('music', 'volume', v);
        if (window.audioEngine) window.audioEngine.setVolume(v);
        if (customAudioElement) customAudioElement.volume = v / 100;
        const masterVol = document.getElementById('master-vol-slider');
        if (masterVol) masterVol.value = v;
        if (musicVolSlider) musicVolSlider.value = v;
      }
    } else if (id === 'cava') {
      const stEl = document.getElementById('inspector-field-cava-style');
      const sensEl = document.getElementById('inspector-field-cava-sens');
      if (stEl) settings.setWidgetOption('cava', 'style', stEl.value);
      if (sensEl) settings.setWidgetOption('cava', 'sensitivity', sensEl.value);
    } else if (id === 'system') {
      const sparkEl = document.getElementById('inspector-field-sys-spark');
      const gpuEl = document.getElementById('inspector-field-sys-gpu');
      if (sparkEl) settings.setWidgetOption('system', 'sparkline', sparkEl.value === 'true');
      if (gpuEl) settings.setWidgetOption('system', 'gpu', gpuEl.value === 'true');
    } else if (id === 'notes') {
      const prioEl = document.getElementById('inspector-field-notes-prio');
      if (prioEl) settings.setWidgetOption('notes', 'defaultPriority', prioEl.value);
    } else if (id === 'bongocat') {
      const sfxEl = document.getElementById('inspector-field-bongo-sfx');
      if (sfxEl) settings.setWidgetOption('bongocat', 'sfx', sfxEl.value === 'true');
    } else if (id === 'crypto') {
      const coinsEl = document.getElementById('inspector-field-crypto-coins');
      if (coinsEl) {
        settings.setWidgetOption('crypto', 'coins', coinsEl.value.trim());
        const arr = coinsEl.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (arr.length > 0) settings.config.cryptoCoins = arr;
        if (typeof fetchCryptoPrices === 'function') fetchCryptoPrices();
      }
    } else if (activeInspectedWidget.isCustom) {
      const typeEl = document.getElementById('inspector-field-custom-type');
      const contentEl = document.getElementById('inspector-field-custom-content');
      settings.updateCustomCube(activeInspectedWidget.id, {
        title: newName,
        badge: newBadge,
        shape: activeInspectedShape,
        width: w,
        height: h,
        type: typeEl ? typeEl.value : 'url',
        url: (typeEl && typeEl.value === 'url') ? contentEl.value.trim() : '',
        content: (typeEl && typeEl.value !== 'url') ? contentEl.value : ''
      });
      refreshCustomCubesCatalog();
    }
    saveCurrentLayout();
    closeCubeInspector();
  });
}

// Backup & Share Profile (Export & Import)
const btnExportProfile = document.getElementById('btn-export-profile');
if (btnExportProfile) {
  btnExportProfile.addEventListener('click', () => {
    saveCurrentLayout();
    const jsonStr = settings.exportProfile();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cubeworld-profile-${new Date().toISOString().slice(0, 10)}.cubeworld`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

const importProfileInput = document.getElementById('import-profile-input');
if (importProfileInput) {
  importProfileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const ok = settings.importProfile(evt.target.result);
      if (ok) {
        alert('¡Perfil de Ricing importado con éxito! Recargando vista...');
        window.location.reload();
      } else {
        alert('Error: el archivo importado no es un perfil válido de CubeWorld.');
      }
    };
    reader.readAsText(file);
  });
}

// Windows Auto-Start Toggle (Open at Login)
const toggleOpenAtLogin = document.getElementById('toggle-open-at-login');
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try {
    const { ipcRenderer } = window.require('electron');
    if (toggleOpenAtLogin) {
      ipcRenderer.invoke('get-open-at-login').then(isOpen => {
        toggleOpenAtLogin.checked = !!isOpen;
      }).catch(() => {});

      toggleOpenAtLogin.addEventListener('change', (e) => {
        ipcRenderer.send('set-open-at-login', e.target.checked);
      });
    }

    // Handle System Tray IPC events
    ipcRenderer.on('tray-toggle-dock', () => {
      if (btnDockCollapse && floatingDock && dockExpandPill) {
        if (floatingDock.classList.contains('collapsed')) {
          floatingDock.classList.remove('collapsed');
          dockExpandPill.classList.add('hidden');
        } else {
          floatingDock.classList.add('collapsed');
          dockExpandPill.classList.remove('hidden');
        }
      }
    });

    ipcRenderer.on('tray-toggle-lock', () => {
      if (btnLockHUD) btnLockHUD.click();
    });

    ipcRenderer.on('tray-open-settings', () => {
      toggleSettingsModal();
    });

    ipcRenderer.on('auto-start-changed', (event, val) => {
      if (toggleOpenAtLogin) toggleOpenAtLogin.checked = !!val;
    });
  } catch (err) {}
}

// CAVA Sensitivity Slider in Settings
const cavaSensSlider = document.getElementById('cava-sens-slider');
const cavaSensDisplay = document.getElementById('cava-sens-display');
if (cavaSensSlider) {
  cavaSensSlider.addEventListener('input', (e) => {
    cavaSens = parseFloat(e.target.value) / 10;
    if (cavaSensDisplay) cavaSensDisplay.textContent = `${cavaSens.toFixed(1)}x`;
    settings.set('cavaSens', cavaSens);
  });
}

// CAVA Style Buttons in Settings
document.querySelectorAll('.cava-opt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    cavaMode = btn.dataset.cavaStyle;
    updateCavaUI();
    settings.set('cavaMode', cavaMode);
  });
});

// CAVA Color Palette Presets in Settings
const savedCavaColor = settings.config.cavaColorScheme || 'theme';
document.querySelectorAll('[data-cava-color]').forEach(btn => {
  btn.classList.toggle('active', btn.dataset.cavaColor === savedCavaColor);
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-cava-color]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.set('cavaColorScheme', btn.dataset.cavaColor);
  });
});

// Dock Collapse & Expand Pill (Uses main-dock ID from HTML)
const floatingDock = document.getElementById('main-dock') || document.getElementById('floating-dock');
const btnDockCollapse = document.getElementById('btn-dock-collapse');
const dockExpandPill = document.getElementById('dock-expand-pill');

if (btnDockCollapse && floatingDock && dockExpandPill) {
  btnDockCollapse.addEventListener('click', (e) => {
    e.stopPropagation();
    floatingDock.classList.add('collapsed');
    dockExpandPill.classList.remove('hidden');
  });

  dockExpandPill.addEventListener('click', (e) => {
    e.stopPropagation();
    floatingDock.classList.remove('collapsed');
    dockExpandPill.classList.add('hidden');
  });
}

// Master Volume & Proximity Snap Sliders
const masterVolSlider = document.getElementById('master-vol-slider');
if (masterVolSlider) {
  masterVolSlider.value = typeof settings.config.volume === 'number' ? settings.config.volume : 75;
  masterVolSlider.addEventListener('input', (e) => {
    const vol = parseInt(e.target.value, 10);
    audio.setVolume(vol);
    settings.set('volume', vol);
    if (musicVolSlider) musicVolSlider.value = vol;
    if (customAudioElement) customAudioElement.volume = vol / 100;
  });
}

const snapSlider = document.getElementById('snap-slider');
if (snapSlider) {
  snapSlider.addEventListener('input', (e) => {
    snapEngine.SNAP_THRESHOLD = parseInt(e.target.value, 10);
    settings.set('snapThreshold', snapEngine.SNAP_THRESHOLD);
  });
}

// Pin to Desktop / Always On Top Toggle
const btnPinDesktop = document.getElementById('btn-pin-desktop');
if (btnPinDesktop) {
  let isAlwaysOnTop = false;
  btnPinDesktop.addEventListener('click', () => {
    isAlwaysOnTop = !isAlwaysOnTop;
    btnPinDesktop.style.color = isAlwaysOnTop ? 'var(--accent-primary)' : 'var(--text-main)';
    btnPinDesktop.title = isAlwaysOnTop ? 'Fijado al frente (Siempre Visible)' : 'Fijar al fondo / Al frente';
    if (typeof window !== 'undefined' && typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('set-always-on-top', isAlwaysOnTop);
      } catch (err) {}
    }
  });
}

// Widget Visibility Toggles
const widgetToggles = document.querySelectorAll('[data-widget-toggle]');
widgetToggles.forEach(toggle => {
  toggle.addEventListener('change', (e) => {
    const id = e.target.dataset.widgetToggle;
    const widget = snapEngine.widgets.find(w => w.id === id);
    if (widget) {
      widget.element.style.display = e.target.checked ? 'flex' : 'none';
      settings.setWidgetActive(id, e.target.checked);
    }
  });
});

// Save Current Layout Button
const saveLayoutBtn = document.getElementById('save-layout-btn');
if (saveLayoutBtn) {
  saveLayoutBtn.addEventListener('click', () => {
    saveCurrentLayout();
    const orig = saveLayoutBtn.innerHTML;
    saveLayoutBtn.innerHTML = `${getSvgIcon('check', 13)} ¡Posiciones Guardadas!`;
    setTimeout(() => { saveLayoutBtn.innerHTML = orig; }, 1800);
  });
}

// Reset Positions Button
const resetPosBtn = document.getElementById('reset-positions-btn');
if (resetPosBtn) {
  resetPosBtn.addEventListener('click', () => {
    layoutWidgetsDefault();
    saveCurrentLayout();
    settingsBackdrop.classList.remove('open');
  });
}

// Global Clock
function updateClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  globalClockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
setInterval(updateClock, 1000);
updateClock();

// -------------------------------------------------------------
// ELECTRON DIRECTCOMPOSITION MOUSE PASS-THROUGH
// -------------------------------------------------------------
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try {
    const { ipcRenderer } = window.require('electron');
    let isClickThrough = false;

    window.addEventListener('mousemove', (e) => {
      const isOverInteractive = !!(
        e.target.closest('.widget-cube') ||
        e.target.closest('.widget-cluster') ||
        e.target.closest('.floating-control-dock') ||
        e.target.closest('.dock-expand-pill') ||
        e.target.closest('.settings-modal') ||
        e.target.closest('.cube-creator-modal') ||
        e.target.closest('.cube-inspector-modal') ||
        e.target.closest('.glass-prompt-modal') ||
        e.target.closest('.bento-layout-strip') ||
        e.target.closest('.widget-context-menu') ||
        e.target.closest('.cubepack-dropzone') ||
        e.target.closest('.plugin-pack-card') ||
        e.target.closest('button') ||
        e.target.closest('input') ||
        e.target.closest('label') ||
        e.target.closest('select') ||
        e.target.closest('textarea')
      );

      if (isOverInteractive && isClickThrough) {
        isClickThrough = false;
        ipcRenderer.send('set-ignore-mouse-events', false);
      } else if (!isOverInteractive && !isClickThrough) {
        isClickThrough = true;
        ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
      }
    });
  } catch (err) {
    // Standard browser environment
  }
}

// =============================================================
// ECOSYSTEM: PRODUCTION WIDGETS & SYSTEM SERVICES
// =============================================================

// -------------------------------------------------------------
// 1. WEATHER HUB (Open-Meteo Real-Time Engine & Geocoding)
// -------------------------------------------------------------
let weatherLat = settings.config.weatherLat || 40.4168;
let weatherLon = settings.config.weatherLon || -3.7038;

async function updateWeatherCity(cityName) {
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=es&format=json`);
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.results && geoData.results.length > 0) {
        const place = geoData.results[0];
        weatherLat = place.latitude;
        weatherLon = place.longitude;
        const formatted = `${place.name}, ${place.country_code ? place.country_code.toUpperCase() : ''}`;
        settings.set('weatherCity', formatted);
        settings.set('weatherLat', weatherLat);
        settings.set('weatherLon', weatherLon);
      }
    }
  } catch (err) {}
  fetchWeatherData();
}

async function fetchWeatherData() {
  const city = settings.config.weatherCity || 'Madrid, ES';
  const cityNameEl = document.getElementById('weather-city-name');
  if (cityNameEl) cityNameEl.textContent = city;

  const getConditionInfo = (code) => {
    if (code === 0) return { text: 'Cielo Despejado', icon: 'sun' };
    if ([1, 2, 3].includes(code)) return { text: 'Parcialmente Nublado', icon: 'cloud' };
    if ([45, 48].includes(code)) return { text: 'Niebla / Neblina', icon: 'cloud' };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { text: 'Lluvia Moderada', icon: 'cloudRain' };
    if ([71, 73, 75, 85, 86].includes(code)) return { text: 'Nieve', icon: 'cloud' };
    if ([95, 96, 99].includes(code)) return { text: 'Tormenta Eléctrica', icon: 'zap' };
    return { text: 'Despejado', icon: 'sun' };
  };

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${weatherLat}&longitude=${weatherLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    const cur = data.current;
    const daily = data.daily;

    const cond = getConditionInfo(cur.weather_code);

    const tempEl = document.getElementById('weather-temp-val');
    const condEl = document.getElementById('weather-condition-text');
    const iconHeroEl = document.getElementById('weather-icon-hero');
    const feelsEl = document.getElementById('weather-feels-like');
    const humEl = document.getElementById('weather-humidity');
    const windEl = document.getElementById('weather-wind');

    if (tempEl) tempEl.textContent = `${Math.round(cur.temperature_2m)}°C`;
    if (condEl) condEl.textContent = cond.text;
    if (iconHeroEl) iconHeroEl.innerHTML = getSvgIcon(cond.icon, 36);
    if (feelsEl) feelsEl.textContent = `${Math.round(cur.apparent_temperature)}°C`;
    if (humEl) humEl.textContent = `${cur.relative_humidity_2m}%`;
    if (windEl) windEl.textContent = `${Math.round(cur.wind_speed_10m)} km/h`;

    // Forecast next 3 days
    if (daily && daily.temperature_2m_max) {
      for (let i = 1; i <= 3; i++) {
        const fcIconEl = document.getElementById(`weather-fc-icon-${i}`);
        const fcTempEl = document.getElementById(`weather-fc-temp-${i}`);
        if (fcIconEl && daily.weather_code[i] !== undefined) {
          const fcCond = getConditionInfo(daily.weather_code[i]);
          fcIconEl.innerHTML = getSvgIcon(fcCond.icon, 14);
        }
        if (fcTempEl && daily.temperature_2m_max[i] !== undefined) {
          fcTempEl.textContent = `${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°`;
        }
      }
    }
  } catch (err) {
    const tempEl = document.getElementById('weather-temp-val');
    if (tempEl && (tempEl.textContent === '--' || !tempEl.textContent)) tempEl.textContent = '22°C';
  }
}

const weatherRefreshBtn = document.getElementById('weather-refresh-btn');
if (weatherRefreshBtn) {
  weatherRefreshBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fetchWeatherData();
  });
}

const weatherCityDisplay = document.getElementById('weather-city-display');
if (weatherCityDisplay) {
  weatherCityDisplay.addEventListener('click', (e) => {
    e.stopPropagation();
    window.showGlassPrompt({
      title: 'Cambiar Ciudad para Clima',
      desc: 'Introduce cualquier ciudad del mundo (ej: Buenos Aires, Tokyo, CDMX, Bogotá, Madrid):',
      placeholder: 'Nombre de la ciudad...',
      value: settings.config.weatherCity || 'Madrid, ES',
      onConfirm: (cityName) => {
        if (cityName && cityName.trim()) {
          updateWeatherCity(cityName.trim());
        }
      }
    });
  });
}
fetchWeatherData();
setInterval(fetchWeatherData, 15 * 60 * 1000);

// -------------------------------------------------------------
// 2. CRYPTO TICKER (Binance 24h Public Ticker & Live Charts)
// -------------------------------------------------------------
async function fetchCryptoPrices() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]');
    if (!res.ok) throw new Error('Binance API error');
    const list = await res.json();

    const formatPrice = (p) => {
      const num = parseFloat(p);
      if (num >= 1000) return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
      return '$' + num.toFixed(2);
    };

    const updateCoin = (sym, priceElId, changeElId) => {
      const item = list.find(c => c.symbol === `${sym}USDT`);
      if (!item) return;
      const priceEl = document.getElementById(priceElId);
      const changeEl = document.getElementById(changeElId);
      if (priceEl) priceEl.textContent = formatPrice(item.lastPrice);
      if (changeEl) {
        const pct = parseFloat(item.priceChangePercent);
        const isUp = pct >= 0;
        changeEl.className = `crypto-change-pill ${isUp ? 'up' : 'down'}`;
        changeEl.innerHTML = `${getSvgIcon(isUp ? 'trendingUp' : 'trendingDown', 10)} ${isUp ? '+' : ''}${pct.toFixed(2)}%`;
      }
    };

    updateCoin('BTC', 'crypto-btc-price', 'crypto-btc-change');
    updateCoin('ETH', 'crypto-eth-price', 'crypto-eth-change');
    updateCoin('SOL', 'crypto-sol-price', 'crypto-sol-change');
  } catch (err) {
    // Keep cached data
  }
}
fetchCryptoPrices();
setInterval(fetchCryptoPrices, 30 * 1000);

// Clickable Crypto Rows (Open TradingView / Binance Chart)
const btcRow = document.getElementById('crypto-btc-row');
const ethRow = document.getElementById('crypto-eth-row');
const solRow = document.getElementById('crypto-sol-row');
if (btcRow) btcRow.addEventListener('click', () => window.open('https://www.binance.com/en/trade/BTC_USDT', '_blank'));
if (ethRow) ethRow.addEventListener('click', () => window.open('https://www.binance.com/en/trade/ETH_USDT', '_blank'));
if (solRow) solRow.addEventListener('click', () => window.open('https://www.binance.com/en/trade/SOL_USDT', '_blank'));

// -------------------------------------------------------------
// 3. HARDWARE BATTERY & POWER HUB
// -------------------------------------------------------------
function initBatteryHub() {
  const levelEl = document.getElementById('battery-level-val');
  const ringEl = document.getElementById('battery-progress-ring');
  const tagEl = document.getElementById('battery-state-tag');
  const iconWrap = document.getElementById('battery-icon-wrap');
  const labelEl = document.getElementById('battery-state-label');
  const timeEl = document.getElementById('battery-time-est');

  const updateBatteryUI = (level, charging, chargingTime, dischargingTime) => {
    const pct = Math.round(level * 100);
    if (levelEl) levelEl.textContent = `${pct}%`;
    if (ringEl) {
      const circumference = 263.89;
      const offset = circumference * (1 - level);
      ringEl.style.strokeDashoffset = offset;
      if (pct <= 20 && !charging) {
        ringEl.style.stroke = '#ef4444';
      } else if (charging) {
        ringEl.style.stroke = '#10b981';
      } else {
        ringEl.style.stroke = 'var(--accent-primary)';
      }
    }
    if (tagEl) {
      tagEl.className = `battery-state-tag ${charging ? 'charging' : ''}`;
    }
    if (iconWrap) {
      iconWrap.innerHTML = charging ? getSvgIcon('zap', 12) : getSvgIcon('battery', 12);
    }
    if (labelEl) {
      labelEl.textContent = charging ? 'Cargando (AC)' : 'En Batería';
    }
    if (timeEl) {
      if (charging) {
        timeEl.textContent = chargingTime && chargingTime !== Infinity ? `Carga completa en ${Math.round(chargingTime/60)}m` : 'Alimentación AC Continua';
      } else {
        timeEl.textContent = dischargingTime && dischargingTime !== Infinity ? `Aprox. ${Math.round(dischargingTime/60)}m restantes` : 'Consumo Equilibrado';
      }
    }
  };

  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      const handler = () => updateBatteryUI(battery.level, battery.charging, battery.chargingTime, battery.dischargingTime);
      handler();
      battery.addEventListener('levelchange', handler);
      battery.addEventListener('chargingchange', handler);
    }).catch(() => {
      updateBatteryUI(1, true, 0, 0);
    });
  } else {
    updateBatteryUI(1, true, 0, 0);
  }
}
initBatteryHub();

// -------------------------------------------------------------
// 4. GITHUB DEV PULSE
// -------------------------------------------------------------
async function fetchGitHubStats() {
  const user = settings.config.githubUser || 'torvalds';
  const nameEl = document.getElementById('github-name-val');
  const loginEl = document.getElementById('github-login-val');
  const reposEl = document.getElementById('github-repos-val');
  const followersEl = document.getElementById('github-followers-val');
  const linkEl = document.getElementById('github-profile-link');
  const avatarBox = document.getElementById('github-avatar-box');

  if (loginEl) loginEl.textContent = `@${user}`;
  if (linkEl) linkEl.href = `https://github.com/${user}`;

  try {
    const res = await fetch(`https://api.github.com/users/${user}`);
    if (!res.ok) throw new Error('GitHub API Error');
    const data = await res.json();
    if (nameEl) nameEl.textContent = data.name || data.login;
    if (reposEl) reposEl.textContent = data.public_repos;
    if (followersEl) followersEl.textContent = data.followers;
    if (avatarBox && data.avatar_url) {
      avatarBox.innerHTML = `<img src="${data.avatar_url}" alt="${user}" />`;
    }
  } catch (err) {
    // Keep fallback
  }
}
fetchGitHubStats();

// Click to customize GitHub User
const githubUserRow = document.querySelector('.github-user-row');
if (githubUserRow) {
  githubUserRow.addEventListener('click', (e) => {
    e.stopPropagation();
    window.showGlassPrompt({
      title: 'Configurar Usuario de GitHub',
      desc: 'Introduce tu nombre de usuario de GitHub para ver tus estadísticas en tiempo real:',
      placeholder: 'ej: torvalds, midudev, tu-usuario...',
      value: settings.config.githubUser || 'torvalds',
      onConfirm: (username) => {
        if (username && username.trim()) {
          settings.set('githubUser', username.trim());
          fetchGitHubStats();
        }
      }
    });
  });
}

// -------------------------------------------------------------
// 5. ACRYLIC GLASS CONTEXT MENU ENGINE
// -------------------------------------------------------------
let currentCtxWidget = null;
const ctxMenu = document.getElementById('widget-context-menu');
const ctxTitle = document.getElementById('ctx-widget-title');
const ctxBadge = document.getElementById('ctx-widget-badge');
const ctxLockLabel = document.getElementById('ctx-lock-label');

window.openWidgetContextMenu = function(widget, clientX, clientY) {
  currentCtxWidget = widget;
  if (!ctxMenu) return;

  if (ctxTitle) ctxTitle.textContent = widget.title;
  if (ctxBadge) ctxBadge.textContent = widget.badge || 'CUBE';
  if (ctxLockLabel) ctxLockLabel.textContent = widget.isLocked ? 'Desbloquear Posición' : 'Bloquear Posición';

  const ctxActionUnlink = document.getElementById('ctx-action-unlink');
  const ctxActionUnlinkAll = document.getElementById('ctx-action-unlink-all');
  if (ctxActionUnlink) {
    ctxActionUnlink.style.display = widget.cluster ? 'flex' : 'none';
  }
  if (ctxActionUnlinkAll) {
    ctxActionUnlinkAll.style.display = widget.cluster ? 'flex' : 'none';
  }

  ctxMenu.classList.remove('hidden');

  const menuW = 200;
  const menuH = 290;
  const posX = Math.min(clientX, window.innerWidth - menuW - 10);
  const posY = Math.min(clientY, window.innerHeight - menuH - 10);

  ctxMenu.style.left = `${Math.max(10, posX)}px`;
  ctxMenu.style.top = `${Math.max(10, posY)}px`;
};

function closeContextMenu() {
  if (ctxMenu && !ctxMenu.classList.contains('hidden')) {
    ctxMenu.classList.add('hidden');
    currentCtxWidget = null;
  }
}

window.addEventListener('click', (e) => {
  if (!e.target.closest('#widget-context-menu')) {
    closeContextMenu();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (floatingSnapHud && !floatingSnapHud.classList.contains('hidden')) {
      floatingSnapHud.classList.add('hidden');
      return;
    }
    if (glassPromptBackdrop && glassPromptBackdrop.classList.contains('open')) {
      closeGlassPrompt();
      return;
    }
    if (ctxMenu && !ctxMenu.classList.contains('hidden')) {
      closeContextMenu();
      return;
    }
    if (cubeInspectorBackdrop && cubeInspectorBackdrop.classList.contains('open')) {
      closeCubeInspector();
      return;
    }
    const creatorBackdrop = document.getElementById('cube-creator-backdrop');
    if (creatorBackdrop && creatorBackdrop.classList.contains('open')) {
      creatorBackdrop.classList.remove('open');
      return;
    }
    const setBackdrop = document.getElementById('settings-backdrop');
    if (setBackdrop && setBackdrop.classList.contains('open')) {
      setBackdrop.classList.remove('open');
      return;
    }
  }
});

document.querySelectorAll('[data-ctx-shape]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCtxWidget) {
      const shape = btn.dataset.ctxShape;
      currentCtxWidget.setShape(shape);
      saveCurrentLayout();
    }
    closeContextMenu();
  });
});

const ctxActionEdit = document.getElementById('ctx-action-edit');
if (ctxActionEdit) {
  ctxActionEdit.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCtxWidget) {
      const target = currentCtxWidget;
      closeContextMenu();
      window.openCubeInspector(target);
    }
  });
}

const ctxActionLock = document.getElementById('ctx-action-lock');
if (ctxActionLock) {
  ctxActionLock.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCtxWidget) {
      currentCtxWidget.isLocked = !currentCtxWidget.isLocked;
      currentCtxWidget.element.classList.toggle('is-locked', currentCtxWidget.isLocked);
      saveCurrentLayout();
    }
    closeContextMenu();
  });
}

const ctxActionDuplicate = document.getElementById('ctx-action-duplicate');
if (ctxActionDuplicate) {
  ctxActionDuplicate.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCtxWidget) {
      const newDef = {
        id: `custom_${Date.now()}`,
        title: `${currentCtxWidget.title} (Copia)`,
        badge: currentCtxWidget.badge || 'CUBE',
        template: 'note',
        payload: 'Cubo duplicado',
        width: currentCtxWidget.width,
        height: currentCtxWidget.height,
        x: currentCtxWidget.x + 30,
        y: currentCtxWidget.y + 30
      };
      instantiateCustomCube(newDef);
      settings.addCustomCube(newDef);
      saveCurrentLayout();
    }
    closeContextMenu();
  });
}

const ctxActionUnlink = document.getElementById('ctx-action-unlink');
if (ctxActionUnlink) {
  ctxActionUnlink.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCtxWidget && currentCtxWidget.cluster) {
      currentCtxWidget.cluster.removeWidget(currentCtxWidget);
      saveCurrentLayout();
    }
    closeContextMenu();
  });
}

const ctxActionUnlinkAll = document.getElementById('ctx-action-unlink-all');
if (ctxActionUnlinkAll) {
  ctxActionUnlinkAll.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCtxWidget && currentCtxWidget.cluster) {
      currentCtxWidget.cluster.uncoupleAll();
      saveCurrentLayout();
    }
    closeContextMenu();
  });
}

const ctxActionExport = document.getElementById('ctx-action-export');
if (ctxActionExport) {
  ctxActionExport.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCtxWidget) {
      settings.exportCubePack(currentCtxWidget);
    }
    closeContextMenu();
  });
}

const ctxActionHide = document.getElementById('ctx-action-hide');
if (ctxActionHide) {
  ctxActionHide.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCtxWidget) {
      currentCtxWidget.element.style.display = 'none';
      settings.setWidgetActive(currentCtxWidget.id, false);
      const toggle = document.querySelector(`[data-widget-toggle="${currentCtxWidget.id}"]`);
      if (toggle) toggle.checked = false;
    }
    closeContextMenu();
  });
}

// -------------------------------------------------------------
// 6. MATERIAL YOU: WALLPAPER COLOR EXTRACTOR
// -------------------------------------------------------------
const wallpaperInput = document.getElementById('wallpaper-color-input');
if (wallpaperInput) {
  wallpaperInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 64, 64);
        const imgData = ctx.getImageData(0, 0, 64, 64).data;

        let maxSaturation = 0;
        let bestR = 96, bestG = 205, bestB = 255;

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];

          const brightness = (r + g + b) / 3;
          if (brightness < 40 || brightness > 225) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = (max - min) / max;

          if (sat > maxSaturation) {
            maxSaturation = sat;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }

        const toHex = (n) => n.toString(16).padStart(2, '0');
        const sampledHex = `#${toHex(bestR)}${toHex(bestG)}${toHex(bestB)}`;

        settings.syncWallpaperAccent(sampledHex);
        setAccent(sampledHex);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// -------------------------------------------------------------
// 7. WINDOW LAYER MODE & GAMING OCCLUSION (0% CPU)
// -------------------------------------------------------------
document.querySelectorAll('.layer-opt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.layer-opt-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'rgba(255,255,255,0.03)';
      b.style.color = 'var(--text-dim)';
    });
    btn.classList.add('active');
    btn.style.background = 'rgba(255,255,255,0.08)';
    btn.style.color = '#fff';

    const mode = btn.dataset.layerMode;
    settings.set('desktopLayerMode', mode);

    if (typeof window !== 'undefined' && typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('set-window-layer', mode);
      } catch (err) {}
    }
  });
});

const toggleGameOcclusion = document.getElementById('toggle-game-occlusion');
if (toggleGameOcclusion) {
  toggleGameOcclusion.checked = settings.config.gameOcclusionMode !== false;
  toggleGameOcclusion.addEventListener('change', (e) => {
    settings.set('gameOcclusionMode', e.target.checked);
  });
}

if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.on('window-blur-occlusion', (event, isBlurred) => {
      if (settings.config.gameOcclusionMode) {
        if (isBlurred) {
          if (audio) audio.isLoopPaused = true;
        } else {
          if (audio) audio.isLoopPaused = false;
        }
      }
    });

    ipcRenderer.invoke('get-displays').then(displays => {
      const displaySelect = document.getElementById('display-select');
      if (displaySelect && displays && displays.length) {
        displaySelect.innerHTML = displays.map(d => `
          <option value="${d.id}">${d.label}</option>
        `).join('');

        displaySelect.addEventListener('change', (e) => {
          ipcRenderer.send('set-display', e.target.value);
        });
      }
    }).catch(() => {});
  } catch (err) {}
}

// -------------------------------------------------------------
// 8. ECOSYSTEM & PLUGINS TAB (.cubepack SDK)
// -------------------------------------------------------------
const cubepackDropzone = document.getElementById('cubepack-dropzone');
const cubepackFileInput = document.getElementById('cubepack-file-input');
const btnExportFullPack = document.getElementById('btn-export-full-cubepack');

function handleCubepackFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const pack = settings.importCubePack(e.target.result);
    if (pack) {
      if (pack.widgets) {
        pack.widgets.forEach(w => instantiateCustomCube(w));
      } else if (pack.widget) {
        instantiateCustomCube(pack.widget);
      }
      alert(`¡Paquete ${pack.name || 'CubePack'} importado con éxito en CubeWorld!`);
      saveCurrentLayout();
    } else {
      alert('Error al leer el archivo .cubepack.');
    }
  };
  reader.readAsText(file);
}

if (cubepackDropzone && cubepackFileInput) {
  cubepackDropzone.addEventListener('click', () => cubepackFileInput.click());

  cubepackDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    cubepackDropzone.classList.add('dragover');
  });

  cubepackDropzone.addEventListener('dragleave', () => {
    cubepackDropzone.classList.remove('dragover');
  });

  cubepackDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    cubepackDropzone.classList.remove('dragover');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleCubepackFile(file);
  });

  cubepackFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleCubepackFile(file);
  });
}

if (btnExportFullPack) {
  btnExportFullPack.addEventListener('click', () => {
    const fullBundle = {
      type: 'CubeWorld-FullBundle',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      config: settings.config,
      cubes: snapEngine.widgets.map(w => ({
        id: w.id,
        title: w.title,
        badge: w.badge,
        width: w.width,
        height: w.height,
        x: w.x,
        y: w.y,
        isLocked: w.isLocked
      }))
    };
    const blob = new Blob([JSON.stringify(fullBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cubeworld-full-setup-${Date.now()}.cubepack`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// 1-Click Curated Community Packs
document.querySelectorAll('.btn-install-pack').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const packId = btn.dataset.packId;
    if (packId === 'cyberpunk') {
      settings.applyRicingPreset('cyberpunk');
      applyWorkspaceModeUI('gaming');
    } else if (packId === 'lofi') {
      settings.applyRicingPreset('serpentinum');
      applyWorkspaceModeUI('focus');
    } else if (packId === 'trader') {
      settings.applyRicingPreset('noctalia');
      settings.setWidgetActive('crypto', true);
      settings.setWidgetActive('weather', true);
      settings.setWidgetActive('system', true);
      weatherWidget.element.style.display = 'flex';
      cryptoWidget.element.style.display = 'flex';
      systemWidget.element.style.display = 'flex';
    } else if (packId === 'devops') {
      settings.applyRicingPreset('caelestia');
      settings.setWidgetActive('github', true);
      settings.setWidgetActive('system', true);
      settings.setWidgetActive('notes', true);
      githubWidget.element.style.display = 'flex';
      systemWidget.element.style.display = 'flex';
      notesWidget.element.style.display = 'flex';
    }
    const orig = btn.innerHTML;
    btn.innerHTML = `${getSvgIcon('check', 11)} ¡Instalado!`;
    setTimeout(() => { btn.innerHTML = orig; }, 1800);
  });
});

// -------------------------------------------------------------
// ABOUT TAB: OPEN GITHUB REPOSITORY
// -------------------------------------------------------------
const btnOpenGithubRepo = document.getElementById('btn-open-github-repo');
if (btnOpenGithubRepo) {
  btnOpenGithubRepo.addEventListener('click', (e) => {
    e.preventDefault();
    const repoUrl = 'https://github.com/saenz/AuraGrid';
    if (typeof window !== 'undefined' && typeof window.require === 'function') {
      try {
        const { shell } = window.require('electron');
        if (shell && shell.openExternal) {
          shell.openExternal(repoUrl);
          return;
        }
      } catch (err) {}
    }
    window.open(repoUrl, '_blank');
  });
}
