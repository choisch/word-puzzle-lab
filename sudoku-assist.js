(() => {
  let activeBoard = null;
  let solved = null;
  let hintEnabled = true;
  let observer = null;
  let checkQueued = false;

  function readPuzzle(board) {
    const cells = [...board.querySelectorAll('.sudokuCell')];
    if (cells.length !== 81) return null;
    return Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => {
      const cell = cells[r * 9 + c];
      if (!cell.classList.contains('given')) return 0;
      const value = Number(cell.textContent.trim());
      return value >= 1 && value <= 9 ? value : 0;
    }));
  }

  function candidates(grid, r, c) {
    const used = new Set();
    for (let i = 0; i < 9; i++) {
      if (grid[r][i]) used.add(grid[r][i]);
      if (grid[i][c]) used.add(grid[i][c]);
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) {
      for (let cc = bc; cc < bc + 3; cc++) {
        if (grid[rr][cc]) used.add(grid[rr][cc]);
      }
    }
    return [1,2,3,4,5,6,7,8,9].filter((n) => !used.has(n));
  }

  function solve(grid) {
    let target = null;
    let options = null;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c]) continue;
        const next = candidates(grid, r, c);
        if (!next.length) return false;
        if (!options || next.length < options.length) {
          target = [r, c];
          options = next;
          if (next.length === 1) break;
        }
      }
      if (options?.length === 1) break;
    }
    if (!target) return true;
    const [r, c] = target;
    for (const n of options) {
      grid[r][c] = n;
      if (solve(grid)) return true;
      grid[r][c] = 0;
    }
    return false;
  }

  function solveBoard(board) {
    const puzzle = readPuzzle(board);
    if (!puzzle) return null;
    const answer = puzzle.map((row) => [...row]);
    return solve(answer) ? answer : null;
  }

  function isRevealMode() {
    return !!document.querySelector('.sudokuCell.reveal') || document.getElementById('answer')?.textContent.includes('정답 숨기기');
  }

  function ensureAssistUi() {
    const side = document.querySelector('.sudokuSide');
    if (!side || side.querySelector('.sudokuAssist')) return;

    const box = document.createElement('div');
    box.className = 'sudokuAssist';
    box.innerHTML = `
      <button type="button" class="sudokuHintToggle" aria-pressed="true">
        <span><b>힌트 모드</b><small>틀린 숫자를 바로 알려줘요</small></span>
        <span class="sudokuHintSwitch"><i></i></span>
      </button>
      <div class="sudokuHintFeedback" aria-live="polite"></div>`;
    side.prepend(box);

    const toggle = box.querySelector('.sudokuHintToggle');
    toggle.addEventListener('click', () => {
      hintEnabled = !hintEnabled;
      toggle.setAttribute('aria-pressed', String(hintEnabled));
      toggle.classList.toggle('off', !hintEnabled);
      if (!hintEnabled) {
        activeBoard?.querySelectorAll('.assist-wrong').forEach((cell) => cell.classList.remove('assist-wrong'));
        setFeedback('힌트 모드를 껐습니다.');
      } else {
        setFeedback('힌트 모드가 켜졌습니다.');
        checkBoard();
      }
    });
  }

  function setFeedback(message, tone = '') {
    const feedback = document.querySelector('.sudokuHintFeedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `sudokuHintFeedback${tone ? ` ${tone}` : ''}`;
  }

  function celebrate() {
    if (!activeBoard || activeBoard.dataset.celebrated === '1') return;
    activeBoard.dataset.celebrated = '1';

    const status = document.querySelector('.sudokuStatus');
    if (status) {
      status.className = 'sudokuStatus ok';
      status.textContent = '완성! 모든 칸이 맞았습니다. 정말 잘했어요! 🎉';
    }
    setFeedback('완벽해요! 수도쿠를 모두 풀었습니다. 🎉', 'success');

    const overlay = document.createElement('div');
    overlay.className = 'sudokuCelebration';
    overlay.innerHTML = `
      <div class="sudokuCelebrateCard" role="status" aria-live="assertive">
        <div class="sudokuCelebrateEmoji">🎉</div>
        <strong>완성!</strong>
        <span>모든 숫자를 정확하게 맞췄어요.</span>
        <button type="button">계속 보기</button>
      </div>
      <div class="sudokuConfetti" aria-hidden="true"></div>`;

    const confetti = overlay.querySelector('.sudokuConfetti');
    for (let i = 0; i < 52; i++) {
      const piece = document.createElement('i');
      piece.style.setProperty('--x', `${Math.random() * 100}vw`);
      piece.style.setProperty('--dx', `${-70 + Math.random() * 140}px`);
      piece.style.setProperty('--delay', `${Math.random() * .55}s`);
      piece.style.setProperty('--dur', `${1.8 + Math.random() * 1.4}s`);
      piece.style.setProperty('--rot', `${180 + Math.random() * 720}deg`);
      piece.style.setProperty('--hue', `${Math.floor(Math.random() * 360)}`);
      confetti.appendChild(piece);
    }

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const close = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 220);
    };
    overlay.querySelector('button').addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });
    setTimeout(close, 4500);
  }

  function checkBoard() {
    checkQueued = false;
    if (!activeBoard || !solved || isRevealMode()) return;

    let filled = 0;
    let wrong = 0;
    let allCorrect = true;

    activeBoard.querySelectorAll('.sudokuCell').forEach((cell) => {
      const r = +cell.dataset.r;
      const c = +cell.dataset.c;
      const value = Number(cell.textContent.trim()) || 0;
      const given = cell.classList.contains('given');
      const isWrong = !given && value !== 0 && value !== solved[r][c];

      if (value) filled++;
      if (isWrong) wrong++;
      if (value !== solved[r][c]) allCorrect = false;

      cell.classList.toggle('assist-wrong', hintEnabled && isWrong);
    });

    if (allCorrect && filled === 81) {
      celebrate();
      return;
    }

    if (!hintEnabled) return;
    if (wrong > 0) setFeedback(wrong === 1 ? '앗, 다른 숫자를 한 번 생각해 볼까요?' : `다시 생각해 볼 칸이 ${wrong}개 있어요.`, 'warning');
    else if (filled > 0) setFeedback('좋아요. 지금까지 입력한 숫자는 모두 맞아요!', 'good');
    else setFeedback('숫자를 넣으면 틀렸을 때 바로 알려줄게요.');
  }

  function queueCheck() {
    if (checkQueued) return;
    checkQueued = true;
    requestAnimationFrame(checkBoard);
  }

  function attach(board) {
    if (board === activeBoard) return;
    observer?.disconnect();
    activeBoard = board;
    hintEnabled = true;
    solved = solveBoard(board);
    ensureAssistUi();
    setFeedback('숫자를 넣으면 틀렸을 때 바로 알려줄게요.');

    observer = new MutationObserver(queueCheck);
    observer.observe(board, { childList: true, subtree: true, characterData: true });
    queueCheck();
  }

  const pageObserver = new MutationObserver(() => {
    const board = document.querySelector('.sudokuBoard');
    if (board) attach(board);
  });
  pageObserver.observe(document.body, { childList: true, subtree: true });

  const board = document.querySelector('.sudokuBoard');
  if (board) attach(board);
})();
