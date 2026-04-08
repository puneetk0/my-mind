# Camber 🏎️
### The missions-driven productivity engine for macOS.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS-blue.svg)]()
[![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-8CC84B.svg)]()

---

![Camber Hero GIF Placeholder](https://via.placeholder.com/800x450/111111/ffffff?text=Camber:+Hover+over+your+notch+to+reveal+the+race)

> [!NOTE]
> **Camber** isn't just a todo list; it's a high-performance racing grid for your daily tasks. It lives seamlessly in your macOS notch, waiting for you to hover before it blooms into a full-scale telemetry dashboard.

---

## 🏎️ What is this?
**Camber** is a notch-native productivity application designed to transform boring daily chores into high-stakes missions on an F1 track. Instead of checking off boxes on a flat list, you choose a constructor, prepare your car in the garage, and watch it progress toward the finish line as you complete your objectives.

Designed specifically for the macOS notch, Camber stays out of your way until you need it, providing a frictionless way to track "visual momentum" throughout your workday.

---

## ✨ Features
- **Notch-Native Interaction**: A frameless, vibrant popover that reveals itself only when you hover over the center of your menu bar (the notch).
- **Constructor Garage**: Choose from 10 legendary F1 teams (Red Bull, Ferrari, Mercedes, etc.), each with their own signature car models and color profiles.
- **Live Racing Grid**: Tasks are represented as cars in active lanes. As you complete subtasks, your car physically moves up the track toward the finish line.
- **Smart Telemetry (Notes)**: Take detailed mission notes with a specialized "auto-link" engine that turns URLs into clickable dashboard elements. 
- **Victory Lap Celebration**: Completing a mission triggers a high-octane celebratory confetti burst and drives your car off the screen.
- **Global Pit Wall Controls**: Fully keyboard-driven experience with global shortcuts to pin, unpin, or launch missions instantly.

---

## 🔥 Why it's different
Traditional productivity apps feel like work. **Camber feels like a race.** 
By mapping the "distance to done" to a physical racing grid, Camber provides immediate, visceral feedback on your productivity. It reduces the cognitive load of a massive todo list by focusing you on your active "drivers" and their progress toward the apex.

---

## 🛠️ Installation

### For Users (Production)
1. Download the latest `Camber.dmg` from the **Releases** section.
2. Drag **Camber** into your `/Applications` folder.
3. Launch Camber. Look for the small tray icon, then simply hover your mouse over the macOS notch to reveal the grid.

### For Developers (Clone and Run)
If you want to customize the telemetry or add new track features:
```bash
# 1. Clone the repository
git clone https://github.com/puneetkathuria/camber.git
cd camber

# 2. Install dependencies
npm install

# 3. Start development mode
npm start

# 4. Build the universal macOS DMG
npm run build
```

---

## 🏗️ Architecture
Camber is built with a lightweight, high-performance stack optimized for the macOS desktop environment.

- **Main Process (`/main`)**: Manages the native macOS window with `vibrancy` effects and handles the `NotchWatcher` which triggers based on mouse proximity to the menu bar.
- **Renderer (`/renderer`)**: A React-driven telemetry board using `HTM` for a slim, build-less feel.
- **Database (`/main/db.js`)**: Local persistence powered by `SQL.js`, ensuring your data stays private and stays on your machine.
- **Asset Engine**: Renders 10 distinct constructor car models centered and scaled for a premium feel.

```text
├── main/             # Main Process (IPC, Window management, Notch logic)
├── renderer/         # React Frontend (Track, Garage, Details)
├── assets/           # Car PNGs, Track background, and UI icons
├── package.json      # Universal build scripts and dependencies
└── webpack.config.js # Asset inlining for "zero-flicker" startup
```

---

## 🕹️ Pit Wall Controls (Shortcuts)

| Shortcut | Action |
| :--- | :--- |
| `Cmd + Shift + L` | **Pin / Unpin** Dashboard globally |
| `Cmd + N` | Open the **Garage** for a New Mission |
| `Cmd + S` or `Enter` | **Launch** Mission from Garage |
| `Cmd + ,` | View **Shortcuts** Pit Map |
| `Esc` | Return to **Pit Lane** / Hide Dashboard |

---

## 🤝 Contributing
Want to add a new car model or improve the telemetry logic?
1. Fork the repository.
2. Create your mission branch (`git checkout -b mission/add-feature`).
3. Commit your changes (`git commit -m 'Add new track telemetry'`).
4. Push to the branch (`git push origin mission/add-feature`).
5. Open a Pull Request.

---

## 📜 Credits & License
- **Created by**: [Puneet Kathuria](https://linkedin.com/in/puneet-kathuria)
- **License**: Distributed under the MIT License. See `LICENSE` for more information.

---
*Keep your head down, focus on the apex, and finish the mission.* 🏁
