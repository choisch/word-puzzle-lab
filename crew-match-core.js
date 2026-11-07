(function(root){
'use strict';
const SIZE=8,COLORS=6,DIRS=[[0,1],[1,0],[1,1],[1,-1]];
function matches(board){
 const hit=new Set(),n=board.length;
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){
  const v=board[r][c];if(v===null)continue;
  for(const [dr,dc] of DIRS){
   const pr=r-dr,pc=c-dc;
   if(pr>=0&&pr<n&&pc>=0&&pc<n&&board[pr][pc]===v)continue;
   const line=[];let y=r,x=c;
   while(y>=0&&y<n&&x>=0&&x<n&&board[y][x]===v){line.push(y*n+x);y+=dr;x+=dc;}
   if(line.length>=3)line.forEach(i=>hit.add(i));
  }
 }
 return [...hit];
}
function adjacent(a,b,n=SIZE){const dr=Math.abs(Math.floor(a/n)-Math.floor(b/n)),dc=Math.abs(a%n-b%n);return a!==b&&dr<=1&&dc<=1;}
function swap(board,a,b){const n=board.length,ar=Math.floor(a/n),ac=a%n,br=Math.floor(b/n),bc=b%n;[board[ar][ac],board[br][bc]]=[board[br][bc],board[ar][ac]];}
function moves(board){
 const n=board.length,out=[];
 for(let a=0;a<n*n;a++)for(const [dr,dc] of [[0,1],[1,-1],[1,0],[1,1]]){
  const r=Math.floor(a/n)+dr,c=a%n+dc;if(r<0||c<0||r>=n||c>=n)continue;
  const b=r*n+c;if(board[Math.floor(a/n)][a%n]===board[r][c])continue;
  swap(board,a,b);const hit=matches(board);swap(board,a,b);if(hit.length)out.push([a,b]);
 }
 return out;
}
function create(random=Math.random){
 for(let attempt=0;attempt<100;attempt++){
  const board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
   const choices=[];
   for(let v=0;v<COLORS;v++){board[r][c]=v;if(!matches(board).length)choices.push(v);}
   board[r][c]=choices[Math.floor(random()*choices.length)];
  }
  if(moves(board).length)return board;
 }
 throw new Error('Could not create a playable board');
}
function refill(board,hit,random=Math.random){
 const n=board.length,removed=new Set(hit);
 for(let c=0;c<n;c++){
  const keep=[];for(let r=0;r<n;r++)if(!removed.has(r*n+c))keep.push(board[r][c]);
  const missing=n-keep.length;const col=Array.from({length:missing},()=>Math.floor(random()*COLORS)).concat(keep);
  for(let r=0;r<n;r++)board[r][c]=col[r];
 }
 return board;
}
const api={SIZE,COLORS,matches,adjacent,swap,moves,create,refill};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CrewMatch=api;
})(typeof globalThis!=='undefined'?globalThis:this);
