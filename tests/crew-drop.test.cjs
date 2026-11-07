const assert=require('node:assert/strict'),R=require('../crew-drop-core.js');const blank=()=>Array.from({length:R.H},()=>Array(R.W).fill(null));
for(const[dr,dc]of[[0,1],[1,0],[1,1],[1,-1]]){const b=blank();for(let k=0;k<4;k++)b[3+k*dr][(dc<0?4:1)+k*dc]=2;assert.equal(R.matches(b).length,4);}
const x=blank();for(let k=0;k<5;k++){x[k][k]=1;x[k][4-k]=1;}assert.equal(R.matches(x).length,9);
const g=new R.Game();const original=g.piece.colors.slice();g.cycle();assert.deepEqual(g.piece.colors,[original[2],original[0],original[1]]);g.cycle();g.cycle();assert.deepEqual(g.piece.colors,original);
while(g.move(-1,0)){}assert.equal(g.piece.x,0);assert(!g.move(-1,0));while(g.move(1,0)){}assert.equal(g.piece.x,5);assert(!g.move(1,0));assert.equal(g.ghostY(),9);g.hardDrop();assert.equal(g.board.flat().filter(v=>v!==null).length,3);
const b=blank();b[10][0]=1;b[11][0]=2;b[7][0]=3;R.collapse(b,[11*6]);assert.equal(b[11][0],1);assert.equal(b[10][0],3);assert.equal(b[9][0],null);
const top=new R.Game();top.board[0][2]=0;top.spawn();assert(top.over);
const overflow=new R.Game();overflow.piece.y=-1;overflow.lock();assert(overflow.over);assert(overflow.board.flat().every(v=>v===null));
// Match removed in wave one makes a diagonal fall into a horizontal second wave.
const cascade=blank();cascade[11][0]=cascade[11][1]=cascade[11][2]=1;cascade[10][0]=2;cascade[9][1]=2;cascade[7][2]=2;
const hit=R.matches(cascade);R.collapse(cascade,hit);assert(R.matches(cascade).length>=3);
let seed=14;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
for(let run=0;run<80;run++){const a=new R.Game(rand);let n=0;while(!a.over&&n++<200){const direction=rand()<.5?-1:1;for(let i=0;i<Math.floor(rand()*5);i++)a.move(direction,0);a.cycle();a.hardDrop();if(a.over)break;let h=R.matches(a.board),chain=0;while(h.length){a.clear(h,++chain);h=R.matches(a.board);}a.spawn();assert(a.board.every(row=>row.length===6));assert(Number.isFinite(a.score));}assert(a.over);}
console.log('Passed rectangular directions, overlap, cycling, walls, hard drop, collapse, cascade, top-out, and 80 simulated games.');
