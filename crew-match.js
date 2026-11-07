(()=>{
'use strict';
const R=CrewMatch,$=id=>document.getElementById(id),colors=['#f26075','#6caff2','#f3d56b','#89d3a2','#b29bf0','#f5a36a'],names=['빨강','파랑','노랑','초록','보라','주황'],marks=['●','◆','★','▲','♥','✚'];
let board,selected=null,score=0,turns=30,best=0,busy=false,epoch=0,sound=false,audio=null;
const tiles=[];const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
try{best=Number(localStorage.getItem('puzzle-lab-crew-match-best'))||0;}catch(_){}
function tone(chain){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(390+chain*90,audio.currentTime);g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.2);}catch(_){}}
function record(){if(score>best){best=score;try{localStorage.setItem('puzzle-lab-crew-match-best',String(best));}catch(_){}}}
function sprite(v){return `<span class="crew" style="--suit:${colors[v]}" aria-hidden="true"><span class="pack"></span><span class="leg l"></span><span class="leg r"></span><span class="body"></span><span class="visor"></span><span class="mark">${marks[v]}</span></span>`;}
function paint(){
 board.flat().forEach((v,i)=>{const b=tiles[i];b.innerHTML=sprite(v);b.setAttribute('aria-label',`${Math.floor(i/8)+1}행 ${i%8+1}열 ${names[v]} 크루`);b.setAttribute('aria-pressed',String(i===selected));b.classList.toggle('selected',i===selected);b.classList.remove('matched','hint');b.disabled=busy||turns===0;});
 $('score').textContent=score.toLocaleString();$('moves').textContent=turns;$('best').textContent=best.toLocaleString();$('hint').disabled=busy||turns===0;
}
function message(text){$('status').textContent=text;}
function start(){epoch++;board=R.create();score=0;turns=30;selected=null;busy=false;$('end').hidden=true;$('combo').textContent='READY';message('크루를 하나 고른 다음, 이웃한 크루를 눌러 자리를 바꿔보세요.');paint();}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,reduced?0:ms));
async function exchange(a,b){
 if(busy||turns===0)return;
 if(!R.adjacent(a,b)){selected=b;paint();message('선택한 크루의 바로 옆이나 대각선 이웃을 골라주세요.');return;}
 const token=epoch;selected=null;busy=true;R.swap(board,a,b);paint();
 let hit=R.matches(board);
 if(!hit.length){message('3명이 이어지지 않아 원래 자리로 돌아갑니다. 횟수는 줄지 않습니다.');await wait(220);if(token!==epoch)return;R.swap(board,a,b);busy=false;paint();return;}
 turns--;let chain=0,total=0,gained=0;
 while(hit.length){
  chain++;total+=hit.length;const points=hit.length*10*chain;score+=points;gained+=points;record();paint();
  hit.forEach(i=>tiles[i].classList.add('matched'));$('combo').textContent=chain>1?`${chain}× COMBO`:`+${points}`;tone(chain);
  message(`${chain}연쇄! 크루 ${hit.length}명 · +${points.toLocaleString()}점`);
  await wait(260);if(token!==epoch)return;
  R.refill(board,hit);paint();await wait(160);if(token!==epoch)return;
  hit=R.matches(board);
  // Keep pathological refill runs bounded without leaving unresolved matches.
  if(chain>=50&&hit.length){board=R.create();hit=[];}
 }
 if(!R.moves(board).length&&turns>0){board=R.create();message('가능한 교환이 없어 새 배치로 바꿨습니다.');}
 else message(`${total}명 구출 · +${gained.toLocaleString()}점${chain>1?` · ${chain}연쇄!`:''}`);
 busy=false;paint();
 if(turns===0){$('result').textContent=`최종 ${score.toLocaleString()}점 · 최고 ${best.toLocaleString()}점`;$('end').hidden=false;$('combo').textContent='COMPLETE';message('30번의 미션을 마쳤습니다. 다시 도전해보세요!');$('again').focus();}
}
function choose(i){if(busy||turns===0)return;if(selected===null){selected=i;paint();}else if(selected===i){selected=null;paint();}else exchange(selected,i);}
for(let i=0;i<64;i++){
 const b=document.createElement('button');b.type='button';b.className='tile';b.dataset.index=i;
 b.addEventListener('click',()=>{if(suppress===i){suppress=null;return;}choose(i);});
 b.addEventListener('keydown',e=>{let next=i;if(e.key==='ArrowLeft')next=i%8?i-1:i;if(e.key==='ArrowRight')next=i%8<7?i+1:i;if(e.key==='ArrowUp')next=i>=8?i-8:i;if(e.key==='ArrowDown')next=i<56?i+8:i;if(e.key.startsWith('Arrow')){e.preventDefault();tiles[next].focus();}if(e.key==='Escape'){selected=null;paint();}});
 tiles.push(b);$('board').appendChild(b);
}
let drag=null,suppress=null;
$('board').addEventListener('pointerdown',e=>{const b=e.target.closest('.tile');if(!b||busy||!turns)return;drag={id:e.pointerId,a:+b.dataset.index,x:e.clientX,y:e.clientY};});
window.addEventListener('pointerup',e=>{
 if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;
 const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)<15)return;
 suppress=d.a;setTimeout(()=>{if(suppress===d.a)suppress=null;},350);
 if(busy||!turns)return;
 const horizontal=Math.abs(dx)>Math.abs(dy)*2,vertical=Math.abs(dy)>Math.abs(dx)*2;
 const dr=horizontal?0:Math.sign(dy),dc=vertical?0:Math.sign(dx),r=Math.floor(d.a/8)+dr,c=d.a%8+dc;
 if(r>=0&&r<8&&c>=0&&c<8)exchange(d.a,r*8+c);
});
window.addEventListener('pointercancel',()=>{drag=null;});
window.addEventListener('blur',()=>{drag=null;});
$('hint').addEventListener('click',()=>{if(busy||!turns)return;selected=null;paint();const pair=R.moves(board)[0];if(pair){pair.forEach(i=>tiles[i].classList.add('hint'));message('테두리가 빛나는 두 크루의 자리를 바꿔보세요.');}});
$('restart').addEventListener('click',start);$('again').addEventListener('click',start);
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').textContent=sound?'소리 켬':'소리 끔';$('sound').setAttribute('aria-pressed',String(sound));$('sound').title=sound?'효과음 끄기':'효과음 켜기';if(sound)tone(1);});
start();
})();
