(() => {
  const BEST_KEYS = {
    easy: 'minesweeper_best_easy',
    normal: 'minesweeper_best_normal',
    hard: 'minesweeper_best_hard',
  };

  let activeStatus = null;
  let statusObserver = null;
  const savedBoards = new WeakSet();

  function currentLevel() {
    const select = document.getElementById('msDifficulty');
    return BEST_KEYS[select?.value] ? select.value : 'easy';
  }

  function readBest(level = currentLevel()) {
    try {
      const value = Number(localStorage.getItem(BEST_KEYS[level]));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch (_) {
      return null;
    }
  }

  function writeBest(level, seconds) {
    if (!BEST_KEYS[level] || !Number.isFinite(seconds) || seconds <= 0) return;
    const current = readBest(level);
    if (!current || seconds < current) {
      try { localStorage.setItem(BEST_KEYS[level], String(seconds)); } catch (_) {}
    }
  }

  function formatTime(total) {
    total = Math.max(0, Math.floor(total || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return hours ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function parseTimer() {
    const text = document.getElementById('msTimer')?.textContent || '';
    const match = text.match(/(\d+):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    if (match[3] !== undefined) {
      return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function hasAnyBest() {
    return Object.keys(BEST_KEYS).some((level) => readBest(level));
  }

  function updateUi() {
    const best = document.getElementById('msBestTime');
    if (best) {
      const value = readBest();
      const text = `최고 ${value ? formatTime(value) : '-'}`;
      if (best.textContent !== text) best.textContent = text;
    }

    const reset = document.getElementById('msResetBest');
    if (reset) reset.disabled = !hasAnyBest();
  }

  function checkCompletion() {
    const status = document.getElementById('msStatus');
    const board = document.querySelector('.msBoard');
    if (!status || !board || !status.textContent.includes('완성!') || savedBoards.has(board)) return;

    savedBoards.add(board);
    const seconds = parseTimer();
    if (seconds) writeBest(currentLevel(), seconds);
    updateUi();
  }

  function resetBest() {
    if (!hasAnyBest()) return;
    if (!window.confirm('지뢰찾기 최고 기록을 모두 초기화할까요?')) return;
    try {
      Object.values(BEST_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch (_) {}
    updateUi();
  }

  function attachStatus(status) {
    if (status === activeStatus) return;
    statusObserver?.disconnect();
    activeStatus = status;
    if (!status) return;
    statusObserver = new MutationObserver(checkCompletion);
    statusObserver.observe(status, { childList: true, subtree: true, characterData: true });
    checkCompletion();
  }

  function ensureUi() {
    const stats = document.querySelector('.msStats');
    const controls = document.querySelector('.msNewControls');
    if (!stats || !controls) return;

    if (!document.getElementById('msBestTime')) {
      const best = document.createElement('span');
      best.id = 'msBestTime';
      best.className = 'msStat msBestStat';
      stats.appendChild(best);
    }

    if (!document.getElementById('msResetBest')) {
      const reset = document.createElement('button');
      reset.id = 'msResetBest';
      reset.type = 'button';
      reset.className = 'msResetBest';
      reset.textContent = '기록 초기화';
      reset.addEventListener('click', resetBest);
      controls.insertBefore(reset, controls.firstChild);
    }

    updateUi();
    attachStatus(document.getElementById('msStatus'));
  }

  const pageObserver = new MutationObserver(ensureUi);
  pageObserver.observe(document.body, { childList: true, subtree: true });
  ensureUi();
})();
