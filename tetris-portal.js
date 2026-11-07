(() => {
  'use strict';
  const grid=document.querySelector('.portalGrid');
  if(!grid||grid.querySelector('[data-game="tetris"]'))return;
  const card=document.createElement('a');
  card.className='portalCard';card.dataset.game='tetris';card.href='./tetris.html';
  card.style.cssText='text-decoration:none;color:inherit;display:block';
  card.innerHTML='<span class="portalIcon">▦</span><h3>테트리스</h3><p>키보드로 블록을 쌓고 줄을 지우는 클래식 게임입니다.</p><span class="portalGo"><span>시작하기</span><span>›</span></span>';
  grid.appendChild(card);
})();
