const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const db = require('./db');
const { registerHandlers } = require('./ipc');
const { createTray } = require('./tray');
const { startNotchWatcher, stopNotchWatcher } = require('./notch');

let win = null;
let popoverVisible = false;

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().bounds;

  win = new BrowserWindow({
    width: 340,
    height: 0,
    x: Math.round(screenWidth / 2 - 170),
    y: 0,
    frame: false,
    transparent: true,
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

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.showInactive();
}

function showPopover() {
  if (!win || popoverVisible) return;
  popoverVisible = true;
  win.setSize(340, 420, true);
  win.webContents.send('popover:show');
}

function hidePopover() {
  if (!win || !popoverVisible) return;
  popoverVisible = false;
  win.setSize(340, 0, true);
  win.webContents.send('popover:hide');
}

function togglePopover() {
  popoverVisible ? hidePopover() : showPopover();
}

app.whenReady().then(async () => {
  await db.init();
  registerHandlers();
  createWindow();
  createTray(togglePopover);

  globalShortcut.register('CommandOrControl+Shift+P', togglePopover);
  startNotchWatcher(win, showPopover, hidePopover, () => popoverVisible);

  ipcMain.on('popover:escape', () => hidePopover());
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopNotchWatcher();
  db.close();
});

app.on('window-all-closed', (e) => e.preventDefault());