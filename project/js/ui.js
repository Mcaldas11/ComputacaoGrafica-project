// ui.js — DOM wiring, menu, input handlers and device list
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

  if (typeof initCanvas === "function") initCanvas();

  // Mode indicator helper: 'challenge' or 'sandbox'
  function setMode(mode) {
    window.currentMode = mode;
    const el = document.getElementById("modeIndicator");
    if (!el) return;
    if (mode === "challenge") el.textContent = "Desafio";
    else el.textContent = "Mundo livre";
  }
  // expose to other scripts
  window.setMode = setMode;
  // ensure challenge panel visibility follows the mode
  function updateChallengePanelVisibility(mode) {
    const box = document.querySelector('.challengeBox');
    if (!box) return;
    if (mode === 'challenge') {
      box.style.display = '';
      box.setAttribute('aria-hidden', 'false');
    } else {
      box.style.display = 'none';
      box.setAttribute('aria-hidden', 'true');
    }
  }
  // wrap global startChallenge/startSim to update the HUD when invoked
  if (typeof startChallenge === "function") {
    const _sc = startChallenge;
    window.startChallenge = function (...args) {
      const res = _sc.apply(this, args);
      try {
        setMode("challenge");
      } catch (e) {}
      return res;
    };
  }
  if (typeof startSim === "function") {
    const _ss = startSim;
    window.startSim = function (...args) {
      const res = _ss.apply(this, args);
      try {
        setMode("sandbox");
      } catch (e) {}
      return res;
    };
  }
  // also update challenge panel visibility whenever mode changes
  const _setMode = window.setMode;
  window.setMode = function (mode) {
    try {
      updateChallengePanelVisibility(mode);
    } catch (e) {}
    return _setMode(mode);
  };

  // default to sandbox on load so challenge box is hidden until a challenge starts
  try {
    setMode('sandbox');
    updateChallengePanelVisibility('sandbox');
  } catch (e) {}

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

  canvas &&
    canvas.addEventListener("click", (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const d = findDeviceAt(x, y);
      if (d) {
        d.on = !d.on;
        // Removed pulse animation on click per user request — toggling
        // via the 'E' key already doesn't create pulses. Keep that
        // behavior consistent: no particle is emitted on click.
        updateDeviceList();
      }
    });

  // keyboard for movement and interaction
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

  resetBtn &&
    resetBtn.addEventListener("click", () => {
      devices.forEach((d) => (d.on = false));
      energyWh = 0;
      updateDeviceList();
    });

  startHandposeBtn &&
    startHandposeBtn.addEventListener("click", () => {
      startWebcam();
      startHandpose();
    });
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
        // default splash start behaves as sandbox (no automatic challenge).
        // If splash wanted challenge it would include a hash; menu will control mode.
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
  // If the page was opened with a start hash, automatically hide the splash and start
  // the simulation in the requested mode. Supported hashes:
  //  - #start or #start-challenge  => start simulation + startChallenge()
  //  - #sandbox or #start-sandbox  => start simulation only (free world)
  const h = (window.location.hash || "").toLowerCase();
  if (h.includes("#start") || h.includes("#sandbox")) {
    hideSplash(() => {
      if (typeof startSim === "function") startSim();
      // challenge variants
      if (h.includes("challenge") || h === "#start") {
        if (typeof startChallenge === "function") startChallenge();
      }
      try {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } catch (e) {
        /* ignore */
      }
    });
  }

  // expose helpers to other modules
  window.updateDeviceList = updateDeviceList;
  window.toggleNearbyDevices = toggleNearbyDevices;
});
