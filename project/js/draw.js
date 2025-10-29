// draw.js — rendering loop, simulation control and meter updates (moved from app.js)
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

  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // background and rooms
  // Don't paint the entire canvas white — keep it transparent so the page
  // background shows through. Draw the room areas (with images if loaded)
  // on top using a subtle dark fill to match the site theme.
  if (salaLoaded) {
    drawImageCropped(salaImg, 40, 40, 360, 240);
    // subtle dark overlay so devices/labels remain legible
    ctx.fillStyle = "rgba(6,12,18,0.28)";
    ctx.fillRect(40, 40, 360, 240);
  } else {
    ctx.fillStyle = "#082033";
    ctx.fillRect(40, 40, 360, 240);
  }

  if (quartoLoaded) {
    drawImageCropped(quartoImg, 500, 40, 360, 240);
    ctx.fillStyle = "rgba(6,12,18,0.28)";
    ctx.fillRect(500, 40, 360, 240);
  } else {
    ctx.fillStyle = "#082033";
    ctx.fillRect(500, 40, 360, 240);
  }

  // bottom shared area
  ctx.fillStyle = "#082033";
  ctx.fillRect(40, 320, 820, 220);

  // devices
  for (const d of devices) {
    ctx.save();
    if (d.on) {
      const grd = ctx.createRadialGradient(
        d.x + d.w / 2,
        d.y + d.h / 2,
        4,
        d.x + d.w / 2,
        d.y + d.h / 2,
        60
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
    } else {
      ctx.fillStyle = d.on ? "#ffeaa7" : "#c7d8e0";
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = "#0b2430";
      ctx.strokeRect(d.x, d.y, d.w, d.h);
    }
    ctx.fillStyle = "#07202a";
    ctx.font = "12px Arial";
    ctx.fillText(d.label, d.x, d.y + d.h + 16);
    ctx.restore();

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

    // halo when player near
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

  // player
  ctx.save();
  const bob = player.stepPhase ? Math.sin(player.stepPhase) * 2.4 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(
    player.x,
    player.y + player.r + 6,
    player.r + 6,
    6,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "#ffdd88";
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 2;
  ctx.arc(player.x, player.y + bob, player.r, 0, Math.PI * 2);
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

  // pulses
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

  // update energy
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

  // update player step phase
  // movement based on keys object (updated by ui.js)
  let vx = 0,
    vy = 0;
  if (keys.ArrowUp) vy -= 1;
  if (keys.ArrowDown) vy += 1;
  if (keys.ArrowLeft) vx -= 1;
  if (keys.ArrowRight) vx += 1;
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
