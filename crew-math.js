(()=>{
'use strict';const R=CrewMath,$=id=>document.getElementById(id),colors=['#f26075','#6caff2','#f3d56b','#89d3a2','#b29bf0','#f5a36a'];
let session,numbers,clock,epoch=0,busy=false,notes=[],started=false,paused=false,ended=false;const tiles=[],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const saved=JSON.parse(localStorage.getItem('puzzle-lab-crew-math-review')||'[]');if(Array.isArray(saved))notes=saved.filter(R.valid);}catch(_){}
function save(){try{localStorage.setItem('puzzle-lab-crew-math-review',JSON.stringify(notes));}catch(_){}}
function remember(q){notes=notes.filter(n=>R.key(n)!==R.key(q)).concat(q);session.tried=true;session.missed.set(R.key(q),{...q});save();}
function sprite(v){return `<span class="crew" style="--suit:${colors[v]}" aria-hidden="true"><span class="pack"></span><span class="leg l"></span><span class="leg r"></span><span class="body"></span><span class="visor"></span></span>`;}
function updateClock(){
 if(!clock)return;const ms=clock.remaining(performance.now());
 $('countdown').hidden=!started||paused||busy||ended||session.done;
 $('timer-number').textContent=(ms/1000).toFixed(1);$('timer-ring').style.strokeDashoffset=100*(1-ms/5000);
 $('countdown').classList.toggle('urgent',ms<=2000);$('countdown').setAttribute('aria-label',`남은 시간 ${Math.ceil(ms/1000)}초`);
 $('lives').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<clock.lives?'':'empty'}">♥</span>`).join(' ');$('lives').setAttribute('aria-label',`남은 목숨 ${clock.lives}개`);
}
function paint(){
 session.board.flat().forEach((v,i)=>{const b=tiles[i];b.style.setProperty('--tile-color',colors[v]);b.innerHTML=sprite(v)+`<span class="math-number">${numbers[v]}</span>`;b.setAttribute('aria-label',`${Math.floor(i/5)+1}행 ${i%5+1}열 숫자 ${numbers[v]}`);b.classList.remove('matched','wrong');b.disabled=busy||session.done||!started||paused||ended;});
 $('score').textContent=session.score.toLocaleString()+'점';$('progress').textContent=`MISSION ${session.index+1} / 5`;
 $('progress-dots').innerHTML=Array.from({length:5},(_,i)=>`<i class="${i<session.index||i===session.index&&session.done?'done':i===session.index?'current':''}"></i>`).join('');
 $('pause').disabled=!started||ended;$('pause').textContent=paused?'계속하기':'일시정지';updateClock();
}
function hint(show=false){
 const{a,b}=session.question;
 const approach=b===1?`${a}개가 한 묶음이에요. 한 묶음은 몇 개일까요?`:`${a} × ${b-1} = ${a*(b-1)}이에요. 여기에 ${a}만큼 더하면 얼마일까요?`;
 $('hint-content').innerHTML=`<p>${approach}</p><div class="groups" role="img" aria-label="${a}개씩 ${b}묶음">${Array.from({length:b},()=>`<span class="group" aria-hidden="true">${'<i></i>'.repeat(a)}</span>`).join('')}</div><p>${a}개씩 ${b}묶음이에요. 한 묶음씩 세어보세요.</p><p class="addition">${Array(b).fill(a).join(' + ')} = ?</p>`;
 if(session.done)$('hint-content').querySelector('.addition').textContent=`${Array(b).fill(a).join(' + ')} = ${a*b}`;
 $('hint-preview').textContent=approach;$('hint-preview').hidden=!show;$('hint-content').hidden=true;$('show-hint').textContent='그림 힌트';
}
function showQuestion(){numbers=session.numbers();const{a,b}=session.question;$('question').textContent=`${a} × ${b} = ?`;$('prompt').textContent='정답 숫자가 적힌 크루를 눌러주세요.';$('status').textContent='5초 안에 정답 크루를 찾아보세요.';$('combo').textContent='5 SECONDS';hint($('auto-hint').checked);clock.reset(performance.now(),started&&!paused);paint();}
function gate(title,text,button){$('ready-title').textContent=title;$('ready-text').textContent=text;$('begin').textContent=button;$('ready').hidden=false;}
function start(){epoch++;busy=false;started=paused=ended=false;clock=new R.Clock();$('lives').classList.remove('life-lost');document.querySelectorAll('.fx-layer').forEach(el=>el.remove());const value=$('table').value;session=new R.Session(value==='all'?'all':Number(value),notes);$('summary').hidden=true;$('stage-notice').hidden=true;gate('5초 안에 정답 찾기!','목숨은 3개예요. 틀리거나 시간이 지나면 하나씩 줄어요.','시작하기');showQuestion();}
function pause(){if(!started||ended)return;if(!paused){paused=true;clock.pause(performance.now());gate('잠깐 쉬어가요','계속하기를 누르면 남은 시간부터 이어져요.','계속하기');}else{paused=false;$('ready').hidden=true;if(!busy&&!session.done)clock.resume(performance.now());}paint();}
async function finish(won){
 const next=won?R.nextTable(session.table):null;
 if(next!==null){
  busy=true;clock.stop();const token=epoch,total=session.score,previous=session.table;
  paint();$('stage-title').textContent=`${previous}단 클리어!`;$('stage-text').textContent=`다음은 ${next}단이에요.`;$('stage-notice').hidden=false;
  $('status').textContent=`${next}단으로 이동합니다. 점수와 목숨은 그대로예요.`;
  await new Promise(resolve=>setTimeout(resolve,1000));if(token!==epoch)return;
  session=new R.Session(next,notes);session.score=total;$('table').value=String(next);$('stage-notice').hidden=true;busy=false;showQuestion();return;
 }
 ended=true;busy=false;clock.stop();$('ready').hidden=true;paint();$('summary').hidden=false;$('summary-title').textContent=won?(session.table==='all'?'다섯 문제, 해냈어요!':'9단까지 해냈어요!'):'다시 도전해볼까요?';$('summary-score').textContent=`크루 구출 점수 ${session.score.toLocaleString()}점`;
 $('summary-message').textContent=!won?'목숨을 모두 썼어요. 어려웠던 문제는 다음 판에서 다시 연습해요.':session.missed.size?'조금 어려웠던 문제는 다음 판에서 다시 만나볼 거예요.':(session.table==='all'?'다섯 문제를 모두 해결했어요. 한 판 더 도전해볼까요?':'선택한 단부터 9단까지 모두 해결했어요!');
 $('review-list').innerHTML=Array.from(session.missed.values()).map(q=>`<span class="review-equation">${q.a} × ${q.b} = ${q.a*q.b}</span>`).join('');$('again').focus({preventScroll:true});}
async function lose(reason,i){
 if(busy||paused||ended||!started||!clock.lose())return;
 busy=true;const token=epoch;remember({...session.question});paint();if(i!==undefined)tiles[i].classList.add('wrong');hint(true);
 $('status').textContent=reason==='timeout'?'시간이 다 됐어요! 목숨 -1':'아직 아니에요! 목숨 -1';$('lives').classList.add('life-lost');
 await new Promise(resolve=>setTimeout(resolve,650));if(token!==epoch)return;$('lives').classList.remove('life-lost');
 if(clock.over){finish(false);return;}busy=false;clock.reset(performance.now(),!paused);paint();$('status').textContent='다시 5초! 같은 문제를 한 번 더 풀어보세요.';
}
async function choose(i){
 if(busy||session.done||!started||paused||ended)return;
 if(clock.remaining(performance.now())<=0){lose('timeout');return;}
 const q={...session.question},color=session.board.flat()[i];const result=session.answer(color,numbers);
 if(!result.correct){lose('wrong',i);return;}
 clock.stop();if(result.first)notes=notes.filter(n=>R.key(n)!==R.key(q));save();busy=true;const token=epoch;paint();
 result.hit.forEach(j=>tiles[j].classList.add('matched'));CrewFX.burst($('math-board'),result.hit,5);
 $('question').textContent=`${q.a} × ${q.b} = ${q.a*q.b}`;$('prompt').textContent=`${q.a}개씩 ${q.b}묶음, 모두 ${q.a*q.b}개!`;$('status').textContent=`맞았어요! 크루 ${result.hit.length}명 구출 · +${result.points}점`;$('combo').textContent='GREAT JOB!';$('hint-content').querySelector('.addition').textContent=`${Array(q.b).fill(q.a).join(' + ')} = ${q.a*q.b}`;
 await new Promise(resolve=>setTimeout(resolve,700));if(token!==epoch)return;session.refill(result.hit);busy=false;if(session.next())showQuestion();else finish(true);
}
for(let i=0;i<25;i++){const b=document.createElement('button');b.type='button';b.className='tile';b.addEventListener('click',()=>choose(i));b.addEventListener('keydown',e=>{const r=Math.floor(i/5),c=i%5;let next=i;if(e.key==='ArrowLeft'&&c>0)next--;if(e.key==='ArrowRight'&&c<4)next++;if(e.key==='ArrowUp'&&r>0)next-=5;if(e.key==='ArrowDown'&&r<4)next+=5;if(e.key.startsWith('Arrow')){e.preventDefault();tiles[next].focus();}});tiles.push(b);$('math-board').appendChild(b);}
$('begin').addEventListener('click',()=>{if(paused){pause();return;}if(ended)return;started=true;$('ready').hidden=true;clock.reset(performance.now());paint();});
$('pause').addEventListener('click',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused&&!ended)pause();});
$('table').addEventListener('change',start);$('restart').addEventListener('click',start);$('again').addEventListener('click',start);
$('auto-hint').addEventListener('change',()=>hint($('auto-hint').checked));$('show-hint').addEventListener('click',()=>{const open=$('hint-content').hidden;$('hint-content').hidden=!open;$('show-hint').textContent=open?'그림 접기':'그림 힌트';});
function tick(){if(clock&&clock.running&&started&&!paused&&!busy&&!ended&&!session.done&&clock.remaining(performance.now())<=0)lose('timeout');updateClock();requestAnimationFrame(tick);}
start();requestAnimationFrame(tick);
})();
