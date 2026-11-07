(()=>{
'use strict';const R=CrewDrop,$=id=>document.getElementById(id),g=new R.Game(),colors=['#f26075','#6caff2','#f3d56b','#89d3a2','#b29bf0','#f5a36a'],marks=['●','◆','★','▲','♥','✚'];
let state='ready',phase='falling',best=0,last=0,gravity=0,ground=0,resets=0,phaseTime=0,hits=[],chain=0;const held=new Map(),cells=[];const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{best=Number(localStorage.getItem('puzzle-lab-crew-drop-best'))||0;}catch(_){}
for(let i=0;i<R.W*R.H;i++){const el=document.createElement('div');el.className='drop-cell';$('drop-board').appendChild(el);cells.push(el);}
function sprite(v){return `<span class="crew" style="--suit:${colors[v]}" aria-hidden="true"><span class="pack"></span><span class="leg l"></span><span class="leg r"></span><span class="body"></span><span class="visor"></span><span class="mark">${marks[v]}</span></span>`;}
function record(){if(g.score>best){best=g.score;try{localStorage.setItem('puzzle-lab-crew-drop-best',String(best));}catch(_){}}}
function draw(){
 const view=g.board.map(row=>row.map(v=>({v,kind:''})));
 if(!g.over&&phase==='falling'){
  const ghost=g.ghostY();g.piece.colors.forEach((v,k)=>{if(ghost+k>=0)view[ghost+k][g.piece.x]={v,kind:'ghost'};});
  g.piece.colors.forEach((v,k)=>{if(g.piece.y+k>=0)view[g.piece.y+k][g.piece.x]={v,kind:'active'};});
 }
 const marked=new Set(phase==='clear'?hits:[]);
 view.flat().forEach(({v,kind},i)=>{const el=cells[i];el.className='drop-cell'+(v!==null?' filled':'')+(kind?' '+kind:'')+(marked.has(i)?' matched':'');el.style.setProperty('--tile-color',v!==null?colors[v]:'#7084ae');el.innerHTML=v!==null?sprite(v):'';});
 $('next').innerHTML=g.next.map(v=>`<div class="drop-cell filled" style="--tile-color:${colors[v]}">${sprite(v)}</div>`).join('');
 record();$('score').textContent=g.score.toLocaleString();$('level').textContent=g.level;$('cleared').textContent=g.cleared;$('best').textContent=best.toLocaleString();
 document.querySelectorAll('[data-action]').forEach(b=>b.disabled=state!=='playing'||phase!=='falling');$('pause').disabled=state==='ready'||state==='over';
}
function clearHeld(){held.clear();document.querySelectorAll('.is-held').forEach(b=>b.classList.remove('is-held'));}
function overlay(label,title,text,button){$('overlay-label').textContent=label;$('overlay-title').textContent=title;$('overlay-text').textContent=text;$('play').textContent=button;$('overlay').hidden=false;}
function start(){g.reset();state='playing';phase='falling';gravity=ground=resets=phaseTime=chain=0;hits=[];clearHeld();document.querySelectorAll('.fx-layer').forEach(el=>el.remove());$('overlay').hidden=true;$('pause').textContent='일시정지';$('status').textContent='같은 색 크루 3명을 가로·세로·대각선으로 연결하세요.';draw();}
function pause(){if(state==='playing'){state='paused';clearHeld();overlay('PAUSED','잠깐 쉬어가세요.','계속하기를 누르면 이어서 할 수 있습니다.','계속하기');$('pause').textContent='계속하기';}else if(state==='paused'){state='playing';$('overlay').hidden=true;$('pause').textContent='일시정지';}draw();}
function finish(){state='over';clearHeld();record();overlay('GAME OVER','다시 도전해볼까요?',`${g.score.toLocaleString()}점 · 크루 ${g.cleared}명 · 레벨 ${g.level}`,'다시 시작');$('status').textContent='크루가 입구까지 쌓였습니다. 새 게임으로 다시 도전하세요.';draw();}
function resolve(){
 if(g.over){finish();return;}
 hits=R.matches(g.board);
 if(hits.length){chain++;phase='clear';phaseTime=0;draw();CrewFX.burst($('drop-board'),hits,R.W);$('status').textContent=`${chain}연쇄! 크루 ${hits.length}명 · +${hits.length*10*chain}점`;}
 else{g.spawn();if(g.over){finish();return;}phase='falling';gravity=ground=resets=chain=0;draw();}
}
function landed(){clearHeld();phase='settle';chain=0;resolve();}
function action(kind){
 if(state!=='playing'||phase!=='falling')return;
 const atFloor=g.collides(g.piece.x,g.piece.y+1);let moved=false;
 if(kind==='left')moved=g.move(-1,0);if(kind==='right')moved=g.move(1,0);if(kind==='cycle'){g.cycle();moved=true;}
 if(kind==='down'&&g.move(0,1)){g.score++;gravity=0;}
 if(kind==='drop'){g.hardDrop();landed();return;}
 if(moved&&atFloor&&resets<15){ground=0;resets++;}draw();
}
const mapping={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'cycle',KeyX:'cycle',Space:'drop'};
window.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.altKey||e.metaKey)return;
 if((e.code==='Enter'||e.code==='Space')&&document.activeElement?.tagName==='BUTTON')return;
 if(!mapping[e.code]&&!['Enter','Escape','KeyP'].includes(e.code))return;
 e.preventDefault();if(e.repeat)return;
 if(e.code==='Enter'){if(state==='paused')pause();else if(state==='ready'||state==='over')start();return;}
 if(e.code==='Escape'||e.code==='KeyP'){pause();return;}
 const kind=mapping[e.code];if(state!=='playing'||phase!=='falling')return;
 if(['left','right','down'].includes(kind))held.set(e.code,{kind,age:0,next:160});action(kind);
});
window.addEventListener('keyup',e=>held.delete(e.code));
window.addEventListener('blur',()=>{if(state==='playing')pause();clearHeld();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
document.querySelectorAll('[data-action]').forEach(b=>{
 const kind=b.dataset.action;
 b.addEventListener('pointerdown',e=>{if(state!=='playing'||phase!=='falling'||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('is-held');if(kind==='left'||kind==='right')held.set('pointer:'+e.pointerId,{kind,age:0,next:160});action(kind);});
 const release=e=>{held.delete('pointer:'+e.pointerId);b.classList.remove('is-held');};for(const event of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,release);
 b.addEventListener('click',e=>{if(e.detail===0)action(kind);});b.addEventListener('contextmenu',e=>e.preventDefault());
});
$('play').addEventListener('click',()=>{if(state==='paused')pause();else start();$('play').blur();});$('restart').addEventListener('click',()=>{start();$('restart').blur();});$('pause').addEventListener('click',()=>{pause();$('pause').blur();});
function frame(now){const dt=Math.min(50,now-(last||now));last=now;if(state==='playing'){
 if(phase==='falling'){
  for(const h of held.values()){h.age+=dt;while(h.age>=h.next){action(h.kind);h.next+=h.kind==='down'?35:55;}}
  gravity+=dt;if(gravity>=Math.max(110,900*Math.pow(.83,g.level-1))){g.move(0,1);gravity=0;draw();}
  if(g.collides(g.piece.x,g.piece.y+1)){ground+=dt;if(ground>=500){g.lock();landed();}}else ground=0;
 }else{phaseTime+=dt;if(phase==='clear'&&phaseTime>=(reduced?60:480)){g.clear(hits,chain);phase='settle';phaseTime=0;draw();}else if(phase==='settle'&&phaseTime>=(reduced?60:170))resolve();}
}requestAnimationFrame(frame);}
draw();requestAnimationFrame(frame);
})();
