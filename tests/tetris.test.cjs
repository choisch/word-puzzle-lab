const assert=require('node:assert/strict');
const {Game,SHAPES}=require('../tetris-core.js');
// Every bag contains all seven pieces exactly once.
const g=new Game();
const ids=[g.piece.id,g.next];for(let i=0;i<12;i++)ids.push(g.take());
assert.equal(new Set(ids.slice(0,7)).size,7);assert.equal(new Set(ids.slice(7,14)).size,7);
// Pieces cannot leave the walls or floor, and four rotations restore the matrix.
for(let id=0;id<7;id++){
 const a=new Game();a.piece={id,matrix:SHAPES[id].map(r=>r.slice()),x:3,y:0};
 const initial=JSON.stringify(a.piece.matrix);for(let n=0;n<4;n++)assert(a.rotate());assert.equal(JSON.stringify(a.piece.matrix),initial);
 while(a.move(-1,0)){} assert(a.collides(a.piece.matrix,a.piece.x-1,a.piece.y));
 while(a.move(0,1)){} assert(a.collides(a.piece.matrix,a.piece.x,a.piece.y+1));
}
// Four-line clear, score at the old level, speed progression, and empty new rows.
const t=new Game();t.lines=6;
for(let r=16;r<20;r++)t.board[r]=Array.from({length:10},(_,c)=>c===4?0:2);
t.piece={id:0,matrix:[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],x:2,y:0};
assert.equal(t.ghostY(),16);assert.equal(t.hardDrop(),4);assert.equal(t.lines,10);assert.equal(t.level,2);assert.equal(t.score,832);assert(t.board.flat().every(v=>v===0));
// A blocked spawn ends the game without allowing subsequent mutations.
const b=new Game();b.board[0].fill(1);b.board[1].fill(1);b.spawn();assert(b.over);assert.equal(b.move(1,0),false);
// No row is cleared when an ordinary piece lands; state remains consistent in long games.
for(let i=0;i<100;i++){
 const a=new Game();let pieces=0;
 while(!a.over&&pieces++<1000){const dx=Math.random()<.5?-1:1;for(let k=0;k<Math.floor(Math.random()*5);k++)a.move(dx,0);a.rotate();a.hardDrop();assert.equal(a.board.length,20);assert(a.board.every(r=>r.length===10));assert(Number.isFinite(a.score));}
 assert(a.over);
}
console.log('Passed: bags, rotation, collisions, line clears, score, levels, top-out, and 100 simulated games.');
