# Camber 🏎️

> Your tasks, racing from your notch.

![Platform](https://img.shields.io/badge/platform-macOS-black?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-white?style=flat-square)
![Version](https://img.shields.io/badge/version-1.0.0-red?style=flat-square)
![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F?style=flat-square)

<!-- HERO GIF: Full-width screen recording showing the notch hover → popover opens →
     car visible on track → click task → detail view → check off subtask → car moves.
     Ideal length: 6-8 seconds, looping. Filename: demo.gif -->

---

## What is Camber?

Camber lives in your MacBook's notch. Hover over it and a race track drops down — each lane is a task, each car is your progress. Complete subtasks and your car drives toward the finish line. Cross it and the race is won.

No separate app to open. No window to find. No boring checkbox list. Just glance up, see where everything stands, and get back to work.

---

## Why Camber is different

Every todo app puts your tasks in a list. You open the app, scroll, find the task, open it, find the subtask, check it, close it. That's four steps to record five seconds of progress.

Camber is always one hover away. The notch — dead space on every MacBook — becomes your pit wall. The F1 metaphor isn't decoration: it encodes real information. A car near the finish line means you're almost done. A car at the start means you haven't touched it. Ten lanes means you always know the state of everything without reading a word.

Traditional productivity apps feel like work. **Camber feels like a race.**

---

## Features

- **Notch-native** — hover over the MacBook notch to open, move away to close
- **F1 race track** — 10 lanes, one per F1 constructor, each car represents a task
- **Progress is physical** — cars move up the lane as subtasks are completed
- **Constructor Garage** — choose from 10 legendary F1 teams, each with their own car model and color profile
- **Subtasks first** — subtasks are not an afterthought, they drive the whole experience
- **Pin mode** — lock Camber open while you work, close when you're done
- **Smart Telemetry** — task notes with an auto-link engine that turns URLs into clickable elements
- **Drag to reorder** — drag objectives within a task, drag cars between lanes
- **Victory Lap** — finish a task and get a chequered flag moment with confetti
- **Keyboard first** — every action has a shortcut, nothing requires the mouse
- **Zero menubar clutter** — lives in the notch, not the menubar
- **Local and private** — everything stored in SQLite on your machine, nothing leaves it

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd + Shift + P` | Toggle Camber open / close (pinned) |
| `Cmd + Shift + L` | Toggle pin — lock open or release |
| `Cmd + N` | New task |
| `Cmd + S` or `Enter` | Save / launch task from add or edit screen |
| `Cmd + ,` | Open keyboard shortcuts reference |
| `Escape` | Go back / close |

---

## Installation

### Download (recommended)

1. Go to [Releases](https://github.com/puneetko/camber/releases)
2. Download `Camber.dmg` from the latest release
3. Open the DMG and drag Camber to your Applications folder
4. Try to open Camber — macOS will block it with a warning that the app is damaged or from an unidentified developer
5. Go to **System Settings → Privacy & Security**, scroll down, and click **Open Anyway** next to Camber
6. Confirm by clicking **Open** in the dialog that follows — Camber will launch normally from this point on

> This happens because Camber is not yet notarized with Apple. It is completely safe — macOS just requires this one-time override for apps outside the App Store that aren't notarized. After the first launch, it opens normally.

<!-- SCREENSHOT: The macOS Privacy & Security panel showing the "Open Anyway" button.
     Filename: gatekeeper.png -->

### Requirements

- macOS 12 Monterey or later
- Apple Silicon or Intel Mac (universal binary)
- MacBook with notch recommended (Pro 14" 2021 onwards) — works on non-notch Macs too via `Cmd + Shift + P`

---

## Running from source

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Setup

```bash
git clone https://github.com/puneetko/camber.git
cd camber
npm install
npm start
```

### Build a distributable DMG

```bash
npm run build:renderer && npm run build
```

Output lands in `dist/Camber.dmg` as a universal binary — runs natively on both Apple Silicon and Intel.

---

## Architecture

Camber is intentionally simple. No Redux, no complex state management. If you can read JavaScript, you can read Camber.

```
camber/
├── main/
├── renderer/
└── assets/
```

### `main/`

The Electron backend. Handles native OS integration and all data operations.

- **`index.js`** — Electron entry point: window setup, tray, global shortcuts, IPC wiring
- **`db.js`** — All SQLite via sql.js: schema definitions, queries, and migrations
- **`ipc.js`** — `ipcMain` handlers that bridge renderer requests to the database
- **`notch.js`** — Mouse polling loop: detects notch hover, shows and hides the popover
- **`tray.js`** — Menubar tray icon and its context menu

### `renderer/`

The UI layer. Pure React with no build step — HTM handles JSX in the browser directly.

- **`index.html`** — Shell document
- **`globals.js`** — HTM + React bindings, shared hooks
- **`app.js`** — Root component: screen routing and global state
- **`HomeScreen.js`** — The race track: 10 lanes, cars, drag-to-swap
- **`AddTaskScreen.js`** — Garage form: title, notes, objectives, constructor picker
- **`TaskDetailScreen.js`** — Pit wall: subtask checklist, progress circle, sectors
- **`Overlays.js`** — Shortcuts modal and celebration overlay
- **`preload.js`** — `contextBridge` that exposes `window.pond` to the renderer
- **`styles.css`** — All styles in one file, CSS variables, no framework

### `assets/`

- **`cars/`** — `car1.png` through `car10.png`: top-down F1 car sprites
- **`track-bg.png`** — Track surface background

---

### How the notch trigger works

macOS has no public API for notch interaction. Camber polls the global mouse position every 100ms using Electron's `screen.getCursorScreenPoint()`. When the cursor enters a hit zone centered at the top of the display — approximately 200px wide and 25px tall — the popover window is shown. A 300ms grace period prevents flickering when the cursor briefly leaves the zone.

The popover is a frameless, transparent `BrowserWindow` anchored to the top center of the primary display. `setAlwaysOnTop(true, 'floating')` keeps it above normal windows without fighting the macOS compositor.

### Data layer

Everything is SQLite via [sql.js](https://github.com/sql-js/sql.js) — an in-memory SQLite compiled to WebAssembly, persisted to `~/Library/Application Support/Camber/camber.db` on every write. No ORM, no migration library, plain SQL. Three tables: `tasks`, `subtasks`, and `constructors`.

### IPC pattern

The renderer has no access to Node APIs. All data operations go through a `contextBridge` API exposed as `window.pond`. The renderer calls `window.pond.getTasks()`, the preload sends it over IPC, the main process queries SQLite and returns the result. Clean separation, no security shortcuts.

---

## The F1 Constructors

| Lane | Constructor | Color |
|------|-------------|-------|
| 1 | Red Bull Racing | `#3671C6` |
| 2 | Ferrari | `#E8002D` |
| 3 | McLaren | `#FF8000` |
| 4 | Mercedes | `#00D2BE` |
| 5 | Aston Martin | `#006F62` |
| 6 | Alpine | `#FF87BC` |
| 7 | Williams | `#005AFF` |
| 8 | Haas | `#B6BABD` |
| 9 | Visa RB | `#6692FF` |
| 10 | Kick Sauber | `#52E252` |

---

## Roadmap

Not promises, just direction.

- Animated F1 car sprites instead of static PNGs
- Due dates with visual urgency encoding on the track
- Global quick-capture shortcut that works without opening the full popover
- Proper Apple notarization for one-click install
- Multiple workspaces / race seasons

---

## Contributing

Camber is open source and contributions are welcome. Open an issue first before building anything significant so we can discuss it.

```bash
git clone https://github.com/puneetko/camber.git
cd camber
npm install
npm start
```

**Useful contributions:** better car SVGs, Windows/Linux support, bug reports with reproduction steps, performance improvements to the notch polling mechanism.

**Please avoid:** cloud sync or accounts (Camber is intentionally local-first), changing the core F1 metaphor, large refactors without discussion.

### Pull request process

1. Fork the repo
2. Create a branch: `git checkout -b fix/your-fix-name`
3. Make your changes and test on macOS with `npm start`
4. Open a PR with a clear description of what changed and why

---

## Built with

- [Electron](https://www.electronjs.org/) — desktop runtime
- [React](https://react.dev/) — UI
- [HTM](https://github.com/developit/htm) — JSX without a build step
- [sql.js](https://github.com/sql-js/sql.js) — SQLite in WebAssembly
- [canvas-confetti](https://github.com/catdad/canvas-confetti) — the celebration moment

---

Built by [Puneet Kathuria](https://github.com/puneetko) as a personal project that got out of hand in the best way.

If Camber helps you ship something, leave a star. If it doesn't, open an issue.

*Keep your head down, focus on the apex, and finish the mission.* 🏁
