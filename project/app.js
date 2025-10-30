// app.js — entry shim (logic moved to modules under js/)
// See: js/state.js, js/draw.js, js/ml.js, js/ui.js

// Compatibility shims so existing code or bookmarks don't break.
/* window.startSim = window.startSim || function(){ console.warn('startSim moved to js/draw.js'); };
window.pauseSim = window.pauseSim || function(){ console.warn('pauseSim moved to js/draw.js'); };
window.updateDeviceList = window.updateDeviceList || function(){ console.warn('updateDeviceList moved to js/ui.js'); };
window.toggleNearbyDevices = window.toggleNearbyDevices || function(){ console.warn('toggleNearbyDevices moved to js/ui.js'); };

// UI elements
const powerWEl = document.getElementById("powerW");
const energyWhEl = document.getElementById("energyWh");
const meterFill = document.getElementById("meterFill");
const deviceListEl = document.getElementById("deviceList");
const resetBtn = document.getElementById("resetBtn");
const startHandposeBtn = document.getElementById("startHandpose");
const startClassifierBtn = document.getElementById("startClassifier");
const snapshotBtn = document.getElementById("snapshotClassify");
const mlStatus = document.getElementById("mlStatus");
const classifierResult = document.getElementById("classifierResult");

// Webcam
const video = document.getElementById("webcam");
let webcamStarted = false;

let lastTime = performance.now();
let energyWh = 0; // watt-hours accumulated

// imagens de fundo
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

// helper: draw an image covering the target rectangle while cropping a small border
// compute an automatic crop rectangle by scanning image edges for dark borders
function computeAutoCrop(img, options = {}) {
  const maxCrop = options.maxCrop || 0.25; // fraction of side
  const brightnessThreshold = options.threshold || 30; // 0..255 per channel average
  try {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;

    // temp canvas
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
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        sum += (r + g + b) / 3;
      }
      return sum / iw;
    };

    const sampleCol = (x) => {
      let sum = 0;
      for (let y = 0; y < ih; y++) {
        const i = (y * iw + x) * 4;
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        sum += (r + g + b) / 3;
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

    // convert to fractional crop
    return {
      left: left / iw,
      top: top / ih,
      right: right / iw,
      bottom: bottom / ih,
    };
  } catch (e) {
    // could be CORS/tainted canvas or other error
    return null;
  }
}

// helper: draw an image covering the target rectangle while cropping small borders
function drawImageCropped(img, dx, dy, dWidth, dHeight, defaultCrop = 0.06) {
  if (!img || !img.width || !img.height) return;

  // cached auto-crop on the image object to avoid recomputing
  if (!img.__autoCrop) {
    const auto = computeAutoCrop(img);
    img.__autoCrop = auto; // may be null
  }

  let crop = img.__autoCrop;
  if (!crop) {
    // fallback to fixed uniform crop fraction
    const cf = Math.max(0, Math.min(0.2, defaultCrop));
    const cropX = Math.round(img.width * cf);
    const cropY = Math.round(img.height * cf);
    const sWidth = Math.max(1, img.width - cropX * 2);
    const sHeight = Math.max(1, img.height - cropY * 2);
    try {
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
      ctx.drawImage(img, dx, dy, dWidth, dHeight);
    }
    return;
  }

  // compute source rectangle from crop fractions
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const sX = Math.round(iw * crop.left);
  const sY = Math.round(ih * crop.top);
  const sW = Math.max(1, iw - Math.round(iw * (crop.left + crop.right)));
  const sH = Math.max(1, ih - Math.round(ih * (crop.top + crop.bottom)));
  try {
    ctx.drawImage(img, sX, sY, sW, sH, dx, dy, dWidth, dHeight);
  } catch (e) {
    // fallback
    ctx.drawImage(img, dx, dy, dWidth, dHeight);
  }
}

// --- player (boneco) ---
const player = {
  x: 220, // initial center x
  y: 160, // initial center y
  r: 14,
  speed: 160, // pixels per second
  stepPhase: 0,
};

// allowed movement areas (match the drawn rooms in draw())
const allowedAreas = [
  { x: 40, y: 40, w: 360, h: 240 }, // left room
  { x: 500, y: 40, w: 360, h: 240 }, // right room
  { x: 40, y: 320, w: 820, h: 220 }, // bottom area
];

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

// activation radius for toggling lights / showing indicator
const activationRadius = 80;

// collision helpers: circle vs rect
function circleIntersectsRect(cx, cy, r, rect) {
  // find closest point to circle within the rectangle
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

function isCenterInAllowedAreas(cx, cy) {
  return allowedAreas.some((r) => isPointInRect(cx, cy, r));
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
  if (toggled) updateDeviceList();
}

// particles for visual energy flow (simple reuse)
const pulses = [];

function draw() {
  const now = performance.now();
  const dt = (now - lastTime) / 1000; // seconds
  lastTime = now;

  // update energy
  const totalW = devices.reduce((s, d) => s + (d.on ? d.power : 0), 0);
  energyWh += totalW * (dt / 3600); // W * hours

  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // update player position based on keys
  let vx = 0,
    vy = 0;
  if (keys.ArrowUp) vy -= 1;
  if (keys.ArrowDown) vy += 1;
  if (keys.ArrowLeft) vx -= 1;
  if (keys.ArrowRight) vx += 1;
  // normalize
  if (vx !== 0 || vy !== 0) {
    const len = Math.sqrt(vx * vx + vy * vy);
    vx = (vx / len) * player.speed;
    vy = (vy / len) * player.speed;
  }
  const nextX = player.x + vx * dt;
  const nextY = player.y + vy * dt;
  // allow movement across the entire canvas but prevent overlapping devices (collision)
  // We'll attempt full move; if causes collision, try axis-aligned moves to allow sliding.
  const clampedNextX = Math.max(
    player.r + 2,
    Math.min(canvas.width - player.r - 2, nextX)
  );
  const clampedNextY = Math.max(
    player.r + 2,
    Math.min(canvas.height - player.r - 2, nextY)
  );

  const willCollideFull = isCollidingAt(clampedNextX, clampedNextY);
  if (!willCollideFull) {
    player.x = clampedNextX;
    player.y = clampedNextY;
  } else {
    // try X only
    const willCollideX = isCollidingAt(clampedNextX, player.y);
    const willCollideY = isCollidingAt(player.x, clampedNextY);
    if (!willCollideX) player.x = clampedNextX;
    if (!willCollideY) player.y = clampedNextY;
    // otherwise remain in place (blocked)
  }

  // update stepping animation phase
  const moving = vx !== 0 || vy !== 0;
  if (moving) player.stepPhase += dt * 12;
  else player.stepPhase = 0;

  // draw rooms (simple)
  // left room (Sala) — draw image if available, otherwise fallback fill
  if (salaLoaded) {
    // draw covering the room rectangle, cropping a small border to remove black edges
    drawImageCropped(salaImg, 40, 40, 360, 240, 0.06);
    // subtle dark overlay so devices/labels remain legible
    ctx.fillStyle = "rgba(6,12,18,0.28)";
    ctx.fillRect(40, 40, 360, 240);
  } else {
    ctx.fillStyle = "#082033";
    ctx.fillRect(40, 40, 360, 240);
  }

  // right room (Quarto)
  if (quartoLoaded) {
    drawImageCropped(quartoImg, 500, 40, 360, 240, 0.06);
    ctx.fillStyle = "rgba(6,12,18,0.28)";
    ctx.fillRect(500, 40, 360, 240);
  } else {
    ctx.fillStyle = "#082033";
    ctx.fillRect(500, 40, 360, 240);
  }

  // bottom shared area
  ctx.fillStyle = "#082033";
  ctx.fillRect(40, 320, 820, 220); // bottom area

  // room labels
  ctx.fillStyle = "#9fb6c3";
  ctx.font = "14px Arial";
  ctx.fillText("Sala", 60, 60);
  ctx.fillText("Quarto", 520, 60);
  ctx.fillText("Cozinha / Despensa", 60, 340);

  // desenhar os dispositivos
  devices.forEach((d, idx) => {
    ctx.save();
    if (d.on) {
      // glowing when on
      const grd = ctx.createRadialGradient(
        d.x + d.w / 2,
        d.y + d.h / 2,
        4,
        d.x + d.w / 2,
        d.y + d.h / 2,
        40
      );
      grd.addColorStop(0, "rgba(255,220,80,0.95)");
      grd.addColorStop(0.4, "rgba(255,200,70,0.45)");
      grd.addColorStop(1, "rgba(255,200,70,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(d.x - 18, d.y - 18, d.w + 36, d.h + 36);
    }

    // carregar as imagens na aplicação
    if (d.type === "light" && lampOnLoaded && lampOffLoaded) {
      // carrega imagem das lampadas
      const lampImg = d.on ? lampOnImg : lampOffImg;
      ctx.drawImage(lampImg, d.x, d.y, d.w, d.h);
    } else if (d.type === "tv" && tvOnLoaded && tvOffLoaded) {
      // carrega imagem da TV
      const tvImg = d.on ? tvOnImg : tvOffImg;
      ctx.drawImage(tvImg, d.x, d.y, d.w, d.h);
    } else if (d.type === "fridge" && fridgeOnLoaded && fridgeOffLoaded) {
      // carrega imagem do frigorífico
      const fridgeImg = d.on ? fridgeOnImg : fridgeOffImg;
      ctx.drawImage(fridgeImg, d.x, d.y, d.w, d.h);
    } else {
      // Fallback para outros dispositivos ou se as imagens não carregaram
      ctx.fillStyle = d.on ? "#ffeaa7" : "#c7d8e0";
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = "#0b2430";
      ctx.strokeRect(d.x, d.y, d.w, d.h);
    }
    ctx.fillStyle = "#07202a";
    ctx.font = "12px Arial";
    ctx.fillText(d.label, d.x, d.y + d.h + 16);
    ctx.restore();

    // pulses (simple animated arcs)
    if (d.on) {
      const t = now / 300 + idx * 1.2;
      ctx.strokeStyle = "rgba(120,194,168,0.55)";
      ctx.beginPath();
      ctx.arc(
        d.x + d.w / 2,
        d.y + d.h / 2,
        26 + Math.sin(t) * 6,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // indicator halo when player is near any device (light or appliance)
    {
      const cx = d.x + d.w / 2;
      const cy = d.y + d.h / 2;
      const dx = player.x - cx;
      const dy = player.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= activationRadius) {
        const alpha = 0.35 * (1 - dist / activationRadius) + 0.12;
        ctx.save();
        const grd = ctx.createRadialGradient(
          cx,
          cy,
          4,
          cx,
          cy,
          activationRadius
        );
        // color differs slightly for lights vs appliances
        if (d.type === "light") {
          grd.addColorStop(0, `rgba(255,220,80,${alpha})`);
          grd.addColorStop(1, `rgba(255,220,80,0)`);
        } else {
          grd.addColorStop(0, `rgba(120,194,168,${alpha})`);
          grd.addColorStop(1, `rgba(120,194,168,0)`);
        }
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, activationRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  });

  // draw player on top with simple walking bob/animation
  ctx.save();
  const bob = player.stepPhase ? Math.sin(player.stepPhase) * 2.4 : 0;
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(
    player.x,
    player.y + player.r + 6,
    player.r + 6,
    6,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // body
  ctx.beginPath();
  ctx.fillStyle = "#ffdd88";
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 2;
  ctx.arc(player.x, player.y + bob, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // simple eyes (shift slightly when moving)
  const eyeOffset = player.stepPhase ? Math.sin(player.stepPhase * 2) * 0.6 : 0;
  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.arc(player.x - 5, player.y - 2 + bob + eyeOffset, 2, 0, Math.PI * 2);
  ctx.arc(player.x + 5, player.y - 2 + bob - eyeOffset, 2, 0, Math.PI * 2);
  ctx.fill();

  // if near any device, draw indicator ring around player
  let nearAny = false;
  for (const d of devices) {
    const dx = player.x - (d.x + d.w / 2);
    const dy = player.y - (d.y + d.h / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= activationRadius) {
      nearAny = true;
      break;
    }
  }
  if (nearAny) {
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "rgba(120,240,180,0.95)";
    ctx.arc(player.x, player.y + bob, player.r + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // update meter/ui
  powerWEl.textContent = Math.round(totalW);
  energyWhEl.textContent = energyWh.toFixed(2);
  const pct = Math.min(1, totalW / 2000);
  meterFill.style.width = `${pct * 100}%`;
  if (pct > 0.7) meterFill.style.boxShadow = "0 0 18px rgba(255,107,107,0.3)";
  else meterFill.style.boxShadow = "";
}

// simulation control
let running = false;
let _animId = null;
const topmenuEl = document.querySelector(".topmenu");

function loop() {
  if (!running) return;
  draw();
  _animId = requestAnimationFrame(loop);
}

function startSim() {
  if (running) return;
  running = true;
  lastTime = performance.now();
  // hide the top menu bar for a cleaner game-like view
  if (topmenuEl) topmenuEl.style.display = "none";
  loop();
}

function pauseSim() {
  running = false;
  if (_animId) cancelAnimationFrame(_animId);
  _animId = null;
  // show top menu when paused so user can access controls
  if (topmenuEl) topmenuEl.style.display = "flex";
}

// Menu buttons (Start/Pause/Reset/Help)
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnResetMenu = document.getElementById("btnReset");
const btnHelp = document.getElementById("btnHelp");
const helpModal = document.getElementById("helpModal");
const helpClose = document.getElementById("helpClose");

if (btnStart) btnStart.addEventListener("click", () => startSim());
if (btnPause) btnPause.addEventListener("click", () => pauseSim());
if (btnResetMenu)
  btnResetMenu.addEventListener("click", () => {
    devices.forEach((d) => (d.on = false));
    energyWh = 0;
    updateDeviceList();
  });
if (btnHelp)
  btnHelp.addEventListener("click", () => {
    if (helpModal) {
      helpModal.classList.add("visible");
      helpModal.setAttribute("aria-hidden", "false");
    }
  });
if (helpClose)
  helpClose.addEventListener("click", () => {
    if (helpModal) {
      helpModal.classList.remove("visible");
      helpModal.setAttribute("aria-hidden", "true");
    }
  });

// Splash / main menu (game-like) wiring
const splash = document.getElementById("splash");
const splashStart = document.getElementById("splashStart");
const splashOptions = document.getElementById("splashOptions");

function hideSplash(cb) {
  if (!splash) {
    if (cb) cb();
    return;
  }
  const panel = splash.querySelector(".splash-panel");
  if (!panel) {
    splash.classList.add("hidden");
    if (cb) cb();
    return;
  }

  // ensure visible so transition runs
  splash.classList.remove("hidden");

  const onEnd = (ev) => {
    // ensure we react to transitions on the panel only
    if (ev.target !== panel) return;
    panel.removeEventListener("transitionend", onEnd);
    splash.classList.remove("splash--hiding");
    splash.classList.add("hidden");
    if (typeof cb === "function") cb();
  };

  panel.addEventListener("transitionend", onEnd);
  // trigger hiding animation
  splash.classList.add("splash--hiding");
}

if (splashStart)
  splashStart.addEventListener("click", () => {
    // hide the top menu immediately for a cleaner view (covers case where animation callback might not fire)
    if (topmenuEl) topmenuEl.style.display = "none";
    // hide with animation, then start simulation
    hideSplash(startSim);
  });

if (splashOptions)
  splashOptions.addEventListener("click", () => {
    // open options/help for now
    if (helpModal) {
      helpModal.classList.add("visible");
      helpModal.setAttribute("aria-hidden", "false");
    }
  });

// allow pressing Enter or Space to start when splash is visible
document.addEventListener("keydown", (ev) => {
  if (!splash || splash.classList.contains("hidden")) return;
  if (ev.key === "Enter" || ev.key === " ") {
    ev.preventDefault();
    hideSplash();
    startSim();
  }
});

// canvas interaction
canvas.addEventListener("click", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  for (const d of devices) {
    if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) {
      d.on = !d.on;
      updateDeviceList();
      return;
    }
  }
});

// keyboard controls: arrow keys move the player; 'e' toggles nearby lights
document.addEventListener("keydown", (ev) => {
  if (ev.key === "e" || ev.key === "E") {
    toggleNearbyDevices();
    ev.preventDefault();
    return;
  }
  if (ev.key in keys) {
    keys[ev.key] = true;
    ev.preventDefault();
  }
});

document.addEventListener("keyup", (ev) => {
  if (ev.key in keys) {
    keys[ev.key] = false;
    ev.preventDefault();
  }
});

function updateDeviceList() {
  deviceListEl.innerHTML = "";
  devices.forEach((d) => {
    const li = document.createElement("li");
    li.textContent = `${d.label} — ${d.power}W`;
    const state = document.createElement("strong");
    state.textContent = d.on ? "ON" : "OFF";
    state.style.color = d.on ? "#ffd86b" : "#9fb6c3";
    li.appendChild(state);
    deviceListEl.appendChild(li);
  });
}

updateDeviceList();

// reset
resetBtn.addEventListener("click", () => {
  devices.forEach((d) => (d.on = false));
  energyWh = 0;
  updateDeviceList();
});

// --- webcam + ml5 integration ---
let handposeModel = null;
let classifier = null;
let lastGesture = 0;
const gestureCooldown = 2000; // ms

async function startWebcam() {
  if (webcamStarted) return Promise.resolve();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    webcamStarted = true;
    mlStatus.textContent = "Estado: webcam ativa";
  } catch (err) {
    console.error("Webcam error", err);
    mlStatus.textContent = "Erro a aceder webcam";
    throw err;
  }
}

function startHandpose() {
  startWebcam()
    .then(() => {
      mlStatus.textContent = "Carregando Handpose...";
      // load model
      handposeModel = ml5.handpose(video, () => {
        mlStatus.textContent = "Handpose pronta";
        // listen to predictions
        handposeModel.on("predict", gotHands);
      });
    })
    .catch(() => {});
}

function gotHands(predictions) {
  if (!predictions || predictions.length === 0) return;
  const p = predictions[0];
  if (!p.landmarks) return;
  const ys = p.landmarks.map((l) => l[1]);
  const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
  // if hand raised (average Y fairly small) -> command to switch lights off
  const h = video.videoHeight || video.height || 240;
  if (avgY < h * 0.45 && Date.now() - lastGesture > gestureCooldown) {
    // turn off lights
    devices.forEach((d) => {
      if (d.type === "light") d.on = false;
    });
    updateDeviceList();
    mlStatus.textContent = "Gesto: mao levantada — luzes desligadas";
    lastGesture = Date.now();
  }
}

function startClassifier() {
  startWebcam()
    .then(() => {
      mlStatus.textContent = "Carregando classificador (MobileNet)...";
      classifier = ml5.imageClassifier("MobileNet", video, () => {
        mlStatus.textContent = "Classificador pronto";
      });
    })
    .catch(() => {});
}

function snapshotClassify() {
  if (!classifier) {
    mlStatus.textContent = "Classificador não ativo";
    return;
  }
  mlStatus.textContent = "A classificar...";
  classifier.classify((err, results) => {
    if (err) {
      console.error(err);
      mlStatus.textContent = "Erro no classificador";
      return;
    }
    const top = results[0];
    classifierResult.innerHTML = `<strong>${top.label}</strong> — confiança ${(
      top.confidence * 100
    ).toFixed(1)}%`;
    mlStatus.textContent = "Classificação concluída";
    // suggest average consumption
    const suggestion = guessConsumptionFromLabel(top.label);
    classifierResult.innerHTML += `<div>Sugestão consumo médio: <strong>${suggestion} W</strong></div>`;
  });
}

function guessConsumptionFromLabel(label) {
  const l = label.toLowerCase();
  if (l.includes("microwave") || l.includes("micro")) return 1000;
  if (l.includes("toaster") || l.includes("toast")) return 800;
  if (
    l.includes("refrigerator") ||
    l.includes("fridge") ||
    l.includes("frigor")
  )
    return 150;
  if (l.includes("tv") || l.includes("television")) return 120;
  if (l.includes("laptop") || l.includes("computer") || l.includes("notebook"))
    return 60;
  if (l.includes("fan")) return 60;
  if (l.includes("oven")) return 2000;
  return 100; // default suggestion
}

startHandposeBtn.addEventListener("click", startHandpose);
startClassifierBtn.addEventListener("click", startClassifier);
snapshotBtn.addEventListener("click", snapshotClassify);

// small safety: stop webcam when page hidden
document.addEventListener("visibilitychange", () => {
  if (document.hidden && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach((t) => t.stop());
    webcamStarted = false;
    mlStatus.textContent = "Webcam parada";
  }
});
 */
