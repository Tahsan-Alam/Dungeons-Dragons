import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aiCaps,MAX_CONFIGURED_CAPS} from './ai-config.ts';
import {DEFAULT_CAPS} from './ai-ledger.ts';
test('team caps preserve defaults and accept only bounded integer overrides',()=>{
 assert.deepEqual(aiCaps({}),DEFAULT_CAPS);
 assert.deepEqual(DEFAULT_CAPS,{campaign:400_000,day:1_000_000,month:4_000_000,concurrency:8});
 assert.deepEqual(aiCaps({AI_CAMPAIGN_MICRO_USD:'2000000',AI_DAY_MICRO_USD:'8000000',AI_MONTH_MICRO_USD:'25000000'}),{campaign:2_000_000,day:8_000_000,month:25_000_000,concurrency:8});
 assert.equal(aiCaps({AI_MONTH_MICRO_USD:'25000000'}).month,25_000_000);
 assert.equal(aiCaps({AI_MONTH_MICRO_USD:'100000000'}).month,MAX_CONFIGURED_CAPS.month);
 for(const value of ['0','-1','NaN','Infinity','1.5','10000000000000000000',' 100',''])assert.equal(aiCaps({AI_MONTH_MICRO_USD:value}).month,0);
 assert.equal(aiCaps({AI_DAY_MICRO_USD:'100000',AI_CAMPAIGN_MICRO_USD:'50000'}).day,100_000);
 assert.equal(aiCaps({AI_DAY_MICRO_USD:'8000001'}).day,8_000_000);
});
