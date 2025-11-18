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

// Posição inicial do jogador (à frente da porta/corredor)
const player = { x: 442, y: 520, r: 14, speed: 170, stepPhase: 0 };

// Helper pequeno para criar imagens e respetivas flags de carregamento
function _loadImgVar(key, src) {
  const img = new Image();
  window[`${key}Img`] = img;
  window[`${key}Loaded`] = false;
  img.onload = () => (window[`${key}Loaded`] = true);
  img.onerror = () => (window[`${key}Loaded`] = false);
  img.src = src;
  return img;
}

const casaImg = _loadImgVar("casa", "assets/img/casa.png");

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

// Liga/desliga aleatoriamente dispositivos a intervalos (usado no Desafio) - loop objetos random
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

// Para o ciclo aleatório de dispositivos
function stopRandomDevices() {
  if (_randomDevicesIntervalId) {
    clearInterval(_randomDevicesIntervalId);
    _randomDevicesIntervalId = null;
  }
}

// Inicia o modo Desafio (temporizador e limite de potência)
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

// Chamado quando o jogador confirma o modal do desafio
function beginChallenge() {
  if (!challengeActive || challengeStarted) return;
  challengeStarted = true;
  startRandomDevices();
  try {
    const statusEl = document.getElementById("challengeStatus");
    if (statusEl) statusEl.textContent = "A decorrer";
  } catch (e) {}
}

// Termina o Desafio e repõe estado base
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

// Limpa indicadores do Desafio sem iniciar/terminar animações
function resetChallenge() {
  challengeActive = false;
  challengeStarted = false;
  challengeRemaining = 0;
  stopRandomDevices();
}

// load all image assets via the small helper — keeps variable names compatible with draw/ui
const salaImg = _loadImgVar("sala", "assets/img/sala.png");
const quartoImg = _loadImgVar("quarto", "assets/img/quarto.png");
const cozinhaImg = _loadImgVar("cozinha", "assets/img/cozinha.jpg");
const despensaImg = _loadImgVar("despensa", "assets/img/despensa.png");

const lampOnImg = _loadImgVar("lampOn", "assets/img/lamp_on.png");
const lampOffImg = _loadImgVar("lampOff", "assets/img/lamp_off.png");

const lamp2OnImg = _loadImgVar("lamp2On", "assets/img/lamp2_on.png");
const lamp2OffImg = _loadImgVar("lamp2Off", "assets/img/lamp2_off.png");

const tvOnImg = _loadImgVar("tvOn", "assets/img/tv_on.png");
const tvOffImg = _loadImgVar("tvOff", "assets/img/tv_off.png");

const fridgeOnImg = _loadImgVar("fridgeOn", "assets/img/fridge_on.png");
const fridgeOffImg = _loadImgVar("fridgeOff", "assets/img/fridge_off.png");

const microwaveOnImg = _loadImgVar(
  "microwaveOn",
  "assets/img/micro-ondas_on.png"
);
const microwaveOffImg = _loadImgVar(
  "microwaveOff",
  "assets/img/micro-ondas_off.png"
);

const heaterOnImg = _loadImgVar("heaterOn", "assets/img/heater_on.png");
const heaterOffImg = _loadImgVar("heaterOff", "assets/img/heater_off.png");

const pulses = [];

// Colisão: círculo (jogador) vs retângulo (dispositivo)
function circleIntersectsRect(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= r * r;
}
// Verifica colisão do jogador
function isCollidingAt(cx, cy) {
  for (const d of devices) {
    if (
      circleIntersectsRect(cx, cy, player.r, { x: d.x, y: d.y, w: d.w, h: d.h })
    )
      return true;
  }
  return false;
}
// Ponto dentro de retângulo
function isPointInRect(px, py, rect) {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  );
}

// Alterna dispositivos próximos do jogador
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

// Cálculo automático de recorte de margens escuras numa imagem
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

// Desenha imagem com recorte automático
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
      const ctx =
        typeof window !== "undefined" && window.ctx
          ? window.ctx
          : document.querySelector("#houseCanvas").getContext("2d");
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
    const ctx =
      typeof window !== "undefined" && window.ctx
        ? window.ctx
        : document.querySelector("#houseCanvas").getContext("2d");
    ctx.drawImage(img, sX, sY, sW, sH, dx, dy, dWidth, dHeight);
  } catch (e) {
    const ctx = document.querySelector("#houseCanvas").getContext("2d");
    ctx.drawImage(img, dx, dy, dWidth, dHeight);
  }
}

// Desliga todas as luzes e indica se houve alterações
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
