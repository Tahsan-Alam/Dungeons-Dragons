import {test} from 'node:test';
import assert from 'node:assert/strict';
import {borrowedName} from './paint-words.ts';

test('names from other stories are caught as whole words, in any case',()=>{
 assert.equal(borrowedName('Avatar the last airbender'),'Avatar the last');
 assert.equal(borrowedName('looks like GANDALF but shorter'),'GANDALF');
 assert.equal(borrowedName('a Jedi robe'),'Jedi');
 assert.equal(borrowedName('Spider-Man mask'),'Spider-Man');
});
test('ordinary descriptions pass, including words that only contain a name',()=>{
 for(const text of ['a one-eyed sailor with a parrot','stark white robes and a thorny crown','an old avatar of the sea','a marionette maker','Thor-like hammer and a joker grin','an elf named Elsa'])assert.equal(borrowedName(text),null,text);
});
