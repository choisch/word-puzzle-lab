(() => {
  let enabled = false;
  let activeBoard = null;
  let boardObserver = null;
  let scheduled = false;
  let running = false;

  function currentState() {
    try {
      return last?.mode === 'sudoku' ? last.puzzle : null;
    } catch (_) {
      return null;
    }
  }

  function cellAt(r, c) {
    return activeBoard?.querySelector(`.sudokuCell[data-r="${r}"][data-c="${c}"]`) || null;
  }

  function hasConflict(board) {
    for (let r = 0; r < 9; r++) {
      const seen = new Set();
      for (let c = 0; c < 9; c++) {
        const v = board[r][c];
        if (!v) continue;
        if (seen.has(v)) return true;
        seen.add(v);
      }
    }
    for (let c = 0; c < 9; c++) {
      const seen = new Set();
      for (let r = 0; r < 9; r++) {
        const v = board[r][c];
        if (!v) continue;
        if (seen.has(v)) return true;
        seen.add(v);
      }
    }
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const seen = new Set();
        for (let r = br * 3; r < br * 3 + 3; r++) {
          for (let c = bc * 3; c < bc * 3 + 3; c++) {
            const v = board[r][c];
            if (!v) continue;
            if (seen.has(v)) return true;
            seen.add(v);
          }
        }
      }
    }
    return false;
  }

  function candidates(board, r, c) {
    if (board[r][c]) return [];
    const used = new Set();
    for (let i = 0; i < 9; i++) {
      if (board[r][i]) used.add(board[r][i]);
      if (board[i][c]) used.add(board[i][c]);
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) {
      for (let cc = bc; cc < bc + 3; cc++) {
        if (board[rr][cc]) used.add(board[rr][cc]);
      }
    }
    return [1,2,3,4,5,6,7,8,9].filter((n) => !used.has(n));
  }

  function findSingles(board) {
    const singles = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c]) continue;
        const options = candidates(board, r, c);
        if (options.length === 1) singles.push([r, c, options[0]]);
      }
    }
    return singles;
  }

  function paintAutoCell(r, c, value) {
    const cell = cellAt(r, c);
    if (!cell) return;
    cell.textContent = value;
    cell.classList.add('user', 'auto-filled');
    cell.classList.remove('temporary-entry', 'wrong');
    cell.setAttribute('data-auto-filled', '1');
    cell.title = '규칙상 가능한 숫자가 하나뿐이라 자동으로 채웠습니다.';
  }

  function runAutofill() {
    scheduled = false;
    if (!enabled || running || !activeBoard) return;
    const state = currentState();
    if (!state || state.revealed || !Array.isArray(state.current)) return;
    if (hasConflict(state.current)) return;

    running = true;
    let total = 0;
    try {
      while (true) {
        const singles = findSingles(state.current);
        if (!singles.length) break;

        let filledThisPass = 0;
        for (const [r, c, value] of singles) {
          if (state.current[r][c]) continue;
          state.current[r][c] = value;
          paintAutoCell(r, c, value);
          filledThisPass++;
          total++;
        }
        if (!filledThisPass || hasConflict(state.current)) break;
      }

      if (total > 0) {
        const feedback = document.querySelector('.sudokuHintFeedback');
        if (feedback) {
          feedback.textContent = `자명한 칸 ${total}개를 자동으로 채웠어요.`;
          feedback.className = 'sudokuHintFeedback good';
        }
      }
    } finally {
      running = false;
    }
  }

  function scheduleAutofill() {
    if (!enabled || scheduled || running) return;
    scheduled = true;
    requestAnimationFrame(runAutofill);
  }

  function syncToggle(button) {
    if (!button) return;
    button.classList.toggle('on', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    const label = button.querySelector('b');
    if (label) label.textContent = `자동 채우기 ${enabled ? 'ON' : 'OFF'}`;
  }

  function ensureToggle() {
    const assist = document.querySelector('.sudokuAssist');
    if (!assist || assist.querySelector('.sudokuAutoToggle')) return;

    const temp = assist.querySelector('.sudokuTempToggle');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sudokuTempToggle sudokuAutoToggle';
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `
      <span><b>자동 채우기 OFF</b><small>후보 숫자가 하나뿐인 칸을 자동으로 채워요</small></span>
      <span class="sudokuTempSwitch sudokuAutoSwitch"><i></i></span>`;

    if (temp) temp.insertAdjacentElement('afterend', button);
    else assist.appendChild(button);

    button.addEventListener('click', () => {
      enabled = !enabled;
      syncToggle(button);
      if (enabled) scheduleAutofill();
    });
    syncToggle(button);
  }

  function attachBoard(board) {
    if (board === activeBoard) {
      ensureToggle();
      return;
    }
    boardObserver?.disconnect();
    activeBoard = board;
    enabled = false;
    ensureToggle();

    boardObserver = new MutationObserver(() => scheduleAutofill());
    boardObserver.observe(board, { childList: true, subtree: true, characterData: true });
  }

  const pageObserver = new MutationObserver(() => {
    const board = document.querySelector('.sudokuBoard');
    if (board) attachBoard(board);
    ensureToggle();
  });
  pageObserver.observe(document.body, { childList: true, subtree: true });

  const board = document.querySelector('.sudokuBoard');
  if (board) attachBoard(board);
})();
