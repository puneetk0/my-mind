const { screen } = require('electron');

let pollInterval = null;
let hideTimeout = null;

// We own these values — no need to ask the OS
const POPOVER_X_OFFSET = 170;
const POPOVER_WIDTH = 340;
const POPOVER_HEIGHT_OPEN = 420;

function startNotchWatcher(win, showFn, hideFn, getVisibleFn) {
  const { width: screenWidth } = screen.getPrimaryDisplay().bounds;

  const popoverX = Math.round(screenWidth / 2 - POPOVER_X_OFFSET);

const NOTCH_ZONE = {
  x: Math.round(screenWidth / 2 - 150),
  y: 0,
  width: 300,
  height: 60,  // was 40 — covers the gap between notch and popover top
};

const GRACE_MS = 400;  // was 300

  function isCursorSafe(cx, cy) {
    const inNotch =
      cx >= NOTCH_ZONE.x &&
      cx <= NOTCH_ZONE.x + NOTCH_ZONE.width &&
      cy <= NOTCH_ZONE.height;

    // Only check popover bounds if it's actually open
    const inPopover =
  getVisibleFn() &&
  cx >= popoverX &&
  cx <= popoverX + POPOVER_WIDTH &&
  cy >= 0 &&
  cy <= POPOVER_HEIGHT_OPEN + 20;  

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