const assert=require('node:assert/strict'),R=require('../crew-match-core.js');
const blank=()=>Array.from({length:8},()=>Array(8).fill(null));
for(const [dr,dc]of[[0,1],[1,0],[1,1],[1,-1]]){const b=blank();for(let k=0;k<4;k++)b[1+k*dr][4+k*dc]=2;assert.equal(R.matches(b).length,4);}
const x=blank();for(let k=0;k<5;k++){x[k][k]=1;x[k][4-k]=1;}assert.equal(R.matches(x).length,9);
const two=blank();two[0][0]=two[0][1]=0;assert.deepEqual(R.matches(two),[]);
assert(R.adjacent(0,9));assert(!R.adjacent(7,8));assert(!R.adjacent(0,0));assert(!R.adjacent(0,16));
const b=Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>(r+c)%6));const original=b.map(r=>r.slice());R.swap(b,0,1);R.swap(b,0,1);assert.deepEqual(b,original);R.moves(b);assert.deepEqual(b,original);
const drop=blank();for(let r=0;r<8;r++)drop[r][0]=r;R.refill(drop,[6*8,7*8],()=>.5);assert.deepEqual(drop.map(r=>r[0]),[3,3,0,1,2,3,4,5]);
let seed=123456;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
for(let k=0;k<100;k++){
 const board=R.create(random);assert.equal(R.matches(board).length,0);const legal=R.moves(board);assert(legal.length);assert(board.flat().every(v=>Number.isInteger(v)&&v>=0&&v<6));
 const [a,b]=legal[0];R.swap(board,a,b);assert(R.matches(board).length>=3);
 for(let j=0;j<30&&R.matches(board).length;j++)R.refill(board,R.matches(board),random);
 assert(board.flat().every(v=>Number.isInteger(v)&&v>=0&&v<6));
}
console.log('Passed horizontal, vertical, both diagonals, overlaps, adjacency, swap rollback, gravity, and 100 seeded playable boards/cascades.');
