// state.js — estado partilhado e funções auxiliares

const devices = [
  {
    id: "light_liv",
    label: "Luz Sala",
    type: "light",
    power: 30,
    x: 175,
    y: 445,
    w: 48,
    h: 48,
    on: false,
  },
  {
    id: "light_bed",
    label: "Luz Quarto",
    type: "light",
    power: 30,
    x: 650,
    y: 100,
    w: 48,
    h: 48,
    on: false,
  },
  {
    id: "light_kitchen",
    label: "Luz Cozinha",
    type: "light2",
    power: 30,
    x: 503,
    y: 80,
    w: 58,
    h: 58,
    on: false,
  },
  {
    id: "fridge",
    label: "Frigorífico",
    type: "fridge",
    power: 110,
    x: 175,
    y: 105,
    w: 105,
    h: 125,
    on: false,
  },
  {
    id: "microwave",
    label: "Micro-ondas",
    type: "microwave",
    power: 1000,
    x: 367,
    y: 135,
    w: 60,
    h: 60,
    on: false,
  },
  {
    id: "tv",
    label: "TV",
    type: "tv",
    power: 400,
    x: 241,
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
    x: 730,
    y: 150,
    w: 68,
    h: 85,
    on: false,
  },
];

// Posição inicial do jogador ajustada para ficar à frente da porta/corredor,
const player = { x: 442, y: 520, r: 14, speed: 160, stepPhase: 0 };

const casaImg = new Image();
let casaLoaded = false;
casaImg.onload = () => (casaLoaded = true);
casaImg.src = "img/casa.png";

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
  w: false,
  a: false,
  s: false,
  d: false,
};
const activationRadius = 80;

let lastTime = performance.now();
let energyWh = 0;
let challengeActive = false;
let challengeDuration = 120;
let challengeRemaining = 0;
let challengeThresholdW = 2000;
let challengeStarted = false;
let challengeEnergyStart = 0;
let _randomDevicesIntervalId = null;

function startRandomDevices(intervalMs = 1200) {
  stopRandomDevices();
  _randomDevicesIntervalId = setInterval(() => {
    if (!devices || devices.length === 0) return;
    const idx = Math.floor(Math.random() * devices.length);
    const chosen = devices[idx];
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

function startChallenge(durationSec = 120, thresholdW = 2000) {
  challengeActive = true;
  challengeStarted = false;
  challengeDuration = durationSec;
  challengeRemaining = durationSec;
  challengeThresholdW = thresholdW;
  try {
    challengeEnergyStart = typeof energyWh !== "undefined" ? energyWh : 0;
  } catch (e) {
    challengeEnergyStart = 0;
  }
  try {
    if (typeof window.setMode === "function") window.setMode("challenge");
    if (typeof window !== "undefined") window.clickModalAcknowledged = false;
    const timerEl = document.getElementById("challengeTimer");
    const thresholdEl = document.getElementById("challengeThreshold");
    const statusEl = document.getElementById("challengeStatus");
    if (thresholdEl) thresholdEl.textContent = Math.round(challengeThresholdW);
    if (timerEl)
      timerEl.textContent = `${String(
        Math.floor(challengeRemaining / 60)
      ).padStart(2, "0")}:${String(
        Math.floor(challengeRemaining % 60)
      ).padStart(2, "0")}`;
    if (statusEl) statusEl.textContent = "A iniciar — confirma para começar";
    const clickModal = document.getElementById("clickModal");
    if (clickModal) {
      clickModal.classList.add("visible");
      clickModal.setAttribute("aria-hidden", "false");
    }
  } catch (e) {}
}

// Chamado quando o jogador confirma o modal do desafio (carrega em 'Entendi')
function beginChallenge() {
  if (!challengeActive || challengeStarted) return;
  challengeStarted = true;
  startRandomDevices();
  try {
    const statusEl = document.getElementById("challengeStatus");
    if (statusEl) statusEl.textContent = "A decorrer";
  } catch (e) {}
}

function stopChallenge() {
  challengeActive = false;
  challengeRemaining = 0;
  stopRandomDevices();
  challengeStarted = false;
  try {
    const clickModal = document.getElementById("clickModal");
    if (clickModal) {
      clickModal.classList.remove("visible");
      clickModal.setAttribute("aria-hidden", "true");
    }
    if (typeof window.setMode === "function") window.setMode("sandbox");
    if (typeof window !== "undefined") window.clickModalAcknowledged = false;
  } catch (e) {}
}

function resetChallenge() {
  challengeActive = false;
  challengeStarted = false;
  challengeRemaining = 0;
  stopRandomDevices();
}

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

const lampOnImg = new Image();
const lampOffImg = new Image();
let lampOnLoaded = false;
let lampOffLoaded = false;
lampOnImg.onload = () => (lampOnLoaded = true);
lampOffImg.onload = () => (lampOffLoaded = true);
lampOnImg.src = "img/lamp_on.png";
lampOffImg.src = "img/lamp_off.png";

const lamp2OnImg = new Image();
const lamp2OffImg = new Image();
let lamp2OnLoaded = false;
let lamp2OffLoaded = false;
lamp2OnImg.onload = () => (lamp2OnLoaded = true);
lamp2OffImg.onload = () => (lamp2OffLoaded = true);
lamp2OnImg.src = "img/lamp2_on.png";
lamp2OffImg.src = "img/lamp2_off.png";

const tvOnImg = new Image();
const tvOffImg = new Image();
let tvOnLoaded = false;
let tvOffLoaded = false;
tvOnImg.onload = () => (tvOnLoaded = true);
tvOffImg.onload = () => (tvOffLoaded = true);
tvOnImg.src = "img/tv_on.png";
tvOffImg.src = "img/tv_off.png";

const fridgeOnImg = new Image();
const fridgeOffImg = new Image();
let fridgeOnLoaded = false;
let fridgeOffLoaded = false;
fridgeOnImg.onload = () => (fridgeOnLoaded = true);
fridgeOffImg.onload = () => (fridgeOffLoaded = true);
fridgeOnImg.src = "img/fridge_on.png";
fridgeOffImg.src = "img/fridge_off.png";

const microwaveOnImg = new Image();
const microwaveOffImg = new Image();
let microwaveOnLoaded = false;
let microwaveOffLoaded = false;
microwaveOnImg.onload = () => (microwaveOnLoaded = true);
microwaveOffImg.onload = () => (microwaveOffLoaded = true);
microwaveOnImg.src = "img/micro-ondas_on.png";
microwaveOffImg.src = "img/micro-ondas_off.png";

const heaterOnImg = new Image();
const heaterOffImg = new Image();
let heaterOnLoaded = false;
let heaterOffLoaded = false;
heaterOnImg.onload = () => (heaterOnLoaded = true);
heaterOffImg.onload = () => (heaterOffLoaded = true);
heaterOnImg.src = "img/heater_on.png";
heaterOffImg.src = "img/heater_off.png";

const pulses = [];

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
