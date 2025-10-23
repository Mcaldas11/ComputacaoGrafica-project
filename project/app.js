// app.js — interactive energy demo
const canvas = document.getElementById("houseCanvas");
const ctx = canvas.getContext("2d");

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

// Devices in the house (simple layout)
const devices = [
  {
    id: "light_liv",
    label: "Luz Sala",
    type: "light",
    power: 60,
    x: 140,
    y: 120,
    w: 36,
    h: 36,
    on: false,
  },
  {
    id: "light_bed",
    label: "Luz Quarto",
    type: "light",
    power: 60,
    x: 640,
    y: 120,
    w: 36,
    h: 36,
    on: false,
  },
  {
    id: "fridge",
    label: "Frigorífico",
    type: "appliance",
    power: 120,
    x: 140,
    y: 360,
    w: 60,
    h: 40,
    on: true,
  },
  {
    id: "tv",
    label: "TV",
    type: "appliance",
    power: 100,
    x: 420,
    y: 360,
    w: 60,
    h: 36,
    on: false,
  },
  {
    id: "heater",
    label: "Aquecedor",
    type: "heater",
    power: 1500,
    x: 640,
    y: 360,
    w: 64,
    h: 36,
    on: false,
  },
];

let lastTime = performance.now();
let energyWh = 0; // watt-hours accumulated

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

  // draw rooms (simple)
  ctx.fillStyle = "#082033";
  ctx.fillRect(40, 40, 360, 240); // left room
  ctx.fillRect(500, 40, 360, 240); // right room
  ctx.fillRect(40, 320, 820, 220); // bottom area

  // room labels
  ctx.fillStyle = "#9fb6c3";
  ctx.font = "14px Arial";
  ctx.fillText("Sala", 60, 60);
  ctx.fillText("Quarto", 520, 60);
  ctx.fillText("Cozinha / Despensa", 60, 340);

  // draw devices
  devices.forEach((d, idx) => {
    // body
    ctx.save();
    if (d.on) {
      // glowing when on
      const grd = ctx.createRadialGradient(
        d.x + d.w / 2,
        d.y + d.h / 2,
        4,
        d.x + d.w / 2,
        d.y + d.h / 2,
        60
      );
      grd.addColorStop(0, "rgba(255,220,80,0.95)");
      grd.addColorStop(0.4, "rgba(255,200,70,0.45)");
      grd.addColorStop(1, "rgba(255,200,70,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(d.x - 18, d.y - 18, d.w + 36, d.h + 36);
    }

    // device shape
    ctx.fillStyle = d.on ? "#ffeaa7" : "#c7d8e0";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = "#0b2430";
    ctx.strokeRect(d.x, d.y, d.w, d.h);
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
  });

  // update meter/ui
  powerWEl.textContent = Math.round(totalW);
  energyWhEl.textContent = energyWh.toFixed(2);
  const pct = Math.min(1, totalW / 2000);
  meterFill.style.width = `${pct * 100}%`;
  if (pct > 0.7) meterFill.style.boxShadow = "0 0 18px rgba(255,107,107,0.3)";
  else meterFill.style.boxShadow = "";

  requestAnimationFrame(draw);
}

// init draw loop
requestAnimationFrame(draw);

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
