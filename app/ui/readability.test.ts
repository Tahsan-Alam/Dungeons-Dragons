import {test} from 'node:test';
import assert from 'node:assert/strict';
import {healthLevel,toastDuration} from './readability.ts';

test('health levels change at half and at a quarter',()=>{
 assert.equal(healthLevel(20,20),'ok');assert.equal(healthLevel(11,20),'ok');
 assert.equal(healthLevel(10,20),'low');assert.equal(healthLevel(6,20),'low');
 assert.equal(healthLevel(5,20),'critical');assert.equal(healthLevel(1,20),'critical');
 assert.equal(healthLevel(0,20),'down');assert.equal(healthLevel(-3,20),'down');assert.equal(healthLevel(5,0),'down');
});

test('messages stay between six and twelve seconds, longer when there is more to read',()=>{
 assert.equal(toastDuration(''),6000);assert.equal(toastDuration('x'.repeat(40)),6000);
 assert.equal(toastDuration('x'.repeat(120)),8400);assert.equal(toastDuration('x'.repeat(900)),12000);
});
