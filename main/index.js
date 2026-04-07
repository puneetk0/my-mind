const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const db = require('./db');
const { registerHandlers } = require('./ipc');
const { createTray } = require('./tray');
const { startNotchWatcher, stopNotchWatcher } = require('./notch');

let win = null;
let popoverVisible = false;
let pinned = false;

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().bounds;
  const POPOVER_WIDTH = 690;

  win = new BrowserWindow({
    width: POPOVER_WIDTH,
    height: 0,
    x: Math.round(screenWidth / 2 - (POPOVER_WIDTH / 2)),
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
  win.setSize(690, 460, true);
  win.webContents.send('popover:show');
}

function hidePopover() {
  if (!win || !popoverVisible || pinned) return; // add pinned check
  popoverVisible = false;
  win.setSize(690, 0, true);
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

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (popoverVisible) {
      pinned = false;
      hidePopover();
    } else {
      pinned = true;
      showPopover();
      if (win) win.webContents.send('popover:pinned', true);
    }
  });

  startNotchWatcher(win, showPopover, hidePopover, () => popoverVisible);

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