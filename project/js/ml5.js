// ml5.js — funções para Handpose e Classificador (MobileNet)

function setMlStatus(status) {
  const mlStatus = document.getElementById("mlStatus");
  if (mlStatus) mlStatus.textContent = status;
}

function startHandpose() {
  // Devolve uma promise que resolve quando o modelo Handpose estiver pronto
  return startWebcam()
    .then(() => {
      console.log("startHandpose: webcam ready, loading model...");
      setMlStatus("Carregando Handpose...");
      return new Promise((resolve, reject) => {
        try {
          if (!ml5 || typeof ml5.handpose !== "function") {
            const msg =
              "ml5.handpose não disponível (verifica a inclusão do script ml5)";
            console.error("startHandpose:", msg);
            setMlStatus(msg);
            reject(new Error(msg));
            return;
          }
          // Opção espelhada para corresponder ao espelho da webcam
          handposeModel = ml5.handpose(video, { flipHorizontal: true }, () => {
            console.log("startHandpose: model ready");
            setMlStatus("Handpose pronta");
            window.handposeActive = true;
            resolve();
          });
          // Ouvir predições do modelo
          handposeModel.on("predict", gotHands);
        } catch (e) {
          console.warn("handpose error", e);
          setMlStatus("Erro Handpose");
          reject(e);
        }
      });
    })
    .catch((err) => {
      console.error("startHandpose: failed", err);
      // Propagar o erro ao chamador
      throw err;
    });
}

function stopHandpose() {
  try {
    // Remover listeners do modelo, se possível
    if (handposeModel && typeof handposeModel.removeListener === "function") {
      try {
        handposeModel.removeListener("predict", gotHands);
      } catch (e) {}
    }
  } catch (e) {}
  handposeModel = null;
  window.handposeActive = false;
  setMlStatus("Handpose parada");
  // Parar completamente a webcam
  try {
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      webcamStarted = false;
      video.srcObject = null;
    }
  } catch (e) {}
}

// Webcam e classificador
let webcamStarted = false;
let video = null;
let handposeModel = null;
let classifier = null;
let lastGesture = 0;
const gestureCooldown = 2000;
// offscreen canvas para classificação espelhada
let mirrorCanvas = null;
let mirrorCtx = null;

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
    // espelhar a pré-visualização
    try {
      video.style.transform = "scaleX(-1)";
      video.style.webkitTransform = "scaleX(-1)";
    } catch (e) {}
    setMlStatus("Estado: câmara ativa");
    return;
  } catch (err) {
    console.error("Erro da câmara", err);
    setMlStatus("Erro a aceder à câmara");
    throw err;
  }
}

function gotHands(predictions) {
  try {
    if (!predictions || predictions.length === 0) return;
    const p = predictions[0];
    if (!p.landmarks) return;
    const ys = p.landmarks.map((l) =>
      Array.isArray(l) ? l[1] : l && typeof l.y !== "undefined" ? l.y : 0
    );
    const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
    const h = (video && (video.videoHeight || video.height)) || 240;
    if (window.DEBUG_HANDPOSE)
      console.log("gotHands: avgY=", avgY, "h=", h, "ratio=", avgY / h);
    const ratio =
      typeof window.handGestureThresholdRatio !== "undefined"
        ? window.handGestureThresholdRatio
        : 0.45;
    if (avgY < h * ratio && Date.now() - lastGesture > gestureCooldown) {
      // desligar TODOS os dispositivos
      let changed = false;
      try {
        for (const d of devices) {
          if (d.on) {
            d.on = false;
            changed = true;
          }
        }
        if (changed && typeof updateDeviceList === "function")
          updateDeviceList();
      } catch (e) {
        console.error("gotHands: error toggling devices", e);
      }
      setMlStatus("Gesto: mao levantada — dispositivos desligados");
      lastGesture = Date.now();
      try {
        // criar pulso visual perto do centro do canvas
        const cx =
          typeof canvas !== "undefined" && canvas ? canvas.width / 2 : 450;
        const cy =
          typeof canvas !== "undefined" && canvas ? canvas.height / 2 : 300;
        pulses.push({ x: cx, y: cy, t: 0 });
      } catch (e) {
        try {
          pulses.push({ x: 450, y: 300, t: 0 });
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error("gotHands unexpected error", err);
  }
}

function startClassifier() {
  return startWebcam()
    .then(() => {
      setMlStatus("Carregando classificador (MobileNet)...");
      classifier = ml5.imageClassifier("MobileNet", () => {
        setMlStatus("Classificador pronto");
      });
    })
    .catch(() => {});
}

function snapshotClassify() {
  if (!classifier || !video) {
    setMlStatus("Classificador não ativo");
    return;
  }
  setMlStatus("A classificar...");
  if (!mirrorCanvas) {
    mirrorCanvas = document.createElement("canvas");
    mirrorCtx = mirrorCanvas.getContext("2d");
  }
  const w = (video && (video.videoWidth || video.width)) || 240;
  const h = (video && (video.videoHeight || video.height)) || 180;
  mirrorCanvas.width = w;
  mirrorCanvas.height = h;
  mirrorCtx.save();
  mirrorCtx.scale(-1, 1);
  mirrorCtx.drawImage(video, -w, 0, w, h);
  mirrorCtx.restore();

  classifier.classify(mirrorCanvas, (err, results) => {
    if (err) {
      console.error(err);
      setMlStatus("Erro no classificador");
      return;
    }
    const classifierResult = document.getElementById("classifierResult");
    if (classifierResult) classifierResult.innerHTML = "";
    setMlStatus("Classificação concluída");
    const minConf =
      typeof window.CLASSIFIER_MIN_CONFIDENCE !== "undefined"
        ? window.CLASSIFIER_MIN_CONFIDENCE
        : 0.12;
    let picked = null;
    if (Array.isArray(results)) {
      for (const r of results) {
        const c = normalizeDeviceCategory(r.label);
        if (c && r.confidence >= minConf) {
          picked = { cat: c, label: r.label, confidence: r.confidence };
          break;
        }
      }
      // fallback: se nada acima do limiar, tenta a melhor categoria mesmo com confiança baixa
      if (!picked) {
        for (const r of results) {
          const c = normalizeDeviceCategory(r.label);
          if (c) {
            picked = { cat: c, label: r.label, confidence: r.confidence };
            break;
          }
        }
      }
    }

    if (!picked) {
      if (classifierResult) {
        classifierResult.innerHTML += `<div style=\"color:#c0392b\">Objeto não suportado. Mostra: <strong>telemóvel</strong>, <strong>fones</strong>, <strong>rato</strong> ou <strong>TV</strong>.</div>`;
        if (window.DEBUG_CLASSIFIER) {
          const dbg = results && results[0] ? results[0] : null;
          if (dbg)
            classifierResult.innerHTML += `<small style=\"color:#7a8b96\">Topo: ${
              dbg.label
            } — ${(dbg.confidence * 100).toFixed(1)}%</small>`;
        }
      }
      return;
    }
    const cat = picked.cat;
    const suggestion = getAverageConsumptionForCategory(cat);
    if (classifierResult) {
      classifierResult.innerHTML += `<div>Categoria: <strong>${cat.toUpperCase()}</strong></div>`;
      classifierResult.innerHTML += `<div>Consumo médio estimado: <strong>${suggestion} W</strong></div>`;
      if (cat === "fones" || cat === "rato") {
        classifierResult.innerHTML += `<small style=\"color:#7a8b96\">Valor típico durante <em>carregamento</em>; em uso normal tende a ser muito baixo.</small>`;
      } else {
        classifierResult.innerHTML += `<small style=\"color:#7a8b96\">Estimativa aproximada; pode variar consoante o modelo.</small>`;
      }
      if (window.DEBUG_CLASSIFIER) {
        classifierResult.innerHTML += `<div><small style=\"color:#7a8b96\">Deteção: ${
          picked.label
        } — ${(picked.confidence * 100).toFixed(1)}%</small></div>`;
      }
    }
  });
}

function normalizeDeviceCategory(label) {
  const l = (label || "").toLowerCase();
  // telemóvel
  const phoneKw = [
    "cellular telephone",
    "cell phone",
    "mobile phone",
    "smartphone",
    "telephone",
    "phone",
    "telemovel",
    "telemóvel",
    "iphone",
    "android",
  ];
  if (phoneKw.some((k) => l.includes(k))) return "telemovel";

  // fones
  const phonesAudioKw = [
    "headphone",
    "headphones",
    "earphone",
    "earphones",
    "earbud",
    "earbuds",
    "headset",
    "fones",
    "auriculares",
  ];
  if (phonesAudioKw.some((k) => l.includes(k))) return "fones";

  // rato
  if (l.includes("computer mouse")) return "rato";
  if (
    l.includes("mouse") &&
    (l.includes("computer") ||
      l.includes("wireless") ||
      l.includes("optical") ||
      l.includes("gaming"))
  )
    return "rato";
  if (l.includes("rato") || l.includes("raton")) return "rato";

  // tv
  const tvKw = ["television", "tv", "smart tv"];
  if (tvKw.some((k) => l.includes(k))) return "tv";

  return null;
}

// Retorna W médios
function getAverageConsumptionForCategory(cat) {
  switch (cat) {
    case "telemovel":
      return 8;
    case "fones":
      return 2;
    case "rato":
      return 1;
    case "tv":
      return 120;
    default:
      return 100;
  }
}

function guessConsumptionFromLabel(label) {
  const cat = normalizeDeviceCategory(label);
  return cat ? getAverageConsumptionForCategory(cat) : null;
}

// Parar a câmara quando a página fica oculta
document.addEventListener("visibilitychange", () => {
  if (document.hidden && video && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach((t) => t.stop());
    webcamStarted = false;
    setMlStatus("Webcam parada");
  }
});

// Expor funções no window para a UI usar
window.startWebcam = startWebcam;
window.startHandpose = startHandpose;
window.stopHandpose = stopHandpose;
window.startClassifier = startClassifier;
window.snapshotClassify = snapshotClassify;
// Parar tudo relacionado a ML5
function stopAllMl() {
  try {
    if (typeof stopHandpose === "function") stopHandpose();
  } catch (e) {}
  try {
    classifier = null;
  } catch (e) {}
  try {
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      video.srcObject = null;
    }
  } catch (e) {}
  try {
    webcamStarted = false;
  } catch (e) {}
  setMlStatus("ML parado");
}
window.stopAllMl = stopAllMl;
