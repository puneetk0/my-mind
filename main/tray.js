const { Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

let tray = null;

const FEEDBACK_URL = 'https://instagram.com/puneet.25_'; // 🔁 Replace
const GITHUB_URL = 'https://github.com/puneetk0';      // 🔁 Replace

function createTray(toggleFn) {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');

  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    icon = icon.resize({ width: 22, height: 22 });
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Pond');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Give Feedback', click: () => shell.openExternal(FEEDBACK_URL) },
    { label: 'GitHub', click: () => shell.openExternal(GITHUB_URL) },
    { type: 'separator' },
    { label: 'Quit Pond', click: () => require('electron').app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', toggleFn);

  return tray;
}

module.exports = { createTray };