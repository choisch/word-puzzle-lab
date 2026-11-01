(() => {
  'use strict';
  const portal = document.querySelector('.puzzlePortal');
  const grid = portal?.querySelector('.portalGrid');
  const layout = document.querySelector('.layout');
  const content = document.getElementById('content');
  const back = document.querySelector('.portalBack');
  const top = document.querySelector('.top');
  if (!portal || !grid || !layout || !content || !back || !top) return;

  let iframe = null;
  let heightObserver = null;

  function setTop(subtitle) {
    const title = top.querySelector('h1');
    const sub = top.querySelector('.sub');
    if (title) title.textContent = 'Puzzle Lab';
    if (sub) sub.textContent = subtitle;
  }

  function resizeGame() {
    if (!iframe || !iframe.isConnected) return;
    const app = iframe.contentDocument?.querySelector('.gg-app');
    if (!app) return;
    iframe.style.height = Math.max(560, Math.ceil(app.getBoundingClientRect().height) + 2) + 'px';
  }

  function enterGame() {
    portal.classList.add('portal-hidden');
    layout.classList.remove('portal-hidden');
    layout.classList.add('gugudan-mode');
    back.classList.add('visible');
    setTop('2단부터 9단까지, 제한시간 안에 문제를 풀어보세요.');

    content.className = 'gugudanPortalContent';
    content.replaceChildren();
    iframe = document.createElement('iframe');
    iframe.className = 'gugudanFrame';
    iframe.title = '구구단 스피드 챌린지';
    iframe.src = './gugudan-speed.html';
    iframe.setAttribute('scrolling', 'no');
    iframe.addEventListener('load', () => {
      if (!iframe || !iframe.isConnected) return;
      const app = iframe.contentDocument?.querySelector('.gg-app');
      if (!app) return;
      resizeGame();
      if (typeof ResizeObserver !== 'undefined') {
        heightObserver?.disconnect();
        heightObserver = new ResizeObserver(resizeGame);
        heightObserver.observe(app);
      }
    });
    content.appendChild(iframe);
  }

  function leaveGame() {
    if (!layout.classList.contains('gugudan-mode')) return;
    heightObserver?.disconnect();
    heightObserver = null;
    iframe?.remove();
    iframe = null;
    layout.classList.remove('gugudan-mode');
    content.classList.remove('gugudanPortalContent');
    content.replaceChildren();
  }

  if (!grid.querySelector('[data-game="gugudan-speed"]')) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'portalCard';
    card.dataset.game = 'gugudan-speed';
    card.innerHTML = '<span class="portalIcon">×</span><h3>구구단 스피드</h3><p>쉬운 문제부터 18문제씩 4세트로 연습해요.</p><span class="portalGo"><span>시작하기</span><span>›</span></span>';
    card.addEventListener('click', enterGame);
    grid.appendChild(card);
  }

  back.addEventListener('click', leaveGame);
})();
