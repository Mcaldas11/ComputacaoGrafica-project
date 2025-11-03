// (ml5.js helpers) — main handpose/classifier helpers are defined below.

function setMlStatus(status) {
  const mlStatus = document.getElementById("mlStatus");
  if (mlStatus) mlStatus.textContent = status;
}

function startHandpose() {
  // Return a promise that resolves when the handpose model is ready
  return startWebcam()
    .then(() => {
      console.log('startHandpose: webcam ready, loading model...');
      setMlStatus("Carregando Handpose...");
      return new Promise((resolve, reject) => {
        try {
          if (!ml5 || typeof ml5.handpose !== 'function') {
            const msg = 'ml5.handpose não disponível (verifica a inclusão do script ml5)';
            console.error('startHandpose:', msg);
            setMlStatus(msg);
            reject(new Error(msg));
            return;
          }
          // prefer flipped option for webcam mirroring
          handposeModel = ml5.handpose(video, { flipHorizontal: true }, () => {
            console.log('startHandpose: model ready');
            setMlStatus("Handpose pronta");
            window.handposeActive = true;
            resolve();
          });
          // listen for predictions
          handposeModel.on("predict", gotHands);
        } catch (e) {
          console.warn("handpose error", e);
          setMlStatus("Erro Handpose");
          reject(e);
        }
      });
    })
    .catch((err) => {
      console.error('startHandpose: failed', err);
      // bubble up error to caller
      throw err;
    });
}

function stopHandpose() {
  try {
    // remove model listeners if possible
    if (handposeModel && typeof handposeModel.removeListener === 'function') {
      try { handposeModel.removeListener('predict', gotHands); } catch (e) {}
    }
  } catch (e) {}
  handposeModel = null;
  window.handposeActive = false;
  setMlStatus('Handpose parada');
  // stop webcam entirely (if classifier is not in use this will free camera)
  try {
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      webcamStarted = false;
      video.srcObject = null;
    }
  } catch (e) {}
}

// --- Lightweight webcam + classifier helpers (compat with UI expectations) ---
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
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    await video.play();
    webcamStarted = true;
    setMlStatus("Estado: webcam ativa");
    return;
  } catch (err) {
    console.error("Webcam error", err);
    setMlStatus("Erro a aceder webcam");
    throw err;
  }
}

function gotHands(predictions) {
  try {
    if (!predictions || predictions.length === 0) return;
    const p = predictions[0];
    // landmarks can be array-of-arrays [x,y,z] or array-of-objects {x,y,z}
    if (!p.landmarks) return;
    const ys = p.landmarks.map((l) => (Array.isArray(l) ? l[1] : l && typeof l.y !== 'undefined' ? l.y : 0));
    const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
    const h = (video && (video.videoHeight || video.height)) || 240;
    // debug
    if (window.DEBUG_HANDPOSE) console.log('gotHands: avgY=', avgY, 'h=', h, 'ratio=', (avgY / h));
    // threshold: hand raised toward top => avgY small; configurable ratio 0.45
    const ratio = typeof window.handGestureThresholdRatio !== 'undefined' ? window.handGestureThresholdRatio : 0.45;
    if (avgY < h * ratio && Date.now() - lastGesture > gestureCooldown) {
      // turn off ALL devices (not only lights)
      let changed = false;
      try {
        for (const d of devices) {
          if (d.on) { d.on = false; changed = true; }
        }
        if (changed && typeof updateDeviceList === "function") updateDeviceList();
      } catch (e) {
        console.error('gotHands: error toggling devices', e);
      }
      setMlStatus("Gesto: mao levantada — dispositivos desligados");
      lastGesture = Date.now();
      try {
        // pulse roughly near center of canvas (if available)
        const cx = (typeof canvas !== 'undefined' && canvas) ? canvas.width/2 : 450;
        const cy = (typeof canvas !== 'undefined' && canvas) ? canvas.height/2 : 300;
        pulses.push({ x: cx, y: cy, t: 0 });
      } catch (e) {
        try { pulses.push({ x: 450, y: 300, t: 0 }); } catch (e) {}
      }
    }
  } catch (err) {
    console.error('gotHands unexpected error', err);
  }
}

function startClassifier() {
  return startWebcam().then(() => {
    setMlStatus("Carregando classificador (MobileNet)...");
    classifier = ml5.imageClassifier("MobileNet", video, () => {
      setMlStatus("Classificador pronto");
    });
  }).catch(() => {});
}

function snapshotClassify() {
  if (!classifier || !video) {
    setMlStatus("Classificador não ativo");
    return;
  }
  setMlStatus("A classificar...");
  classifier.classify((err, results) => {
    if (err) {
      console.error(err);
      setMlStatus("Erro no classificador");
      return;
    }
    const top = results[0];
    const classifierResult = document.getElementById("classifierResult");
    if (classifierResult)
      classifierResult.innerHTML = `<strong>${top.label}</strong> — confiança ${(top.confidence * 100).toFixed(1)}%`;
    setMlStatus("Classificação concluída");
    const suggestion = guessConsumptionFromLabel(top.label);
    if (classifierResult)
      classifierResult.innerHTML += `<div>Sugestão consumo médio: <strong>${suggestion} W</strong></div>`;
  });
}

function guessConsumptionFromLabel(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("microwave") || l.includes("micro")) return 1000;
  if (l.includes("toaster") || l.includes("toast")) return 800;
  if (l.includes("refrigerator") || l.includes("fridge") || l.includes("frigor")) return 150;
  if (l.includes("tv") || l.includes("television")) return 120;
  if (l.includes("laptop") || l.includes("computer") || l.includes("notebook")) return 60;
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
    setMlStatus("Webcam parada");
  }
});

// Expose functions to window for UI to call
window.startWebcam = startWebcam;
window.startHandpose = startHandpose;
window.stopHandpose = stopHandpose;
window.startClassifier = startClassifier;
window.snapshotClassify = snapshotClassify;