(() => {
  function ensureSudokuRule() {
    let active = false;
    try { active = mode === 'sudoku'; } catch (_) {}
    if (!active) return;

    const content = document.getElementById('content');
    const board = content?.querySelector('.sudokuWrap');
    if (!content || !board || content.querySelector('.sudokuRuleBanner')) return;

    const rule = document.createElement('div');
    rule.className = 'sudokuRuleBanner';
    rule.innerHTML = '<strong>규칙</strong><span>각 가로줄, 세로줄, 3×3 박스에 1~9가 한 번씩 들어가야 합니다.</span>';

    content.prepend(rule);
  }

  const observer = new MutationObserver(ensureSudokuRule);
  observer.observe(document.body, { childList: true, subtree: true });
  ensureSudokuRule();
})();
