(() => {
  let activeBoard = null;
  let startedAt = 0;
  let stoppedAt = 0;
  let timerId = null;

  function formatElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return hours ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function timerBadge() {
    return document.getElementById('sudokuElapsedTime');
  }

  function renderTime() {
    const badge = timerBadge();
    if (!badge || !startedAt) return;
    const end = stoppedAt || Date.now();
    badge.textContent = `시간 ${formatElapsed(end - startedAt)}`;
    badge.classList.toggle('stopped', !!stoppedAt);
  }

  function stopTimer() {
    if (!startedAt || stoppedAt) return;
    stoppedAt = Date.now();
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    renderTime();
  }

  function startTimer(board) {
    activeBoard = board;
    startedAt = Date.now();
    stoppedAt = 0;
    if (timerId) clearInterval(timerId);
    timerId = setInterval(renderTime, 1000);
    renderTime();
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
      renderTime();
    }

    const status = document.querySelector('.sudokuStatus');
    if (status?.textContent?.includes('완성!')) stopTimer();
  }

  const observer = new MutationObserver(ensureTimer);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  ensureTimer();
})();
