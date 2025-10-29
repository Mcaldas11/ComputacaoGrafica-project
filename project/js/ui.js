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
  // If the page was opened with #start, automatically hide the splash and start
  // the simulation (this supports the menu linking to index.html#start).
  if (window.location.hash === "#start") {
    hideSplash(() => {
      if (typeof startSim === "function") startSim();
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
