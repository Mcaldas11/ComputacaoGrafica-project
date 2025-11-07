// draw.js — ciclo de desenho, controlo da simulação e atualização do medidor
let canvas, ctx;
let running = false;
let _animId = null;
let meterFillEl, powerWEl, energyWhEl, consEl, consIconEl, consTextEl;
let timerEl, thresholdEl, statusEl;

// Estado para animação de morte do jogador
let deathAnim = { active: false, t: 0, duration: 1.1, onDone: null };
function startDeathAnimation(cb) {
  deathAnim.active = true;
  deathAnim.t = 0;
  deathAnim.onDone = typeof cb === 'function' ? cb : null;
}
function resetDeathAnimation() {
  deathAnim.active = false;
  deathAnim.t = 0;
  deathAnim.onDone = null;
}
window.resetDeathAnimation = resetDeathAnimation;

function initCanvas() {
  canvas = document.getElementById("houseCanvas");
  ctx = canvas?.getContext("2d");
  if (!canvas) return;
  canvas.width ||= 900;
  canvas.height ||= 600;

  meterFillEl = document.getElementById("meterFill");
  powerWEl = document.getElementById("powerW");
  energyWhEl = document.getElementById("energyWh");
  consEl = document.getElementById("consumptionStatus");
  consIconEl = consEl?.querySelector(".icon");
  consTextEl = consEl?.querySelector(".text");
  timerEl = document.getElementById("challengeTimer");
  thresholdEl = document.getElementById("challengeThreshold");
  statusEl = document.getElementById("challengeStatus");
}

function computePowerW() {
  return devices.reduce((sum, d) => sum + (d.on ? d.power : 0), 0);
}

// Mapa de imagens (fora do loop)
const imgMap = {
  light: {
    on: lampOnImg,
    off: lampOffImg,
    loaded: () => lampOnLoaded && lampOffLoaded,
  },
  light2: {
    on: lamp2OnImg,
    off: lamp2OffImg,
    loaded: () => lamp2OnLoaded && lamp2OffLoaded,
  },
  microwave: {
    on: microwaveOnImg,
    off: microwaveOffImg,
    loaded: () => microwaveOnLoaded && microwaveOffLoaded,
  },
  tv: { on: tvOnImg, off: tvOffImg, loaded: () => tvOnLoaded && tvOffLoaded },
  fridge: {
    on: fridgeOnImg,
    off: fridgeOffImg,
    loaded: () => fridgeOnLoaded && fridgeOffLoaded,
  },
  heater: {
    on: heaterOnImg,
    off: heaterOffImg,
    loaded: () => heaterOnLoaded && heaterOffLoaded,
  },
};

//Cores de brilho por tipo
const glowColors = {
  heater: [
    "rgba(255,140,50,0.95)",
    "rgba(255,100,40,0.45)",
    "rgba(255,90,30,0)",
  ],
  tv: ["rgba(80,160,255,0.92)", "rgba(60,130,255,0.42)", "rgba(60,130,255,0)"],
  fridge: [
    "rgba(255,255,255,0.95)",
    "rgba(240,240,255,0.35)",
    "rgba(240,240,255,0)",
  ],
  microwave: [
    "rgba(255,235,150,0.92)",
    "rgba(255,230,140,0.40)",
    "rgba(255,230,140,0)",
  ],
  light2: [
    "rgba(255,235,150,0.92)",
    "rgba(255,230,140,0.40)",
    "rgba(255,230,140,0)",
  ],
  light: [
    "rgba(255,220,80,0.95)",
    "rgba(255,200,70,0.45)",
    "rgba(255,200,70,0)",
  ],
};

// Função auxiliar para terminar desafio
function endChallenge(win, msg) {
  stopChallenge();
  pauseSim();
  try {
    const used = energyWh - (challengeEnergyStart || 0);
    if (typeof window.showChallengeResult === "function") {
      setTimeout(() => window.showChallengeResult(win, used), 50);
    } else {
      setTimeout(() => alert(msg), 50);
    }
  } catch {
    setTimeout(() => alert(msg), 50);
  }
}

function draw(timestamp) {
  if (!ctx) return;
  const now = timestamp || performance.now();
  const dt = Math.min(0.2, (now - lastTime) / 1000);
  lastTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fundo da casa
  if (casaLoaded) {
    drawImageCropped(casaImg, 40, 40, 815, 520);
    ctx.fillStyle = "rgba(6,12,18,0.28)";
  } else {
    ctx.fillStyle = "#082033";
  }
  ctx.fillRect(40, 40, 815, 520);

  // Dispositivos
  for (const d of devices) {
    ctx.save();

    // brilho
    if (d.on) {
      const [c1, c2, c3] = glowColors[d.type] || glowColors.light;
      const cx = d.x + d.w / 2,
        cy = d.y + d.h / 2;
      const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, 42);
      grd.addColorStop(0, c1);
      grd.addColorStop(0.4, c2);
      grd.addColorStop(1, c3);
      ctx.fillStyle = grd;
      ctx.fillRect(d.x - 18, d.y - 18, d.w + 36, d.h + 36);
    }

    // imagem
    const map = imgMap[d.type];
    if (map?.loaded())
      ctx.drawImage(d.on ? map.on : map.off, d.x, d.y, d.w, d.h);

    // anel ativo
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

    // área de ativação
    const cx = d.x + d.w / 2,
      cy = d.y + d.h / 2;
    const dist = Math.hypot(player.x - cx, player.y - cy);
    if (dist <= activationRadius) {
      const alpha = 0.35 * (1 - dist / activationRadius) + 0.12;
      const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, activationRadius);
      const base = d.type === "light" ? "255,220,80" : "120,194,168";
      grd.addColorStop(0, `rgba(${base},${alpha})`);
      grd.addColorStop(1, `rgba(${base},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, activationRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Jogador
  ctx.save();
  const movingNow =
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
  // Se estiver em morte, cancelar animações normais e encolher
  if (deathAnim.active) {
    const progress = Math.min(1, deathAnim.t / deathAnim.duration);
    drawRadius = player.r * (1 - progress * 0.85);
    bob = 0;
  } else if (movingNow && player.stepPhase) {
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
  if (deathAnim.active) {
    const alpha = Math.max(0, 1 - deathAnim.t / deathAnim.duration);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = selColor;
  } else {
    ctx.fillStyle = selColor;
  }
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, drawRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (deathAnim.active) ctx.restore();
  if (!deathAnim.active) {
    const eyeOffset = player.stepPhase ? Math.sin(player.stepPhase * 2) * 0.6 : 0;
    ctx.fillStyle = "#2b2b2b";
    ctx.beginPath();
    ctx.arc(player.x - 5, player.y - 2 + bob + eyeOffset, 2, 0, Math.PI * 2);
    ctx.arc(player.x + 5, player.y - 2 + bob - eyeOffset, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // olho substituído por X
    ctx.strokeStyle = "#2b2b2b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x - 6, player.y - 6);
    ctx.lineTo(player.x + 6, player.y + 6);
    ctx.moveTo(player.x + 6, player.y - 6);
    ctx.lineTo(player.x - 6, player.y + 6);
    ctx.stroke();
  }

  // anel próximo
  const nearAny = devices.some(
    (d) =>
      Math.hypot(player.x - (d.x + d.w / 2), player.y - (d.y + d.h / 2)) <=
      activationRadius
  );
  if (nearAny) {
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "rgba(120,240,180,0.95)";
    ctx.arc(player.x, player.y + bob, player.r + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Pulsos
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i];
    p.t = (p.t || 0) + dt;
    if (p.t > 1) pulses.splice(i, 1);
    else {
      ctx.strokeStyle = `rgba(255,150,0,${1 - p.t})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.t * 60, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Energia e consumo
  const totalW = computePowerW();
  energyWh += totalW * (dt / 3600);
  if (meterFillEl) {
    const pct = Math.min(1, totalW / 2000);
    meterFillEl.style.width = `${pct * 100}%`;
    meterFillEl.style.boxShadow =
      pct > 0.7 ? "0 0 18px rgba(255,107,107,0.3)" : "";
  }
  powerWEl && (powerWEl.textContent = Math.round(totalW));
  energyWhEl && (energyWhEl.textContent = energyWh.toFixed(2));
  if (consEl) {
    const high = totalW > 800;
    consIconEl && (consIconEl.style.display = high ? "" : "none");
    consTextEl &&
      (consTextEl.textContent = high
        ? "Consumo demasiado elevado"
        : "Consumo controlado");
    consEl.classList.toggle("high", high);
  }

  //Lógica do desafio
  if (typeof challengeActive !== "undefined" && challengeActive) {
    thresholdEl && (thresholdEl.textContent = Math.round(challengeThresholdW));
    if (timerEl) {
      const mins = Math.floor(challengeRemaining / 60);
      const secs = Math.floor(challengeRemaining % 60);
      timerEl.textContent = `${String(mins).padStart(2, "0")}:${String(
        secs
      ).padStart(2, "0")}`;
    }
    if (!challengeStarted) {
      statusEl && (statusEl.textContent = "A iniciar — confirma para começar");
    } else {
      challengeRemaining = Math.max(0, challengeRemaining - dt);
      if (statusEl) statusEl.textContent = "A decorrer";
      if (totalW > challengeThresholdW && !deathAnim.active) {
        if (statusEl) statusEl.textContent = "Perdeu — consumo demasiado alto";
        // terminar o desafio, mas manter o loop para animar a morte
        stopChallenge();
        const used = (typeof energyWh !== "undefined" && typeof challengeEnergyStart !== "undefined")
          ? energyWh - challengeEnergyStart : 0;
        startDeathAnimation(() => {
          try {
            if (typeof window.showChallengeResult === "function") window.showChallengeResult(false, used);
            else alert("Perdeu — o consumo excedeu o limite.");
          } catch (e) {}
          pauseSim();
        });
      }
      if (challengeRemaining <= 0 && !deathAnim.active) {
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

  let vx = 0, vy = 0;
  if (!deathAnim.active) {
    if (keys.ArrowUp || keys.w) vy -= 1;
    if (keys.ArrowDown || keys.s) vy += 1;
    if (keys.ArrowLeft || keys.a) vx -= 1;
    if (keys.ArrowRight || keys.d) vx += 1;
    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * player.speed;
      vy = (vy / len) * player.speed;
    }
  }

  const nextX = Math.max(
    player.r + 2,
    Math.min(canvas.width - player.r - 2, player.x + vx * dt)
  );
  const nextY = Math.max(
    player.r + 2,
    Math.min(canvas.height - player.r - 2, player.y + vy * dt)
  );
  if (!isCollidingAt(nextX, nextY)) {
    player.x = nextX;
    player.y = nextY;
  } else {
    if (!isCollidingAt(nextX, player.y)) player.x = nextX;
    else if (!isCollidingAt(player.x, nextY)) player.y = nextY;
  }
  const moving = vx !== 0 || vy !== 0;
  if (!deathAnim.active) {
    if (moving) player.stepPhase += dt * 12;
    else player.stepPhase = 0;
  }

  // atualizar animação de morte
  if (deathAnim.active) {
    deathAnim.t += dt;
    if (deathAnim.t >= deathAnim.duration) {
      deathAnim.active = false;
      const cb = deathAnim.onDone; deathAnim.onDone = null;
      if (cb) cb();
    }
  }

  if (running) _animId = requestAnimationFrame(draw);
}

function startSim() {
  if (running) return;
  if (!ctx) initCanvas();
  // garantir que uma nova simulação limpa qualquer estado de morte anterior
  resetDeathAnimation();
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
