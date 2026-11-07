/* Pure game rules, shared by the browser and the rule tests. */
(function (root) {
  'use strict';
  const SHAPES = [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[2,0,0],[2,2,2],[0,0,0]], [[0,0,3],[3,3,3],[0,0,0]],
    [[4,4],[4,4]], [[0,5,5],[5,5,0],[0,0,0]],
    [[0,6,0],[6,6,6],[0,0,0]], [[7,7,0],[0,7,7],[0,0,0]]
  ];
  class Game {
    constructor(random = Math.random) { this.random = random; this.reset(); }
    reset() {
      this.board = Array.from({length:20},()=>Array(10).fill(0));
      this.score = 0; this.lines = 0; this.level = 1; this.over = false;
      this.bag = []; this.next = this.take(); this.spawn();
    }
    take() {
      if (!this.bag.length) {
        this.bag = [0,1,2,3,4,5,6];
        for (let i=6;i>0;i--) { const j=Math.floor(this.random()*(i+1)); [this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]]; }
      }
      return this.bag.pop();
    }
    spawn() {
      const id = this.next; this.next = this.take();
      this.piece = {id, matrix:SHAPES[id].map(r=>r.slice()), x:id===3?4:3, y:0};
      if (this.collides()) this.over = true;
    }
    collides(matrix=this.piece.matrix,x=this.piece.x,y=this.piece.y) {
      return matrix.some((row,r)=>row.some((v,c)=>v && (x+c<0 || x+c>=10 || y+r>=20 || (y+r>=0 && this.board[y+r][x+c]))));
    }
    move(dx,dy) {
      if(this.over || this.collides(this.piece.matrix,this.piece.x+dx,this.piece.y+dy)) return false;
      this.piece.x+=dx; this.piece.y+=dy; return true;
    }
    rotate(direction=1) {
      if(this.over) return false;
      const m=this.piece.matrix, n=m.length;
      const rotated=m.map((row,r)=>row.map((_,c)=>direction===1?m[n-1-c][r]:m[c][n-1-r]));
      // Small wall/floor kicks allow rotation next to the edges and stack.
      for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,-2]]) {
        if(!this.collides(rotated,this.piece.x+dx,this.piece.y+dy)) {
          this.piece.matrix=rotated; this.piece.x+=dx; this.piece.y+=dy; return true;
        }
      }
      return false;
    }
    ghostY() { let y=this.piece.y; while(!this.collides(this.piece.matrix,this.piece.x,y+1)) y++; return y; }
    hardDrop() { if(this.over) return 0; const y=this.ghostY(); this.score+=(y-this.piece.y)*2; this.piece.y=y; return this.lock(); }
    lock() {
      if(this.over) return 0;
      let above=false;
      this.piece.matrix.forEach((row,r)=>row.forEach((v,c)=>{if(v){const y=this.piece.y+r;if(y<0)above=true;else this.board[y][this.piece.x+c]=v;}}));
      if(above) {this.over=true;return 0;}
      const kept=this.board.filter(row=>row.some(v=>!v)), cleared=20-kept.length;
      while(kept.length<20) kept.unshift(Array(10).fill(0));
      this.board=kept; this.score += [0,100,300,500,800][cleared]*this.level;
      this.lines+=cleared; this.level=1+Math.floor(this.lines/10); this.spawn(); return cleared;
    }
  }
  const api={Game,SHAPES};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.TetrisRules=api;
})(typeof globalThis!=='undefined'?globalThis:this);
