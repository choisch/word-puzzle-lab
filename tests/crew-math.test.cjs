const assert=require('node:assert/strict'),R=require('../crew-math-core.js');let seed=29;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
for(const table of[2,3,4,5,6,7,8,9,'all'])for(let run=0;run<30;run++){
 const s=new R.Session(table,[],random);assert.equal(s.queue.length,5);if(table!=='all')assert(s.queue.every(q=>q.a===table));
 for(let step=0;step<5;step++){const q=s.question,n=s.numbers();assert.equal(n.filter(v=>v===q.a*q.b).length,2);assert.equal(new Set(n).size,3);assert(n.every(v=>v>0&&v<=81));assert.equal(new Set(s.board.flat()).size,6);
 const before=s.score;if(step===0){const wrong=n.findIndex(v=>v!==q.a*q.b);assert.equal(s.answer(wrong,n).correct,false);assert.equal(s.index,0);assert.equal(s.score,before);assert(s.missed.has(R.key(q)));}
 const color=n.indexOf(q.a*q.b),r=s.answer(color,n);assert(r.correct);if(step===0)assert.equal(R.key(s.queue[2]),R.key(q));assert(r.hit.length>0);assert.equal(s.score,before+r.hit.length*10);assert(s.answer(color,n).ignored);s.refill(r.hit);assert.equal(s.board.flat().length,25);assert.equal(new Set(s.board.flat()).size,6);assert.equal(s.next(),step<4);}
}
const review=new R.Session(6,[{a:6,b:7},{a:9,b:9},{a:4,b:99}],random);assert.equal(R.key(review.queue[0]),'6x7');assert(review.queue.every(q=>q.a===6));assert(!R.valid({a:1,b:7}));assert(!R.valid({a:3,b:0}));
console.log('Passed 270 seeded five-question sessions, answer choices, no wrong-answer penalty, delayed review, refill, duplicate-submit guard, and table filtering.');
