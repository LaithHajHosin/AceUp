import { describe, it, expect } from 'vitest';
import { validateQuestionPayload, validateQuestionPatch } from '../src/questions/question-validation.js';

const mc={prompt:'What is O(1)?',category:'arrays',difficulty:'easy',type:'multiple_choice',choices:[{id:'a',text:'Constant',isCorrect:true},{id:'b',text:'Linear',isCorrect:false}]};
describe('question cross-field validation',()=>{
  it('accepts a valid multiple choice question',()=>expect(()=>validateQuestionPayload(mc)).not.toThrow());
  it('requires exactly one correct choice',()=>expect(()=>validateQuestionPayload({...mc,choices:mc.choices.map(c=>({...c,isCorrect:false}))})).toThrow());
  it('rejects duplicate choice ids',()=>expect(()=>validateQuestionPayload({...mc,choices:[mc.choices[0],{...mc.choices[1],id:'a'}]})).toThrow());
  it('rejects fields from another question type',()=>expect(()=>validateQuestionPayload({...mc,expectedOutput:'x'})).toThrow());
  it('validates the final merged patch, not just changed fields',()=>expect(()=>validateQuestionPatch(mc,{type:'short_answer'})).toThrow());
  it('accepts valid short-answer question',()=>expect(()=>validateQuestionPayload({prompt:'Explain stack',category:'stacks',difficulty:'medium',type:'short_answer',expectedKeywords:['lifo','push'],requiredKeywordCount:1})).not.toThrow());
  it('rejects required keyword count above the keyword count',()=>expect(()=>validateQuestionPayload({prompt:'Explain stack',category:'stacks',difficulty:'medium',type:'short_answer',expectedKeywords:['lifo','push'],requiredKeywordCount:3})).toThrow());
  it('requires expected output for code-output questions',()=>expect(()=>validateQuestionPayload({prompt:'What prints?',category:'javascript',difficulty:'hard',type:'code_output'})).toThrow());
});
