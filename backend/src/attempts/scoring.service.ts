/**
 * Pure scoring functions for PrepPressure attempts.
 * Implements deterministic scoring rules as defined in the project specification and API contract.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'multiple_choice' | 'short_answer' | 'code_output';
export type Readiness = 'needs_practice' | 'almost_ready' | 'ready';

export interface QuestionSnapshot {
  questionId: number;
  type: QuestionType;
  difficulty: Difficulty;
  prompt: string;
  choices?: Array<{ id: string; text: string; isCorrect: boolean }> | null;
  expectedKeywords?: string[] | null;
  requiredKeywordCount?: number | null;
  expectedOutput?: string | null;
}

export interface UserSubmittedAnswer {
  type: QuestionType;
  choiceId?: string;
  text?: string;
}

export interface QuestionScoreResult {
  questionId: number;
  points: number;
  maxPoints: number;
  matchedKeywords?: string[];
  missedKeywords?: string[];
  explanation: string;
}

/**
 * Returns the maximum points for a given difficulty.
 * Easy: 1, Medium: 2, Hard: 3
 */
export function getMaxPointsForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'medium':
      return 2;
    case 'hard':
      return 3;
    default:
      return 1;
  }
}

/**
 * Normalizes text for code output comparison by trimming outer spaces
 * and standardizing CRLF / CR line endings to LF.
 */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/**
 * Scores a multiple choice question.
 * Full points for the correct choice, otherwise 0.
 */
export function scoreMultipleChoice(
  choiceId: string | undefined,
  choices: Array<{ id: string; text: string; isCorrect: boolean }> | undefined | null,
  maxPoints: number,
): { points: number; explanation: string } {
  if (!choiceId || !choices || choices.length === 0) {
    return { points: 0, explanation: 'Question was not answered.' };
  }

  const selected = choices.find((c) => c.id === choiceId);
  if (selected && selected.isCorrect) {
    return {
      points: maxPoints,
      explanation: 'Correct choice selected.',
    };
  }

  return {
    points: 0,
    explanation: 'Incorrect choice selected.',
  };
}

/**
 * Scores a short answer question based on expected keywords.
 * - Full points if matched keywords >= requiredKeywordCount
 * - Half points if at least 1 keyword matched but < requiredKeywordCount
 * - 0 points if no keywords matched
 */
export function scoreShortAnswer(
  text: string | undefined,
  expectedKeywords: string[] | undefined | null,
  requiredKeywordCount: number | undefined | null,
  maxPoints: number,
): {
  points: number;
  matchedKeywords: string[];
  missedKeywords: string[];
  explanation: string;
} {
  const keywords = expectedKeywords ?? [];
  const required = requiredKeywordCount ?? 1;

  if (!text || text.trim().length === 0) {
    return {
      points: 0,
      matchedKeywords: [],
      missedKeywords: [...keywords],
      explanation: 'Question was not answered.',
    };
  }

  const answerLower = text.toLowerCase();
  const matchedKeywords: string[] = [];
  const missedKeywords: string[] = [];

  for (const kw of keywords) {
    const trimmedKw = kw.trim();
    if (trimmedKw && answerLower.includes(trimmedKw.toLowerCase())) {
      matchedKeywords.push(trimmedKw);
    } else {
      missedKeywords.push(trimmedKw);
    }
  }

  const matchedCount = matchedKeywords.length;

  if (matchedCount >= required) {
    const kwDisplay = matchedKeywords.join(', ');
    return {
      points: maxPoints,
      matchedKeywords,
      missedKeywords,
      explanation: `Matched ${matchedCount} of ${required} required keywords (${kwDisplay}): full credit.`,
    };
  }

  if (matchedCount > 0) {
    const kwDisplay = matchedKeywords.join(', ');
    return {
      points: maxPoints / 2,
      matchedKeywords,
      missedKeywords,
      explanation: `Matched ${matchedCount} of ${required} required keywords (${kwDisplay}): half credit.`,
    };
  }

  return {
    points: 0,
    matchedKeywords,
    missedKeywords,
    explanation: `No required keywords matched: zero credit.`,
  };
}

/**
 * Scores a code output question via direct text comparison.
 * No code execution: text comparison only after normalizing newlines and outer whitespace.
 */
export function scoreCodeOutput(
  submittedText: string | undefined,
  expectedOutput: string | undefined | null,
  maxPoints: number,
): { points: number; explanation: string } {
  if (submittedText === undefined || submittedText === null || submittedText.trim().length === 0) {
    return { points: 0, explanation: 'Question was not answered.' };
  }

  const normalizedSubmitted = normalizeOutput(submittedText);
  const normalizedExpected = normalizeOutput(expectedOutput ?? '');

  if (normalizedSubmitted === normalizedExpected) {
    return {
      points: maxPoints,
      explanation: 'Output matches expected output.',
    };
  }

  return {
    points: 0,
    explanation: 'Output does not match expected output.',
  };
}

/**
 * Scores an individual question snapshot with the user's submitted answer (or unanswered if undefined).
 */
export function scoreQuestion(
  question: QuestionSnapshot,
  submittedAnswer?: UserSubmittedAnswer | null,
): QuestionScoreResult {
  const maxPoints = getMaxPointsForDifficulty(question.difficulty);

  if (!submittedAnswer) {
    return {
      questionId: question.questionId,
      points: 0,
      maxPoints,
      matchedKeywords: question.type === 'short_answer' ? [] : undefined,
      missedKeywords: question.type === 'short_answer' ? (question.expectedKeywords ?? []) : undefined,
      explanation: 'Question was not answered.',
    };
  }

  switch (question.type) {
    case 'multiple_choice': {
      const mc = scoreMultipleChoice(submittedAnswer.choiceId, question.choices, maxPoints);
      return {
        questionId: question.questionId,
        points: mc.points,
        maxPoints,
        explanation: mc.explanation,
      };
    }

    case 'short_answer': {
      const sa = scoreShortAnswer(
        submittedAnswer.text,
        question.expectedKeywords,
        question.requiredKeywordCount,
        maxPoints,
      );
      return {
        questionId: question.questionId,
        points: sa.points,
        maxPoints,
        matchedKeywords: sa.matchedKeywords,
        missedKeywords: sa.missedKeywords,
        explanation: sa.explanation,
      };
    }

    case 'code_output': {
      const co = scoreCodeOutput(submittedAnswer.text, question.expectedOutput, maxPoints);
      return {
        questionId: question.questionId,
        points: co.points,
        maxPoints,
        explanation: co.explanation,
      };
    }

    default:
      return {
        questionId: question.questionId,
        points: 0,
        maxPoints,
        explanation: 'Unknown question type.',
      };
  }
}

/**
 * Calculates the percentage rounded to one decimal place:
 * (pointsEarned / maxPoints) * 100
 */
export function calculatePercentage(pointsEarned: number, maxPoints: number): number {
  if (maxPoints <= 0) {
    return 0.0;
  }
  const percentage = (pointsEarned / maxPoints) * 100;
  return Math.round(percentage * 10) / 10;
}

/**
 * Determines readiness level based on calculated percentage:
 * - Ready: >= 85.0%
 * - Almost ready: >= 60.0% and < 85.0%
 * - Needs practice: < 60.0%
 */
export function calculateReadiness(percentage: number): Readiness {
  if (percentage >= 85.0) {
    return 'ready';
  }
  if (percentage >= 60.0) {
    return 'almost_ready';
  }
  return 'needs_practice';
}

/**
 * Computes full score summary for an attempt's question snapshots and submitted answers.
 */
export function scoreAttempt(
  questions: QuestionSnapshot[],
  answers: Array<{ questionId: number; answer: UserSubmittedAnswer }>,
): {
  score: number;
  maxScore: number;
  percentage: number;
  readiness: Readiness;
  itemResults: QuestionScoreResult[];
} {
  const answerMap = new Map<number, UserSubmittedAnswer>();
  for (const a of answers) {
    answerMap.set(a.questionId, a.answer);
  }

  let totalScore = 0;
  let totalMaxScore = 0;
  const itemResults: QuestionScoreResult[] = [];

  for (const q of questions) {
    const userAns = answerMap.get(q.questionId);
    const result = scoreQuestion(q, userAns);
    itemResults.push(result);
    totalScore += result.points;
    totalMaxScore += result.maxPoints;
  }

  const percentage = calculatePercentage(totalScore, totalMaxScore);
  const readiness = calculateReadiness(percentage);

  return {
    score: totalScore,
    maxScore: totalMaxScore,
    percentage,
    readiness,
    itemResults,
  };
}
