// ml5.js — Handpose + Classificador

let webcamStarted = false,
  video = null,
  handposeModel = null,
  classifier = null,
  lastGesture = 0,
  mirrorCanvas = null,
  mirrorCtx = null;
const gestureCooldown = 2000;

function setMlStatus(msg) {
  const el = document.getElementById("mlStatus");
  if (el) el.textContent = msg;
}

// Webcam
async function startWebcam() {
  if (webcamStarted) return;
  video = document.getElementById("webcam");
  if (!video) throw new Error("Elemento <video> não encontrado");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    video.style.transform = "scaleX(-1)";
    webcamStarted = true;
    setMlStatus("Câmara ativa");
  } catch (e) {
    console.error("startWebcam:", e);
    setMlStatus("Erro ao aceder à câmara");
    throw e;
  }
}

// Handpose
function startHandpose() {
  return startWebcam().then(
    () =>
      new Promise((resolve, reject) => {
        if (!ml5?.handpose) return reject("ml5.handpose não disponível");
        setMlStatus("Carregando Handpose...");
        try {
          handposeModel = ml5.handpose(video, { flipHorizontal: true }, () => {
            setMlStatus("Handpose pronta");
            window.handposeActive = true;
            resolve();
          });
          handposeModel.on("predict", gotHands);
        } catch (e) {
          console.error("Erro Handpose:", e);
          setMlStatus("Erro Handpose");
          reject(e);
        }
      })
  );
}

function stopHandpose() {
  try {
    handposeModel?.removeListener?.("predict", gotHands);
    handposeModel = null;
    window.handposeActive = false;
  } catch {}
  stopCamera();
  setMlStatus("Handpose parada");
}

function gotHands(preds) {
  try {
    if (!preds?.length) return;
    const p = preds[0];
    const ys = p.landmarks.map((l) => (Array.isArray(l) ? l[1] : l?.y ?? 0));
    const avgY = ys.reduce((a, b) => a + b) / ys.length;
    const h = video?.videoHeight || 240;
    const ratio = window.handGestureThresholdRatio ?? 0.45;

    if (avgY < h * ratio && Date.now() - lastGesture > gestureCooldown) {
      let changed = false;
      for (const d of devices || []) {
        if (d.on) (d.on = false), (changed = true);
      }
      if (changed) window.updateDeviceList?.();
      setMlStatus("Gesto: mão levantada — dispositivos desligados");
      lastGesture = Date.now();
      const cx = canvas?.width / 2 || 450,
        cy = canvas?.height / 2 || 300;
      (window.pulses ||= []).push({ x: cx, y: cy, t: 0 });
    }
  } catch (e) {
    console.error("gotHands:", e);
  }
}

// Classificador
function startClassifier() {
  return startWebcam().then(() => {
    setMlStatus("Carregando classificador...");
    classifier = ml5.imageClassifier("MobileNet", () =>
      setMlStatus("Classificador pronto")
    );
  });
}

function snapshotClassify() {
  if (!classifier || !video) return setMlStatus("Classificador não ativo");
  setMlStatus("A classificar...");

  const w = video.videoWidth || 240,
    h = video.videoHeight || 180;
  mirrorCanvas ||= document.createElement("canvas");
  mirrorCtx ||= mirrorCanvas.getContext("2d");
  mirrorCanvas.width = w;
  mirrorCanvas.height = h;
  mirrorCtx.save();
  mirrorCtx.scale(-1, 1);
  mirrorCtx.drawImage(video, -w, 0, w, h);
  mirrorCtx.restore();

  classifier.classify(mirrorCanvas, (err, res) => {
    const resultEl = document.getElementById("classifierResult");
    if (err) {
      console.error(err);
      setMlStatus("Erro no classificador");
      return;
    }
    if (resultEl) resultEl.innerHTML = "";
    setMlStatus("Classificação concluída");

    const minConf = window.CLASSIFIER_MIN_CONFIDENCE ?? 0.12;
    let picked = res?.find(
      (r) => normalizeDeviceCategory(r.label) && r.confidence >= minConf
    );
    if (!picked)
      picked = res?.find((r) => normalizeDeviceCategory(r.label)) || null;
    if (!picked) {
      if (resultEl) {
        resultEl.innerHTML = `<div style="color:#c0392b">Objeto não suportado. Mostra: <b>telemóvel</b>, <b>fones</b>, <b>rato</b> ou <b>TV</b>.</div>`;
        if (window.DEBUG_CLASSIFIER && res?.[0])
          resultEl.innerHTML += `<small style="color:#7a8b96">Topo: ${
            res[0].label
          } — ${(res[0].confidence * 100).toFixed(1)}%</small>`;
      }
      return;
    }

    const cat = normalizeDeviceCategory(picked.label),
      watts = getAverageConsumptionForCategory(cat);
    if (resultEl) {
      resultEl.innerHTML = `
        <div>Categoria: <b>${cat.toUpperCase()}</b></div>
        <div>Consumo médio: <b>${watts} W</b></div>
        <small style="color:#7a8b96">${
          ["fones", "rato"].includes(cat)
            ? "Durante carregamento; em uso normal é muito baixo."
            : "Estimativa aproximada, pode variar."
        }</small>
        ${
          window.DEBUG_CLASSIFIER
            ? `<div><small>${picked.label} — ${(
                picked.confidence * 100
              ).toFixed(1)}%</small></div>`
            : ""
        }
      `;
    }
  });
}

// Helpers
function normalizeDeviceCategory(label = "") {
  const l = label.toLowerCase();
  if (/(cell|mobile|smart|telephone|phone|telem[oó]vel|iphone|android)/.test(l))
    return "telemovel";
  if (/(head|ear|fone|auricular)/.test(l)) return "fones";
  if (/(mouse|rato|raton)/.test(l)) return "rato";
  if (/(television|tv|smart tv)/.test(l)) return "tv";
  return null;
}

function getAverageConsumptionForCategory(c) {
  return { telemovel: 8, fones: 2, rato: 1, tv: 120 }[c] ?? 100;
}

function guessConsumptionFromLabel(l) {
  const c = normalizeDeviceCategory(l);
  return c ? getAverageConsumptionForCategory(c) : null;
}

function stopCamera() {
  try {
    video?.srcObject?.getTracks()?.forEach((t) => t.stop());
    video.srcObject = null;
  } catch {}
  webcamStarted = false;
}

// Parar tudo
function stopAllMl() {
  stopHandpose();
  classifier = null;
  stopCamera();
  setMlStatus("ML parado");
}

// Eventos e exports
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera(), setMlStatus("Webcam parada");
});

Object.assign(window, {
  startWebcam,
  startHandpose,
  stopHandpose,
  startClassifier,
  snapshotClassify,
  stopAllMl,
});
