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
// offscreen canvas para classificação espelhada
let mirrorCanvas = null;
let mirrorCtx = null;

async function startWebcam() {
  if (webcamStarted) return Promise.resolve();
  video = document.getElementById("webcam");
  if (!video) return Promise.reject(new Error("video element missing"));
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    await video.play();
    webcamStarted = true;
    // espelhar a pré-visualização para corresponder à experiência de selfie
    try {
      video.style.transform = 'scaleX(-1)';
      video.style.webkitTransform = 'scaleX(-1)';
    } catch (e) {}
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
    // criar sem fonte atrelada; iremos passar um canvas espelhado no snapshot
    classifier = ml5.imageClassifier("MobileNet", () => {
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
  // preparar canvas espelhado
  if (!mirrorCanvas) {
    mirrorCanvas = document.createElement('canvas');
    mirrorCtx = mirrorCanvas.getContext('2d');
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
    // Limpa o resultado anterior e NÃO mostra o rótulo bruto (pedido do utilizador)
    if (classifierResult) classifierResult.innerHTML = "";
    setMlStatus("Classificação concluída");
    // Escolhe o MELHOR resultado dentro das 4 categorias suportadas (procura no top-K)
    const minConf = (typeof window.CLASSIFIER_MIN_CONFIDENCE !== 'undefined') ? window.CLASSIFIER_MIN_CONFIDENCE : 0.12;
    let picked = null; // {cat, label, confidence}
    if (Array.isArray(results)) {
      for (const r of results) {
        const c = normalizeDeviceCategory(r.label);
        if (c && (r.confidence >= minConf)) {
          picked = { cat: c, label: r.label, confidence: r.confidence };
          break;
        }
      }
      // fallback: se nada acima do limiar, tenta a melhor categoria mesmo com confiança baixa
      if (!picked) {
        for (const r of results) {
          const c = normalizeDeviceCategory(r.label);
          if (c) { picked = { cat: c, label: r.label, confidence: r.confidence }; break; }
        }
      }
    }

    if (!picked) {
      if (classifierResult) {
        classifierResult.innerHTML += `<div style=\"color:#c0392b\">Objeto não suportado. Mostra: <strong>telemóvel</strong>, <strong>fones</strong>, <strong>rato</strong> ou <strong>TV</strong>.</div>`;
        // Opcional: modo debug para mostrar label/confiança original se necessário
        if (window.DEBUG_CLASSIFIER) {
          const dbg = (results && results[0]) ? results[0] : null;
          if (dbg) classifierResult.innerHTML += `<small style=\"color:#7a8b96\">Top: ${dbg.label} — ${(dbg.confidence * 100).toFixed(1)}%</small>`;
        }
      }
      return;
    }
    const cat = picked.cat;
    const suggestion = getAverageConsumptionForCategory(cat);
    if (classifierResult) {
      classifierResult.innerHTML += `<div>Categoria: <strong>${cat.toUpperCase()}</strong></div>`;
      classifierResult.innerHTML += `<div>Consumo médio estimado: <strong>${suggestion} W</strong></div>`;
      if (cat === 'fones' || cat === 'rato') {
        classifierResult.innerHTML += `<small style=\"color:#7a8b96\">Valor típico durante <em>carregamento</em>; em uso normal tende a ser muito baixo.</small>`;
      } else {
        classifierResult.innerHTML += `<small style=\"color:#7a8b96\">Estimativa aproximada; pode variar consoante o modelo.</small>`;
      }
      if (window.DEBUG_CLASSIFIER) {
        classifierResult.innerHTML += `<div><small style=\"color:#7a8b96\">Deteção: ${picked.label} — ${(picked.confidence * 100).toFixed(1)}%</small></div>`;
      }
    }
  });
}


function normalizeDeviceCategory(label) {
  const l = (label || '').toLowerCase();
  // telemóvel
  const phoneKw = [
    'cellular telephone','cell phone','mobile phone','smartphone','telephone','phone',
    'telemovel','telemóvel','iphone','android'
  ];
  if (phoneKw.some(k => l.includes(k))) return 'telemovel';

  // fones (headphones/earphones/earbuds/headset)
  const phonesAudioKw = [
    'headphone','headphones','earphone','earphones','earbud','earbuds','headset','fones','auriculares'
  ];
  if (phonesAudioKw.some(k => l.includes(k))) return 'fones';

  // rato (computer mouse)
  // Preferir "computer mouse"; aceitar "mouse" apenas quando acompanhado de termos de computação
  if (l.includes('computer mouse')) return 'rato';
  if (l.includes('mouse') && (l.includes('computer') || l.includes('wireless') || l.includes('optical') || l.includes('gaming'))) return 'rato';
  if (l.includes('rato') || l.includes('raton')) return 'rato';

  // tv (television)
  const tvKw = ['television','tv','smart tv'];
  if (tvKw.some(k => l.includes(k))) return 'tv';

  return null;
}

// Retorna W médios típicos para a categoria pedida
function getAverageConsumptionForCategory(cat) {
  switch (cat) {
    case 'telemovel':
      // carregamento rápido ~8–18 W; uso/idle é inferior
      return 8;
    case 'fones':
      // carregamento de auriculares/headset
      return 2;
    case 'rato':
      // rato sem fios durante carregamento; com fio em uso ~0.5–1 W
      return 1;
    case 'tv':
      // TV LED/LCD média
      return 120;
    default:
      return 100;
  }
}

function guessConsumptionFromLabel(label) {
  // Apenas as 4 categorias pedidas
  const cat = normalizeDeviceCategory(label);
  return cat ? getAverageConsumptionForCategory(cat) : null;
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