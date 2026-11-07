import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aiCaps,MAX_CONFIGURED_CAPS} from './ai-config.ts';
import {DEFAULT_CAPS} from './ai-ledger.ts';
test('team caps preserve small defaults and accept only bounded integer overrides',()=>{
 assert.deepEqual(aiCaps({}),DEFAULT_CAPS);
 assert.equal(aiCaps({AI_MONTH_MICRO_USD:'25000000'}).month,25_000_000);
 assert.equal(aiCaps({AI_MONTH_MICRO_USD:'100000000'}).month,MAX_CONFIGURED_CAPS.month);
 for(const value of ['0','-1','NaN','Infinity','1.5','10000000000000000000',' 100',''])assert.equal(aiCaps({AI_MONTH_MICRO_USD:value}).month,0);
 assert.equal(aiCaps({AI_DAY_MICRO_USD:'100000',AI_CAMPAIGN_MICRO_USD:'50000'}).day,100_000);
 assert.equal(aiCaps({AI_DAY_MICRO_USD:'2000001'}).day,2_000_000);
});
