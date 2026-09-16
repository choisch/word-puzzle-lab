(() => {
  const portal = document.querySelector('.puzzlePortal');
  const portalGrid = portal?.querySelector('.portalGrid');
  const layout = document.querySelector('.layout');
  const content = document.getElementById('content');
  const back = document.querySelector('.portalBack');
  const top = document.querySelector('.top');
  if (!portal || !portalGrid || !layout || !content || !back || !top) return;

  let state = null;
  let timerId = null;
  let longPressed = false;
  let longPressTimer = null;

  const LEVELS = {
    easy: { label: '쉬움', rows: 9, cols: 9, mines: 10 },
    normal: { label: '보통', rows: 12, cols: 12, mines: 22 },
    hard: { label: '어려움', rows: 16, cols: 16, mines: 40 },
  };

  function setTop(title, subtitle) {
    const h1 = top.querySelector('h1');
    const sub = top.querySelector('.sub');
    if (h1) h1.textContent = title;
    if (sub) sub.textContent = subtitle;
  }

  function addPortalCard() {
    if (portalGrid.querySelector('[data-game="minesweeper"]')) return;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'portalCard';
    card.dataset.game = 'minesweeper';
    card.innerHTML = `
      <span class="portalIcon">💣</span>
      <h3>지뢰찾기</h3>
      <p>숫자를 단서로 안전한 칸을 열고 지뢰를 찾아 표시합니다.</p>
      <span class="portalGo"><span>시작하기</span><span>›</span></span>`;
    card.addEventListener('click', enterMinesweeper);
    portalGrid.appendChild(card);
  }

  function makeState(level = 'easy') {
    const cfg = LEVELS[level];
    return {
      level,
      ...cfg,
      minesSet: new Set(),
      revealed: new Set(),
      flags: new Set(),
      hintCells: new Set(),
      hintFlags: new Set(),
      started: false,
      over: false,
      won: false,
      flagMode: false,
      hintMode: true,
      autoFinish: true,
      startedAt: 0,
      elapsed: 0,
    };
  }

  function idx(r, c) { return r * state.cols + c; }
  function rc(index) { return [Math.floor(index / state.cols), index % state.cols]; }
  function inBounds(r, c) { return r >= 0 && c >= 0 && r < state.rows && c < state.cols; }

  function neighbors(index) {
    const [r, c] = rc(index);
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (inBounds(rr, cc)) out.push(idx(rr, cc));
      }
    }
    return out;
  }

  function adjacentMines(index) {
    let n = 0;
    for (const nb of neighbors(index)) if (state.minesSet.has(nb)) n++;
    return n;
  }

  function placeMines(firstIndex) {
    const excluded = new Set([firstIndex, ...neighbors(firstIndex)]);
    const candidates = [];
    for (let i = 0; i < state.rows * state.cols; i++) if (!excluded.has(i)) candidates.push(i);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    state.minesSet = new Set(candidates.slice(0, state.mines));
    state.started = true;
    state.startedAt = Date.now();
    startTimer();
  }

  function startTimer() {
    stopTimer(false);
    timerId = setInterval(() => {
      if (!state?.started || state.over) return;
      state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      updateStats();
    }, 1000);
  }

  function stopTimer(save = true) {
    if (timerId) clearInterval(timerId);
    timerId = null;
    if (save && state?.startedAt) state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  }

  function formatTime(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function buildShell() {
    layout.classList.add('minesweeper-mode');
    content.className = 'minesweeperContent';
    content.innerHTML = `
      <div class="msRule"><strong>규칙</strong><span>숫자는 주변 8칸의 지뢰 수입니다. 지뢰가 아닌 모든 칸을 열면 성공합니다.</span></div>
      <div class="msTopbar">
        <div class="msStats">
          <span class="msStat" id="msMines">지뢰 ${state.mines}</span>
          <span class="msStat" id="msRemain">남은 안전 칸</span>
          <span class="msStat msTimer" id="msTimer">◷ 00:00</span>
        </div>
        <div class="msNewControls">
          <select id="msDifficulty" aria-label="지뢰찾기 난이도">
            ${Object.entries(LEVELS).map(([key, value]) => `<option value="${key}"${key === state.level ? ' selected' : ''}>${value.label}</option>`).join('')}
          </select>
          <button type="button" id="msNewGame">새 게임</button>
        </div>
      </div>
      <div class="msLayout">
        <div>
          <div class="msBoardWrap"><div class="msBoard" role="grid" aria-label="지뢰찾기 게임판"></div></div>
          <div class="msStatus" id="msStatus">첫 칸을 열어 시작하세요. 첫 클릭은 안전합니다.</div>
        </div>
        <aside class="msSide">
          <button type="button" class="msToggle on" id="msHintMode" aria-pressed="true">
            <span><b>힌트 모드</b><small>모순을 표시하고 한 칸 힌트를 사용할 수 있어요</small></span><i></i>
          </button>
          <button type="button" class="msAction" id="msOneHint">
            <span><b>한 칸 힌트</b><small>막혔을 때 논리적으로 확정되는 칸부터 도와줘요</small></span><em>?</em>
          </button>
          <button type="button" class="msToggle on" id="msAutoFinish" aria-pressed="true">
            <span><b>자동 마무리</b><small>사실상 다 풀었으면 남은 칸을 정리해요</small></span><i></i>
          </button>
          <button type="button" class="msToggle" id="msFlagMode" aria-pressed="false">
            <span><b>깃발 모드</b><small>모바일에서 칸을 눌러 지뢰 표시</small></span><i></i>
          </button>
          <div class="msHelp">PC에서는 우클릭, 모바일에서는 길게 누르기로도 🚩 깃발을 놓을 수 있습니다.</div>
        </aside>
      </div>`;

    const board = content.querySelector('.msBoard');
    board.style.setProperty('--ms-cols', state.cols);
    board.innerHTML = Array.from({ length: state.rows * state.cols }, (_, i) => `<button type="button" class="msCell" data-index="${i}" aria-label="닫힌 칸"></button>`).join('');

    bindControls();
    render();
  }

  function bindControls() {
    document.getElementById('msNewGame')?.addEventListener('click', () => newGame(document.getElementById('msDifficulty').value));
    document.getElementById('msDifficulty')?.addEventListener('change', (e) => newGame(e.target.value));

    document.getElementById('msHintMode')?.addEventListener('click', () => {
      state.hintMode = !state.hintMode;
      render();
      setStatus(state.hintMode ? '힌트 모드를 켰습니다.' : '힌트 모드를 껐습니다.');
    });

    document.getElementById('msAutoFinish')?.addEventListener('click', () => {
      state.autoFinish = !state.autoFinish;
      render();
      if (state.autoFinish) maybeAutoFinish();
    });

    document.getElementById('msFlagMode')?.addEventListener('click', () => {
      state.flagMode = !state.flagMode;
      render();
      setStatus(state.flagMode ? '깃발 모드 ON · 지뢰라고 생각하는 칸을 누르세요.' : '깃발 모드 OFF · 칸을 누르면 열립니다.');
    });

    document.getElementById('msOneHint')?.addEventListener('click', giveHint);

    const board = content.querySelector('.msBoard');
    board?.addEventListener('click', (event) => {
      const cell = event.target.closest('.msCell');
      if (!cell || state.over) return;
      if (longPressed) { longPressed = false; return; }
      const index = Number(cell.dataset.index);
      if (state.flagMode) toggleFlag(index);
      else reveal(index);
    });

    board?.addEventListener('contextmenu', (event) => {
      const cell = event.target.closest('.msCell');
      if (!cell || state.over) return;
      event.preventDefault();
      toggleFlag(Number(cell.dataset.index));
    });

    board?.addEventListener('pointerdown', (event) => {
      const cell = event.target.closest('.msCell');
      if (!cell || state.over || event.pointerType === 'mouse') return;
      longPressed = false;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        longPressed = true;
        toggleFlag(Number(cell.dataset.index));
      }, 480);
    });
    ['pointerup','pointercancel','pointerleave'].forEach((name) => board?.addEventListener(name, () => clearTimeout(longPressTimer)));
  }

  function setStatus(text, tone = '') {
    const el = document.getElementById('msStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `msStatus${tone ? ` ${tone}` : ''}`;
  }

  function reveal(index, options = {}) {
    if (state.over || state.revealed.has(index) || state.flags.has(index)) return;
    if (!state.started) placeMines(index);

    if (state.minesSet.has(index)) {
      state.revealed.add(index);
      state.over = true;
      state.won = false;
      stopTimer();
      setStatus('앗, 지뢰를 밟았습니다. 새 게임으로 다시 도전해 보세요.', 'bad');
      render();
      return;
    }

    const queue = [index];
    const seen = new Set();
    while (queue.length) {
      const cur = queue.shift();
      if (seen.has(cur) || state.flags.has(cur) || state.minesSet.has(cur)) continue;
      seen.add(cur);
      state.revealed.add(cur);
      if (options.hint) state.hintCells.add(cur);
      if (adjacentMines(cur) === 0) {
        for (const nb of neighbors(cur)) if (!state.revealed.has(nb) && !state.flags.has(nb)) queue.push(nb);
      }
    }

    render();
    if (!checkWin()) maybeAutoFinish();
  }

  function toggleFlag(index, options = {}) {
    if (state.over || state.revealed.has(index)) return;
    if (state.flags.has(index)) {
      state.flags.delete(index);
      state.hintFlags.delete(index);
    } else if (state.flags.size < state.mines) {
      state.flags.add(index);
      if (options.hint) state.hintFlags.add(index);
    }
    render();
    if (!checkWin()) maybeAutoFinish();
  }

  function constraintMoves() {
    const safe = new Set();
    const mines = new Set();
    const conflicts = new Set();

    for (const index of state.revealed) {
      const number = adjacentMines(index);
      if (!number) continue;
      const nbs = neighbors(index);
      const flagged = nbs.filter((n) => state.flags.has(n));
      const hidden = nbs.filter((n) => !state.revealed.has(n) && !state.flags.has(n));
      if (flagged.length > number) {
        conflicts.add(index);
        flagged.forEach((n) => conflicts.add(n));
        continue;
      }
      if (flagged.length === number) hidden.forEach((n) => safe.add(n));
      if (hidden.length && number - flagged.length === hidden.length) hidden.forEach((n) => mines.add(n));
    }
    return { safe, mines, conflicts };
  }

  function giveHint() {
    if (!state.hintMode || state.over) return;

    if (!state.started) {
      const center = idx(Math.floor(state.rows / 2), Math.floor(state.cols / 2));
      reveal(center, { hint: true });
      setStatus('첫 힌트로 안전한 칸을 하나 열었습니다.', 'hint');
      return;
    }

    const { safe, mines, conflicts } = constraintMoves();
    if (conflicts.size) {
      setStatus('깃발 수가 숫자와 맞지 않는 곳이 있습니다. 표시된 부분을 먼저 확인해 보세요.', 'bad');
      render();
      return;
    }

    const safeMoves = [...safe].filter((i) => !state.revealed.has(i) && !state.flags.has(i));
    const mineMoves = [...mines].filter((i) => !state.revealed.has(i) && !state.flags.has(i));
    if (safeMoves.length) {
      const target = safeMoves[Math.floor(Math.random() * safeMoves.length)];
      reveal(target, { hint: true });
      setStatus('숫자 단서만으로 안전하다고 확정되는 칸을 하나 열었습니다.', 'hint');
      return;
    }
    if (mineMoves.length) {
      const target = mineMoves[Math.floor(Math.random() * mineMoves.length)];
      toggleFlag(target, { hint: true });
      setStatus('숫자 단서만으로 지뢰라고 확정되는 칸에 깃발을 하나 놓았습니다.', 'hint');
      return;
    }

    const fallback = [];
    for (let i = 0; i < state.rows * state.cols; i++) {
      if (!state.revealed.has(i) && !state.flags.has(i) && !state.minesSet.has(i)) fallback.push(i);
    }
    if (!fallback.length) return;
    const target = fallback[Math.floor(Math.random() * fallback.length)];
    reveal(target, { hint: true });
    setStatus('논리적으로 바로 확정되는 칸이 없어 안전한 칸 하나를 힌트로 열었습니다.', 'hint');
  }

  function maybeAutoFinish() {
    if (!state.autoFinish || state.over || !state.started) return;
    const total = state.rows * state.cols;
    const safeTotal = total - state.mines;
    const allSafeRevealed = state.revealed.size === safeTotal && [...state.revealed].every((i) => !state.minesSet.has(i));
    const allMinesFlagged = state.flags.size === state.mines && [...state.minesSet].every((i) => state.flags.has(i));

    if (allSafeRevealed) {
      for (const mine of state.minesSet) state.flags.add(mine);
      finishWin();
      return;
    }
    if (allMinesFlagged) {
      for (let i = 0; i < total; i++) if (!state.minesSet.has(i)) state.revealed.add(i);
      finishWin();
    }
  }

  function checkWin() {
    if (state.over || !state.started) return false;
    const safeTotal = state.rows * state.cols - state.mines;
    const safeRevealed = [...state.revealed].filter((i) => !state.minesSet.has(i)).length;
    if (safeRevealed === safeTotal) {
      finishWin();
      return true;
    }
    return false;
  }

  function finishWin() {
    if (state.over && state.won) return;
    state.over = true;
    state.won = true;
    for (const mine of state.minesSet) state.flags.add(mine);
    stopTimer();
    render();
    setStatus(`완성! ${formatTime(state.elapsed)} 만에 지뢰를 모두 찾았습니다. 🎉`, 'ok');
    celebrate();
  }

  function conflictSet() {
    return state.hintMode ? constraintMoves().conflicts : new Set();
  }

  function render() {
    const board = content.querySelector('.msBoard');
    if (!board || !state) return;
    const conflicts = conflictSet();

    board.querySelectorAll('.msCell').forEach((cell) => {
      const index = Number(cell.dataset.index);
      const revealed = state.revealed.has(index);
      const flagged = state.flags.has(index);
      const mine = state.minesSet.has(index);
      const hintCell = state.hintCells.has(index);
      const hintFlag = state.hintFlags.has(index);
      cell.className = 'msCell';
      cell.textContent = '';
      cell.removeAttribute('data-number');

      if (revealed) {
        cell.classList.add('revealed');
        if (mine) {
          cell.classList.add('mine');
          cell.textContent = '💣';
        } else {
          const number = state.started ? adjacentMines(index) : 0;
          if (number) {
            cell.textContent = number;
            cell.dataset.number = number;
          }
          if (hintCell) cell.classList.add('hint-filled');
        }
      } else if (flagged) {
        cell.classList.add('flagged');
        if (hintFlag) cell.classList.add('hint-flag');
        cell.textContent = '🚩';
      }

      if (state.over && !state.won && mine && !flagged) {
        cell.classList.add('mine', 'revealed');
        cell.textContent = '💣';
      }
      if (conflicts.has(index)) cell.classList.add('conflict');
      cell.disabled = state.over;
    });

    syncToggle('msHintMode', state.hintMode);
    syncToggle('msAutoFinish', state.autoFinish);
    syncToggle('msFlagMode', state.flagMode);
    const hint = document.getElementById('msOneHint');
    if (hint) {
      hint.disabled = !state.hintMode || state.over;
      hint.classList.toggle('off', hint.disabled);
    }
    updateStats();
  }

  function syncToggle(id, on) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', String(on));
  }

  function updateStats() {
    if (!state) return;
    const totalSafe = state.rows * state.cols - state.mines;
    const revealedSafe = [...state.revealed].filter((i) => !state.minesSet.has(i)).length;
    const mines = document.getElementById('msMines');
    const remain = document.getElementById('msRemain');
    const timer = document.getElementById('msTimer');
    if (mines) mines.textContent = `지뢰 ${Math.max(0, state.mines - state.flags.size)}개 남음`;
    if (remain) remain.textContent = `안전 칸 ${Math.max(0, totalSafe - revealedSafe)}개 남음`;
    if (timer) timer.textContent = `◷ ${formatTime(state.elapsed)}`;
  }

  function celebrate() {
    const old = document.querySelector('.msCelebration');
    old?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'msCelebration';
    overlay.innerHTML = `<div class="msCelebrateCard"><div>🎉</div><strong>지뢰 제거 완료!</strong><span>${formatTime(state.elapsed)} 만에 성공했습니다.</span><button type="button">계속 보기</button></div><div class="msConfetti"></div>`;
    const confetti = overlay.querySelector('.msConfetti');
    for (let i = 0; i < 42; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--x', `${Math.random() * 100}vw`);
      p.style.setProperty('--dx', `${-70 + Math.random() * 140}px`);
      p.style.setProperty('--delay', `${Math.random() * .5}s`);
      p.style.setProperty('--dur', `${1.6 + Math.random() * 1.2}s`);
      p.style.setProperty('--hue', `${Math.floor(Math.random() * 360)}`);
      confetti.appendChild(p);
    }
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 220); };
    overlay.querySelector('button')?.addEventListener('click', close);
    setTimeout(close, 4300);
  }

  function newGame(level = 'easy') {
    stopTimer(false);
    state = makeState(level);
    try {
      mode = 'minesweeper';
      last = { mode: 'minesweeper', puzzle: state };
      revealed = false;
    } catch (_) {}
    buildShell();
  }

  function enterMinesweeper() {
    portal.classList.add('portal-hidden');
    layout.classList.remove('portal-hidden');
    layout.classList.add('minesweeper-mode');
    back.classList.add('visible');
    setTop('Puzzle Lab', '숫자를 단서로 안전한 칸을 열고 지뢰를 찾아보세요.');
    newGame('easy');
  }

  back.addEventListener('click', () => {
    if (!layout.classList.contains('minesweeper-mode')) return;
    stopTimer(false);
    layout.classList.remove('minesweeper-mode');
    content.classList.remove('minesweeperContent');
    document.querySelector('.msCelebration')?.remove();
  });

  addPortalCard();
})();
