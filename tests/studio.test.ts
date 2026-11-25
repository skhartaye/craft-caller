import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sample,practiceReply,validService} from '../lib/studio.ts';
test('unknown questions do not invent facts',()=>{const r=practiceReply('Can you guarantee revenue?',sample);assert.match(r.text,/don’t have an approved answer/)});
test('stop requests take priority over a pricing question',()=>{const r=practiceReply('How much does it cost? Stop calling me.',sample);assert.equal(r.ended,true);assert.doesNotMatch(r.text,/Pricing/)});
test('approved FAQ answer is returned verbatim',()=>assert.equal(practiceReply('How much does it cost?',sample).text,sample.faqs[0].answer));
test('service records reject corrupted or unexpected data',()=>{assert.equal(validService(sample),true);assert.equal(validService({...sample,faqs:[{question:42}]}),false);assert.equal(validService(null),false)});
