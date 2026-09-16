(() => {
  let activeBoard = null;

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

  function hintModeEnabled() {
    const toggle = document.querySelector('.sudokuHintToggle');
    return !!toggle && toggle.getAttribute('aria-pressed') === 'true';
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

  function setFeedback(message, tone = '') {
    const feedback = document.querySelector('.sudokuHintFeedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `sudokuHintFeedback${tone ? ` ${tone}` : ''}`;
  }

  function chooseHintCell(state) {
    const selected = activeBoard?.querySelector('.sudokuCell.selected');
    if (selected) {
      const r = Number(selected.dataset.r);
      const c = Number(selected.dataset.c);
      if (!state.given[r][c] && !state.current[r][c]) return [r, c];
    }

    const empty = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!state.given[r][c] && !state.current[r][c]) empty.push([r, c]);
      }
    }
    if (!empty.length) return null;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function giveOneCellHint() {
    const state = currentState();
    if (!activeBoard || !state || state.revealed || !Array.isArray(state.current)) return;

    if (!hintModeEnabled()) {
      setFeedback('한 칸 힌트를 쓰려면 힌트 모드를 켜주세요.', 'temporary');
      syncHintButton();
      return;
    }

    if (hasConflict(state.current)) {
      setFeedback('먼저 표시된 중복 숫자를 고쳐주세요. 그다음 한 칸 힌트를 쓸 수 있어요.', 'warning');
      return;
    }

    const target = chooseHintCell(state);
    if (!target) {
      setFeedback('빈칸이 없습니다.', 'good');
      return;
    }

    const [r, c] = target;
    const value = state.solution[r][c];
    state.current[r][c] = value;
    state.selected = [r, c];

    const cell = cellAt(r, c);
    if (cell) {
      cell.textContent = value;
      cell.classList.add('user', 'hint-filled', 'selected');
      cell.classList.remove('temporary-entry', 'wrong', 'assist-conflict');
      cell.setAttribute('data-hint-filled', '1');
      cell.title = '한 칸 힌트로 채운 숫자입니다.';
    }

    setFeedback(`${r + 1}행 ${c + 1}열에 한 칸 힌트를 드렸어요.`, 'good');
  }

  function syncHintButton() {
    const button = document.querySelector('.sudokuOneCellHint');
    if (!button) return;
    const enabled = hintModeEnabled();
    button.disabled = !enabled;
    button.classList.toggle('off', !enabled);
    button.setAttribute('aria-disabled', String(!enabled));
    const small = button.querySelector('small');
    if (small) {
      small.textContent = enabled
        ? '막혔을 때 빈칸 하나를 정답으로 채워줘요'
        : '힌트 모드를 켜면 사용할 수 있어요';
    }
  }

  function ensureButton() {
    const assist = document.querySelector('.sudokuAssist');
    if (!assist || assist.querySelector('.sudokuOneCellHint')) {
      syncHintButton();
      return;
    }

    const temp = assist.querySelector('.sudokuTempToggle');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sudokuTempToggle sudokuOneCellHint';
    button.innerHTML = `
      <span><b>한 칸 힌트</b><small>막혔을 때 빈칸 하나를 정답으로 채워줘요</small></span>
      <span aria-hidden="true" style="font-weight:700;font-size:16px;line-height:1">?</span>`;

    if (temp) temp.insertAdjacentElement('afterend', button);
    else assist.appendChild(button);

    button.addEventListener('click', giveOneCellHint);
    syncHintButton();
  }

  function attachBoard(board) {
    if (board !== activeBoard) activeBoard = board;
    ensureButton();
  }

  const pageObserver = new MutationObserver(() => {
    const board = document.querySelector('.sudokuBoard');
    if (board) attachBoard(board);
    ensureButton();
    syncHintButton();
  });
  pageObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'class'] });

  const board = document.querySelector('.sudokuBoard');
  if (board) attachBoard(board);
})();
