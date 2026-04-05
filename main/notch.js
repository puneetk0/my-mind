const { screen } = require('electron');

let pollInterval = null;
let hideTimeout = null;

// We own these values — no need to ask the OS
const POPOVER_X_OFFSET = 345;
const POPOVER_WIDTH = 690;
const POPOVER_HEIGHT_OPEN = 460;

function startNotchWatcher(win, showFn, hideFn, getVisibleFn) {
  const { width: screenWidth } = screen.getPrimaryDisplay().bounds;

  const popoverX = Math.round(screenWidth / 2 - POPOVER_X_OFFSET);

const NOTCH_ZONE = {
  x: Math.round(screenWidth / 2 - 150),
  y: 0,
  width: 300,
  height: 60,  // was 40 — covers the gap between notch and popover top
};

const GRACE_MS = 600;  // was 300

  function isCursorSafe(cx, cy) {
    const inNotch =
      cx >= NOTCH_ZONE.x &&
      cx <= NOTCH_ZONE.x + NOTCH_ZONE.width &&
      cy <= NOTCH_ZONE.height;

    // Added large padding buffers: 30px on sides, 60px on bottom
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