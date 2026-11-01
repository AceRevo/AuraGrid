const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Low-Power & Minimal RAM Optimization Flags
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128');

function log(msg) {
  try {
    const logPath = path.join(app.getPath('userData'), 'electron-boot.log');
    fs.writeFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`, { flag: 'a' });
  } catch (e) {}
}

process.on('uncaughtException', (err) => {
  log(`UNCAUGHT: ${err && err.stack ? err.stack : err}`);
});

let mainWindow = null;
let tray = null;

function createWindow() {
  log('createWindow called');

  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    x: x,
    y: y,
    width: width,
    height: height,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    log(`CONSOLE [${level}]: ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('did-finish-load');
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    log(`did-fail-load: code=${code}, desc=${desc}`);
  });

  mainWindow.webContents.on('render-process-gone', (e, details) => {
    log(`render-process-gone: ${JSON.stringify(details)}`);
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Setup System Tray
  try {
    const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    tray = new Tray(trayIcon);
    tray.setToolTip('AuraGrid - Next-Gen Bento Desktop HUD');

    const updateTrayMenu = () => {
      const isAutoStart = app.getLoginItemSettings().openAtLogin;
      const contextMenu = Menu.buildFromTemplate([
        { label: 'AuraGrid Bento HUD', enabled: false },
        { type: 'separator' },
        {
          label: 'Alternar Dock Flotante',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('tray-toggle-dock');
            }
          }
        },
        {
          label: 'Modo HUD / Bloquear Cubos',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('tray-toggle-lock');
            }
          }
        },
        {
          label: 'Configuración (Ctrl+,)',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('tray-open-settings');
            }
          }
        },
        {
          label: 'Iniciar con Windows',
          type: 'checkbox',
          checked: isAutoStart,
          click: (item) => {
            app.setLoginItemSettings({ openAtLogin: item.checked });
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('auto-start-changed', item.checked);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Salir de AuraGrid',
          click: () => {
            app.quit();
          }
        }
      ]);
      tray.setContextMenu(contextMenu);
    };

    updateTrayMenu();
    tray.on('double-click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tray-open-settings');
      }
    });
  } catch (err) {
    log(`Tray creation error: ${err}`);
  }

  // IPC for selective click-through
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  // IPC for Always-On-Top toggle
  ipcMain.on('set-always-on-top', (event, flag) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(!!flag);
    }
  });

  // IPC for Window Layering Mode (Desktop wallpaper level vs HUD Topmost)
  ipcMain.on('set-window-layer', (event, mode) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      if (mode === 'topmost') {
        win.setAlwaysOnTop(true, 'screen-saver');
      } else {
        win.setAlwaysOnTop(false);
      }
    }
  });

  // IPC for Multi-Monitor display query
  ipcMain.handle('get-displays', () => {
    const primary = screen.getPrimaryDisplay();
    return screen.getAllDisplays().map((d, idx) => ({
      id: d.id,
      index: idx,
      isPrimary: d.id === primary.id,
      bounds: d.bounds,
      workArea: d.workArea,
      label: `Monitor ${idx + 1} (${d.bounds.width}x${d.bounds.height})${d.id === primary.id ? ' - Principal' : ''}`
    }));
  });

  // IPC for moving to a chosen display
  ipcMain.on('set-display', (event, displayId) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      const displays = screen.getAllDisplays();
      const target = displays.find(d => String(d.id) === String(displayId)) || screen.getPrimaryDisplay();
      const { x, y, width, height } = target.workArea;
      win.setBounds({ x, y, width, height });
    }
  });

  // IPC for Desktop loopback audio capture sources
  ipcMain.handle('get-desktop-sources', async (event, opts) => {
    try {
      const { desktopCapturer } = require('electron');
      const sources = await desktopCapturer.getSources(opts || { types: ['screen'] });
      return sources.map(s => ({ id: s.id, name: s.name }));
    } catch (err) {
      log(`get-desktop-sources error: ${err}`);
      return [];
    }
  });

  // Gaming Occlusion & Window Blur tracking (0% CPU mode)
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-blur-occlusion', true);
    }
  });

  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-blur-occlusion', false);
    }
  });

  // IPC for Open-at-Login
  ipcMain.handle('get-open-at-login', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.on('set-open-at-login', (event, val) => {
    app.setLoginItemSettings({ openAtLogin: !!val });
  });

  // IPC for clean exit
  ipcMain.on('quit-app', () => {
    log('quit-app IPC received');
    app.quit();
  });

  // Shift + Escape closes the application
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.shift) {
      log('Shift+Escape pressed');
      app.quit();
    }
  });

  mainWindow.on('closed', () => {
    log('mainWindow closed');
    mainWindow = null;
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
      tray = null;
    }
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
log(`gotTheLock = ${gotTheLock}`);

if (!gotTheLock) {
  log('Could not get single instance lock, quitting.');
  app.quit();
} else {
  app.whenReady().then(createWindow);

  app.on('second-instance', () => {
    log('second-instance detected');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    log('window-all-closed');
    app.quit();
  });
}
