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

  function setFeedback(message, tone = '') {
    const feedback = document.querySelector('.sudokuHintFeedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `sudokuHintFeedback${tone ? ` ${tone}` : ''}`;
  }

  function fillOneObviousCell() {
    const state = currentState();
    if (!activeBoard || !state || state.revealed || !Array.isArray(state.current)) return;

    if (hasConflict(state.current)) {
      setFeedback('먼저 중복된 숫자를 고쳐야 자명한 칸을 찾을 수 있어요.', 'warning');
      return;
    }

    const singles = findSingles(state.current);
    if (!singles.length) {
      setFeedback('지금은 규칙만으로 바로 확정되는 칸이 없어요.', 'temporary');
      return;
    }

    const [r, c, value] = singles[Math.floor(Math.random() * singles.length)];
    state.current[r][c] = value;

    const cell = cellAt(r, c);
    if (cell) {
      cell.textContent = value;
      cell.classList.add('user', 'auto-filled');
      cell.classList.remove('temporary-entry', 'wrong');
      cell.setAttribute('data-auto-filled', '1');
      cell.title = '규칙상 가능한 숫자가 하나뿐이라 도움으로 채운 칸입니다.';
    }

    setFeedback(`${r + 1}행 ${c + 1}열은 ${value}만 들어갈 수 있어요. 한 칸만 도와드렸습니다.`, 'good');
  }

  function ensureButton() {
    const assist = document.querySelector('.sudokuAssist');
    if (!assist || assist.querySelector('.sudokuAutoToggle')) return;

    const temp = assist.querySelector('.sudokuTempToggle');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sudokuTempToggle sudokuAutoToggle';
    button.innerHTML = `
      <span><b>자명한 칸 1개 찾기</b><small>후보 숫자가 하나뿐인 칸 하나만 도와줘요</small></span>
      <span aria-hidden="true" style="font-weight:700;font-size:16px;line-height:1">→</span>`;

    if (temp) temp.insertAdjacentElement('afterend', button);
    else assist.appendChild(button);

    button.addEventListener('click', fillOneObviousCell);
  }

  function attachBoard(board) {
    if (board !== activeBoard) activeBoard = board;
    ensureButton();
  }

  const pageObserver = new MutationObserver(() => {
    const board = document.querySelector('.sudokuBoard');
    if (board) attachBoard(board);
    ensureButton();
  });
  pageObserver.observe(document.body, { childList: true, subtree: true });

  const board = document.querySelector('.sudokuBoard');
  if (board) attachBoard(board);
})();
