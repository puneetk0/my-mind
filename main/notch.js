const { screen } = require('electron');

let pollInterval = null;
let hideTimeout = null;

const POPOVER_WIDTH = 690;
const POPOVER_HEIGHT_OPEN = 460;
const GRACE_MS = 300;

function startNotchWatcher(win, showFn, hideFn, getVisibleFn) {

  function isCursorSafe(cx, cy) {
    // Read fresh screen bounds every tick — after sleep/wake these can change
    const { width: screenWidth } = screen.getPrimaryDisplay().bounds;
    const popoverX = Math.round(screenWidth / 2 - POPOVER_WIDTH / 2);

    const notchX = Math.round(screenWidth / 2 - 100);

    const inNotch =
      cx >= notchX &&
      cx <= notchX + 200 &&
      cy <= 25;

    // Large padding buffers: 30px on sides, 60px on bottom
    const inPopover =
      getVisibleFn() &&
      cx >= popoverX - 30 &&
      cx <= popoverX + POPOVER_WIDTH + 30 &&
      cy >= -20 &&
      cy <= POPOVER_HEIGHT_OPEN + 60;

    return { inNotch, inPopover, safe: inNotch || inPopover };
  }

  pollInterval = setInterval(() => {
    if (!win || win.isDestroyed()) return;

    const { x, y } = screen.getCursorScreenPoint();
    const visible = getVisibleFn();
    const { inNotch, safe } = isCursorSafe(x, y);

    if (inNotch && !visible) {
      // Cursor entered notch zone and popover is closed — show it
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      showFn();

    } else if (!safe && visible) {
      // Cursor left safe zone — start grace period before hiding
      if (!hideTimeout) {
        hideTimeout = setTimeout(() => {
          hideTimeout = null;
          if (win.isDestroyed()) return;

          // Re-check position at hide time — cursor might have returned
          const { x: cx, y: cy } = screen.getCursorScreenPoint();
          const { safe: stillSafe } = isCursorSafe(cx, cy);
          if (!stillSafe) hideFn();
        }, GRACE_MS);
      }

    } else if (safe && hideTimeout) {
      // Cursor returned to safe zone — cancel pending hide
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }, 100);
}

function stopNotchWatcher() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
}

module.exports = { startNotchWatcher, stopNotchWatcher };