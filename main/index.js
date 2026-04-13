const { app, BrowserWindow, globalShortcut, screen, ipcMain, powerMonitor } = require('electron');
const path = require('path');
const db = require('./db');
const { registerHandlers } = require('./ipc');
const { createTray } = require('./tray');
const { startNotchWatcher, stopNotchWatcher } = require('./notch');

let win = null;
let popoverVisible = false;
let pinned = false;

const POPOVER_WIDTH = 690;

/**
 * Recalculate the correct X/Y for the popover so it's centred at the
 * top of the primary display.  Called on launch AND after sleep/wake
 * or display-geometry changes.
 */
function repositionWindow() {
  if (!win || win.isDestroyed()) return;
  const { width: screenWidth } = screen.getPrimaryDisplay().bounds;
  const x = Math.round(screenWidth / 2 - POPOVER_WIDTH / 2);
  win.setPosition(x, 0, false);
}

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().bounds;

  win = new BrowserWindow({
    width: POPOVER_WIDTH,
    height: 0,
    x: Math.round(screenWidth / 2 - (POPOVER_WIDTH / 2)),
    y: 0,
    frame: false,
    transparent: true,
    backgroundImage: '#00000000',
    resizable: false,
    hasShadow: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 'floating' is enough — 'screen-saver' fights macOS compositor
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  win.showInactive();
}

function showPopover() {
  if (!win || popoverVisible) return;
  // Always re-centre before opening — covers sleep/wake edge cases
  repositionWindow();
  popoverVisible = true;
  win.setSize(POPOVER_WIDTH, 460, true);
  win.webContents.send('popover:show');
}

function hidePopover() {
  if (!win || !popoverVisible || pinned) return;
  popoverVisible = false;
  win.setSize(POPOVER_WIDTH, 0, true);
  win.webContents.send('popover:hide');
}

function togglePopover() {
  if (popoverVisible) {
    pinned = false;
    if (win) win.webContents.send('popover:pinned', pinned);
    hidePopover();
  } else {
    showPopover();
  }
}

app.whenReady().then(async () => {
  // Create the window shell FIRST so the user sees something instantly,
  // then initialise the database in parallel.
  registerHandlers();
  createWindow();

  // DB init runs concurrently — IPC handlers will wait for it internally
  await db.init();

  createTray(togglePopover);

  globalShortcut.register('CommandOrControl+Shift+L', () => {
    pinned = !pinned;
    if (pinned) {
      showPopover();
    }
    if (win) win.webContents.send('popover:pinned', pinned);
  });

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (popoverVisible) {
      pinned = false;
      if (win) win.webContents.send('popover:pinned', pinned);
      hidePopover();
    } else {
      pinned = true;
      if (win) win.webContents.send('popover:pinned', pinned);
      showPopover();
    }
  });

  startNotchWatcher(win, showPopover, hidePopover, () => popoverVisible);

  // ── Fix: reposition when display geometry changes or after sleep/wake ──
  screen.on('display-metrics-changed', repositionWindow);
  screen.on('display-added', repositionWindow);
  screen.on('display-removed', repositionWindow);

  powerMonitor.on('resume', () => {
    // After macOS wakes, the display bounds may have shifted.
    // Small delay lets the compositor settle before we query.
    setTimeout(() => {
      repositionWindow();
      // Also restart notch watcher with fresh screen metrics
      stopNotchWatcher();
      startNotchWatcher(win, showPopover, hidePopover, () => popoverVisible);
    }, 500);
  });

  ipcMain.on('popover:escape', () => hidePopover());
  ipcMain.on('popover:pin', () => {
    pinned = !pinned;
    if (win) win.webContents.send('popover:pinned', pinned);
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopNotchWatcher();
  db.close();
});

app.on('window-all-closed', (e) => e.preventDefault());