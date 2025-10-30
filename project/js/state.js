// state.js — central shared state and helpers (moved from app.js)
// Contains devices, images, player state and helper functions.

// Devices in the house (simple layout)
const devices = [
  {
    id: "light_liv",
    label: "Luz Sala",
    type: "light",
    power: 60,
    x: 140,
    y: 120,
    w: 48,
    h: 48,
    on: false,
  },
  {
    id: "light_bed",
    label: "Luz Quarto",
    type: "light",
    power: 60,
    x: 640,
    y: 120,
    w: 48,
    h: 48,
    on: false,
  },
  {
    id: "light_kitchen",
    label: "Luz Cozinha",
    type: "light",
    power: 60,
    x: 320,
    y: 360,
    w: 48,
    h: 48,
    on: false,
  },
  {
    id: "fridge",
    label: "Frigorífico",
    type: "fridge",
    power: 120,
    x: 140,
    y: 360,
    w: 60,
    h: 70,
    on: false,
  },
  {
    id: "tv",
    label: "TV",
    type: "tv",
    power: 100,
    x: 420,
    y: 360,
    w: 80,
    h: 56,
    on: false,
  },
  {
    id: "heater",
    label: "Aquecedor",
    type: "heater",
    power: 1000,
    x: 640,
    y: 360,
    w: 64,
    h: 76,
    on: false,
  },
];

// player (boneco)
const player = { x: 220, y: 160, r: 14, speed: 160, stepPhase: 0 };

// movement areas & inputs
const allowedAreas = [
  { x: 40, y: 40, w: 360, h: 240 },
  { x: 500, y: 40, w: 360, h: 240 },
  { x: 40, y: 320, w: 820, h: 220 },
];
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};
const activationRadius = 80;

// timing / energy
let lastTime = performance.now();
let energyWh = 0;
// challenge state (2-minute game mode)
let challengeActive = false;
let challengeDuration = 120; // seconds
let challengeRemaining = 0; // seconds
// default threshold set to 1500W per request
let challengeThresholdW = 1500; // W - if totalW > threshold -> lose
// interval id for the random-device toggler
let _randomDevicesIntervalId = null;

// start randomly toggling devices (previously only lights). By default picks any device
// from the `devices` array and mostly turns it ON (75%), sometimes toggles OFF.
function startRandomDevices(intervalMs = 1200) {
  // intervalMs: base interval in ms. Reduced from 4500 to 1200 to increase difficulty.
  // add a small random jitter so activations aren't perfectly periodic (0..800ms)
  stopRandomDevices();
  _randomDevicesIntervalId = setInterval(() => {
    if (!devices || devices.length === 0) return;
    // pick a random device from the full devices list
    const idx = Math.floor(Math.random() * devices.length);
    const chosen = devices[idx];
    // 75% chance to turn it ON, 25% chance to toggle
    if (Math.random() < 0.75) chosen.on = true;
    else chosen.on = !chosen.on;
    if (typeof updateDeviceList === "function") updateDeviceList();
  }, intervalMs + Math.floor(Math.random() * 800));
}

function stopRandomDevices() {
  if (_randomDevicesIntervalId) {
    clearInterval(_randomDevicesIntervalId);
    _randomDevicesIntervalId = null;
  }
}

function startChallenge(durationSec = 120, thresholdW = 1200) {
  challengeActive = true;
  challengeDuration = durationSec;
  challengeRemaining = durationSec;
  challengeThresholdW = thresholdW;
  // start random device routine (affects all devices now)
  startRandomDevices();
  // ensure UI shows challenge mode immediately if helper exists
  try {
    if (typeof window.setMode === 'function') window.setMode('challenge');
    const timerEl = document.getElementById && document.getElementById('challengeTimer');
    const thresholdEl = document.getElementById && document.getElementById('challengeThreshold');
    const statusEl = document.getElementById && document.getElementById('challengeStatus');
    if (thresholdEl) thresholdEl.textContent = Math.round(challengeThresholdW);
    if (timerEl) timerEl.textContent = `${String(Math.floor(challengeRemaining/60)).padStart(2,'0')}:${String(Math.floor(challengeRemaining%60)).padStart(2,'0')}`;
    if (statusEl) statusEl.textContent = 'A decorrer';
  } catch (e) {
    /* ignore if DOM not ready */
  }
}

function stopChallenge() {
  challengeActive = false;
  challengeRemaining = 0;
  stopRandomDevices();
}

// imagens comodos
const salaImg = new Image();
let salaLoaded = false;
salaImg.onload = () => (salaLoaded = true);
salaImg.onerror = () => (salaLoaded = false);
salaImg.src = "img/sala.png";

const quartoImg = new Image();
let quartoLoaded = false;
quartoImg.onload = () => (quartoLoaded = true);
quartoImg.onerror = () => (quartoLoaded = false);
quartoImg.src = "img/quarto.png";

const cozinhaImg = new Image();
let cozinhaLoaded = false;
cozinhaImg.onload = () => (cozinhaLoaded = true);
cozinhaImg.onerror = () => (cozinhaLoaded = false);
cozinhaImg.src = "img/cozinha.jpg";

const despensaImg = new Image();
let despensaLoaded = false;
despensaImg.onload = () => (despensaLoaded = true);
despensaImg.onerror = () => (despensaLoaded = false);
despensaImg.src = "img/despensa.png";

// carregar imagens das lâmpadas
const lampOnImg = new Image();
const lampOffImg = new Image();
let lampOnLoaded = false;
let lampOffLoaded = false;
lampOnImg.onload = () => (lampOnLoaded = true);
lampOffImg.onload = () => (lampOffLoaded = true);
lampOnImg.src = "img/lamp_on.png";
lampOffImg.src = "img/lamp_off.png";

// carregar imagens da tv
const tvOnImg = new Image();
const tvOffImg = new Image();
let tvOnLoaded = false;
let tvOffLoaded = false;
tvOnImg.onload = () => (tvOnLoaded = true);
tvOffImg.onload = () => (tvOffLoaded = true);
tvOnImg.src = "img/tv_on.png";
tvOffImg.src = "img/tv_off.png";

// carregar imagens do frigorifico
const fridgeOnImg = new Image();
const fridgeOffImg = new Image();
let fridgeOnLoaded = false;
let fridgeOffLoaded = false;
fridgeOnImg.onload = () => (fridgeOnLoaded = true);
fridgeOffImg.onload = () => (fridgeOffLoaded = true);
fridgeOnImg.src = "img/fridge_on.png";
fridgeOffImg.src = "img/fridge_off.png";

// carregar imagens do aquecedor
const heaterOnImg = new Image();
const heaterOffImg = new Image();
let heaterOnLoaded = false;
let heaterOffLoaded = false;
heaterOnImg.onload = () => (heaterOnLoaded = true);
heaterOffImg.onload = () => (heaterOffLoaded = true);
heaterOnImg.src = "img/heater_on.png";
heaterOffImg.src = "img/heater_off.png";

// helper arrays and particles
const pulses = [];

// geometry helpers
function circleIntersectsRect(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= r * r;
}
function isCollidingAt(cx, cy) {
  for (const d of devices) {
    if (
      circleIntersectsRect(cx, cy, player.r, { x: d.x, y: d.y, w: d.w, h: d.h })
    )
      return true;
  }
  return false;
}
function isPointInRect(px, py, rect) {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  );
}

// basic toggle near player
function toggleNearbyDevices(radius = activationRadius) {
  const cx = player.x;
  const cy = player.y;
  let toggled = false;
  devices.forEach((d) => {
    const dx = cx - (d.x + d.w / 2);
    const dy = cy - (d.y + d.h / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= radius) {
      d.on = !d.on;
      toggled = true;
    }
  });
  if (toggled && typeof updateDeviceList === "function") updateDeviceList();
}

// auto-crop detection (copied)
function computeAutoCrop(img, options = {}) {
  const maxCrop = options.maxCrop || 0.25;
  const brightnessThreshold = options.threshold || 30;
  try {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    const t = document.createElement("canvas");
    t.width = iw;
    t.height = ih;
    const tc = t.getContext("2d");
    tc.drawImage(img, 0, 0, iw, ih);
    const data = tc.getImageData(0, 0, iw, ih).data;
    const sampleRow = (y) => {
      let sum = 0;
      for (let x = 0; x < iw; x++) {
        const i = (y * iw + x) * 4;
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      return sum / iw;
    };
    const sampleCol = (x) => {
      let sum = 0;
      for (let y = 0; y < ih; y++) {
        const i = (y * iw + x) * 4;
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      return sum / ih;
    };
    const maxTop = Math.floor(ih * maxCrop);
    let top = 0;
    for (let y = 0; y < maxTop; y++) {
      if (sampleRow(y) > brightnessThreshold) {
        top = y;
        break;
      }
    }
    const maxBottom = Math.floor(ih * maxCrop);
    let bottom = 0;
    for (let y = ih - 1; y >= ih - maxBottom; y--) {
      if (sampleRow(y) > brightnessThreshold) {
        bottom = ih - 1 - y;
        break;
      }
    }
    const maxLeft = Math.floor(iw * maxCrop);
    let left = 0;
    for (let x = 0; x < maxLeft; x++) {
      if (sampleCol(x) > brightnessThreshold) {
        left = x;
        break;
      }
    }
    const maxRight = Math.floor(iw * maxCrop);
    let right = 0;
    for (let x = iw - 1; x >= iw - maxRight; x--) {
      if (sampleCol(x) > brightnessThreshold) {
        right = iw - 1 - x;
        break;
      }
    }
    return {
      left: left / iw,
      top: top / ih,
      right: right / iw,
      bottom: bottom / ih,
    };
  } catch (e) {
    return null;
  }
}

function drawImageCropped(img, dx, dy, dWidth, dHeight, defaultCrop = 0.06) {
  if (!img || !img.width || !img.height) return;
  if (!img.__autoCrop) {
    img.__autoCrop = computeAutoCrop(img);
  }
  const crop = img.__autoCrop;
  if (!crop) {
    const cf = Math.max(0, Math.min(0.2, defaultCrop));
    const cropX = Math.round(img.width * cf);
    const cropY = Math.round(img.height * cf);
    const sWidth = Math.max(1, img.width - cropX * 2);
    const sHeight = Math.max(1, img.height - cropY * 2);
    try {
      const ctx = document.querySelector("#houseCanvas").getContext("2d");
      ctx.drawImage(
        img,
        cropX,
        cropY,
        sWidth,
        sHeight,
        dx,
        dy,
        dWidth,
        dHeight
      );
    } catch (e) {
      const ctx = document.querySelector("#houseCanvas").getContext("2d");
      ctx.drawImage(img, dx, dy, dWidth, dHeight);
    }
    return;
  }
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const sX = Math.round(iw * crop.left);
  const sY = Math.round(ih * crop.top);
  const sW = Math.max(1, iw - Math.round(iw * (crop.left + crop.right)));
  const sH = Math.max(1, ih - Math.round(ih * (crop.top + crop.bottom)));
  try {
    const ctx = document.querySelector("#houseCanvas").getContext("2d");
    ctx.drawImage(img, sX, sY, sW, sH, dx, dy, dWidth, dHeight);
  } catch (e) {
    const ctx = document.querySelector("#houseCanvas").getContext("2d");
    ctx.drawImage(img, dx, dy, dWidth, dHeight);
  }
}

// utility: turn off all lights (used by ML handpose gesture)
function turnOffAllLights() {
  let changed = false;
  for (const d of devices) {
    if (d.type === "light" && d.on) {
      d.on = false;
      changed = true;
    }
  }
  return changed;
}
