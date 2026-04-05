const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;

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
    { label: 'Toggle Pond', click: toggleFn },
    { type: 'separator' },
    { label: 'Quit', click: () => require('electron').app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', toggleFn);

  return tray;
}

module.exports = { createTray };
