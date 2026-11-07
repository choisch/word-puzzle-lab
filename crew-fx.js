(()=>{
'use strict';
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function burst(board,indices,cols){
 if(reduced||!indices.length)return;
 const host=board.parentElement,rect=board.getBoundingClientRect(),base=host.getBoundingClientRect();
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('fx-layer');svg.setAttribute('width','100%');svg.setAttribute('height','100%');svg.setAttribute('viewBox',`0 0 ${base.width} ${base.height}`);svg.setAttribute('aria-hidden','true');
 const points=new Map();for(const i of indices){const tile=board.children[i];if(!tile)continue;const box=tile.getBoundingClientRect();points.set(i,{x:box.left-base.left+box.width/2,y:box.top-base.top+box.height/2,s:box.width});}
 function node(tag,attrs){const el=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);svg.appendChild(el);return el;}
 function bolt(a,b){let d=`M ${a.x} ${a.y}`;const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;for(let k=1;k<6;k++){const t=k/6,j=(Math.random()-.5)*14;d+=` L ${a.x+dx*t-dy/len*j} ${a.y+dy*t+dx/len*j}`;}d+=` L ${b.x} ${b.y}`;node('path',{d,class:'fx-bolt'});}
 for(const [i,p]of points){
  node('circle',{cx:p.x,cy:p.y,r:p.s*.5,class:'fx-ring'});
  for(let k=0;k<7;k++){const angle=Math.PI*2*k/7,range=p.s*(.6+Math.random()*.6);const spark=node('circle',{cx:p.x,cy:p.y,r:1+Math.random()*1.5,class:'fx-spark'});spark.style.setProperty('--dx',Math.cos(angle)*range+'px');spark.style.setProperty('--dy',Math.sin(angle)*range+'px');}
  let connected=false;for(const delta of [1,cols-1,cols,cols+1]){const q=points.get(i+delta);if(q&&Math.abs((i%cols)-((i+delta)%cols))<=1){bolt(p,q);connected=true;}}
  if(!connected)bolt({x:p.x-p.s*.4,y:p.y-p.s*.4},{x:p.x+p.s*.4,y:p.y+p.s*.4});
 }
 host.appendChild(svg);host.classList.remove('electric-hit');void host.offsetWidth;host.classList.add('electric-hit');setTimeout(()=>{svg.remove();host.classList.remove('electric-hit');},550);
}
window.CrewFX={burst};
})();
