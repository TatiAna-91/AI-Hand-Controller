# ✋⚡ AI Hand Controller

> Real-time AI-powered hand tracking with neon visual effects. Control energy beams and trigger explosions using nothing but your bare hands.

![Built with](https://img.shields.io/badge/Built%20with-MediaPipe-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## 🎯 Features

- **🤖 AI Hand Tracking** — Uses Google's MediaPipe HandLandmarker to detect and track up to 2 hands in real-time via your webcam.
- **🖐️ Neon Skeleton Overlay** — Glowing cyan & magenta neon lines are drawn across your fingers and hand bones.
- **⚡ Energy Beam** — Hold up both hands and a dynamic lightning beam shoots between your index fingertips.
- **💥 Explosion Gesture** — Close your fist to charge energy (pulsing orange aura), then open your hand to unleash a fiery particle explosion with a shockwave ring.
- **📊 Real-time HUD** — Professional heads-up display showing hand count, current gesture, FPS counter, and live status.
- **🎥 Live Camera Background** — Your webcam feed is the background, not a boring grey screen.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A device with a webcam
- A modern browser (Chrome, Edge, or Firefox recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/AI-Hand-Controller.git
cd AI-Hand-Controller

# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## 🎮 How to Use

| Gesture | Action |
|---------|--------|
| ✋ Open hand | Neon skeleton tracks your fingers |
| ✊ Close fist | Charges energy (orange pulsing aura) |
| ✊ → ✋ Fist then open | 💥 Triggers explosion from your palm |
| 🤚🤚 Both hands up | ⚡ Energy beam between fingertips |

---

## 🛠️ Tech Stack

- **[MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)** — Google's AI model for hand landmark detection
- **[Vite](https://vitejs.dev/)** — Lightning-fast build tool
- **HTML5 Canvas** — High-performance 2D rendering for all visual effects
- **Vanilla CSS** — Glassmorphism UI with micro-animations

---

## 📁 Project Structure

```
AI-Hand-Controller/
├── index.html      # Main HTML with HUD layout & camera feed
├── style.css       # Premium dark-mode glassmorphism design
├── main.js         # Core engine: MediaPipe + Canvas rendering
├── package.json    # Dependencies & scripts
└── README.md       # This file
```

---

## ⚡ Performance

Optimized for smooth real-time performance:
- Camera runs at 640×480 for fast AI inference
- Zero `shadowBlur` calls — glow effects faked with layered strokes
- Batched Canvas draw calls to minimize GPU overhead
- Particle system capped for consistent frame rates

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ and AI
</p>
