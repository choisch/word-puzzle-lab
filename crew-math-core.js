(function(root){
'use strict';const COLORS=6,SIZE=5;
function shuffle(a,random=Math.random){const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function key(q){return `${q.a}x${q.b}`;}
function valid(q){return q&&Number.isInteger(q.a)&&q.a>=2&&q.a<=9&&Number.isInteger(q.b)&&q.b>=1&&q.b<=9;}
class Session{
 constructor(table=2,reviews=[],random=Math.random){this.random=random;this.table=table;this.index=0;this.score=0;this.firstTry=0;this.missed=new Map();this.tried=false;this.done=false;
 const pool=[];for(let a=2;a<=9;a++)if(table==='all'||a===table)for(let b=1;b<=9;b++)pool.push({a,b});
 const pending=shuffle(reviews.filter(q=>valid(q)&&(table==='all'||q.a===table)),random).slice(0,2);const used=new Set(pending.map(key));this.queue=pending.concat(shuffle(pool.filter(q=>!used.has(key(q))),random)).slice(0,5);this.board=this.makeBoard();}
 get question(){return this.queue[this.index];}
 makeBoard(){const colors=shuffle(Array.from({length:25},(_,i)=>i%COLORS),this.random);return Array.from({length:5},(_,r)=>colors.slice(r*5,r*5+5));}
 numbers(){const{a,b}=this.question,correct=a*b;const nearby=shuffle([b-1,b+1,b-2,b+2,1,9].filter(n=>n>=1&&n<=9&&n!==b),this.random);const wrong=[...new Set(nearby)].slice(0,2).map(n=>n*a);while(wrong.length<2){let n=a*(1+Math.floor(this.random()*9));if(n!==correct&&!wrong.includes(n))wrong.push(n);}return shuffle([correct,correct,wrong[0],wrong[0],wrong[1],wrong[1]],this.random);}
 answer(color,numbers){if(this.done)return{ignored:true};const q=this.question;
 if(numbers[color]!==q.a*q.b){this.tried=true;this.missed.set(key(q),{...q});return{correct:false};}
 const first=!this.tried;if(first){this.firstTry++;this.missed.delete(key(q));}
 const hit=[];this.board.flat().forEach((v,i)=>{if(v===color)hit.push(i);});this.score+=hit.length*10;this.done=true;
 if(this.tried){const slot=this.index+2;if(slot<5&&!this.queue.slice(this.index+1).some(other=>key(other)===key(q)))this.queue[slot]={...q};}
 return{correct:true,hit,points:hit.length*10,first};}
 refill(hit){const removed=new Set(hit);for(let c=0;c<5;c++){const keep=[];for(let r=0;r<5;r++)if(!removed.has(r*5+c))keep.push(this.board[r][c]);const col=Array.from({length:5-keep.length},()=>Math.floor(this.random()*COLORS)).concat(keep);for(let r=0;r<5;r++)this.board[r][c]=col[r];}
 // Every next question needs at least one of each color to keep all choices available.
 if(new Set(this.board.flat()).size<6)this.board=this.makeBoard();}
 next(){if(!this.done)return false;if(this.index===4)return false;this.index++;this.done=false;this.tried=false;return true;}
}
class Clock{
 constructor(){this.lives=3;this.duration=5000;this.rest=5000;this.deadline=0;this.running=false;}
 get over(){return this.lives===0;}
 remaining(now){return this.running?Math.max(0,this.deadline-now):this.rest;}
 reset(now,run=true){this.rest=this.duration;this.running=false;if(run)this.resume(now);}
 resume(now){if(this.over||this.running)return;this.deadline=now+this.rest;this.running=true;}
 pause(now){this.rest=this.remaining(now);this.running=false;}
 stop(){this.running=false;}
 lose(){if(this.over||!this.running)return false;this.running=false;this.rest=0;this.lives--;return true;}
}
function nextTable(table){return Number.isInteger(table)&&table>=2&&table<9?table+1:null;}
const api={Session,Clock,key,valid,nextTable};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CrewMath=api;
})(typeof globalThis!=='undefined'?globalThis:this);
