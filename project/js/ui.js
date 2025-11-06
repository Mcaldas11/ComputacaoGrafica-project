// ui.js — ligações ao DOM, menus, entradas e lista de dispositivos
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("houseCanvas");
  const resetBtn = document.getElementById("resetBtn");
  const startHandposeBtn = document.getElementById("startHandpose");
  const startClassifierBtn = document.getElementById("startClassifier");
  const snapshotBtn = document.getElementById("snapshotClassify");
  const deviceListEl = document.getElementById("deviceList");
  const helpModal = document.getElementById("helpModal");
  const helpClose = document.getElementById("helpClose");
  const splash = document.getElementById("splash");
  const splashStart = document.getElementById("splashStart");
  const splashOptions = document.getElementById("splashOptions");
  const topmenuEl = document.querySelector(".topmenu");

  // cache modals / result UI early to avoid repeated lookups later
  const clickModal = document.getElementById('clickModal');
  const clickModalClose = document.getElementById('clickModalClose');
  const resultModal = document.getElementById('resultModal');
  const resultTitle = document.getElementById('resultTitle');
  const resultMessage = document.getElementById('resultMessage');
  const resultEnergy = document.getElementById('resultEnergy');
  const resultRestart = document.getElementById('resultRestart');
  const resultClose = document.getElementById('resultClose');

  // small helper to toggle modal-like visibility and aria state
  function setVisible(el, visible) {
    if (!el) return;
    if (visible) {
      el.classList.add('visible');
      el.setAttribute('aria-hidden', 'false');
    } else {
      el.classList.remove('visible');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  if (typeof initCanvas === "function") initCanvas();

  function setMode(mode) {
    window.currentMode = mode;
    const el = document.getElementById("modeIndicator");
    if (el) el.textContent = mode === "challenge" ? "Desafio" : "Mundo livre";
  }
  window.setMode = setMode;
  // single helper to update mode-dependent UI (challenge box and ml UI)
  function updateUIForMode(mode) {
    const challengeBox = document.querySelector('.challengeBox');
    if (challengeBox) {
      const show = mode === 'challenge';
      challengeBox.style.display = show ? '' : 'none';
      challengeBox.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    const mlBox = document.querySelector('.mlBox');
    const showMl = mode !== 'challenge';
    if (mlBox) {
      mlBox.style.display = showMl ? '' : 'none';
      mlBox.setAttribute('aria-hidden', showMl ? 'false' : 'true');
    }
    // buttons
    if (startHandposeBtn) startHandposeBtn.style.display = showMl ? '' : 'none';
    if (startClassifierBtn) startClassifierBtn.style.display = showMl ? '' : 'none';
    if (snapshotBtn) snapshotBtn.style.display = showMl ? '' : 'none';
    if (!showMl && typeof window.stopAllMl === 'function') {
      try { window.stopAllMl(); } catch (e) {}
    }
  }
  if (typeof startChallenge === "function") {
    const _sc = startChallenge;
    window.startChallenge = function (...args) {
      const res = _sc.apply(this, args);
      setMode("challenge");
      updateUIForMode("challenge");
      return res;
    };
  }
  if (typeof startSim === "function") {
    const _ss = startSim;
    window.startSim = function (...args) {
      const res = _ss.apply(this, args);
      setMode("sandbox");
      updateUIForMode("sandbox");
      return res;
    };
  }
  // ensure any external calls to setMode also update UI
  const _setMode = window.setMode;
  window.setMode = function (mode) {
    updateUIForMode(mode);
    return _setMode(mode);
  };
  // initialize
  setMode('sandbox');
  updateUIForMode('sandbox');

  function updateDeviceList() {
    if (!deviceListEl) return;
    deviceListEl.innerHTML = "";
    for (const d of devices) {
      const li = document.createElement("li");
      li.textContent = `${d.label} — ${d.power}W `;
      const state = document.createElement("strong");
      state.textContent = d.on ? "ON" : "OFF";
      state.style.color = d.on ? "#ffd86b" : "#9fb6c3";
      li.appendChild(state);
      deviceListEl.appendChild(li);
    }
  }

  updateDeviceList();

  function findDeviceAt(x, y) {
    for (const d of devices) {
      if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return d;
    }
    return null;
  }

  function showClickModal() {
    if (window.clickModalAcknowledged) return;
    setVisible(clickModal, true);
  }
  if (canvas) {
    canvas.addEventListener("click", (ev) => {
      if (typeof challengeActive !== 'undefined' && challengeActive) {
        showClickModal();
        ev.preventDefault();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const d = findDeviceAt(x, y);
      if (d) {
        d.on = !d.on;
        updateDeviceList();
      }
    });
    canvas.addEventListener('mousedown', (ev) => {
      if (challengeActive) {
        showClickModal();
        ev.preventDefault();
      }
    });
    canvas.addEventListener('touchstart', (ev) => {
      if (challengeActive) {
        showClickModal();
        ev.preventDefault();
      }
    }, {passive: false});
  }

  // teclado para movimento e interação
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "e" || ev.key === "E") {
      toggleNearbyDevices();
      ev.preventDefault();
      return;
    }
    const k = ev.key && ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k in keys) {
      keys[k] = true;
      ev.preventDefault();
    }
  });
  document.addEventListener("keyup", (ev) => {
    const k = ev.key && ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k in keys) {
      keys[k] = false;
      ev.preventDefault();
    }
  });

  resetBtn &&
    resetBtn.addEventListener("click", () => {
      devices.forEach((d) => (d.on = false));
      energyWh = 0;
      updateDeviceList();
    });

  if (startHandposeBtn) {
    startHandposeBtn.addEventListener("click", async () => {
      try {
        startHandposeBtn.disabled = true;
        const active = !!window.handposeActive;
        if (!active) {
          try {
            await startHandpose();
            startHandposeBtn.textContent = 'Parar Handpose';
          } catch (err) {
            console.error('UI: startHandpose failed', err);
            const s = document.getElementById('mlStatus');
            if (s) s.textContent = 'Erro ao ativar Handpose — verifica permissões/console';
            return;
          }
        } else {
          if (typeof stopHandpose === 'function') stopHandpose();
          startHandposeBtn.textContent = 'Ativar Handpose';
        }
      } catch (e) {
        console.error('Falha ao ativar Handpose', e);
        try { const s = document.getElementById('mlStatus'); if (s) s.textContent = 'Erro ao ativar Handpose'; } catch (e) {}
      } finally {
        startHandposeBtn.disabled = false;
      }
    });
  }
  startClassifierBtn &&
    startClassifierBtn.addEventListener("click", () => {
      startWebcam();
      startClassifier();
    });
  snapshotBtn &&
    snapshotBtn.addEventListener("click", () => {
      snapshotClassify();
    });

  helpClose &&
    helpClose.addEventListener("click", () => {
      if (helpModal) helpModal.setAttribute("aria-hidden", "true");
    });

  function hideSplash(cb) {
    if (!splash) return cb && cb();
    const panel = splash.querySelector(".splash-panel");
    if (!panel) {
      splash.classList.add("hidden");
      if (cb) cb();
      return;
    }
    splash.classList.remove("hidden");
    const onEnd = (ev) => {
      if (ev.target !== panel) return;
      panel.removeEventListener("transitionend", onEnd);
      if (splash.parentNode) splash.parentNode.removeChild(splash);
      if (cb) cb();
    };
    panel.addEventListener("transitionend", onEnd);
    splash.classList.add("splash--hiding");
  }

  splashStart &&
    splashStart.addEventListener("click", () => {
      if (topmenuEl && topmenuEl.parentNode)
        topmenuEl.parentNode.removeChild(topmenuEl);
      hideSplash(() => {
        if (typeof startSim === "function") startSim();
        updateDeviceList();
      });
    });

  splashOptions &&
    splashOptions.addEventListener("click", () => {
      if (helpModal) {
        helpModal.classList.add("visible");
        helpModal.setAttribute("aria-hidden", "false");
      }
    });
  const h = (window.location.hash || "").toLowerCase();
  if (h.includes("#start") || h.includes("#sandbox")) {
    hideSplash(() => {
      if (typeof startSim === "function") startSim();
      if (h.includes("challenge") || h === "#start") {
        if (typeof startChallenge === "function") startChallenge();
      }
      try {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } catch (e) {
        
      }
    });
  }

  window.updateDeviceList = updateDeviceList;
  window.toggleNearbyDevices = toggleNearbyDevices;
  if (clickModalClose) {
    clickModalClose.addEventListener('click', () => {
      window.clickModalAcknowledged = true;
      setVisible(clickModal, false);
      if (typeof beginChallenge === 'function' && !challengeStarted) beginChallenge();
    });
  }
  if (clickModal) {
    clickModal.addEventListener('click', (ev) => {
      if (ev.target === clickModal) {
          setVisible(clickModal, false);
        }
    });
  }
  window.showChallengeResult = function (won, energyUsed) {
    if (!resultModal) {
      alert((won ? 'Ganhou — ' : 'Perdeu — ') + 'energia usada: ' + (Math.round(energyUsed * 100) / 100) + ' Wh');
      return;
    }
    if (resultTitle) resultTitle.textContent = won ? 'Ganhou!' : 'Perdeu';
    if (resultMessage) resultMessage.textContent = won ? 'Conseguiu manter o consumo aceitável.' : 'O consumo excedeu o limite durante o desafio.';
    if (resultEnergy) resultEnergy.textContent = (Math.round(energyUsed * 100) / 100).toFixed(2);
  setVisible(resultModal, true);
    // confetti if available
    if (won && typeof confetti === 'function') {
      try {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        const duration = 1600;
        const end = Date.now() + duration;
        const interval = setInterval(() => {
          if (Date.now() > end) return clearInterval(interval);
          confetti({ particleCount: 40, startVelocity: 30, spread: 120, origin: { x: Math.random(), y: Math.random() * 0.6 } });
        }, 250);
      } catch (e) {
        console.warn('Confetti failed', e);
      }
    }
  };

  if (resultRestart) {
    resultRestart.addEventListener('click', () => {
      if (typeof stopChallenge === 'function') stopChallenge();
      devices.forEach((d) => (d.on = false));
      energyWh = 0;
      updateDeviceList();
      setVisible(resultModal, false);
      // start sim first (will set sandbox), then start challenge which will set mode to 'challenge'
      if (typeof startSim === 'function') startSim();
      if (typeof startChallenge === 'function') startChallenge(challengeDuration, challengeThresholdW);
      // immediately acknowledge click modal and begin the challenge
      window.clickModalAcknowledged = true;
      setVisible(clickModal, false);
      if (typeof beginChallenge === 'function') beginChallenge();
    });
  }

  if (resultClose) {
    resultClose.addEventListener('click', () => {
      if (typeof stopChallenge === 'function') stopChallenge();
      if (typeof pauseSim === 'function') pauseSim();
      try {
        window.location.href = 'menu.html';
      } catch (e) {
        setVisible(resultModal, false);
        if (typeof setMode === 'function') setMode('sandbox');
      }
    });
  }
});
