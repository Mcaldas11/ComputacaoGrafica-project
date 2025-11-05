// draw.js — ciclo de desenho, controlo da simulação e atualização do medidor
let canvas, ctx;
let running = false;
let _animId = null;

function initCanvas() {
  canvas = document.getElementById("houseCanvas");
  ctx = canvas && canvas.getContext("2d");
  if (!canvas) return;
  canvas.width = canvas.width || 900;
  canvas.height = canvas.height || 600;
}

function computePowerW() {
  return devices.reduce((sum, d) => sum + (d.on ? d.power : 0), 0);
}

function draw(timestamp) {
  if (!ctx) return;
  const now = timestamp || performance.now();
  const dt = Math.min(0.2, (now - lastTime) / 1000);
  lastTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (casaLoaded) {
    drawImageCropped(casaImg, 40, 40, 815, 520);
    ctx.fillStyle = "rgba(6,12,18,0.28)";
    ctx.fillRect(40, 40, 815, 520);
  } else {
    ctx.fillStyle = "#082033";
    ctx.fillRect(40, 40, 815, 520);
  }
  for (const d of devices) {
    ctx.save();
    if (d.on) {
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
    if (d.type === "light" && lampOnLoaded && lampOffLoaded) {
      const lampImg = d.on ? lampOnImg : lampOffImg;
      ctx.drawImage(lampImg, d.x, d.y, d.w, d.h);
    } else if (d.type === "light2" && lamp2OnLoaded && lamp2OffLoaded) {
      const lamp2Img = d.on ? lamp2OnImg : lamp2OffImg;
      ctx.drawImage(lamp2Img, d.x, d.y, d.w, d.h);
    } else if (
      d.type === "microwave" &&
      microwaveOnLoaded &&
      microwaveOffLoaded
    ) {
      const microwaveImg = d.on ? microwaveOnImg : microwaveOffImg;
      ctx.drawImage(microwaveImg, d.x, d.y, d.w, d.h);
    } else if (d.type === "tv" && tvOnLoaded && tvOffLoaded) {
      const tvImg = d.on ? tvOnImg : tvOffImg;
      ctx.drawImage(tvImg, d.x, d.y, d.w, d.h);
    } else if (d.type === "fridge" && fridgeOnLoaded && fridgeOffLoaded) {
      const fridgeImg = d.on ? fridgeOnImg : fridgeOffImg;
      ctx.drawImage(fridgeImg, d.x, d.y, d.w, d.h);
    } else if (d.type === "heater" && heaterOnLoaded && heaterOffLoaded) {
      const heaterImg = d.on ? heaterOnImg : heaterOffImg;
      ctx.drawImage(heaterImg, d.x, d.y, d.w, d.h);
    } else {
      ctx.fillStyle = d.on ? "#ffeaa7" : "#c7d8e0";
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = "#0b2430";
      ctx.strokeRect(d.x, d.y, d.w, d.h);
    }

    if (d.on) {
      const t = now / 300 + 1.2;
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
    const cx = d.x + d.w / 2;
    const cy = d.y + d.h / 2;
    const dx = player.x - cx;
    const dy = player.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= activationRadius) {
      const alpha = 0.35 * (1 - dist / activationRadius) + 0.12;
      ctx.save();
      const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, activationRadius);
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

  ctx.save();
  const movingNow = Boolean(
    keys.ArrowUp ||
      keys.ArrowDown ||
      keys.ArrowLeft ||
      keys.ArrowRight ||
      keys.w ||
      keys.a ||
      keys.s ||
      keys.d
  );
  let bob = 0;
  let drawRadius = player.r;
  if (movingNow && player.stepPhase) {
    bob = Math.sin(player.stepPhase) * 2.4;
  } else {
    const idlePhase = now / 250;
    bob = Math.sin(idlePhase) * 1.6;
    const breathScale = 1 + Math.sin(idlePhase * 0.9) * 0.035;
    drawRadius = player.r * breathScale;
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(
    player.x,
    player.y + drawRadius + 6,
    drawRadius + 6,
    6,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.beginPath();
  const selColor = localStorage.getItem("selectedColor") || "#ffdd88";
  ctx.fillStyle = selColor;
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 2;
  ctx.arc(player.x, player.y + bob, drawRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const eyeOffset = player.stepPhase ? Math.sin(player.stepPhase * 2) * 0.6 : 0;
  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.arc(player.x - 5, player.y - 2 + bob + eyeOffset, 2, 0, Math.PI * 2);
  ctx.arc(player.x + 5, player.y - 2 + bob - eyeOffset, 2, 0, Math.PI * 2);
  ctx.fill();

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

  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i];
    p.t = (p.t || 0) + dt;
    if (p.t > 1) {
      pulses.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = `rgba(255,150,0,${1 - p.t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.t * 60, 0, Math.PI * 2);
    ctx.stroke();
  }

  const totalW = computePowerW();
  energyWh += totalW * (dt / 3600);
  const meterFillEl = document.getElementById("meterFill");
  const powerWEl = document.getElementById("powerW");
  const energyWhEl = document.getElementById("energyWh");
  if (meterFillEl) {
    const pct = Math.min(1, totalW / 2000);
    meterFillEl.style.width = `${pct * 100}%`;
    meterFillEl.style.boxShadow =
      pct > 0.7 ? "0 0 18px rgba(255,107,107,0.3)" : "";
  }
  if (powerWEl) powerWEl.textContent = Math.round(totalW);
  if (energyWhEl) energyWhEl.textContent = energyWh.toFixed(2);
  try {
    const consEl = document.getElementById("consumptionStatus");
    if (consEl) {
      const iconEl = consEl.querySelector(".icon");
      const textEl = consEl.querySelector(".text");
      if (totalW > 800) {
        if (iconEl) iconEl.style.display = "";
        if (textEl) textEl.textContent = "Consumo demasiado elevado";
        consEl.classList.add("high");
      } else {
        if (iconEl) iconEl.style.display = "none";
        if (textEl) textEl.textContent = "Consumo controlado";
        consEl.classList.remove("high");
      }
    }
  } catch (e) {}

  if (typeof challengeActive !== "undefined" && challengeActive) {
    const timerEl = document.getElementById("challengeTimer");
    const thresholdEl = document.getElementById("challengeThreshold");
    const statusEl = document.getElementById("challengeStatus");
    if (thresholdEl) thresholdEl.textContent = Math.round(challengeThresholdW);
    if (timerEl) {
      const mins = Math.floor(challengeRemaining / 60);
      const secs = Math.floor(challengeRemaining % 60);
      timerEl.textContent = `${String(mins).padStart(2, "0")}:${String(
        secs
      ).padStart(2, "0")}`;
    }
    if (typeof challengeStarted === "undefined" || !challengeStarted) {
      if (statusEl) statusEl.textContent = "A iniciar — confirma para começar";
    } else {
      challengeRemaining = Math.max(0, challengeRemaining - dt);
      if (statusEl) statusEl.textContent = "A decorrer";
      if (totalW > challengeThresholdW) {
        if (statusEl) statusEl.textContent = "Perdeu — consumo demasiado alto";
        stopChallenge();
        pauseSim();
        try {
          const used =
            typeof energyWh !== "undefined" &&
            typeof challengeEnergyStart !== "undefined"
              ? energyWh - challengeEnergyStart
              : 0;
          if (typeof window.showChallengeResult === "function") {
            setTimeout(() => window.showChallengeResult(false, used), 50);
          } else {
            setTimeout(() => alert("Perdeu — o consumo excedeu o limite."), 50);
          }
        } catch (e) {
          setTimeout(() => alert("Perdeu — o consumo excedeu o limite."), 50);
        }
        return;
      }
      if (challengeRemaining <= 0) {
        if (statusEl) statusEl.textContent = "Ganhou — tempo esgotado";
        stopChallenge();
        pauseSim();
        try {
          const used =
            typeof energyWh !== "undefined" &&
            typeof challengeEnergyStart !== "undefined"
              ? energyWh - challengeEnergyStart
              : 0;
          if (typeof window.showChallengeResult === "function") {
            setTimeout(() => window.showChallengeResult(true, used), 50);
          } else {
            setTimeout(
              () => alert("Ganhou — conseguiu manter o consumo aceitável!"),
              50
            );
          }
        } catch (e) {
          setTimeout(
            () => alert("Ganhou — conseguiu manter o consumo aceitável!"),
            50
          );
        }
        return;
      }
    }
  }

  let vx = 0,
    vy = 0;
  if (keys.ArrowUp || keys.w) vy -= 1;
  if (keys.ArrowDown || keys.s) vy += 1;
  if (keys.ArrowLeft || keys.a) vx -= 1;
  if (keys.ArrowRight || keys.d) vx += 1;
  if (vx !== 0 || vy !== 0) {
    const len = Math.sqrt(vx * vx + vy * vy);
    vx = (vx / len) * player.speed;
    vy = (vy / len) * player.speed;
  }
  const dtMove = dt;
  const nextX = player.x + vx * dtMove;
  const nextY = player.y + vy * dtMove;
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
    const willCollideX = isCollidingAt(clampedNextX, player.y);
    const willCollideY = isCollidingAt(player.x, clampedNextY);
    if (!willCollideX) player.x = clampedNextX;
    if (!willCollideY) player.y = clampedNextY;
  }
  const moving = vx !== 0 || vy !== 0;
  if (moving) player.stepPhase += dt * 12;
  else player.stepPhase = 0;

  if (running) _animId = requestAnimationFrame(draw);
}

function loop() {
  if (!running) return;
  draw();
}

function startSim() {
  if (running) return;
  if (!ctx) initCanvas();
  running = true;
  lastTime = performance.now();
  _animId = requestAnimationFrame(draw);
}
function pauseSim() {
  running = false;
  if (_animId) cancelAnimationFrame(_animId);
  _animId = null;
}

window.startSim = startSim;
window.pauseSim = pauseSim;
