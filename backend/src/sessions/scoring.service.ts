import { Injectable } from '@nestjs/common';
import { QuestionSnapshot, SavedAnswer } from './schemas/session.schema.js';

export interface QuestionScore {
  questionId: number;
  submittedAnswer: string | null;
  expectedAnswer: string;
  pointsAwarded: number;
  pointsPossible: number;
  explanation: string;
}

export interface FullScore {
  earnedPoints: number;
  possiblePoints: number;
  percentage: number;
  readiness: 'Ready' | 'Almost ready' | 'Needs practice';
  questions: QuestionScore[];
}

@Injectable()
export class ScoringService {
  calculate(questions: QuestionSnapshot[], answers: SavedAnswer[]): FullScore {
    const answerByQuestion = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );

    const details = questions.map((question) => {
      const answer = answerByQuestion.get(question.id);
      const possible = this.pointsFor(question.difficulty);
      let awarded = 0;
      let submittedAnswer: string | null = null;
      let expectedAnswer = '';
      let explanation = 'No answer submitted.';

      if (question.type === 'multiple_choice') {
        const correctChoice = question.choices.find(
          (choice) => choice.isCorrect,
        );
        expectedAnswer = correctChoice?.text ?? '';
        const selected = question.choices.find(
          (choice) => choice.id === answer?.choiceId,
        );
        submittedAnswer = selected?.text ?? null;
        if (selected?.isCorrect) {
          awarded = possible;
          explanation = 'Correct choice.';
        } else if (answer) {
          explanation = 'Incorrect choice.';
        }
      }

      if (question.type === 'short_answer') {
        const text = answer?.text?.toLowerCase() ?? '';
        const matched = question.expectedKeywords.filter((keyword) =>
          text.includes(keyword.toLowerCase()),
        );
        submittedAnswer = answer?.text ?? null;
        expectedAnswer = question.expectedKeywords.join(', ');
        const required =
          question.requiredKeywordCount ?? question.expectedKeywords.length;

        if (matched.length >= required) {
          awarded = possible;
          explanation = `Matched keywords: ${matched.join(', ') || 'none'}.`;
        } else if (matched.length > 0) {
          awarded = possible / 2;
          explanation = `Partial credit. Matched keywords: ${matched.join(', ')}.`;
        } else if (answer) {
          explanation = 'No expected keywords matched.';
        }
      }

      if (question.type === 'code_output') {
        const expected = this.normalize(question.expectedOutput ?? '');
        const submitted = this.normalize(answer?.text ?? '');
        submittedAnswer = answer?.text ?? null;
        expectedAnswer = question.expectedOutput ?? '';
        if (answer && submitted === expected) {
          awarded = possible;
          explanation =
            'Output matches exactly after line-ending and outer-space normalization.';
        } else if (answer) {
          explanation = 'Output does not match the expected output.';
        }
      }

      return {
        questionId: question.id,
        submittedAnswer,
        expectedAnswer,
        pointsAwarded: awarded,
        pointsPossible: possible,
        explanation,
      };
    });

    const earnedPoints = details.reduce(
      (sum, item) => sum + item.pointsAwarded,
      0,
    );
    const possiblePoints = details.reduce(
      (sum, item) => sum + item.pointsPossible,
      0,
    );
    const percentage =
      possiblePoints === 0
        ? 0
        : Math.round((earnedPoints / possiblePoints) * 1000) / 10;

    const readiness =
      percentage >= 85
        ? 'Ready'
        : percentage >= 60
          ? 'Almost ready'
          : 'Needs practice';

    return {
      earnedPoints,
      possiblePoints,
      percentage,
      readiness,
      questions: details,
    };
  }

  private pointsFor(difficulty: string): number {
    if (difficulty === 'easy') return 1;
    if (difficulty === 'medium') return 2;
    return 3;
  }

  private normalize(value: string): string {
    return value.replace(/\r\n?/g, '\n').trim();
  }
}
