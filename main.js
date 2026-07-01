import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

// ─── DOM Elements ───
const videoElement = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d", { alpha: true });
const startCameraBtn = document.getElementById("start-camera-btn");
const statusText = document.getElementById("status-text");
const startupOverlay = document.getElementById("startup-overlay");
const hudStatus = document.getElementById("hud-status");
const hudStatusText = document.getElementById("hud-status-text");
const hudHands = document.getElementById("hud-hands");
const hudGesture = document.getElementById("hud-gesture");
const hudFps = document.getElementById("hud-fps");

// ─── State ───
let handLandmarker = undefined;
let webcamRunning = false;
let lastVideoTime = -1;
let results = undefined;
let handStates = [];
let particles = [];
let shockwaves = [];
let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
];

// ─── Initialize MediaPipe ───
async function initializeHandLandmarker() {
  statusText.innerText = "Loading AI Model...";
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    handLandmarker = await HandLandmarker.createFromModelPath(
      vision,
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    );
    await handLandmarker.setOptions({ runningMode: "VIDEO", numHands: 2 });
    statusText.innerText = "✓ AI Model Ready — Click to Start";
    startCameraBtn.disabled = false;
  } catch (error) {
    console.error("Error loading model:", error);
    statusText.innerText = "✗ Failed to load model.";
  }
}

// ─── Camera (lower resolution = much faster) ───
function enableCam() {
  if (!handLandmarker) return;
  webcamRunning = true;
  startCameraBtn.innerText = "STARTING...";
  startCameraBtn.disabled = true;

  navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: "user" }
  }).then((stream) => {
    videoElement.srcObject = stream;
    videoElement.addEventListener("loadeddata", () => {
      startupOverlay.classList.add("hidden");
      hudStatus.classList.add("live");
      hudStatusText.textContent = "LIVE";
      document.querySelector(".status-dot").style.background = "#22c55e";
      document.querySelector(".status-dot").style.boxShadow = "0 0 6px #22c55e";
      predictWebcam();
    });
  }).catch(() => {
    statusText.innerText = "Camera access denied.";
    startCameraBtn.disabled = false;
    startCameraBtn.innerText = "Initialize Camera";
  });
}

// ─── Gesture Detection ───
function getHandGesture(landmarks) {
  const wrist = landmarks[0];
  let extended = 0;
  const tips = [8, 12, 16, 20];
  const mids = [6, 10, 14, 18];
  for (let i = 0; i < 4; i++) {
    const t = landmarks[tips[i]], m = landmarks[mids[i]];
    const dt = (t.x - wrist.x) ** 2 + (t.y - wrist.y) ** 2;
    const dm = (m.x - wrist.x) ** 2 + (m.y - wrist.y) ** 2;
    if (dt > dm) extended++;
  }
  if (extended === 0) return "fist";
  if (extended >= 3) return "open";
  return "partial";
}

// ─── Explosion (fewer particles for speed) ───
function createExplosion(x, y) {
  const fireColors = ["#ff4500", "#ff6a00", "#ff8c00", "#ffd700", "#ffffff"];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 18 + 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.015 + Math.random() * 0.025,
      color: fireColors[Math.floor(Math.random() * fireColors.length)],
      size: Math.random() * 10 + 3
    });
  }
  // Smoke
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 1.0,
      decay: 0.01 + Math.random() * 0.01,
      color: "#ff4500",
      size: Math.random() * 20 + 10,
      isSmoke: true
    });
  }
  shockwaves.push({ x, y, radius: 10, maxRadius: 250, life: 1.0 });
}

// ─── Draw particles (NO shadowBlur = fast) ───
function updateAndDrawParticles() {
  if (particles.length === 0) return;

  canvasCtx.save();
  canvasCtx.globalCompositeOperation = "lighter";

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    if (!p.isSmoke) p.vy += 0.25;
    p.life -= p.decay;
    p.size *= p.isSmoke ? 0.99 : 0.96;

    if (p.life <= 0 || p.size < 0.3) {
      particles.splice(i, 1);
      continue;
    }

    canvasCtx.globalAlpha = Math.max(0, p.life * (p.isSmoke ? 0.25 : 0.9));
    canvasCtx.fillStyle = p.color;
    canvasCtx.beginPath();
    canvasCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    canvasCtx.fill();
  }

  canvasCtx.restore();
}

function updateAndDrawShockwaves() {
  if (shockwaves.length === 0) return;

  canvasCtx.save();
  canvasCtx.globalCompositeOperation = "lighter";

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i];
    s.radius += (s.maxRadius - s.radius) * 0.08;
    s.life -= 0.03;

    if (s.life <= 0) { shockwaves.splice(i, 1); continue; }

    canvasCtx.globalAlpha = s.life * 0.5;

    // Outer ring
    canvasCtx.strokeStyle = "#ff6a00";
    canvasCtx.lineWidth = 3 * s.life;
    canvasCtx.beginPath();
    canvasCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    canvasCtx.stroke();

    // Inner ring
    canvasCtx.strokeStyle = "#ffffff";
    canvasCtx.lineWidth = 1.5 * s.life;
    canvasCtx.beginPath();
    canvasCtx.arc(s.x, s.y, s.radius * 0.7, 0, Math.PI * 2);
    canvasCtx.stroke();
  }

  canvasCtx.restore();
}

// ─── Neon Skeleton (single pass, no shadowBlur) ───
function drawNeonSkeleton(landmarks, color, isCharging) {
  const w = canvasElement.width;
  const h = canvasElement.height;

  canvasCtx.save();
  canvasCtx.globalCompositeOperation = "lighter";
  canvasCtx.lineCap = "round";
  canvasCtx.lineJoin = "round";

  // Outer glow (wide semi-transparent stroke fakes the glow)
  canvasCtx.globalAlpha = isCharging ? 0.4 : 0.2;
  canvasCtx.strokeStyle = color;
  canvasCtx.lineWidth = isCharging ? 14 : 10;

  canvasCtx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    canvasCtx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    canvasCtx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
  }
  canvasCtx.stroke();

  // Core line
  canvasCtx.globalAlpha = 1;
  canvasCtx.strokeStyle = isCharging ? "#ffffff" : color;
  canvasCtx.lineWidth = isCharging ? 4 : 2.5;

  canvasCtx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    canvasCtx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    canvasCtx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
  }
  canvasCtx.stroke();

  // Joints
  canvasCtx.fillStyle = "#ffffff";
  canvasCtx.beginPath();
  for (const lm of landmarks) {
    canvasCtx.moveTo(lm.x * w + 3, lm.y * h);
    canvasCtx.arc(lm.x * w, lm.y * h, isCharging ? 4 : 3, 0, Math.PI * 2);
  }
  canvasCtx.fill();

  // Charging aura
  if (isCharging) {
    const palm = landmarks[9];
    const px = palm.x * w, py = palm.y * h;
    const pulseSize = 35 + Math.sin(performance.now() * 0.008) * 12;
    const grad = canvasCtx.createRadialGradient(px, py, 0, px, py, pulseSize);
    grad.addColorStop(0, "rgba(255, 106, 0, 0.45)");
    grad.addColorStop(0.6, "rgba(255, 69, 0, 0.1)");
    grad.addColorStop(1, "transparent");
    canvasCtx.fillStyle = grad;
    canvasCtx.beginPath();
    canvasCtx.arc(px, py, pulseSize, 0, Math.PI * 2);
    canvasCtx.fill();
  }

  canvasCtx.restore();
}

// ─── Energy Beam (optimized) ───
function drawEnergyBeam(p1, p2) {
  const w = canvasElement.width, h = canvasElement.height;
  const x1 = p1.x * w, y1 = p1.y * h;
  const x2 = p2.x * w, y2 = p2.y * h;
  const dist = Math.hypot(x2 - x1, y2 - y1);

  canvasCtx.save();
  canvasCtx.globalCompositeOperation = "lighter";
  canvasCtx.lineCap = "round";

  // Wide outer glow (no shadowBlur, just thick transparent line)
  canvasCtx.globalAlpha = 0.15;
  canvasCtx.strokeStyle = "#ff00e5";
  canvasCtx.lineWidth = 20;
  canvasCtx.beginPath();
  canvasCtx.moveTo(x1, y1);
  canvasCtx.lineTo(x2, y2);
  canvasCtx.stroke();

  // Medium core
  canvasCtx.globalAlpha = 0.5;
  canvasCtx.strokeStyle = "#00f0ff";
  canvasCtx.lineWidth = 7;
  canvasCtx.beginPath();
  canvasCtx.moveTo(x1, y1);
  canvasCtx.lineTo(x2, y2);
  canvasCtx.stroke();

  // Bright center
  canvasCtx.globalAlpha = 1;
  canvasCtx.strokeStyle = "#ffffff";
  canvasCtx.lineWidth = 2.5;
  canvasCtx.beginPath();
  canvasCtx.moveTo(x1, y1);
  canvasCtx.lineTo(x2, y2);
  canvasCtx.stroke();

  // 2 lightning arcs
  const segments = Math.max(2, Math.floor(dist / 25));
  const arcColors = ["#00f0ff", "#ff00e5"];
  canvasCtx.lineWidth = 1.5;
  canvasCtx.globalAlpha = 0.6;

  for (let arc = 0; arc < 2; arc++) {
    canvasCtx.strokeStyle = arcColors[arc];
    canvasCtx.beginPath();
    canvasCtx.moveTo(x1, y1);
    const perpAngle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
    for (let i = 1; i < segments; i++) {
      const f = i / segments;
      const jitter = (Math.random() - 0.5) * 35;
      canvasCtx.lineTo(
        x1 + (x2 - x1) * f + Math.cos(perpAngle) * jitter,
        y1 + (y2 - y1) * f + Math.sin(perpAngle) * jitter
      );
    }
    canvasCtx.lineTo(x2, y2);
    canvasCtx.stroke();
  }

  // Endpoint orbs (simple circles, no gradient)
  canvasCtx.globalAlpha = 0.8;
  canvasCtx.fillStyle = "#ffffff";
  for (const [px, py] of [[x1, y1], [x2, y2]]) {
    canvasCtx.beginPath();
    canvasCtx.arc(px, py, 8, 0, Math.PI * 2);
    canvasCtx.fill();
  }
  canvasCtx.globalAlpha = 0.3;
  canvasCtx.fillStyle = "#00f0ff";
  for (const [px, py] of [[x1, y1], [x2, y2]]) {
    canvasCtx.beginPath();
    canvasCtx.arc(px, py, 15, 0, Math.PI * 2);
    canvasCtx.fill();
  }

  canvasCtx.restore();
}

// ─── Main Loop ───
async function predictWebcam() {
  if (canvasElement.width !== videoElement.videoWidth && videoElement.videoWidth > 0) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
  }

  if (!webcamRunning) return;

  // FPS
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsTime = now;
    hudFps.textContent = `FPS: ${currentFps}`;
  }

  if (lastVideoTime !== videoElement.currentTime && videoElement.videoWidth > 0) {
    lastVideoTime = videoElement.currentTime;
    results = handLandmarker.detectForVideo(videoElement, now);
  }

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  let gestureLabel = "—";

  if (results && results.landmarks) {
    hudHands.textContent = `HANDS: ${results.landmarks.length}`;
    const colors = ["#00f0ff", "#ff00e5"];

    for (let i = 0; i < results.landmarks.length; i++) {
      const landmarks = results.landmarks[i];
      const color = colors[i % colors.length];
      if (!handStates[i]) handStates[i] = { state: "idle" };

      const gesture = getHandGesture(landmarks);

      if (gesture === "fist") {
        if (handStates[i].state !== "charging") handStates[i].state = "charging";
        gestureLabel = "CHARGING ⚡";
      } else if (gesture === "open" && handStates[i].state === "charging") {
        handStates[i].state = "idle";
        const palm = landmarks[9];
        createExplosion(palm.x * canvasElement.width, palm.y * canvasElement.height);
        gestureLabel = "BOOM 💥";
      } else {
        handStates[i].state = "idle";
        if (gesture === "open") gestureLabel = "OPEN ✋";
      }

      drawNeonSkeleton(landmarks, color, handStates[i].state === "charging");
    }

    if (results.landmarks.length >= 2) {
      drawEnergyBeam(results.landmarks[0][8], results.landmarks[1][8]);
      gestureLabel = "BEAM ⚡⚡";
    }
  } else {
    hudHands.textContent = "HANDS: 0";
  }

  hudGesture.textContent = `GESTURE: ${gestureLabel}`;

  updateAndDrawParticles();
  updateAndDrawShockwaves();

  requestAnimationFrame(predictWebcam);
}

// ─── Init ───
startCameraBtn.addEventListener("click", enableCam);
initializeHandLandmarker();
