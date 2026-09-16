(() => {
  let activeBoard = null;
  let startedAt = 0;
  let stoppedAt = 0;
  let timerId = null;
  let savedThisBoard = false;

  const BEST_KEYS = {
    easy: 'sudoku_best_easy',
    normal: 'sudoku_best_normal',
    hard: 'sudoku_best_hard',
  };

  function currentDifficulty() {
    const select = document.getElementById('difficulty');
    return BEST_KEYS[select?.value] ? select.value : 'normal';
  }

  function readBest(level = currentDifficulty()) {
    try {
      const value = Number(localStorage.getItem(BEST_KEYS[level]));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch (_) {
      return null;
    }
  }

  function saveBest(ms) {
    if (savedThisBoard || !ms) return;
    savedThisBoard = true;
    const level = currentDifficulty();
    const current = readBest(level);
    if (!current || ms < current) {
      try { localStorage.setItem(BEST_KEYS[level], String(ms)); } catch (_) {}
    }
  }

  function formatElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return hours ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function timerBadge() {
    return document.getElementById('sudokuElapsedTime');
  }

  function bestBadge() {
    return document.getElementById('sudokuBestTime');
  }

  function renderTime() {
    const badge = timerBadge();
    if (badge && startedAt) {
      const end = stoppedAt || Date.now();
      setText(badge, `시간 ${formatElapsed(end - startedAt)}`);
      badge.classList.toggle('stopped', !!stoppedAt);
    }

    const best = bestBadge();
    if (best) {
      const value = readBest();
      setText(best, `최고 ${value ? formatElapsed(value) : '-'}`);
    }
  }

  function stopTimer() {
    if (!startedAt || stoppedAt) return;
    stoppedAt = Date.now();
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    saveBest(stoppedAt - startedAt);
    renderTime();
  }

  function startTimer(board) {
    activeBoard = board;
    startedAt = Date.now();
    stoppedAt = 0;
    savedThisBoard = false;
    if (timerId) clearInterval(timerId);
    timerId = setInterval(renderTime, 1000);
    renderTime();
  }

  function resetBestTimes() {
    const hasAny = Object.keys(BEST_KEYS).some((level) => readBest(level));
    if (!hasAny) return;
    if (!window.confirm('수도쿠 최고 기록을 모두 초기화할까요?')) return;
    try {
      Object.values(BEST_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch (_) {}
    renderTime();
    const button = document.getElementById('sudokuResetBest');
    if (button) button.disabled = true;
  }

  function ensureTimer() {
    let sudokuActive = false;
    try { sudokuActive = mode === 'sudoku'; } catch (_) {}
    if (!sudokuActive) return;

    const board = document.querySelector('.sudokuBoard');
    const stats = document.querySelector('#content .stats');
    if (!board || !stats) return;

    if (board !== activeBoard) startTimer(board);

    let badge = timerBadge();
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'sudokuElapsedTime';
      badge.className = 'stat sudokuTimerStat';
      stats.appendChild(badge);
    }

    let best = bestBadge();
    if (!best) {
      best = document.createElement('span');
      best.id = 'sudokuBestTime';
      best.className = 'stat sudokuBestStat';
      stats.appendChild(best);
    }

    let reset = document.getElementById('sudokuResetBest');
    if (!reset) {
      reset = document.createElement('button');
      reset.id = 'sudokuResetBest';
      reset.type = 'button';
      reset.className = 'sudokuResetBest';
      reset.textContent = '기록 초기화';
      reset.addEventListener('click', resetBestTimes);
      stats.appendChild(reset);
    }
    reset.disabled = !Object.keys(BEST_KEYS).some((level) => readBest(level));

    const status = document.querySelector('.sudokuStatus');
    if (status?.textContent?.includes('완성!')) stopTimer();
    renderTime();
  }

  const observer = new MutationObserver(ensureTimer);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  ensureTimer();
})();
