(() => {
  let activeBoard = null;
  let hintEnabled = true;
  let temporaryMode = false;
  let observer = null;
  let checkQueued = false;

  function isRevealMode() {
    return !!document.querySelector('.sudokuCell.reveal') || document.getElementById('answer')?.textContent.includes('정답 숨기기');
  }

  function selectedCell() {
    return activeBoard?.querySelector('.sudokuCell.selected') || null;
  }

  function cellValue(cell) {
    const value = Number(cell?.textContent.trim());
    return value >= 1 && value <= 9 ? value : 0;
  }

  function setFeedback(message, tone = '') {
    const feedback = document.querySelector('.sudokuHintFeedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `sudokuHintFeedback${tone ? ` ${tone}` : ''}`;
  }

  function syncToggleUi() {
    const hint = document.querySelector('.sudokuHintToggle');
    if (hint) {
      hint.setAttribute('aria-pressed', String(hintEnabled));
      hint.classList.toggle('off', !hintEnabled);
    }
    const temp = document.querySelector('.sudokuTempToggle');
    if (temp) {
      temp.setAttribute('aria-pressed', String(temporaryMode));
      temp.classList.toggle('on', temporaryMode);
    }
  }

  function ensureAssistUi() {
    const side = document.querySelector('.sudokuSide');
    if (!side || side.querySelector('.sudokuAssist')) return;

    const box = document.createElement('div');
    box.className = 'sudokuAssist';
    box.innerHTML = `
      <button type="button" class="sudokuHintToggle" aria-pressed="true">
        <span><b>힌트 모드</b><small>가로·세로·3×3의 같은 숫자를 알려줘요</small></span>
        <span class="sudokuHintSwitch"><i></i></span>
      </button>
      <button type="button" class="sudokuTempToggle" aria-pressed="false">
        <span><b>임시 모드</b><small>확신 없는 숫자를 연하게 적어둬요</small></span>
        <span class="sudokuTempSwitch"><i></i></span>
      </button>
      <div class="sudokuHintFeedback" aria-live="polite"></div>`;
    side.prepend(box);

    box.querySelector('.sudokuHintToggle').addEventListener('click', () => {
      hintEnabled = !hintEnabled;
      syncToggleUi();
      if (!hintEnabled) {
        activeBoard?.querySelectorAll('.assist-conflict').forEach((cell) => cell.classList.remove('assist-conflict'));
        setFeedback('힌트 모드를 껐습니다.');
      } else {
        setFeedback('힌트 모드가 켜졌습니다. 중복 숫자를 확인할게요.');
        checkBoard();
      }
    });

    box.querySelector('.sudokuTempToggle').addEventListener('click', () => {
      temporaryMode = !temporaryMode;
      syncToggleUi();
      setFeedback(temporaryMode ? '임시 모드 ON · 지금부터 넣는 숫자는 임시 표시됩니다.' : '임시 모드 OFF · 지금부터 넣는 숫자는 확정 표시됩니다.', temporaryMode ? 'temporary' : '');
    });

    syncToggleUi();
  }

  function markSelectedAfterInput(value) {
    queueMicrotask(() => {
      if (!activeBoard || isRevealMode()) return;
      const cell = selectedCell();
      if (!cell || cell.classList.contains('given')) return;
      const actual = cellValue(cell);
      if (!actual || value === 0) {
        cell.classList.remove('temporary-entry');
      } else {
        cell.classList.toggle('temporary-entry', temporaryMode);
      }
      queueCheck();
    });
  }

  function bindInputMode() {
    const side = document.querySelector('.sudokuSide');
    if (!side || side.dataset.assistBound === '1') return;
    side.dataset.assistBound = '1';

    side.addEventListener('click', (event) => {
      const num = event.target.closest('.sudokuNum');
      if (num) {
        markSelectedAfterInput(Number(num.dataset.number));
        return;
      }
      if (event.target.closest('.sudokuErase')) markSelectedAfterInput(0);
    });
  }

  function boardGroups() {
    const get = (r, c) => activeBoard?.querySelector(`.sudokuCell[data-r="${r}"][data-c="${c}"]`);
    const groups = [];

    for (let r = 0; r < 9; r++) {
      groups.push({ type: 'row', index: r, cells: Array.from({ length: 9 }, (_, c) => get(r, c)) });
    }
    for (let c = 0; c < 9; c++) {
      groups.push({ type: 'col', index: c, cells: Array.from({ length: 9 }, (_, r) => get(r, c)) });
    }
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const cells = [];
        for (let r = br * 3; r < br * 3 + 3; r++) {
          for (let c = bc * 3; c < bc * 3 + 3; c++) cells.push(get(r, c));
        }
        groups.push({ type: 'box', index: br * 3 + bc, cells });
      }
    }
    return groups;
  }

  function findConflicts() {
    const conflicts = new Set();
    const reasons = new Set();

    for (const group of boardGroups()) {
      const byValue = new Map();
      for (const cell of group.cells) {
        const value = cellValue(cell);
        if (!value) continue;
        if (!byValue.has(value)) byValue.set(value, []);
        byValue.get(value).push(cell);
      }
      for (const cells of byValue.values()) {
        if (cells.length < 2) continue;
        cells.forEach((cell) => conflicts.add(cell));
        reasons.add(group.type);
      }
    }
    return { conflicts, reasons };
  }

  function reasonText(reasons) {
    const labels = [];
    if (reasons.has('row')) labels.push('가로줄');
    if (reasons.has('col')) labels.push('세로줄');
    if (reasons.has('box')) labels.push('3×3 박스');
    return labels.join(' · ');
  }

  function celebrate() {
    if (!activeBoard || activeBoard.dataset.celebrated === '1') return;
    activeBoard.dataset.celebrated = '1';

    const status = document.querySelector('.sudokuStatus');
    if (status) {
      status.className = 'sudokuStatus ok';
      status.textContent = '완성! 모든 규칙을 만족했습니다. 정말 잘했어요! 🎉';
    }
    setFeedback('완벽해요! 수도쿠를 모두 풀었습니다. 🎉', 'success');

    const overlay = document.createElement('div');
    overlay.className = 'sudokuCelebration';
    overlay.innerHTML = `
      <div class="sudokuCelebrateCard" role="status" aria-live="assertive">
        <div class="sudokuCelebrateEmoji">🎉</div>
        <strong>완성!</strong>
        <span>가로·세로·3×3 규칙을 모두 만족했어요.</span>
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

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
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
    if (!activeBoard || isRevealMode()) return;

    const cells = [...activeBoard.querySelectorAll('.sudokuCell')];
    if (cells.length !== 81) return;

    const { conflicts, reasons } = findConflicts();
    cells.forEach((cell) => cell.classList.toggle('assist-conflict', hintEnabled && conflicts.has(cell)));

    const filled = cells.filter((cell) => cellValue(cell)).length;
    const temporaryCount = cells.filter((cell) => cell.classList.contains('temporary-entry') && cellValue(cell)).length;

    if (filled === 81 && conflicts.size === 0) {
      if (temporaryCount > 0) {
        setFeedback(`모든 칸이 규칙에 맞습니다. 임시 숫자 ${temporaryCount}개를 확정해 보세요.`, 'temporary');
      } else {
        celebrate();
      }
      return;
    }

    if (!hintEnabled) return;
    if (conflicts.size > 0) {
      setFeedback(`${reasonText(reasons)}에 같은 숫자가 있어요. 표시된 숫자를 확인해 보세요.`, 'warning');
    } else if (temporaryCount > 0) {
      setFeedback(`규칙 충돌은 없습니다. 임시 숫자 ${temporaryCount}개가 남아 있어요.`, 'temporary');
    } else if (filled > 0) {
      setFeedback('좋아요. 현재 가로·세로·3×3에 중복 숫자가 없습니다.', 'good');
    } else {
      setFeedback('같은 가로줄·세로줄·3×3 박스에 같은 숫자가 들어가면 알려줄게요.');
    }
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
    temporaryMode = false;
    ensureAssistUi();
    bindInputMode();
    syncToggleUi();
    setFeedback('같은 가로줄·세로줄·3×3 박스에 같은 숫자가 들어가면 알려줄게요.');

    observer = new MutationObserver(queueCheck);
    observer.observe(board, { childList: true, subtree: true, characterData: true });
    queueCheck();
  }

  document.addEventListener('keydown', (event) => {
    let sudokuActive = false;
    try { sudokuActive = mode === 'sudoku'; } catch (_) {}
    if (!sudokuActive || !activeBoard || isRevealMode()) return;
    if (/^[1-9]$/.test(event.key)) markSelectedAfterInput(Number(event.key));
    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') markSelectedAfterInput(0);
  });

  const pageObserver = new MutationObserver(() => {
    const board = document.querySelector('.sudokuBoard');
    if (board) attach(board);
  });
  pageObserver.observe(document.body, { childList: true, subtree: true });

  const board = document.querySelector('.sudokuBoard');
  if (board) attach(board);
})();
