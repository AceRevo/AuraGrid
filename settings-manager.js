/**
 * Settings Manager & Configuration Hub
 * 
 * Handles persistence for:
 * - Theme selection (Windows 11 Dark / Light, Caelestia, Noctalia, Serpentinum, Cyberpunk, OLED)
 * - Workspace Modes (Focus, Gaming/Ocio, Minimal HUD, Full Studio)
 * - Typography font styles & Window Frame styles
 * - Low-Power PC Mode (for older/weaker CPUs)
 * - Custom accent colors with auto-glow generation
 * - Blur, border radius, and panel opacity calibration
 * - Widget catalog active toggles
 * - Audio visualizer modes and sensitivity
 * - Grid layout and custom positions
 * 
 * Open Source - CubeWorld Architecture
 */

export class SettingsManager {
  constructor() {
    this.defaults = {
      theme: 'win11-dark',
      blur: 30,
      opacity: 94,
      radius: 16,
      accentColor: '#60cdff',
      snapThreshold: 45,
      cavaMode: 'bars',
      cavaSens: 1.2,
      cavaColorScheme: 'theme',
      hideBordersZeroOpacity: false,
      disableShadows: false,
      enableAuraGlow: true,
      volume: 75,
      isMuted: false,
      eqSettings: { bass: 0, mids: 0, treble: 0, drive: 0, echo: 0 },
      isGlobalLocked: false,
      workspaceMode: 'studio',
      fontStyle: 'modern',
      windowStyle: 'bento',
      lowPowerMode: false,
      gameOcclusionMode: true,
      desktopLayerMode: 'desktop',
      weatherCity: 'Madrid, ES',
      weatherUnits: 'c',
      cryptoCoins: ['BTC', 'ETH', 'SOL'],
      githubUser: '',
      customCubes: [],
      activeWidgets: {
        music: false,
        cava: false,
        midifx: false,
        lyrics: false,
        bongocat: false,
        gallery: false,
        system: false,
        notes: false,
        weather: true,
        crypto: false,
        battery: false,
        github: false
      },
      widgetOptions: {},
      savedLayout: null
    };

    // Auto-detect low-spec or weak hardware (<= 4 CPU threads) for instant smooth performance
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
      this.defaults.lowPowerMode = true;
    }

    this.config = this.loadConfig();
    this.listeners = new Set();
    this.applyTheme(this.config.theme);
    this.applyTypography(this.config.fontStyle || 'modern');
    this.applyWindowStyle(this.config.windowStyle || 'bento');
    this.applyLowPowerMode(!!this.config.lowPowerMode);
    this.applyStyles();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem('cubeworld_config_v2');
      if (saved) {
        return { ...this.defaults, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage:', e);
    }
    return { ...this.defaults };
  }

  saveConfig() {
    try {
      localStorage.setItem('cubeworld_config_v2', JSON.stringify(this.config));
    } catch (e) {
      console.warn('Could not save settings to localStorage:', e);
    }
    this.notify();
  }

  set(key, val) {
    this.config[key] = val;
    this.saveConfig();
  }

  addCustomCube(cubeDef) {
    if (!Array.isArray(this.config.customCubes)) {
      this.config.customCubes = [];
    }
    this.config.customCubes = this.config.customCubes.filter(c => c.id !== cubeDef.id);
    this.config.customCubes.push(cubeDef);
    this.saveConfig();
  }

  removeCustomCube(cubeId) {
    if (!Array.isArray(this.config.customCubes)) return;
    this.config.customCubes = this.config.customCubes.filter(c => c.id !== cubeId);
    if (this.config.savedLayout && this.config.savedLayout[cubeId]) {
      delete this.config.savedLayout[cubeId];
    }
    this.saveConfig();
  }

  updateCustomCube(cubeId, updates) {
    if (!Array.isArray(this.config.customCubes)) return;
    const target = this.config.customCubes.find(c => c.id === cubeId);
    if (target) {
      Object.assign(target, updates);
      this.saveConfig();
    }
  }

  setWidgetActive(widgetId, isActive) {
    if (!this.config.activeWidgets) this.config.activeWidgets = {};
    this.config.activeWidgets[widgetId] = isActive;
    this.saveConfig();
  }

  applyTheme(themeName) {
    this.config.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    this.saveConfig();
  }

  applyTypography(fontKey) {
    this.config.fontStyle = fontKey;
    const root = document.documentElement;
    if (root) {
      root.setAttribute('data-font-style', fontKey);
      if (fontKey === 'mono') {
        root.style.setProperty('--font-main', "'JetBrains Mono', 'Cascadia Code', Consolas, monospace");
        root.style.setProperty('--font-mono', "'JetBrains Mono', 'Cascadia Code', Consolas, monospace");
        root.style.setProperty('--font-header', "'JetBrains Mono', monospace");
      } else if (fontKey === 'cyber') {
        root.style.setProperty('--font-main', "'Orbitron', 'Rajdhani', 'Segoe UI Semibold', monospace");
        root.style.setProperty('--font-mono', "'JetBrains Mono', monospace");
        root.style.setProperty('--font-header', "'Orbitron', monospace");
      } else if (fontKey === 'bento') {
        root.style.setProperty('--font-main', "'Outfit', 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif");
        root.style.setProperty('--font-mono', "'JetBrains Mono', monospace");
        root.style.setProperty('--font-header', "'Outfit', sans-serif");
      } else {
        // modern
        root.style.setProperty('--font-main', "'Plus Jakarta Sans', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif");
        root.style.setProperty('--font-mono', "'JetBrains Mono', monospace");
        root.style.setProperty('--font-header', "'Plus Jakarta Sans', sans-serif");
      }
    }
    if (document.body) {
      document.body.setAttribute('data-font-style', fontKey);
    }
    this.saveConfig();
  }

  getWidgetOption(widgetId, key, fallback = null) {
    if (!this.config.widgetOptions) this.config.widgetOptions = {};
    if (this.config.widgetOptions[widgetId] && this.config.widgetOptions[widgetId][key] !== undefined) {
      return this.config.widgetOptions[widgetId][key];
    }
    return fallback;
  }

  setWidgetOption(widgetId, key, value) {
    if (!this.config.widgetOptions) this.config.widgetOptions = {};
    if (!this.config.widgetOptions[widgetId]) this.config.widgetOptions[widgetId] = {};
    this.config.widgetOptions[widgetId][key] = value;
    this.saveConfig();
  }

  applyWindowStyle(styleKey) {
    this.config.windowStyle = styleKey;
    const root = document.documentElement;
    if (root) {
      root.setAttribute('data-window-style', styleKey);
    }
    if (document.body) {
      document.body.setAttribute('data-window-style', styleKey);
    }
    this.saveConfig();
  }

  applyLowPowerMode(enabled) {
    this.config.lowPowerMode = !!enabled;
    if (document.body) {
      document.body.classList.toggle('low-power-pc', !!enabled);
    }
    this.applyStyles();
    this.saveConfig();
  }

  applyWorkspaceMode(modeId) {
    this.config.workspaceMode = modeId;
    if (!this.config.activeWidgets) this.config.activeWidgets = {};

    if (modeId === 'focus') {
      // Focus: Tasks, Lo-Fi Music, Clock & Weather. Hide distracting animations
      this.config.activeWidgets = {
        music: true,
        cava: false,
        midifx: false,
        lyrics: false,
        bongocat: false,
        gallery: false,
        system: false,
        notes: true,
        weather: true,
        crypto: false,
        battery: true,
        github: false
      };
      this.config.enableAuraGlow = false;
    } else if (modeId === 'embed') {
      // Embed: Bongo Cat / Web apps as main desktop element + Music & Tasks
      this.config.activeWidgets = {
        music: true,
        cava: false,
        midifx: false,
        lyrics: false,
        bongocat: true,
        gallery: false,
        system: false,
        notes: true,
        weather: false,
        crypto: false,
        battery: false,
        github: false
      };
      this.config.enableAuraGlow = true;
    } else if (modeId === 'duo') {
      // Duo: 2 Balanced Columns (Media Hub + Quick Tasks + Weather)
      this.config.activeWidgets = {
        music: true,
        cava: false,
        midifx: false,
        lyrics: false,
        bongocat: false,
        gallery: false,
        system: false,
        notes: true,
        weather: false,
        crypto: false,
        battery: false,
        github: false
      };
      this.config.enableAuraGlow = true;
    } else if (modeId === 'trio') {
      // Trio: 3 Symmetrical Columns (Notes + Music + Telemetry)
      this.config.activeWidgets = {
        music: true,
        cava: false,
        midifx: false,
        lyrics: false,
        bongocat: false,
        gallery: false,
        system: true,
        notes: true,
        weather: false,
        crypto: false,
        battery: false,
        github: false
      };
      this.config.enableAuraGlow = true;
    } else if (modeId === 'media') {
      // Multimedia Studio: Media Player + CAVA + MIDI FX + Karaoke Lyrics
      this.config.activeWidgets = {
        music: true,
        cava: true,
        midifx: true,
        lyrics: true,
        bongocat: false,
        gallery: false,
        system: false,
        notes: false,
        weather: false,
        crypto: false,
        battery: false,
        github: false
      };
      this.config.enableAuraGlow = true;
    } else if (modeId === 'gaming') {
      // Ocio / Gaming: Bongo Cat, Music, CAVA visualizer, GPU/CPU telemetry & Battery
      this.config.activeWidgets = {
        music: true,
        cava: true,
        midifx: false,
        lyrics: false,
        bongocat: true,
        gallery: true,
        system: true,
        notes: false,
        weather: false,
        crypto: false,
        battery: true,
        github: false
      };
      this.config.enableAuraGlow = true;
    } else if (modeId === 'minimal') {
      // Minimalist HUD: Telemetry & Weather with zero opacity
      this.config.activeWidgets = {
        music: false,
        cava: false,
        midifx: false,
        lyrics: false,
        bongocat: false,
        gallery: false,
        system: true,
        notes: false,
        weather: true,
        crypto: false,
        battery: true,
        github: false
      };
      this.config.opacity = 0;
      this.config.hideBordersZeroOpacity = true;
      this.config.disableShadows = true;
      this.config.enableAuraGlow = false;
    } else {
      // Full Studio: All key modules
      this.config.activeWidgets = {
        music: true,
        cava: true,
        midifx: true,
        lyrics: true,
        bongocat: true,
        gallery: true,
        system: true,
        notes: true,
        weather: true,
        crypto: true,
        battery: true,
        github: false
      };
    }

    this.applyStyles();
    this.saveConfig();
    return this.config.activeWidgets;
  }

  // --- Ecosystem: .cubepack Import / Export SDK ---
  exportCubePack(cubeDef) {
    const pack = {
      format: 'cubeworld-package',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      cube: {
        title: cubeDef.title,
        badge: cubeDef.badge,
        template: cubeDef.template || 'note',
        payload: cubeDef.payload || '',
        shape: cubeDef.shape || '1:1',
        width: cubeDef.width || 200,
        height: cubeDef.height || 200
      }
    };
    return JSON.stringify(pack, null, 2);
  }

  importCubePack(rawJson) {
    try {
      const data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      if (data && data.format === 'cubeworld-package' && data.cube) {
        const c = data.cube;
        const newId = `pack_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const cubeDef = {
          id: newId,
          title: c.title || 'Cubo Importado',
          badge: c.badge || 'PACK',
          template: c.template || 'note',
          payload: c.payload || '',
          shape: c.shape || '1:1',
          width: c.width || 200,
          height: c.height || 200,
          x: 180 + (((this.config.customCubes && this.config.customCubes.length) || 0) * 30),
          y: 160 + (((this.config.customCubes && this.config.customCubes.length) || 0) * 25)
        };
        this.addCustomCube(cubeDef);
        return cubeDef;
      }
    } catch (err) {
      console.warn('Failed to parse cubepack:', err);
    }
    return null;
  }

  syncWallpaperAccent(hexColor) {
    if (!hexColor || !hexColor.startsWith('#')) return;
    this.config.accentColor = hexColor;
    this.applyStyles();
    this.saveConfig();
  }

  hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  }

  applyStyles() {
    const root = document.documentElement;
    const body = document.body;

    const effectiveBlur = this.config.lowPowerMode ? 0 : this.config.blur;
    root.style.setProperty('--blur-intensity', `${effectiveBlur}px`);
    root.style.setProperty('--border-radius', `${this.config.radius}px`);
    root.style.setProperty('--panel-opacity', `${this.config.opacity / 100}`);

    const isZeroOpacity = this.config.opacity === 0;
    const shouldDisableShadows = !!this.config.disableShadows || isZeroOpacity;
    const shouldHideBorders = !!this.config.hideBordersZeroOpacity && isZeroOpacity;

    if (body) {
      body.classList.toggle('opacity-zero', isZeroOpacity);
      body.classList.toggle('no-shadows', shouldDisableShadows);
      body.classList.toggle('hide-borders', shouldHideBorders);
      body.classList.toggle('low-power-pc', !!this.config.lowPowerMode);
    }

    if (shouldHideBorders) {
      root.style.setProperty('--panel-border', 'transparent');
      root.style.setProperty('--panel-highlight', 'transparent');
    } else {
      root.style.removeProperty('--panel-border');
      root.style.removeProperty('--panel-highlight');
    }

    if (this.config.accentColor) {
      root.style.setProperty('--accent-primary', this.config.accentColor);
      try {
        const rgb = this.hexToRgb(this.config.accentColor);
        root.style.setProperty('--accent-rgb', rgb);
        root.style.setProperty('--panel-border-glow', `rgba(${rgb}, 0.40)`);
      } catch (err) {
        // Fallback
      }
    }

    if (body) {
      body.classList.toggle('aura-glow-active', !!this.config.enableAuraGlow && !this.config.lowPowerMode);
    }
  }

  applyRicingPreset(presetId) {
    const presets = {
      caelestia: {
        theme: 'caelestia',
        accentColor: '#00f0ff',
        blur: 34,
        radius: 18,
        opacity: 88,
        cavaColorScheme: 'cyberpunk',
        enableAuraGlow: true,
        disableShadows: false,
        windowStyle: 'bento',
        fontStyle: 'bento'
      },
      noctalia: {
        theme: 'noctalia',
        accentColor: '#c084fc',
        blur: 32,
        radius: 16,
        opacity: 90,
        cavaColorScheme: 'sunset',
        enableAuraGlow: true,
        disableShadows: false,
        windowStyle: 'obsidian',
        fontStyle: 'modern'
      },
      serpentinum: {
        theme: 'serpentinum',
        accentColor: '#10b981',
        blur: 28,
        radius: 14,
        opacity: 90,
        cavaColorScheme: 'matrix',
        enableAuraGlow: true,
        disableShadows: false,
        windowStyle: 'obsidian',
        fontStyle: 'mono'
      },
      cyberpunk: {
        theme: 'cyberpunk',
        accentColor: '#00ffcc',
        blur: 34,
        radius: 16,
        opacity: 95,
        cavaColorScheme: 'cyberpunk',
        enableAuraGlow: true,
        disableShadows: false,
        windowStyle: 'cyberdeck',
        fontStyle: 'cyber'
      },
      minimal: {
        theme: 'win11-dark',
        accentColor: '#ffffff',
        blur: 16,
        radius: 14,
        opacity: 45,
        cavaColorScheme: 'theme',
        enableAuraGlow: false,
        disableShadows: true,
        windowStyle: 'minimal',
        fontStyle: 'modern'
      }
    };

    const cfg = presets[presetId];
    if (cfg) {
      Object.assign(this.config, cfg);
      this.applyTheme(cfg.theme);
      this.applyTypography(cfg.fontStyle || 'modern');
      this.applyWindowStyle(cfg.windowStyle || 'bento');
      this.applyStyles();
      this.saveConfig();
    }
    return cfg;
  }

  exportProfile() {
    return JSON.stringify({
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      config: this.config
    }, null, 2);
  }

  importProfile(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data && data.config) {
        this.config = { ...this.defaults, ...data.config };
        this.applyTheme(this.config.theme);
        this.applyTypography(this.config.fontStyle || 'modern');
        this.applyWindowStyle(this.config.windowStyle || 'bento');
        this.applyLowPowerMode(!!this.config.lowPowerMode);
        this.applyStyles();
        this.saveConfig();
        return true;
      }
    } catch (e) {
      console.warn('Failed to import profile:', e);
    }
    return false;
  }

  subscribe(fn) {
    this.listeners.add(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.config));
  }
}

export const settings = new SettingsManager();
