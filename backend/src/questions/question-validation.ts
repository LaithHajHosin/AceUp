import { BadRequestException } from '@nestjs/common';

const COMMON = ['prompt', 'category', 'difficulty', 'type'];
const MC = ['choices'];
const SHORT = ['expectedKeywords', 'requiredKeywordCount'];
const CODE = ['codeSnippet', 'expectedOutput'];
const ALLOWED = new Set([...COMMON, ...MC, ...SHORT, ...CODE]);

export type QuestionType = 'multiple_choice' | 'short_answer' | 'code_output';
export type Difficulty = 'easy' | 'medium' | 'hard';

export function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

export function validateQuestionPayload(value: Record<string, any>): void {
  const fail = (message: string): never => {
    throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message });
  };

  for (const key of Object.keys(value)) {
    if (!ALLOWED.has(key)) fail(`Unknown question field: ${key}`);
  }
  if (typeof value.prompt !== 'string' || value.prompt.trim().length < 5 || value.prompt.trim().length > 2000) {
    fail('prompt must be a string between 5 and 2000 characters');
  }
  if (typeof value.category !== 'string' || normalizeCategory(value.category).length < 2 || normalizeCategory(value.category).length > 40) {
    fail('category must contain 2 to 40 characters');
  }
  if (!['easy', 'medium', 'hard'].includes(value.difficulty)) fail('difficulty must be easy, medium, or hard');
  if (!['multiple_choice', 'short_answer', 'code_output'].includes(value.type)) fail('type is invalid');

  const allowedForType = value.type === 'multiple_choice' ? MC : value.type === 'short_answer' ? SHORT : CODE;
  for (const key of [...MC, ...SHORT, ...CODE]) {
    if (!allowedForType.includes(key) && Object.hasOwn(value, key) && value[key] !== undefined) {
      fail(`${key} is not allowed for question type ${value.type}`);
    }
  }

  if (value.type === 'multiple_choice') {
    if (!Array.isArray(value.choices) || value.choices.length < 2 || value.choices.length > 6) {
      fail('multiple_choice requires 2 to 6 choices');
    }
    const ids = new Set<string>();
    let correct = 0;
    for (const choice of value.choices) {
      if (!choice || typeof choice.id !== 'string' || choice.id.length < 1 || choice.id.length > 10) fail('Each choice id must be 1 to 10 characters');
      if (ids.has(choice.id)) fail('Choice ids must be unique');
      ids.add(choice.id);
      if (typeof choice.text !== 'string' || !choice.text.trim()) fail('Each choice requires non-empty text');
      if (typeof choice.isCorrect !== 'boolean') fail('Each choice requires boolean isCorrect');
      if (choice.isCorrect) correct++;
      for (const key of Object.keys(choice)) if (!['id', 'text', 'isCorrect'].includes(key)) fail(`Unknown choice field: ${key}`);
    }
    if (correct !== 1) fail('Exactly one choice must have isCorrect=true');
  } else if (value.type === 'short_answer') {
    if (!Array.isArray(value.expectedKeywords) || value.expectedKeywords.length < 2 || value.expectedKeywords.length > 6) {
      fail('short_answer requires 2 to 6 expectedKeywords');
    }
    if (value.expectedKeywords.some((word: unknown) => typeof word !== 'string' || !word.trim())) fail('Keywords must be non-empty strings');
    if (!Number.isInteger(value.requiredKeywordCount) || value.requiredKeywordCount < 1 || value.requiredKeywordCount > value.expectedKeywords.length) {
      fail('requiredKeywordCount must be between 1 and expectedKeywords.length');
    }
  } else {
    if (typeof value.expectedOutput !== 'string' || !value.expectedOutput.trim()) fail('code_output requires non-empty expectedOutput');
    if (value.codeSnippet !== undefined && (typeof value.codeSnippet !== 'string' || value.codeSnippet.length > 5000)) fail('codeSnippet must be at most 5000 characters');
  }
}

export function validateQuestionPatch(current: Record<string, any>, patch: Record<string, any>): Record<string, any> {
  const fields = ['prompt', 'category', 'difficulty', 'type', 'choices', 'expectedKeywords', 'requiredKeywordCount', 'codeSnippet', 'expectedOutput'];
  const merged: Record<string, any> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(current, field) && current[field] !== undefined && current[field] !== null) merged[field] = current[field];
    if (Object.prototype.hasOwnProperty.call(patch, field) && patch[field] !== undefined) merged[field] = patch[field];
  }
  validateQuestionPayload(merged);
  return merged;
}
