# Pond V2 — F1 Track Edition
## Product Requirements Document

**Version:** 2.0  
**Author:** Puneet  
**Date:** April 2026  
**Status:** Draft  
**Builds on:** Pond V1 (notch popover, Electron + React + SQLite, no bundler)

---

## Context for the Coding Agent

This document describes V2 of Pond, a macOS notch-native todo app. V1 is already built and working. Here is what V1 has that V2 must preserve:

- Electron app with no webpack/bundler. React loaded via CDN script tags. Plain CSS, no modules.
- Single `renderer/app.js` file containing all React components using HTM templating.
- SQLite via `better-sqlite3` for persistence. All DB calls go through IPC.
- `main/index.js` — creates BrowserWindow, wires notch watcher, global shortcut, tray.
- `main/notch.js` — polls mouse position every 100ms, shows/hides popover on notch hover.
- `main/db.js` — SQLite init and CRUD queries.
- `main/ipc.js` — all `ipcMain.handle()` registrations.
- `main/tray.js` — tray icon.
- `renderer/preload.js` — contextBridge exposes `window.pond` API.
- `renderer/index.html` — loads React, HTM, and app.js via CDN script tags.
- `renderer/styles.css` — all styles in one file.

**V2 changes the visual layer only.** The IPC contract, SQLite schema (with additions), and Electron window management stay the same. Do not refactor the architecture.

---

## 1. What Changes in V2

### What stays the same
- All of main process: `index.js`, `notch.js`, `tray.js`, `ipc.js`
- `renderer/preload.js` — unchanged
- `renderer/index.html` — unchanged except adding PixiJS CDN script (optional, see section 5)
- SQLite schema — extended, not replaced
- Global shortcut (`Cmd+Shift+P`), Escape to close, tray icon

### What changes
- Window width: **340px → 700px**
- Window height: **420px → 560px**
- `renderer/app.js` — full rewrite of visual layer. Same screen names (Home, AddTask, TaskDetail) but completely different rendering.
- `renderer/styles.css` — full rewrite of styles.
- `main/db.js` — two new columns in tasks table, one new table for constructor assignments.
- `main/ipc.js` — two new IPC handlers.

---

## 2. The Core Concept

Each task is an F1 car on a racing lane. The popover shows a top-down view of a race track with up to 10 lanes running bottom to top. Each lane belongs to one F1 constructor (team). When a user creates a task, they choose a constructor — that team's car appears at the bottom of its lane. As the user completes subtasks, the car moves up the lane. When all subtasks are done, the car crosses the finish line at the top, a brief celebration plays, and the lane clears.

Progress is physical and spatial. You see exactly where every task stands without reading a single number.

---

## 3. Layout

### Window dimensions
```
Width:  700px
Height: 560px
```

### Track layout (top-down view)
```
┌─────────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════════╗  │
│  ║           FINISH LINE (top of track)                          ║  │
│  ╠═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╣                     ║  │
│  ║ 1 ║ 2 ║ 3 ║ 4 ║ 5 ║ 6 ║ 7 ║ 8 ║ 9 ║10 ║  ← lane numbers   ║  │
│  ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                     ║  │
│  ║   ║🔴 ║   ║🔵 ║   ║🟠 ║   ║   ║   ║   ║  ← cars            ║  │
│  ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                     ║  │
│  ╠═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╣                     ║  │
│  ║           START LINE (bottom)           ║                     ║  │
│  ╚═════════════════════════════════════════╝                     ║  │
│  [+ Add Task]                                                    ║  │
└─────────────────────────────────────────────────────────────────────┘
```

### Track dimensions
- Track area: 660px wide, 460px tall (centered in window, with 20px padding each side)
- 10 lanes, each 66px wide
- Lane height: 420px of usable track (40px reserved for finish line header, 40px for start line)
- Cars move from y=420 (start) to y=0 (finish) as subtasks complete
- Car position = `420 - (completedSubtasks / totalSubtasks) * 420` pixels from track top

### Below the track
- 40px footer area with a single "+ Add Task" button, centered, full width minus padding

---

## 4. The Ten Constructors

Each constructor has a fixed lane number, primary color, and secondary color. The user picks a constructor when creating a task. Each constructor can only have one active task at a time — if a lane is occupied, that constructor is grayed out in the picker.

| Lane | Constructor | Primary Color | Secondary Color | Car File |
|------|------------|---------------|-----------------|----------|
| 1 | Red Bull Racing | `#3671C6` | `#FF1E00` | `cars/redbull.png` |
| 2 | Ferrari | `#E8002D` | `#FFCC00` | `cars/ferrari.png` |
| 3 | McLaren | `#FF8000` | `#000000` | `cars/mclaren.png` |
| 4 | Mercedes | `#00D2BE` | `#000000` | `cars/mercedes.png` |
| 5 | Aston Martin | `#006F62` | `#CEDC00` | `cars/astonmartin.png` |
| 6 | Alpine | `#FF87BC` | `#0090FF` | `cars/alpine.png` |
| 7 | Williams | `#005AFF` | `#FFFFFF` | `cars/williams.png` |
| 8 | Haas | `#B6BABD` | `#E8002D` | `cars/haas.png` |
| 9 | Visa RB | `#6692FF` | `#C8001E` | `cars/visarb.png` |
| 10 | Kick Sauber | `#52E252` | `#000000` | `cars/sauber.png` |

### Car image specs (user provides these)
- Format: PNG with transparent background
- Dimensions: 52px wide × 26px tall (top-down view, car faces upward)
- Placed in: `assets/cars/` directory
- Naming: exactly as shown in Car File column above
- The car image should face upward (toward the finish line)

### Track background
- User provides: `assets/track-bg.png`
- Dimensions: 660px × 460px
- Should be a top-down F1 track surface — asphalt texture, lane markings, kerbs
- The app overlays lane dividers and car images on top of this background

---

## 5. Rendering Approach

**Use CSS transforms and plain JS animation — do NOT use PixiJS for V2.**

Reason: PixiJS is heavy and adds complexity. Car movement is just `transform: translateY()` on an `<img>` element. CSS transitions handle the smooth movement. This keeps the zero-bundler architecture intact.

Each car is an `<img>` element absolutely positioned within its lane `<div>`. When a subtask is toggled, recalculate the car's Y position and update its inline style. CSS `transition: transform 0.6s ease-out` handles the animation automatically.

```
Lane div (position: relative, overflow: hidden)
  └── track background (position: absolute, full lane)
  └── car img (position: absolute, bottom: calculated_px, left: 50%, transform: translateX(-50%))
```

Car Y position formula:
```javascript
const progress = task.subtasks.length > 0
  ? task.subtasks.filter(s => s.completed).length / task.subtasks.length
  : 0;

// bottomPx = 0 means car is at start line, 380 means at finish line
const bottomPx = Math.round(progress * 380);
car.style.bottom = bottomPx + 'px';
```

Use CSS transition on the car element:
```css
.car-img {
  transition: bottom 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

---

## 6. Database Changes

### Modified: tasks table
Add two new columns. Do this with `ALTER TABLE` on first run if columns don't exist — do not drop and recreate the table (V1 data must survive).

```sql
-- Add to existing tasks table
ALTER TABLE tasks ADD COLUMN constructor_id INTEGER; -- 1-10, maps to constructor table
ALTER TABLE tasks ADD COLUMN lane INTEGER;           -- 1-10, same as constructor_id for now
```

### New: constructors table (lookup, seeded on init)
```sql
CREATE TABLE IF NOT EXISTS constructors (
  id          INTEGER PRIMARY KEY,  -- 1-10
  name        TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  car_file    TEXT NOT NULL
);

-- Seed data (insert only if table is empty)
INSERT OR IGNORE INTO constructors VALUES
  (1,  'Red Bull Racing', '#3671C6', '#FF1E00', 'redbull.png'),
  (2,  'Ferrari',         '#E8002D', '#FFCC00', 'ferrari.png'),
  (3,  'McLaren',         '#FF8000', '#000000', 'mclaren.png'),
  (4,  'Mercedes',        '#00D2BE', '#000000', 'mercedes.png'),
  (5,  'Aston Martin',    '#006F62', '#CEDC00', 'astonmartin.png'),
  (6,  'Alpine',          '#FF87BC', '#0090FF', 'alpine.png'),
  (7,  'Williams',        '#005AFF', '#FFFFFF', 'williams.png'),
  (8,  'Haas',            '#B6BABD', '#E8002D', 'haas.png'),
  (9,  'Visa RB',         '#6692FF', '#C8001E', 'visarb.png'),
  (10, 'Kick Sauber',     '#52E252', '#000000', 'sauber.png');
```

### Modified query: tasks:getAll
Must now return constructor info joined with each task:

```sql
SELECT
  t.*,
  c.name        AS constructor_name,
  c.primary_color,
  c.secondary_color,
  c.car_file
FROM tasks t
LEFT JOIN constructors c ON t.constructor_id = c.id
WHERE t.completed = 0
ORDER BY t.position ASC;
```

Subtasks are fetched separately and attached as before.

---

## 7. New IPC Handlers

Add these two handlers to `main/ipc.js`. Everything else stays the same.

### `constructors:getAvailable`
Returns all 10 constructors, with an `available` boolean indicating whether the lane is free.

```javascript
ipcMain.handle('constructors:getAvailable', () => {
  const occupiedLanes = db.prepare(
    `SELECT constructor_id FROM tasks WHERE completed = 0 AND constructor_id IS NOT NULL`
  ).all().map(r => r.constructor_id);

  const all = db.prepare(`SELECT * FROM constructors ORDER BY id`).all();

  return all.map(c => ({
    ...c,
    available: !occupiedLanes.includes(c.id)
  }));
});
```

### `tasks:add` — updated signature
The existing handler needs to accept `constructor_id` in the payload:

```javascript
ipcMain.handle('tasks:add', (_, { title, note, subtasks, constructor_id }) => {
  const id = crypto.randomUUID();
  const position = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE completed = 0`).get().c;

  db.prepare(`
    INSERT INTO tasks (id, title, note, completed, position, constructor_id, lane, created_at)
    VALUES (?, ?, ?, 0, ?, ?, ?, ?)
  `).run(id, title, note || null, position, constructor_id, constructor_id, Date.now());

  if (subtasks && subtasks.length > 0) {
    const insertSubtask = db.prepare(`
      INSERT INTO subtasks (id, task_id, title, completed, position)
      VALUES (?, ?, ?, 0, ?)
    `);
    subtasks.forEach((s, i) => insertSubtask.run(crypto.randomUUID(), id, s, i));
  }

  return db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id);
});
```

---

## 8. Preload Changes

Add two new methods to `window.pond` in `renderer/preload.js`:

```javascript
contextBridge.exposeInMainWorld('pond', {
  // --- existing methods, unchanged ---
  getTasks:      ()     => ipcRenderer.invoke('tasks:getAll'),
  completeTask:  (id)   => ipcRenderer.invoke('tasks:complete', id),
  deleteTask:    (id)   => ipcRenderer.invoke('tasks:delete', id),
  toggleSubtask: (id)   => ipcRenderer.invoke('subtasks:toggle', id),
  onShow: (cb) => ipcRenderer.on('popover:show', cb),
  onHide: (cb) => ipcRenderer.on('popover:hide', cb),

  // --- new in V2 ---
  getConstructors: ()     => ipcRenderer.invoke('constructors:getAvailable'),
  addTask: (data)         => ipcRenderer.invoke('tasks:add', data),
  // data shape: { title, note, subtasks: string[], constructor_id: number }
});
```

---

## 9. Screen Specifications

### 9.1 Home Screen — The Race Track

**This is the default view when the popover opens.**

Structure:
```
<div class="pond-root">
  <div class="track-container">
    <div class="finish-line">FINISH</div>
    <div class="lanes-wrapper">
      <!-- 10 lane divs, always rendered, empty or occupied -->
      <div class="lane" data-lane="1">
        <div class="lane-color-bar" style="background: #3671C6"></div>
        <img class="car-img" src="../assets/cars/redbull.png" style="bottom: 42px">
        <div class="task-label">Fix notch bug</div>
      </div>
      <!-- lanes 2-10 ... -->
    </div>
    <div class="start-line">START</div>
  </div>
  <div class="track-footer">
    <button class="add-task-btn">+ Add Task</button>
  </div>
</div>
```

**Lane rendering rules:**
- All 10 lanes are always rendered, whether occupied or not
- Empty lane: shows constructor color bar on the left edge of the lane, no car image, no label
- Occupied lane: shows car image at correct Y position, task title truncated at bottom of lane
- Car position updates immediately when a subtask is toggled (no page navigation needed for subtask toggle — handle it inline via a hover interaction, see section 9.3)

**CSS for lane:**
```css
.lanes-wrapper {
  display: flex;
  flex-direction: row;
  width: 660px;
  height: 420px;
  position: relative;
}

.lane {
  width: 66px;
  height: 420px;
  position: relative;
  border-right: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  overflow: hidden;
}

.lane-color-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}

.car-img {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 52px;
  height: 26px;
  transition: bottom 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  z-index: 2;
}

.task-label {
  position: absolute;
  bottom: 4px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 2px;
  z-index: 3;
}
```

---

### 9.2 Add Task Screen

**Replaces track content inline — same popover, no new window.**

Layout:
```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back                                                          │
│                                                                  │
│  Task title                          ← large input, required     │
│  ──────────────────────────────────────────────────────────────  │
│  Notes (optional)                    ← textarea                  │
│  ──────────────────────────────────────────────────────────────  │
│  SUBTASKS                                                        │
│  ○ Subtask one                                              ×    │
│  ○ Subtask two                                              ×    │
│  + Add subtask                                                   │
│  ──────────────────────────────────────────────────────────────  │
│  CHOOSE YOUR CAR                                                 │
│                                                                  │
│  [🔴 Red Bull] [🔴 Ferrari ] [🟠 McLaren] [⚫ Mercedes]          │
│  [🟢 Aston  ] [🩷 Alpine  ] [🔵 Williams] [⚪ Haas   ]          │
│  [🔵 Visa RB] [🟢 Sauber  ]                                     │
│   (grayed out if lane is occupied)                               │
│                                                                  │
│  [ Cancel ]                    [ Add Task → ]                   │
└──────────────────────────────────────────────────────────────────┘
```

**Constructor picker:**
- Grid of 10 constructor chips, 2 rows of 5
- Each chip: constructor primary color as background, constructor name in white, 2px border
- Selected chip: white border 2px, slightly scaled up (transform: scale(1.05))
- Unavailable chip (lane occupied): opacity 0.3, cursor not-allowed, not selectable
- Validation: cannot submit without selecting an available constructor

**Form validation:**
- Title is required — show inline error "Title is required" if empty on submit
- Constructor is required — show inline error "Choose a car" if none selected
- Subtasks are optional — if none added, the car starts at the bottom and cannot move (since progress = 0/0 = 0%). This is valid — the task completes via "Mark as done" in detail view.

---

### 9.3 Task Detail Screen

**Opens when user clicks an occupied lane on the home screen.**

Layout:
```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back          🔴 Ferrari                                      │
│                                                                  │
│  Fix the notch hover bug             ← title, 17px 600          │
│                                                                  │
│  Notes about the issue...            ← note, muted, if exists    │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  SUBTASKS                     2 / 5 complete                     │
│                                                                  │
│  ☑  Check notch.js polling interval    ← done (gray+strike)     │
│  ☑  Increase grace period to 600ms                              │
│  ○  Test on external monitor                                     │
│  ○  Test on MacBook Pro notch                                    │
│  ○  Ship                                                         │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  ████████████░░░░░░░░░░  40%          ← progress bar            │
│                                                                  │
│                           [ Mark as done ]                       │
└──────────────────────────────────────────────────────────────────┘
```

**Subtask toggle behavior:**
- Toggling a subtask in the detail view immediately updates the car position on the track (even though track is not visible — update the data so when user navigates back, position is correct)
- Progress bar updates in real time as subtasks are toggled
- Progress bar color = constructor primary color

**Mark as done:**
- Muted button at bottom right
- On tap: car plays a brief finish animation (see section 10), then task is marked complete, lane clears, user is returned to home screen

---

## 10. Animations

### Car movement
- CSS transition on `bottom` property: `0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Triggers every time a subtask is toggled
- Car smoothly drives up the lane

### Finish line celebration
When "Mark as done" is tapped and the car has reached or is at the finish line:

```javascript
// Simple JS animation — no library needed
function playFinishAnimation(laneEl, carEl) {
  // 1. Car drives off the top of the lane
  carEl.style.transition = 'bottom 0.4s ease-in';
  carEl.style.bottom = '460px'; // off screen top

  // 2. After car exits, flash the lane with constructor color
  setTimeout(() => {
    laneEl.style.backgroundColor = constructorColor;
    laneEl.style.transition = 'background-color 0.1s';
    setTimeout(() => {
      laneEl.style.backgroundColor = 'transparent';
      // 3. Clear the lane data
      clearLane(laneEl);
    }, 200);
  }, 400);
}
```

If "Mark as done" is tapped before all subtasks are complete (early finish):
- Car drives to top of lane quickly (0.3s)
- Same flash animation
- No penalty, just clears

### Popover open/close
Same as V1 — `win.setSize(700, 560, true)` and `win.setSize(700, 0, true)`. Update these values in `main/index.js`.

---

## 11. Style Guide

### Color palette
```css
:root {
  --bg-dark:        #1a1a1a;      /* main background */
  --track-surface:  #2a2a2a;      /* track background if no image */
  --lane-border:    rgba(255,255,255,0.08);
  --finish-line:    #ffffff;
  --start-line:     rgba(255,255,255,0.4);
  --text-primary:   #ffffff;
  --text-secondary: rgba(255,255,255,0.5);
  --text-label:     rgba(255,255,255,0.7);
  --btn-primary:    #ffffff;
  --btn-primary-text: #1a1a1a;
  --btn-muted:      rgba(255,255,255,0.3);
}
```

### Typography
```css
/* System font — resolves to SF Pro on macOS */
font-family: -apple-system, BlinkMacSystemFont, sans-serif;

/* Scale */
--text-xs:   9px;   /* lane task labels */
--text-sm:  11px;   /* section headers, metadata */
--text-base: 13px;  /* body, subtasks, form inputs */
--text-lg:  15px;   /* constructor name in detail */
--text-xl:  17px;   /* task title in detail */
```

### Overall aesthetic
- Dark background (track is naturally dark asphalt)
- High contrast white text on dark
- Constructor colors are the only saturated colors in the UI
- No rounded corners on the track/lane area — keep it sharp and technical
- Rounded corners (8px) only on buttons and form inputs
- The track background image (user-provided) sets the visual tone — the UI layers on top minimally

---

## 12. Updated Window Configuration

Update these values in `main/index.js`:

```javascript
// V2 window dimensions
const POPOVER_WIDTH = 700;
const POPOVER_HEIGHT = 560;

win = new BrowserWindow({
  width: POPOVER_WIDTH,
  height: 0,
  x: Math.round(screenWidth / 2 - POPOVER_WIDTH / 2),
  y: 0,
  // ... rest unchanged
});

function showPopover() {
  if (!win || popoverVisible) return;
  popoverVisible = true;
  win.setSize(POPOVER_WIDTH, POPOVER_HEIGHT, true);
  win.webContents.send('popover:show');
}

function hidePopover() {
  if (!win || !popoverVisible) return;
  popoverVisible = false;
  win.setSize(POPOVER_WIDTH, 0, true);
  win.webContents.send('popover:hide');
}
```

Also update `main/notch.js` — the safe zone width must match the new window width:

```javascript
const POPOVER_WIDTH = 700;   // updated from 340
const POPOVER_HEIGHT_OPEN = 560;  // updated from 420
const POPOVER_X_OFFSET = 350;     // updated from 170 (half of 700)
```

And update the notch hit zone to be wider since the window is wider:
```javascript
const NOTCH_ZONE = {
  x: Math.round(screenWidth / 2 - 150),  // unchanged — notch itself is still ~300px
  y: 0,
  width: 300,
  height: 60,
};
```

---

## 13. File Changes Summary

| File | Action | What changes |
|------|--------|--------------|
| `main/index.js` | Edit | Window width/height constants (340→700, 420→560), x offset |
| `main/notch.js` | Edit | `POPOVER_WIDTH`, `POPOVER_HEIGHT_OPEN`, `POPOVER_X_OFFSET` constants |
| `main/db.js` | Edit | ALTER TABLE for new columns, new constructors table, seed data, updated getAll query |
| `main/ipc.js` | Edit | Updated `tasks:add` handler, new `constructors:getAvailable` handler |
| `renderer/preload.js` | Edit | Add `getConstructors` method to contextBridge |
| `renderer/app.js` | Rewrite | New Home (track), AddTask (with constructor picker), TaskDetail screens |
| `renderer/styles.css` | Rewrite | Full V2 dark track styles |
| `assets/cars/*.png` | Add | 10 car images (user provides, 52×26px each, transparent bg) |
| `assets/track-bg.png` | Add | Track background (user provides, 660×460px) |

---

## 14. Build & Verify Checklist

Work through these in order. Verify each before proceeding.

### Step 1 — Window resize only
- Update dimensions in `index.js` and `notch.js`
- `npm start` → popover opens at 700×560? Notch hover still works? ✅

### Step 2 — Database migration
- Update `db.js` with ALTER TABLE statements and constructors table
- `npm start` → app starts without crashing? Existing tasks still load? ✅

### Step 3 — New IPC handlers
- Update `ipc.js` and `preload.js`
- Test: `window.pond.getConstructors()` from DevTools returns 10 constructors? ✅

### Step 4 — Track home screen (mock data)
- Rewrite `app.js` Home screen with hardcoded mock tasks on the track
- Verify lane layout, car positioning, task labels render correctly ✅

### Step 5 — Add Task screen with constructor picker
- Build AddTask screen, wire constructor picker, wire form submission
- Test: add a task → car appears on correct lane at start position ✅

### Step 6 — Task Detail + subtask toggling
- Build TaskDetail screen
- Test: toggle subtask → car moves up lane on return to home ✅

### Step 7 — Finish animation + mark as done
- Implement finish animation
- Test: complete all subtasks → mark done → car exits → lane clears ✅

### Step 8 — Full regression
- All V1 flows still work (add, view, complete, persist across restart)
- Notch hover, Cmd+Shift+P, Escape all work at new window size
- No beach ball or lag during normal use ✅

---

## 15. Assets the User Will Provide

The coding agent should not generate or substitute these. Leave placeholders and document clearly.

| Asset | Path | Spec |
|-------|------|------|
| Red Bull car | `assets/cars/redbull.png` | 52×26px PNG, transparent bg, top-down view facing up |
| Ferrari car | `assets/cars/ferrari.png` | same spec |
| McLaren car | `assets/cars/mclaren.png` | same spec |
| Mercedes car | `assets/cars/mercedes.png` | same spec |
| Aston Martin car | `assets/cars/astonmartin.png` | same spec |
| Alpine car | `assets/cars/alpine.png` | same spec |
| Williams car | `assets/cars/williams.png` | same spec |
| Haas car | `assets/cars/haas.png` | same spec |
| Visa RB car | `assets/cars/visarb.png` | same spec |
| Kick Sauber car | `assets/cars/sauber.png` | same spec |
| Track background | `assets/track-bg.png` | 660×460px PNG, top-down asphalt track with lane markings |

Until assets are provided, render colored rectangles as placeholders:
- Car placeholder: a `<div>` with constructor primary color, 52×26px, border-radius 4px
- Track placeholder: `background-color: #2a2a2a` on the track container

---

*Pond V2 — F1 Track Edition · PRD · April 2026 · Puneet*
