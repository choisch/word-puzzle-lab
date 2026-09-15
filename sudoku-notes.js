(() => {
  const noteStore = new WeakMap();
  let active = null;
  let popover = null;

  function currentPuzzle() {
    try {
      return last?.mode === 'sudoku' ? last.puzzle : null;
    } catch (_) {
      return null;
    }
  }

  function notesFor(puzzle) {
    if (!puzzle) return null;
    if (!noteStore.has(puzzle)) {
      noteStore.set(puzzle, {
        rows: Array(9).fill(''),
        cols: Array(9).fill(''),
      });
    }
    return noteStore.get(puzzle);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function ensurePopover() {
    if (popover) return popover;
    popover = document.createElement('div');
    popover.className = 'sudokuMemoPopover';
    popover.hidden = true;
    popover.innerHTML = `
      <div class="sudokuMemoPopoverHead">
        <div class="sudokuMemoPopoverTitle"></div>
        <button type="button" class="sudokuMemoClose" aria-label="메모 닫기">×</button>
      </div>
      <textarea class="sudokuMemoInput" rows="4" placeholder="메모를 입력하세요"></textarea>
      <div class="sudokuMemoPopoverFoot">
        <span class="sudokuMemoAutosave">자동 저장</span>
        <button type="button" class="sudokuMemoClear">메모 지우기</button>
      </div>`;
    document.body.appendChild(popover);

    popover.querySelector('.sudokuMemoClose').addEventListener('click', closePopover);
    popover.querySelector('.sudokuMemoClear').addEventListener('click', () => {
      if (!active) return;
      const notes = notesFor(active.puzzle);
      notes[active.kind][active.index] = '';
      const input = popover.querySelector('.sudokuMemoInput');
      input.value = '';
      refreshButtons(active.puzzle);
      input.focus();
    });
    popover.querySelector('.sudokuMemoInput').addEventListener('input', (event) => {
      if (!active) return;
      const notes = notesFor(active.puzzle);
      notes[active.kind][active.index] = event.target.value;
      refreshButtons(active.puzzle);
    });

    document.addEventListener('pointerdown', (event) => {
      if (!active || popover.hidden) return;
      if (popover.contains(event.target)) return;
      if (event.target.closest('.sudokuMemoSlot')) return;
      closePopover();
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && active) closePopover();
    });

    window.addEventListener('resize', () => {
      if (active && !popover.hidden) positionPopover(active.trigger);
    });

    return popover;
  }

  function positionPopover(trigger) {
    if (!popover || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    const mobile = window.innerWidth <= 600;

    popover.style.left = '';
    popover.style.right = '';
    popover.style.top = '';
    popover.style.bottom = '';

    if (mobile) {
      popover.style.left = '12px';
      popover.style.right = '12px';
      popover.style.bottom = '12px';
      return;
    }

    const width = 260;
    const gap = 8;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - width - 10));
    let top = rect.bottom + gap;
    if (top + 190 > window.innerHeight) top = Math.max(10, rect.top - 190 - gap);

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function openPopover(kind, index, trigger) {
    const puzzle = currentPuzzle();
    if (!puzzle) return;
    const notes = notesFor(puzzle);
    ensurePopover();

    active = { puzzle, kind, index, trigger };
    const isRow = kind === 'rows';
    popover.querySelector('.sudokuMemoPopoverTitle').textContent = `${index + 1}${isRow ? '행' : '열'} 메모`;
    const input = popover.querySelector('.sudokuMemoInput');
    input.value = notes[kind][index] || '';
    popover.hidden = false;
    positionPopover(trigger);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function closePopover() {
    if (!popover) return;
    popover.hidden = true;
    active = null;
  }

  function slotMarkup(kind, index, value) {
    const label = `${index + 1}${kind === 'rows' ? '행' : '열'} 메모`;
    const hasNote = !!value.trim();
    const preview = hasNote ? value.trim().replace(/\s+/g, ' ').slice(0, 12) : '';
    return `<button type="button" class="sudokuMemoSlot ${hasNote ? 'has-note' : ''}" data-kind="${kind}" data-index="${index}" aria-label="${label}" title="${escapeHtml(preview || label)}"><span class="sudokuMemoIndex">${index + 1}</span><span class="sudokuMemoMark">${hasNote ? '•' : '+'}</span></button>`;
  }

  function refreshButtons(puzzle) {
    const notes = notesFor(puzzle);
    if (!notes) return;
    document.querySelectorAll('.sudokuMemoSlot').forEach((button) => {
      const kind = button.dataset.kind;
      const index = +button.dataset.index;
      const value = notes[kind][index] || '';
      const hasNote = !!value.trim();
      button.classList.toggle('has-note', hasNote);
      button.querySelector('.sudokuMemoMark').textContent = hasNote ? '•' : '+';
      button.title = hasNote ? value.trim().replace(/\s+/g, ' ').slice(0, 40) : `${index + 1}${kind === 'rows' ? '행' : '열'} 메모`;
    });
  }

  function enhanceSudoku() {
    const board = document.querySelector('.sudokuBoard');
    const shell = board?.closest('.sudokuBoardShell');
    const puzzle = currentPuzzle();
    if (!board || !shell || !puzzle || shell.dataset.memoEnhanced === '1') return;

    shell.dataset.memoEnhanced = '1';
    closePopover();
    const notes = notesFor(puzzle);

    const frame = document.createElement('div');
    frame.className = 'sudokuMemoFrame';

    const corner = document.createElement('div');
    corner.className = 'sudokuMemoCorner';
    corner.textContent = 'MEMO';

    const colRail = document.createElement('div');
    colRail.className = 'sudokuColMemoRail';
    colRail.innerHTML = notes.cols.map((value, index) => slotMarkup('cols', index, value)).join('');

    const rowRail = document.createElement('div');
    rowRail.className = 'sudokuRowMemoRail';
    rowRail.innerHTML = notes.rows.map((value, index) => slotMarkup('rows', index, value)).join('');

    shell.replaceChildren(frame);
    frame.append(corner, colRail, rowRail, board);

    frame.querySelectorAll('.sudokuMemoSlot').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        openPopover(button.dataset.kind, +button.dataset.index, button);
      });
    });
  }

  const observer = new MutationObserver(() => enhanceSudoku());
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceSudoku();
})();
