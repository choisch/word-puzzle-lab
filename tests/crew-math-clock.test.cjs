const assert=require('node:assert/strict'),{Clock,nextTable}=require('../crew-math-core.js');
const c=new Clock();assert.equal(c.lives,3);assert.equal(c.running,false);c.reset(100);assert.equal(c.remaining(100),5000);assert.equal(c.remaining(5099),1);assert.equal(c.remaining(5100),0);assert(c.lose());assert.equal(c.lives,2);assert(!c.lose());assert.equal(c.lives,2);
c.reset(6000);c.pause(7500);assert.equal(c.remaining(999999),3500);c.resume(10000);assert.equal(c.remaining(11000),2500);c.stop();assert(!c.lose());assert.equal(c.lives,2);
c.reset(12000);assert(c.lose());c.reset(13000);assert(c.lose());assert(c.over);assert.equal(c.lives,0);c.reset(14000);assert.equal(c.running,false);assert(!c.lose());assert.equal(c.lives,0);
const notStarted=new Clock();notStarted.reset(100,false);assert(!notStarted.running);notStarted.resume(500);assert.equal(notStarted.remaining(5500),0);
console.log('Passed exact five-second boundary, life loss, duplicate penalty guard, pause/resume, stopped effects, initial gate, and game-over clamping.');

for(let table=2;table<9;table++)assert.equal(nextTable(table),table+1);assert.equal(nextTable(9),null);assert.equal(nextTable('all'),null);assert.equal(nextTable(1),null);
console.log('Passed automatic next-table progression through 9 and terminal mixed mode.');
