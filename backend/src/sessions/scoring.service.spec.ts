import { ScoringService } from './scoring.service.js';
import { QuestionSnapshot, SavedAnswer } from './schemas/session.schema.js';

describe('ScoringService', () => {
  const service = new ScoringService();

  it('awards full points for a correct multiple-choice answer', () => {
    const questions = [
      {
        id: 101,
        prompt: 'Pick stack',
        category: 'arrays',
        difficulty: 'medium',
        type: 'multiple_choice',
        choices: [
          { id: 'a', text: 'Queue', isCorrect: false },
          { id: 'b', text: 'Stack', isCorrect: true },
        ],
        expectedKeywords: [],
      },
    ] as QuestionSnapshot[];
    const answers = [
      {
        questionId: 101,
        type: 'multiple_choice',
        choiceId: 'b',
        submittedAt: new Date(),
      },
    ] as SavedAnswer[];

    const result = service.calculate(questions, answers);
    expect(result.earnedPoints).toBe(2);
    expect(result.possiblePoints).toBe(2);
    expect(result.percentage).toBe(100);
    expect(result.readiness).toBe('Ready');
  });

  it('awards half points for a partial short answer', () => {
    const questions = [
      {
        id: 102,
        prompt: 'Explain stack',
        category: 'arrays',
        difficulty: 'easy',
        type: 'short_answer',
        choices: [],
        expectedKeywords: ['last-in', 'first-out'],
        requiredKeywordCount: 2,
      },
    ] as QuestionSnapshot[];
    const answers = [
      {
        questionId: 102,
        type: 'short_answer',
        text: 'It follows LAST-IN order',
        submittedAt: new Date(),
      },
    ] as SavedAnswer[];

    const result = service.calculate(questions, answers);
    expect(result.earnedPoints).toBe(0.5);
    expect(result.possiblePoints).toBe(1);
    expect(result.questions[0].explanation).toContain('Partial credit');
  });

  it('normalizes line endings and outer whitespace for code output', () => {
    const questions = [
      {
        id: 103,
        prompt: 'Predict output',
        category: 'arrays',
        difficulty: 'hard',
        type: 'code_output',
        choices: [],
        expectedKeywords: [],
        expectedOutput: 'one\ntwo',
      },
    ] as QuestionSnapshot[];
    const answers = [
      {
        questionId: 103,
        type: 'code_output',
        text: '  one\r\ntwo  ',
        submittedAt: new Date(),
      },
    ] as SavedAnswer[];

    const result = service.calculate(questions, answers);
    expect(result.earnedPoints).toBe(3);
    expect(result.percentage).toBe(100);
  });

  it('awards zero for an unanswered question', () => {
    const questions = [
      {
        id: 104,
        prompt: 'Pick stack',
        category: 'arrays',
        difficulty: 'easy',
        type: 'multiple_choice',
        choices: [{ id: 'a', text: 'Stack', isCorrect: true }],
        expectedKeywords: [],
      },
    ] as QuestionSnapshot[];

    const result = service.calculate(questions, []);
    expect(result.earnedPoints).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.readiness).toBe('Needs practice');
  });
});
