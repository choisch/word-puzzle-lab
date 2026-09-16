(() => {
  const portal = document.querySelector('.puzzlePortal');
  const portalGrid = portal?.querySelector('.portalGrid');
  const layout = document.querySelector('.layout');
  const content = document.getElementById('content');
  const back = document.querySelector('.portalBack');
  const top = document.querySelector('.top');
  if (!portal || !portalGrid || !layout || !content || !back || !top) return;

  const W = 800;
  const H = 450;
  const GROUND = 382;
  const NET_X = W / 2;
  const NET_W = 12;
  const NET_H = 126;
  const PLAYER_R = 34;
  const BALL_R = 16;
  const WIN_SCORE = 7;
  const BEST_KEY = 'electric_volleyball_best_streak';
  const STREAK_KEY = 'electric_volleyball_streak';

  let canvas = null;
  let ctx = null;
  let rafId = null;
  let running = false;
  let lastTs = 0;
  let serveAt = 0;
  let messageUntil = 0;
  let message = '';
  let pointLocked = false;
  let difficulty = 'normal';

  let streak = readNumber(STREAK_KEY);
  let bestStreak = readNumber(BEST_KEY);

  const input = { left: false, right: false, jump: false, spike: false };
  const player = body(150, GROUND - PLAYER_R);
  const cpu = body(650, GROUND - PLAYER_R);
  const ball = { x: 250, y: 120, vx: 0, vy: 0, spin: 0 };
  const score = { player: 0, cpu: 0 };

  function readNumber(key) {
    try {
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (_) { return 0; }
  }

  function writeNumber(key, value) {
    try {
      if (value > 0) localStorage.setItem(key, String(value));
      else localStorage.removeItem(key);
    } catch (_) {}
  }

  function body(x, y) {
    return { x, y, vx: 0, vy: 0, grounded: true, spike: 0, squash: 0 };
  }

  function setTop(subtitle) {
    const h1 = top.querySelector('h1');
    const sub = top.querySelector('.sub');
    if (h1) h1.textContent = 'Puzzle Lab';
    if (sub) sub.textContent = subtitle;
  }

  function addPortalCard() {
    if (portalGrid.querySelector('[data-game="electric-volleyball"]')) return;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'portalCard';
    card.dataset.game = 'electric-volleyball';
    card.innerHTML = `<span class="portalIcon">⚡🏐</span><h3>번개 배구</h3><p>점프와 스파이크로 CPU와 겨룹니다.</p><span class="portalGo"><span>시작하기</span><span>›</span></span>`;
    card.addEventListener('click', enterGame);
    portalGrid.appendChild(card);
  }

  function enterGame() {
    portal.classList.add('portal-hidden');
    layout.classList.remove('portal-hidden');
    layout.classList.add('electric-volleyball-mode');
    back.classList.add('visible');
    setTop('점프와 스파이크로 CPU와 7점 배구 대결을 해보세요.');
    buildShell();
    resetMatch();
    startLoop();
  }

  function buildShell() {
    content.className = 'electricVolleyballContent';
    content.innerHTML = `
      <div class="evRule"><strong>조작</strong><span>PC: ← → 이동 · Z 점프 · X 스파이크</span></div>
      <div class="evTopbar">
        <div class="evStats">
          <span class="evStat" id="evScore">0 : 0</span>
          <span class="evStat" id="evStreak">연승 ${streak}</span>
          <span class="evStat" id="evBest">최고 ${bestStreak}</span>
        </div>
        <div class="evActions">
          <select id="evDifficulty" aria-label="CPU 난이도">
            <option value="easy">CPU 쉬움</option>
            <option value="normal" selected>CPU 보통</option>
            <option value="hard">CPU 어려움</option>
          </select>
          <button type="button" class="evResetRecord" id="evResetRecord">기록 초기화</button>
          <button type="button" class="evNew" id="evNew">새 경기</button>
        </div>
      </div>
      <div class="evStageWrap">
        <canvas class="evCanvas" id="evCanvas" width="${W}" height="${H}" aria-label="번개 배구 경기장"></canvas>
        <div class="evMessage" id="evMessage" aria-live="polite"></div>
      </div>
      <div class="evControls" aria-label="모바일 조작">
        <div class="evMoveControls">
          <button type="button" class="evControl" data-control="left" aria-label="왼쪽 이동">←</button>
          <button type="button" class="evControl" data-control="right" aria-label="오른쪽 이동">→</button>
        </div>
        <div class="evActionControls">
          <button type="button" class="evControl evJump" data-control="jump">점프</button>
          <button type="button" class="evControl evSpike" data-control="spike">스파이크</button>
        </div>
      </div>
      <div class="evHelp">공이 내 바닥에 닿으면 CPU가 1점, 상대 바닥에 닿으면 내가 1점입니다.</div>`;

    canvas = document.getElementById('evCanvas');
    ctx = canvas?.getContext('2d') || null;
    document.getElementById('evNew')?.addEventListener('click', resetMatch);
    document.getElementById('evDifficulty')?.addEventListener('change', (event) => { difficulty = event.target.value; resetMatch(); });
    document.getElementById('evResetRecord')?.addEventListener('click', resetRecord);
    bindTouchControls();
    updateUi();
  }

  function bindTouchControls() {
    document.querySelectorAll('.evControl').forEach((button) => {
      const key = button.dataset.control;
      const press = (event) => {
        event.preventDefault();
        input[key] = true;
        if (key === 'jump') tryJump(player);
        if (key === 'spike') triggerSpike(player);
        button.classList.add('pressed');
      };
      const release = (event) => {
        event.preventDefault();
        input[key] = false;
        button.classList.remove('pressed');
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    });
  }

  function resetRecord() {
    if (!bestStreak && !streak) return;
    if (!window.confirm('번개 배구 연승 기록을 초기화할까요?')) return;
    streak = 0;
    bestStreak = 0;
    writeNumber(STREAK_KEY, 0);
    writeNumber(BEST_KEY, 0);
    updateUi();
  }

  function resetMatch() {
    score.player = 0;
    score.cpu = 0;
    resetBodies();
    queueServe(Math.random() < 0.5 ? 'player' : 'cpu', 700);
    showMessage('경기 시작!', 900);
    updateUi();
  }

  function resetBodies() {
    Object.assign(player, body(150, GROUND - PLAYER_R));
    Object.assign(cpu, body(650, GROUND - PLAYER_R));
    ball.x = 250;
    ball.y = 120;
    ball.vx = 0;
    ball.vy = 0;
    ball.spin = 0;
    pointLocked = false;
  }

  function queueServe(side, delay = 650) {
    pointLocked = true;
    serveAt = performance.now() + delay;
    ball.x = side === 'player' ? 205 : 595;
    ball.y = 115;
    ball.vx = 0;
    ball.vy = 0;
    ball.spin = 0;
    ball.serveSide = side;
  }

  function releaseServe() {
    pointLocked = false;
    const dir = ball.serveSide === 'player' ? 1 : -1;
    ball.vx = dir * (2.4 + Math.random() * 0.8);
    ball.vy = -1.0 - Math.random() * 1.0;
    serveAt = 0;
  }

  function startLoop() {
    if (running) return;
    running = true;
    lastTs = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    clearInputs();
  }

  function clearInputs() {
    Object.keys(input).forEach((key) => { input[key] = false; });
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(2, Math.max(.45, (ts - lastTs) / 16.6667));
    lastTs = ts;
    update(dt, ts);
    draw(ts);
    rafId = requestAnimationFrame(loop);
  }

  function update(dt, ts) {
    if (serveAt && ts >= serveAt) releaseServe();

    updatePlayer(player, input.left, input.right, dt, false);
    updateCpu(dt);
    updatePlayer(cpu, cpu.aiLeft, cpu.aiRight, dt, true);

    if (pointLocked) return;

    ball.vy += 0.32 * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.spin += ball.vx * 0.012 * dt;
    ball.vx *= Math.pow(.9985, dt);

    if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * .94; }
    if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * .94; }
    if (ball.y - BALL_R < 18) { ball.y = 18 + BALL_R; ball.vy = Math.abs(ball.vy) * .88; }

    collideNet();
    collidePlayer(player, false);
    collidePlayer(cpu, true);

    if (ball.y + BALL_R >= GROUND) {
      ball.y = GROUND - BALL_R;
      awardPoint(ball.x < NET_X ? 'cpu' : 'player');
    }
  }

  function updatePlayer(p, left, right, dt, isCpu) {
    const accel = isCpu ? 0.53 : 0.62;
    const max = isCpu ? cpuSpeed() : 6.2;
    if (left && !right) p.vx -= accel * dt;
    if (right && !left) p.vx += accel * dt;
    if ((!left && !right) || (left && right)) p.vx *= Math.pow(.78, dt);
    p.vx = Math.max(-max, Math.min(max, p.vx));
    p.x += p.vx * dt;
    p.vy += 0.52 * dt;
    p.y += p.vy * dt;

    if (p.y + PLAYER_R >= GROUND) {
      p.y = GROUND - PLAYER_R;
      p.vy = 0;
      p.grounded = true;
    } else {
      p.grounded = false;
    }

    const minX = isCpu ? NET_X + NET_W / 2 + PLAYER_R : PLAYER_R;
    const maxX = isCpu ? W - PLAYER_R : NET_X - NET_W / 2 - PLAYER_R;
    if (p.x < minX) { p.x = minX; p.vx = Math.max(0, p.vx); }
    if (p.x > maxX) { p.x = maxX; p.vx = Math.min(0, p.vx); }

    p.spike = Math.max(0, p.spike - 0.055 * dt);
    p.squash = Math.max(0, p.squash - 0.04 * dt);
  }

  function cpuSpeed() {
    return difficulty === 'easy' ? 4.1 : difficulty === 'hard' ? 6.3 : 5.2;
  }

  function updateCpu(dt) {
    cpu.aiLeft = false;
    cpu.aiRight = false;
    if (pointLocked) return;

    const react = difficulty === 'easy' ? 46 : difficulty === 'hard' ? 18 : 30;
    let target = 620;
    if (ball.x > NET_X - react || ball.vx > 0) {
      const predicted = ball.x + ball.vx * Math.max(0, (GROUND - 120 - ball.y) / Math.max(2.4, Math.abs(ball.vy) + 2));
      target = Math.max(NET_X + 60, Math.min(W - 50, predicted));
    }

    if (cpu.x < target - 10) cpu.aiRight = true;
    if (cpu.x > target + 10) cpu.aiLeft = true;

    const near = Math.abs(ball.x - cpu.x) < (difficulty === 'easy' ? 70 : 92);
    const descending = ball.vy > -2;
    const usefulHeight = ball.y < GROUND - 42 && ball.y > 105;
    if (near && descending && usefulHeight && cpu.grounded) {
      const chance = difficulty === 'easy' ? .025 : difficulty === 'hard' ? .095 : .055;
      if (Math.random() < chance * dt) tryJump(cpu);
    }

    if (!cpu.grounded && near && ball.y < cpu.y + 10 && Math.random() < (difficulty === 'hard' ? .08 : .035) * dt) triggerSpike(cpu);
  }

  function tryJump(p) {
    if (!p.grounded || pointLocked) return;
    p.vy = -10.6;
    p.grounded = false;
    p.squash = .8;
  }

  function triggerSpike(p) {
    if (pointLocked) return;
    p.spike = 1;
  }

  function collideNet() {
    const left = NET_X - NET_W / 2;
    const right = NET_X + NET_W / 2;
    const top = GROUND - NET_H;

    if (ball.y + BALL_R > top && ball.y - BALL_R < GROUND && ball.x + BALL_R > left && ball.x - BALL_R < right) {
      const fromLeft = ball.x < NET_X;
      ball.x = fromLeft ? left - BALL_R : right + BALL_R;
      ball.vx = fromLeft ? -Math.abs(ball.vx) * .88 : Math.abs(ball.vx) * .88;
    } else if (ball.y + BALL_R > top - 4 && ball.y - BALL_R < top + 7 && Math.abs(ball.x - NET_X) < NET_W / 2 + BALL_R) {
      ball.y = top - BALL_R;
      ball.vy = -Math.abs(ball.vy) * .88;
    }
  }

  function collidePlayer(p, isCpu) {
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    const minDist = PLAYER_R + BALL_R;
    const distSq = dx * dx + dy * dy;
    if (distSq <= 0 || distSq >= minDist * minDist) return;

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const approach = ball.vx * nx + ball.vy * ny - (p.vx * nx + p.vy * ny);
    const base = Math.max(4.3, Math.abs(approach) * 0.88 + 2.6);
    ball.vx = p.vx * .45 + nx * base;
    ball.vy = p.vy * .28 + ny * base - 1.1;

    if (p.spike > 0) {
      const dir = isCpu ? -1 : 1;
      ball.vx += dir * 4.1;
      ball.vy += 2.8;
      p.spike = 0;
      flashMessage(isCpu ? 'CPU 스파이크!' : '스파이크!', 420);
    }
  }

  function awardPoint(winner) {
    if (pointLocked) return;
    pointLocked = true;
    score[winner] += 1;
    updateUi();

    if (score[winner] >= WIN_SCORE) {
      finishMatch(winner);
      return;
    }

    flashMessage(winner === 'player' ? '내 점수!' : 'CPU 점수', 650);
    resetBodies();
    queueServe(winner, 900);
  }

  function finishMatch(winner) {
    const won = winner === 'player';
    if (won) {
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
      writeNumber(STREAK_KEY, streak);
      writeNumber(BEST_KEY, bestStreak);
      showMessage(`승리! ${score.player} : ${score.cpu}`, 1700);
    } else {
      streak = 0;
      writeNumber(STREAK_KEY, 0);
      showMessage(`아쉽다! ${score.player} : ${score.cpu}`, 1700);
    }
    updateUi();
    queueServe('player', 2600);
    setTimeout(() => {
      if (!layout.classList.contains('electric-volleyball-mode')) return;
      score.player = 0;
      score.cpu = 0;
      resetBodies();
      queueServe(won ? 'cpu' : 'player', 700);
      updateUi();
    }, 2100);
  }

  function updateUi() {
    const scoreEl = document.getElementById('evScore');
    const streakEl = document.getElementById('evStreak');
    const bestEl = document.getElementById('evBest');
    const reset = document.getElementById('evResetRecord');
    if (scoreEl) scoreEl.textContent = `${score.player} : ${score.cpu}`;
    if (streakEl) streakEl.textContent = `연승 ${streak}`;
    if (bestEl) bestEl.textContent = `최고 ${bestStreak}`;
    if (reset) reset.disabled = !streak && !bestStreak;
  }

  function flashMessage(text, duration) {
    message = text;
    messageUntil = performance.now() + duration;
  }

  function showMessage(text, duration) {
    flashMessage(text, duration);
    const el = document.getElementById('evMessage');
    if (el) el.textContent = text;
  }

  function draw(ts) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#f6fbff');
    sky.addColorStop(1, '#eef8ef');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    drawCloud(110, 70, 1);
    drawCloud(610, 92, .8);
    drawCloud(370, 52, .62);

    ctx.fillStyle = '#dff0d5';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#c9e6b9';
    ctx.fillRect(0, GROUND, W, 4);
    ctx.strokeStyle = '#c1d9bd';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 8]);
    ctx.beginPath();
    ctx.moveTo(NET_X, GROUND + 2);
    ctx.lineTo(NET_X, H);
    ctx.stroke();
    ctx.setLineDash([]);

    drawNet();
    drawCreature(player, false, '#f0c94b', '#735b18');
    drawCreature(cpu, true, '#7bcbd1', '#205f68');
    drawBall();

    ctx.fillStyle = 'rgba(53,39,25,.82)';
    ctx.font = '700 22px Pretendard, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(score.player), 365, 36);
    ctx.fillText(String(score.cpu), 435, 36);
    ctx.font = '600 12px Pretendard, sans-serif';
    ctx.fillStyle = 'rgba(53,39,25,.55)';
    ctx.fillText('ME', 365, 56);
    ctx.fillText('CPU', 435, 56);

    const msgEl = document.getElementById('evMessage');
    if (msgEl) {
      const visible = ts < messageUntil;
      msgEl.textContent = visible ? message : '';
      msgEl.classList.toggle('show', visible);
    }
  }

  function drawCloud(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    [[0,10,28],[30,0,36],[68,12,26]].forEach(([cx, cy, r]) => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillRect(-5, 10, 80, 30);
    ctx.restore();
  }

  function drawNet() {
    const top = GROUND - NET_H;
    ctx.fillStyle = '#776c5d';
    ctx.fillRect(NET_X - 6, top, 12, NET_H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(NET_X - 5, top + 7, 10, NET_H - 12);
    ctx.strokeStyle = '#c9c2b5';
    ctx.lineWidth = 1;
    for (let y = top + 12; y < GROUND - 5; y += 13) {
      ctx.beginPath(); ctx.moveTo(NET_X - 5, y); ctx.lineTo(NET_X + 5, y); ctx.stroke();
    }
    ctx.fillStyle = '#4b4035';
    ctx.fillRect(NET_X - 9, top - 5, 18, 6);
  }

  function drawCreature(p, flipped, fill, ink) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (flipped) ctx.scale(-1, 1);
    const squashX = 1 + p.squash * .08;
    const squashY = 1 - p.squash * .08;
    ctx.scale(squashX, squashY);

    ctx.strokeStyle = ink;
    ctx.fillStyle = fill;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(-20, -24);
    ctx.lineTo(-30, -47);
    ctx.lineTo(-7, -34);
    ctx.lineTo(10, -48);
    ctx.lineTo(22, -25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(-11, -7, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -7, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(0, 3, 7, .2, Math.PI - .2); ctx.stroke();

    ctx.save();
    ctx.translate(2, 13);
    ctx.rotate(-.12);
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(-7, -8); ctx.lineTo(4, -8); ctx.lineTo(-1, 0); ctx.lineTo(8, 0); ctx.lineTo(-5, 13); ctx.lineTo(-1, 4); ctx.lineTo(-10, 4); ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (p.spike > 0) {
      ctx.strokeStyle = '#ff7f30';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(24, -12); ctx.lineTo(42, -20); ctx.moveTo(27, 0); ctx.lineTo(48, 0); ctx.moveTo(23, 12); ctx.lineTo(42, 21); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBall() {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.spin);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6f675d';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ff9b35';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, BALL_R - 4, -.9, .9); ctx.stroke();
    ctx.strokeStyle = '#4eb9c3';
    ctx.beginPath(); ctx.arc(0, 0, BALL_R - 4, 2.2, 4.0); ctx.stroke();
    ctx.restore();
  }

  function keyHandler(event, down) {
    if (!layout.classList.contains('electric-volleyball-mode')) return;
    const target = event.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    let handled = true;
    switch (event.key) {
      case 'ArrowLeft': input.left = down; break;
      case 'ArrowRight': input.right = down; break;
      case 'z': case 'Z':
        input.jump = down;
        if (down && !event.repeat) tryJump(player);
        break;
      case 'x': case 'X':
        input.spike = down;
        if (down && !event.repeat) triggerSpike(player);
        break;
      default: handled = false;
    }
    if (handled) event.preventDefault();
  }

  window.addEventListener('keydown', (event) => keyHandler(event, true));
  window.addEventListener('keyup', (event) => keyHandler(event, false));
  window.addEventListener('blur', clearInputs);

  back.addEventListener('click', () => {
    if (!layout.classList.contains('electric-volleyball-mode')) return;
    stopLoop();
    layout.classList.remove('electric-volleyball-mode');
    content.classList.remove('electricVolleyballContent');
  });

  addPortalCard();
})();
