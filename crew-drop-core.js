(function(root){
'use strict';const W=6,H=12,COLORS=6;
function matches(board){const hit=new Set();for(let r=0;r<H;r++)for(let c=0;c<W;c++){const v=board[r][c];if(v===null)continue;for(const[dr,dc]of[[0,1],[1,0],[1,1],[1,-1]]){const pr=r-dr,pc=c-dc;if(pr>=0&&pr<H&&pc>=0&&pc<W&&board[pr][pc]===v)continue;const line=[];let y=r,x=c;while(y>=0&&y<H&&x>=0&&x<W&&board[y][x]===v){line.push(y*W+x);y+=dr;x+=dc;}if(line.length>=3)line.forEach(i=>hit.add(i));}}return[...hit];}
function collapse(board,hit){const removed=new Set(hit);for(let c=0;c<W;c++){const keep=[];for(let r=0;r<H;r++)if(!removed.has(r*W+c)&&board[r][c]!==null)keep.push(board[r][c]);const col=Array(H-keep.length).fill(null).concat(keep);for(let r=0;r<H;r++)board[r][c]=col[r];}return board;}
class Game{
 constructor(random=Math.random){this.random=random;this.reset();}
 bar(){return Array.from({length:3},()=>Math.floor(this.random()*COLORS));}
 reset(){this.board=Array.from({length:H},()=>Array(W).fill(null));this.score=0;this.cleared=0;this.level=1;this.over=false;this.next=this.bar();this.spawn();}
 spawn(){this.piece={x:2,y:-2,colors:this.next.slice()};this.next=this.bar();if(this.collides())this.over=true;}
 collides(x=this.piece.x,y=this.piece.y){return this.piece.colors.some((v,k)=>x<0||x>=W||y+k>=H||(y+k>=0&&this.board[y+k][x]!==null));}
 move(dx,dy){if(this.over||this.collides(this.piece.x+dx,this.piece.y+dy))return false;this.piece.x+=dx;this.piece.y+=dy;return true;}
 cycle(){if(this.over)return;this.piece.colors.unshift(this.piece.colors.pop());}
 ghostY(){let y=this.piece.y;while(!this.collides(this.piece.x,y+1))y++;return y;}
 hardDrop(){if(this.over)return;const y=this.ghostY();this.score+=(y-this.piece.y)*2;this.piece.y=y;this.lock();}
 lock(){if(this.over)return;if(this.piece.y<0){this.over=true;return;}this.piece.colors.forEach((v,k)=>this.board[this.piece.y+k][this.piece.x]=v);}
 clear(hit,chain){this.score+=hit.length*10*chain;this.cleared+=hit.length;this.level=1+Math.floor(this.cleared/30);collapse(this.board,hit);}
}
const api={W,H,Game,matches,collapse};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CrewDrop=api;
})(typeof globalThis!=='undefined'?globalThis:this);
