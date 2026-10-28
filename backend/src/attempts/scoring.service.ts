import { Injectable } from '@nestjs/common';
import { AttemptEntity } from '../database/database.service.js';

export interface ScoredResultItem {
  questionId: number;
  position: number;
  prompt: string;
  type: 'multiple_choice' | 'short_answer' | 'code_output';
  submitted: { choiceId?: string; text?: string } | null;
  expected: {
    correctChoiceId?: string;
    expectedKeywords?: string[];
    requiredKeywordCount?: number;
    expectedOutput?: string;
  };
  points: number;
  maxPoints: number;
  explanation: string;
}

@Injectable()
export class ScoringService {
  public evaluateAttempt(attempt: AttemptEntity): {
    score: number;
    maxScore: number;
    percentage: number;
    readiness: 'needs_practice' | 'almost_ready' | 'ready';
    items: ScoredResultItem[];
  } {
    const maxScore = attempt.questions.length;
    let totalScore = 0;
    const items: ScoredResultItem[] = [];

    attempt.questions.forEach((q, idx) => {
      const position = idx + 1;
      const answerEntry = attempt.answers.find(a => a.questionId === q.questionId);
      let points = 0;
      let explanation = '';
      let submitted: { choiceId?: string; text?: string } | null = null;
      let expected: ScoredResultItem['expected'] = {};

      if (q.type === 'multiple_choice') {
        const correct = q.choices?.find(c => c.isCorrect);
        expected = { correctChoiceId: correct?.id || '' };

        if (!answerEntry || !answerEntry.answer.choiceId) {
          points = 0;
          explanation = 'Unanswered question.';
        } else {
          submitted = { choiceId: answerEntry.answer.choiceId };
          if (correct && answerEntry.answer.choiceId === correct.id) {
            points = 1.0;
            explanation = 'Correct choice selected.';
          } else {
            points = 0;
            explanation = `Incorrect choice. Expected choice was (${correct?.id}).`;
          }
        }
      } else if (q.type === 'short_answer') {
        const keywords = q.expectedKeywords || [];
        const required = q.requiredKeywordCount || 1;
        expected = { expectedKeywords: keywords, requiredKeywordCount: required };

        if (!answerEntry || !answerEntry.answer.text || !answerEntry.answer.text.trim()) {
          points = 0;
          explanation = 'Unanswered question.';
        } else {
          const text = answerEntry.answer.text.trim();
          submitted = { text };
          const lower = text.toLowerCase();
          const matched = keywords.filter(kw => lower.includes(kw.toLowerCase()));
          const count = matched.length;

          if (count >= required) {
            points = 1.0;
            explanation = `Matched ${count} of ${required} required keywords (${matched.join(', ')}): full credit.`;
          } else if (count > 0) {
            points = 0.5;
            explanation = `Matched ${count} of ${required} required keywords (${matched.join(', ')}): half credit.`;
          } else {
            points = 0;
            explanation = `Matched 0 of ${required} required keywords. Expected concepts: ${keywords.join(', ')}.`;
          }
        }
      } else if (q.type === 'code_output') {
        const targetOutput = (q.expectedOutput || '').replace(/\r\n/g, '\n').trim();
        expected = { expectedOutput: q.expectedOutput || '' };

        if (!answerEntry || answerEntry.answer.text === undefined || answerEntry.answer.text === null) {
          points = 0;
          explanation = 'Unanswered question.';
        } else {
          const candidateOutput = (answerEntry.answer.text || '').replace(/\r\n/g, '\n').trim();
          submitted = { text: answerEntry.answer.text };

          if (candidateOutput === targetOutput) {
            points = 1.0;
            explanation = 'Exact console output matched: full credit.';
          } else {
            points = 0;
            explanation = 'Output mismatch.';
          }
        }
      }

      totalScore += points;
      items.push({
        questionId: q.questionId,
        position,
        prompt: q.prompt,
        type: q.type,
        submitted,
        expected,
        points,
        maxPoints: 1,
        explanation,
      });
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
    let readiness: 'needs_practice' | 'almost_ready' | 'ready' = 'needs_practice';
    if (percentage >= 85) readiness = 'ready';
    else if (percentage >= 60) readiness = 'almost_ready';

    return {
      score: totalScore,
      maxScore,
      percentage,
      readiness,
      items,
    };
  }
}
