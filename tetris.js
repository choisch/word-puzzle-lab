(() => {
  'use strict';
  const $=id=>document.getElementById(id), game=new TetrisRules.Game();
  const ctx=$('board').getContext('2d'), nextCtx=$('next').getContext('2d');
  const colors=['','#53d7e8','#6689f7','#f6ad59','#f4d96d','#80d997','#b894f6','#f07b89'];
  let state='ready', best=0, last=0, gravity=0, grounded=0, resets=0;
  const held=new Map();
  try { best=Math.max(0,Number(localStorage.getItem('puzzle-lab-tetris-best'))||0); } catch (_) { /* Storage can be disabled. */ }
  function clearHeld() {
    held.clear();
    document.querySelectorAll('.touch-controls .is-held').forEach(button=>button.classList.remove('is-held'));
  }
  function saveBest() {
    if(game.score<=best) return;
    best=game.score;
    try { localStorage.setItem('puzzle-lab-tetris-best',String(best)); } catch (_) { /* Play continues without storage. */ }
  }
  function cell(context,x,y,size,color,ghost=false) {
    context.fillStyle=color;
    if(ghost){context.globalAlpha=.5;context.strokeStyle=color;context.lineWidth=1.5;context.strokeRect(x+3,y+3,size-6,size-6);context.globalAlpha=1;return;}
    context.fillRect(x+1,y+1,size-2,size-2);
    context.fillStyle='#ffffff35';context.fillRect(x+2,y+2,size-4,3);
    context.fillStyle='#00000022';context.fillRect(x+2,y+size-5,size-4,3);
  }
  function drawPiece(context,matrix,x,y,size,ghost=false) {
    matrix.forEach((row,r)=>row.forEach((v,c)=>{if(v && y+r*size>=0)cell(context,x+c*size,y+r*size,size,colors[v],ghost);}));
  }
  function draw() {
    ctx.fillStyle='#0b1019';ctx.fillRect(0,0,300,600);
    ctx.strokeStyle='#192231';ctx.lineWidth=.5;
    for(let x=0;x<=300;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke();}
    for(let y=0;y<=600;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(300,y);ctx.stroke();}
    drawPiece(ctx,game.board,0,0,30);
    if(!game.over){drawPiece(ctx,game.piece.matrix,game.piece.x*30,game.ghostY()*30,30,true);drawPiece(ctx,game.piece.matrix,game.piece.x*30,game.piece.y*30,30);}
    nextCtx.clearRect(0,0,160,100);
    const m=TetrisRules.SHAPES[game.next];
    drawPiece(nextCtx,m,(160-m.length*25)/2,(100-m.length*25)/2,25);
    $('score').textContent=game.score.toLocaleString();$('level').textContent=game.level;
    $('lines').textContent=game.lines;$('best').textContent=best.toLocaleString();
    document.querySelectorAll('[data-action]').forEach(button=>button.disabled=state!=='playing');
  }
  function overlay(label,title,text,button) {
    $('overlay-label').textContent=label;$('overlay-title').textContent=title;
    $('overlay-text').textContent=text;$('play').textContent=button;$('overlay').hidden=false;
  }
  function start() {
    game.reset();state='playing';gravity=0;grounded=0;resets=0;clearHeld();
    $('overlay').hidden=true;$('pause').disabled=false;$('pause').innerHTML='일시정지 <kbd>P</kbd>';
    $('status').textContent='빈 줄을 남기지 않고 쌓아보세요.';draw();
  }
  function pause() {
    if(state==='playing') {
      state='paused';clearHeld();overlay('PAUSED','잠깐 쉬어가세요.','계속하기 버튼을 누르면 이어서 할 수 있습니다.','계속하기');
      $('pause').innerHTML='계속하기 <kbd>P</kbd>';
    } else if(state==='paused') {
      state='playing';$('overlay').hidden=true;$('pause').innerHTML='일시정지 <kbd>P</kbd>';
    }
    draw();
  }
  function afterLock(cleared) {
    gravity=0;grounded=0;resets=0;saveBest();
    if(cleared) $('status').textContent=cleared===4?'테트리스! 한 번에 4줄을 지웠습니다.':`${cleared}줄을 지웠습니다!`;
    if(game.over) {
      state='over';clearHeld();$('pause').disabled=true;
      overlay('GAME OVER','다시 도전해볼까요?',`${game.score.toLocaleString()}점 · ${game.lines}줄 · 레벨 ${game.level}`,'다시 시작');
      $('status').textContent='게임이 끝났습니다. Enter로 다시 시작하세요.';
    }
  }
  function action(code) {
    if(state!=='playing')return;
    const wasGrounded=game.collides(game.piece.matrix,game.piece.x,game.piece.y+1);
    let changed=false;
    if(code==='ArrowLeft')changed=game.move(-1,0);
    if(code==='ArrowRight')changed=game.move(1,0);
    if(code==='ArrowDown'){if(game.move(0,1)){game.score++;gravity=0;}}
    if(code==='ArrowUp'||code==='KeyX')changed=game.rotate(1);
    if(code==='KeyZ')changed=game.rotate(-1);
    if(code==='Space'){afterLock(game.hardDrop());draw();return;}
    if(changed && wasGrounded && resets<15){grounded=0;resets++;}
    saveBest();draw();
  }
  const keys=['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','KeyX','KeyZ','KeyP','Escape','Enter'];
  window.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||!keys.includes(e.code))return;
    // Leave Tab and focused button activation to the browser.
    if((e.code==='Enter'||e.code==='Space')&&document.activeElement?.tagName==='BUTTON')return;
    e.preventDefault();if(e.repeat)return;
    if(e.code==='KeyP'||e.code==='Escape'){pause();return;}
    if(e.code==='Enter'){if(state==='paused')pause();else if(state==='ready'||state==='over')start();return;}
    if(state!=='playing')return;
    if(['ArrowLeft','ArrowRight','ArrowDown'].includes(e.code))held.set(e.code,{age:0,next:160});
    action(e.code);
  });
  window.addEventListener('keyup',e=>held.delete(e.code));
  window.addEventListener('blur',()=>{if(state==='playing')pause();clearHeld();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
  $('play').addEventListener('click',()=>{if(state==='paused')pause();else start();$('play').blur();});
  $('pause').addEventListener('click',()=>{pause();$('pause').blur();});
  $('restart').addEventListener('click',()=>{start();$('restart').blur();});
  document.querySelectorAll('[data-action]').forEach(button=>{
    const code=button.dataset.action;
    button.addEventListener('pointerdown',e=>{
      if(state!=='playing'||(e.pointerType==='mouse'&&e.button!==0))return;
      e.preventDefault();button.setPointerCapture(e.pointerId);button.classList.add('is-held');
      if(['ArrowLeft','ArrowRight','ArrowDown'].includes(code))held.set('pointer:'+e.pointerId,{code,age:0,next:160});
      action(code);
    });
    const release=e=>{held.delete('pointer:'+e.pointerId);button.classList.remove('is-held');};
    button.addEventListener('pointerup',release);
    button.addEventListener('pointercancel',release);
    button.addEventListener('lostpointercapture',release);
    // Native button activation from assistive technology or a keyboard.
    button.addEventListener('click',e=>{if(e.detail===0)action(code);});
    button.addEventListener('contextmenu',e=>e.preventDefault());
  });
  function frame(now) {
    const dt=Math.min(50,now-(last||now));last=now;
    if(state==='playing') {
      for(const [code,key] of held){key.age+=dt;while(key.age>=key.next){action(key.code||code);key.next+=(key.code||code)==='ArrowDown'?35:50;}}
      gravity+=dt;
      const interval=Math.max(70,800*Math.pow(.8,game.level-1));
      if(gravity>=interval){game.move(0,1);gravity=0;}
      if(game.collides(game.piece.matrix,game.piece.x,game.piece.y+1)){
        grounded+=dt;if(grounded>=500)afterLock(game.lock());
      }else grounded=0;
      draw();
    }
    requestAnimationFrame(frame);
  }
  draw();requestAnimationFrame(frame);
})();
