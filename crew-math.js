(()=>{
'use strict';const R=CrewMath,$=id=>document.getElementById(id),colors=['#f26075','#6caff2','#f3d56b','#89d3a2','#b29bf0','#f5a36a'];
let session,numbers,epoch=0,busy=false,notes=[];const tiles=[],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const saved=JSON.parse(localStorage.getItem('puzzle-lab-crew-math-review')||'[]');if(Array.isArray(saved))notes=saved.filter(R.valid);}catch(_){}
function save(){try{localStorage.setItem('puzzle-lab-crew-math-review',JSON.stringify(notes));}catch(_){}}
function sprite(v){return `<span class="crew" style="--suit:${colors[v]}" aria-hidden="true"><span class="pack"></span><span class="leg l"></span><span class="leg r"></span><span class="body"></span><span class="visor"></span></span>`;}
function paint(){
 session.board.flat().forEach((v,i)=>{const b=tiles[i];b.style.setProperty('--tile-color',colors[v]);b.innerHTML=sprite(v)+`<span class="math-number">${numbers[v]}</span>`;b.setAttribute('aria-label',`${Math.floor(i/5)+1}행 ${i%5+1}열 숫자 ${numbers[v]}`);b.classList.remove('matched','wrong');b.disabled=busy||session.done;});
 $('score').textContent=session.score.toLocaleString()+'점';$('progress').textContent=`MISSION ${session.index+1} / 5`;
 $('progress-dots').innerHTML=Array.from({length:5},(_,i)=>`<i class="${i<session.index||i===session.index&&session.done?'done':i===session.index?'current':''}"></i>`).join('');
}
function hint(show=false){
 const{a,b}=session.question;
 const approach=b===1?`${a}개가 한 묶음이에요. 한 묶음은 몇 개일까요?`:`${a} × ${b-1} = ${a*(b-1)}이에요. 여기에 ${a}만큼 더하면 얼마일까요?`;
 $('hint-content').innerHTML=`<p>${approach}</p><div class="groups" role="img" aria-label="${a}개씩 ${b}묶음">${Array.from({length:b},()=>`<span class="group" aria-hidden="true">${'<i></i>'.repeat(a)}</span>`).join('')}</div><p>${a}개씩 ${b}묶음이에요. 한 묶음씩 세어보세요.</p><p class="addition">${Array(b).fill(a).join(' + ')} = ?</p>`;
 if(session.done)$('hint-content').querySelector('.addition').textContent=`${Array(b).fill(a).join(' + ')} = ${a*b}`;
 $('hint-preview').textContent=approach;$('hint-preview').hidden=!show;
 $('hint-content').hidden=true;$('show-hint').textContent='그림 힌트';
}
function showQuestion(focus=false){
 numbers=session.numbers();const{a,b}=session.question;$('question').textContent=`${a} × ${b} = ?`;$('prompt').textContent='정답 숫자가 적힌 크루를 눌러주세요.';$('status').textContent='천천히 생각해도 괜찮아요.';$('combo').textContent='NO TIME LIMIT';
 hint($('auto-hint').checked);paint();if(focus){$('question').focus({preventScroll:true});$('question').scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'});}
}
function start(){epoch++;busy=false;document.querySelectorAll('.fx-layer').forEach(el=>el.remove());const value=$('table').value;session=new R.Session(value==='all'?'all':Number(value),notes);$('summary').hidden=true;showQuestion();}
async function choose(i){
 if(busy||session.done)return;const q={...session.question},color=session.board.flat()[i];const result=session.answer(color,numbers);
 if(!result.correct){notes=notes.filter(n=>R.key(n)!==R.key(q)).concat(q);save();tiles[i].classList.add('wrong');$('status').textContent='아직 아니에요. 아래 그림을 보고 다시 골라보세요.';hint(true);$('hint-content').hidden=false;$('show-hint').textContent='그림 접기';return;}
 if(result.first)notes=notes.filter(n=>R.key(n)!==R.key(q));save();busy=true;const token=epoch;paint();
 result.hit.forEach(j=>tiles[j].classList.add('matched'));CrewFX.burst($('math-board'),result.hit,5);
 $('question').textContent=`${q.a} × ${q.b} = ${q.a*q.b}`;$('prompt').textContent=`${q.a}개씩 ${q.b}묶음, 모두 ${q.a*q.b}개!`;$('status').textContent=`맞았어요! 크루 ${result.hit.length}명 구출 · +${result.points}점`;$('combo').textContent='GREAT JOB!';
 $('hint-content').querySelector('.addition').textContent=`${Array(q.b).fill(q.a).join(' + ')} = ${q.a*q.b}`;
 await new Promise(resolve=>setTimeout(resolve,700));if(token!==epoch)return;
 session.refill(result.hit);busy=false;advance();
}
for(let i=0;i<25;i++){const b=document.createElement('button');b.type='button';b.className='tile';b.addEventListener('click',()=>choose(i));b.addEventListener('keydown',e=>{const r=Math.floor(i/5),c=i%5;let next=i;if(e.key==='ArrowLeft'&&c>0)next--;if(e.key==='ArrowRight'&&c<4)next++;if(e.key==='ArrowUp'&&r>0)next-=5;if(e.key==='ArrowDown'&&r<4)next+=5;if(e.key.startsWith('Arrow')){e.preventDefault();tiles[next].focus();}});tiles.push(b);$('math-board').appendChild(b);}
function advance(){
 if(busy||!session.done)return;
 if(session.next()){showQuestion();return;}
 paint();$('summary').hidden=false;$('summary-score').textContent=`크루 구출 점수 ${session.score.toLocaleString()}점`;
 $('summary-message').textContent=session.missed.size?'조금 어려웠던 문제는 다음 판에서 다시 만나볼 거예요.':'다섯 문제를 모두 해결했어요. 한 판 더 도전해볼까요?';
 $('review-list').innerHTML=Array.from(session.missed.values()).map(q=>`<span class="review-equation">${q.a} × ${q.b} = ${q.a*q.b}</span>`).join('');$('again').focus({preventScroll:true});
}
$('table').addEventListener('change',start);$('restart').addEventListener('click',()=>{start();$('table').scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'});});$('again').addEventListener('click',()=>{start();$('table').focus({preventScroll:true});$('table').scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'});});
$('auto-hint').addEventListener('change',()=>hint($('auto-hint').checked));$('show-hint').addEventListener('click',()=>{const open=$('hint-content').hidden;$('hint-content').hidden=!open;$('show-hint').textContent=open?'그림 접기':'그림 힌트';});
start();
})();
