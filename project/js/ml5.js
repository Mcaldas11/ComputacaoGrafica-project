// ml.js — webcam + ml5 functions (migrated from app.js)
let webcamStarted = false;
let video = null;
let handposeModel = null;
let classifier = null;
let lastGesture = 0;
const gestureCooldown = 2000;

async function startWebcam() {
  if (webcamStarted) return Promise.resolve();
  video = document.getElementById("webcam");
  if (!video) return Promise.reject(new Error("video element missing"));
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    webcamStarted = true;
    const mlStatus = document.getElementById("mlStatus");
    if (mlStatus) mlStatus.textContent = "Estado: webcam ativa";
  } catch (err) {
    console.error("Webcam error", err);
    const mlStatus = document.getElementById("mlStatus");
    if (mlStatus) mlStatus.textContent = "Erro a aceder webcam";
    throw err;
  }
}

function startHandpose() {
  startWebcam()
    .then(() => {
      const mlStatus = document.getElementById("mlStatus");
      if (mlStatus) mlStatus.textContent = "Carregando Handpose...";
      try {
        handposeModel = ml5.handpose(video, () => {
          if (mlStatus) mlStatus.textContent = "Handpose pronta";
        });
        handposeModel.on("predict", gotHands);
      } catch (e) {
        console.warn("handpose error", e);
        if (mlStatus) mlStatus.textContent = "Erro Handpose";
      }
    })
    .catch(() => {});
}

function gotHands(predictions) {
  if (!predictions || predictions.length === 0) return;
  const p = predictions[0];
  if (!p.landmarks) return;
  const ys = p.landmarks.map((l) => l[1]);
  const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const h = video.videoHeight || video.height || 240;
  if (avgY < h * 0.45 && Date.now() - lastGesture > gestureCooldown) {
    // turn off lights
    let changed = false;
    for (const d of devices) {
      if (d.type === "light" && d.on) {
        d.on = false;
        changed = true;
      }
    }
    if (changed && typeof updateDeviceList === "function") updateDeviceList();
    const mlStatus = document.getElementById("mlStatus");
    if (mlStatus)
      mlStatus.textContent = "Gesto: mao levantada — luzes desligadas";
    lastGesture = Date.now();
    pulses.push({ x: 450, y: 300, t: 0 });
  }
}

function startClassifier() {
  startWebcam()
    .then(() => {
      const mlStatus = document.getElementById("mlStatus");
      if (mlStatus)
        mlStatus.textContent = "Carregando classificador (MobileNet)...";
      classifier = ml5.imageClassifier("MobileNet", video, () => {
        if (mlStatus) mlStatus.textContent = "Classificador pronto";
      });
    })
    .catch(() => {});
}

function snapshotClassify() {
  if (!classifier || !video) {
    const mlStatus = document.getElementById("mlStatus");
    if (mlStatus) mlStatus.textContent = "Classificador não ativo";
    return;
  }
  const mlStatus = document.getElementById("mlStatus");
  if (mlStatus) mlStatus.textContent = "A classificar...";
  classifier.classify((err, results) => {
    if (err) {
      console.error(err);
      if (mlStatus) mlStatus.textContent = "Erro no classificador";
      return;
    }
    const top = results[0];
    const classifierResult = document.getElementById("classifierResult");
    if (classifierResult)
      classifierResult.innerHTML = `<strong>${
        top.label
      }</strong> — confiança ${(top.confidence * 100).toFixed(1)}%`;
    if (mlStatus) mlStatus.textContent = "Classificação concluída";
    const suggestion = guessConsumptionFromLabel(top.label);
    if (classifierResult)
      classifierResult.innerHTML += `<div>Sugestão consumo médio: <strong>${suggestion} W</strong></div>`;
  });
}

function guessConsumptionFromLabel(label) {
  const l = (label || "").toLowerCase();
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
  return 100;
}

// safety: stop webcam when page hidden
document.addEventListener("visibilitychange", () => {
  if (document.hidden && video && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach((t) => t.stop());
    webcamStarted = false;
    const mlStatus = document.getElementById("mlStatus");
    if (mlStatus) mlStatus.textContent = "Webcam parada";
  }
});

window.startWebcam = startWebcam;
window.startHandpose = startHandpose;
window.startClassifier = startClassifier;
window.snapshotClassify = snapshotClassify;
