import { describe, it, expect } from 'vitest';
import {
  scoreMultipleChoice,
  scoreShortAnswer,
  scoreCodeOutput,
  scoreQuestion,
  calculatePercentage,
  calculateReadiness,
  scoreAttempt,
  normalizeOutput,
  QuestionSnapshot,
} from '../src/attempts/scoring.service.js';

describe('ScoringService (Pure scoring logic)', () => {
  describe('Multiple Choice Scoring', () => {
    const choices = [
      { id: 'a', text: 'O(1)', isCorrect: true },
      { id: 'b', text: 'O(n)', isCorrect: false },
      { id: 'c', text: 'O(log n)', isCorrect: false },
    ];

    it('awards full points when the correct choice is selected', () => {
      const result = scoreMultipleChoice('a', choices, 2);
      expect(result.points).toBe(2);
      expect(result.explanation).toContain('Correct');
    });

    it('awards 0 points when an incorrect choice is selected', () => {
      const result = scoreMultipleChoice('b', choices, 2);
      expect(result.points).toBe(0);
      expect(result.explanation).toContain('Incorrect');
    });

    it('awards 0 points when unanswered (undefined choiceId)', () => {
      const result = scoreMultipleChoice(undefined, choices, 2);
      expect(result.points).toBe(0);
      expect(result.explanation).toBe('Question was not answered.');
    });

    it('awards 0 points if choice does not exist in choices', () => {
      const result = scoreMultipleChoice('z', choices, 2);
      expect(result.points).toBe(0);
      expect(result.explanation).toContain('Incorrect');
    });
  });

  describe('Short Answer Scoring', () => {
    const expectedKeywords = ['lifo', 'push', 'pop'];
    const requiredKeywordCount = 2;
    const maxPoints = 2;

    it('awards full points when matched keywords count >= requiredKeywordCount with case differences', () => {
      // User typed "LIFO" and "PuSh" with different cases
      const answer = 'A stack operates on LIFO principle where we PUSH elements.';
      const result = scoreShortAnswer(answer, expectedKeywords, requiredKeywordCount, maxPoints);
      expect(result.points).toBe(2);
      expect(result.matchedKeywords).toEqual(['lifo', 'push']);
      expect(result.missedKeywords).toEqual(['pop']);
      expect(result.explanation).toContain('full credit');
    });

    it('awards half points when at least 1 keyword matches but less than requiredKeywordCount', () => {
      // User only matched "pop"
      const answer = 'You can POP items from the collection.';
      const result = scoreShortAnswer(answer, expectedKeywords, requiredKeywordCount, maxPoints);
      expect(result.points).toBe(1); // maxPoints (2) / 2 = 1
      expect(result.matchedKeywords).toEqual(['pop']);
      expect(result.missedKeywords).toEqual(['lifo', 'push']);
      expect(result.explanation).toContain('half credit');
    });

    it('awards 0 points when none of the expected keywords match', () => {
      const answer = 'It is a linear data structure with random access.';
      const result = scoreShortAnswer(answer, expectedKeywords, requiredKeywordCount, maxPoints);
      expect(result.points).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
      expect(result.missedKeywords).toEqual(['lifo', 'push', 'pop']);
      expect(result.explanation).toContain('zero credit');
    });

    it('awards 0 points when unanswered or empty text', () => {
      const result = scoreShortAnswer('', expectedKeywords, requiredKeywordCount, maxPoints);
      expect(result.points).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
      expect(result.missedKeywords).toEqual(['lifo', 'push', 'pop']);
      expect(result.explanation).toBe('Question was not answered.');
    });

    it('handles half points correctly for odd maxPoints (e.g. 1 point -> 0.5 points)', () => {
      const answer = 'Only LIFO is mentioned.';
      const result = scoreShortAnswer(answer, expectedKeywords, requiredKeywordCount, 1);
      expect(result.points).toBe(0.5);
      expect(result.explanation).toContain('half credit');
    });
  });

  describe('Code Output Scoring', () => {
    const expectedOutput = '[ 2, 4 ]';
    const maxPoints = 3;

    it('awards full points on exact string match', () => {
      const result = scoreCodeOutput('[ 2, 4 ]', expectedOutput, maxPoints);
      expect(result.points).toBe(3);
      expect(result.explanation).toContain('matches expected output');
    });

    it('awards full points when matching across Windows CRLF (\\r\\n) and Unix LF (\\n)', () => {
      const expected = 'Line 1\r\nLine 2';
      const submitted = 'Line 1\nLine 2';
      const result = scoreCodeOutput(submitted, expected, maxPoints);
      expect(result.points).toBe(3);
      expect(result.explanation).toContain('matches expected output');
    });

    it('awards full points when submitted has extra outer spaces or surrounding newlines', () => {
      const submitted = '   \n  [ 2, 4 ] \n\n  ';
      const result = scoreCodeOutput(submitted, expectedOutput, maxPoints);
      expect(result.points).toBe(3);
      expect(result.explanation).toContain('matches expected output');
    });

    it('awards 0 points when the output text does not match', () => {
      const submitted = '[ 2, 4, 6 ]';
      const result = scoreCodeOutput(submitted, expectedOutput, maxPoints);
      expect(result.points).toBe(0);
      expect(result.explanation).toContain('does not match');
    });

    it('awards 0 points when unanswered or empty', () => {
      const result = scoreCodeOutput('', expectedOutput, maxPoints);
      expect(result.points).toBe(0);
      expect(result.explanation).toBe('Question was not answered.');
    });

    it('normalizeOutput strips outer spaces and standardizes \\r\\n', () => {
      expect(normalizeOutput('  hello\r\nworld  ')).toBe('hello\nworld');
    });
  });

  describe('Percentage Calculation and Rounding', () => {
    it('calculates percentage rounded to one decimal place', () => {
      // 8 out of 12 = 66.666... -> 66.7
      expect(calculatePercentage(8, 12)).toBe(66.7);

      // 7 out of 10 = 70.0
      expect(calculatePercentage(7, 10)).toBe(70.0);

      // 3.5 out of 5 = 70.0
      expect(calculatePercentage(3.5, 5)).toBe(70.0);

      // 1 out of 6 = 16.666... -> 16.7
      expect(calculatePercentage(1, 6)).toBe(16.7);
    });

    it('returns 0.0 when maxPoints is 0', () => {
      expect(calculatePercentage(0, 0)).toBe(0.0);
    });
  });

  describe('Readiness Boundaries (Exact Thresholds: 59.9 / 60.0 / 84.9 / 85.0)', () => {
    it('boundary at 59.9% -> needs_practice', () => {
      expect(calculateReadiness(59.9)).toBe('needs_practice');
    });

    it('boundary at 60.0% -> almost_ready', () => {
      expect(calculateReadiness(60.0)).toBe('almost_ready');
    });

    it('boundary at 84.9% -> almost_ready', () => {
      expect(calculateReadiness(84.9)).toBe('almost_ready');
    });

    it('boundary at 85.0% -> ready', () => {
      expect(calculateReadiness(85.0)).toBe('ready');
    });

    it('handles 0% and 100%', () => {
      expect(calculateReadiness(0.0)).toBe('needs_practice');
      expect(calculateReadiness(100.0)).toBe('ready');
    });
  });

  describe('Full Attempt Scoring (scoreAttempt)', () => {
    const questions: QuestionSnapshot[] = [
      {
        questionId: 101,
        type: 'multiple_choice',
        difficulty: 'easy', // 1 point
        prompt: 'MC Question',
        choices: [
          { id: 'a', text: 'Option A', isCorrect: true },
          { id: 'b', text: 'Option B', isCorrect: false },
        ],
      },
      {
        questionId: 102,
        type: 'short_answer',
        difficulty: 'medium', // 2 points
        prompt: 'SA Question',
        expectedKeywords: ['react', 'virtual', 'dom'],
        requiredKeywordCount: 2,
      },
      {
        questionId: 103,
        type: 'code_output',
        difficulty: 'hard', // 3 points
        prompt: 'CO Question',
        expectedOutput: '42',
      },
    ];

    it('scores an attempt with mixed correct, partial, and unanswered questions', () => {
      // Total max score = 1 + 2 + 3 = 6
      const answers = [
        {
          questionId: 101,
          answer: { type: 'multiple_choice' as const, choiceId: 'a' }, // full = 1
        },
        {
          questionId: 102,
          answer: { type: 'short_answer' as const, text: 'React uses components' }, // 1 matched keyword (react) out of 2 -> half credit = 1
        },
        // questionId 103 left unanswered -> 0
      ];

      const result = scoreAttempt(questions, answers);
      expect(result.score).toBe(2); // 1 + 1 + 0 = 2
      expect(result.maxScore).toBe(6);
      expect(result.percentage).toBe(33.3); // 2 / 6 * 100 = 33.333 -> 33.3
      expect(result.readiness).toBe('needs_practice');
      expect(result.itemResults).toHaveLength(3);

      // Verify unanswered item
      const item3 = result.itemResults.find((r) => r.questionId === 103);
      expect(item3?.points).toBe(0);
      expect(item3?.explanation).toBe('Question was not answered.');
    });
  });
});
