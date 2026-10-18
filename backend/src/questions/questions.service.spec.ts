import { beforeEach, describe, expect, it } from 'vitest';
import { AppHttpException } from '../common/exceptions/app-http.exception.js';
import { QuestionsService } from './questions.service.js';
import { SEED_QUESTIONS } from './seed-questions.js';

describe('QuestionsService (Badr Domain Unit Tests)', () => {
  let service: QuestionsService;

  beforeEach(async () => {
    service = new QuestionsService();
    await service.seedInitialQuestions(SEED_QUESTIONS);
  });

  it('seeds at least 40 team-authored questions across >= 4 categories, all 3 difficulties, and all 3 types', async () => {
    const { items } = await service.findAllPublic({});
    expect(items.length).toBeGreaterThanOrEqual(40);
    expect(items.length).toBe(78);

    const categories = new Set(items.map((q) => q.category));
    const difficulties = new Set(items.map((q) => q.difficulty));
    const types = new Set(items.map((q) => q.type));

    expect(categories.size).toBeGreaterThanOrEqual(4);
    expect(Array.from(difficulties).sort()).toEqual(['easy', 'hard', 'medium']);
    expect(Array.from(types).sort()).toEqual([
      'code_output',
      'multiple_choice',
      'short_answer',
    ]);
  });

  it('strictly redacts private grading fields (isCorrect, expectedKeywords, requiredKeywordCount, expectedOutput) in public responses', async () => {
    const { items } = await service.findAllPublic({});
    for (const q of items) {
      const raw = q as unknown as Record<string, unknown>;
      expect(raw.expectedKeywords).toBeUndefined();
      expect(raw.requiredKeywordCount).toBeUndefined();
      expect(raw.expectedOutput).toBeUndefined();

      if (q.choices) {
        for (const choice of q.choices) {
          expect(
            (choice as unknown as Record<string, unknown>).isCorrect,
          ).toBeUndefined();
        }
      }
    }
  });

  it('filters active questions by category, difficulty, and type combined', async () => {
    const reactMedium = await service.findAllPublic({
      category: 'react',
      difficulty: 'medium',
    });
    expect(reactMedium.items.length).toBe(7);
    expect(
      reactMedium.items.every(
        (q) => q.category === 'react' && q.difficulty === 'medium',
      ),
    ).toBe(true);
  });

  it('provides full internal grading fields via findActiveForSession for Esmaeel session snapshots', async () => {
    const sessionPool = await service.findActiveForSession('react', 'medium');
    expect(sessionPool.length).toBe(7);
    const shortAnswer = sessionPool.find((q) => q.id === 109);
    expect(shortAnswer).toBeDefined();
    expect(shortAnswer?.expectedKeywords).toEqual([
      'identity',
      're-render',
      'reorder',
    ]);
    expect(shortAnswer?.requiredKeywordCount).toBe(2);
  });

  it('computes the next numeric question ID directly from the highest existing ID + 1', async () => {
    const created = await service.createInternal({
      prompt: 'What is the output of 2 + 2 in JavaScript?',
      category: 'typescript',
      difficulty: 'easy',
      type: 'code_output',
      expectedOutput: '4',
    });
    expect(created.id).toBe(179);
  });

  it('rejects multiple_choice creation when choices do not have exactly one isCorrect=true', async () => {
    await expect(
      service.createInternal({
        prompt: 'Invalid MC question with two correct choices',
        category: 'react',
        difficulty: 'easy',
        type: 'multiple_choice',
        choices: [
          { id: 'a', text: 'Option A', isCorrect: true },
          { id: 'b', text: 'Option B', isCorrect: true },
        ],
      }),
    ).rejects.toThrowError(AppHttpException);
  });

  it('rejects short_answer creation when requiredKeywordCount exceeds expectedKeywords length', async () => {
    await expect(
      service.createInternal({
        prompt: 'Invalid SA question',
        category: 'typescript',
        difficulty: 'medium',
        type: 'short_answer',
        expectedKeywords: ['type', 'interface'],
        requiredKeywordCount: 3,
      }),
    ).rejects.toThrowError(AppHttpException);
  });

  it('rejects cross-type field pollution on create and PATCH update', async () => {
    await expect(
      service.createInternal({
        prompt: 'Short answer with forbidden choices array',
        category: 'nodejs',
        difficulty: 'easy',
        type: 'short_answer',
        expectedKeywords: ['stream', 'buffer'],
        requiredKeywordCount: 1,
        choices: [
          { id: 'a', text: 'Yes', isCorrect: true },
          { id: 'b', text: 'No', isCorrect: false },
        ],
      }),
    ).rejects.toThrowError(AppHttpException);
  });

  it('prevents deleting a question referenced in a session (409 QUESTION_IN_USE) and allows deactivating it instead', async () => {
    service.markQuestionUsedInSession(101);

    await expect(service.deleteInternal(101)).rejects.toMatchObject({
      code: 'QUESTION_IN_USE',
    });

    const deactivated = await service.deactivateInternal(101);
    expect(deactivated.active).toBe(false);

    const { items } = await service.findAllPublic({ category: 'react' });
    expect(items.some((q) => q.id === 101)).toBe(false);
  });
});
