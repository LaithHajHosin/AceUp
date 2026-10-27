import { scoreQuestion } from './scoring.service.js';
import {
  Attempt,
  AttemptQuestionSnapshot,
} from './schemas/attempt.schema.js';
import {
  AttemptListItemDto,
  AttemptQuestionDto,
  AttemptResponseDto,
  AttemptResultItemDto,
  AttemptResultsResponseDto,
} from './dto/attempt-response.dto.js';

/**
 * Strips all secret scoring data (isCorrect, expectedKeywords, expectedOutput)
 * from a question snapshot to create a safe AttemptQuestion for the candidate.
 */
export function toSafeAttemptQuestion(q: AttemptQuestionSnapshot): AttemptQuestionDto {
  return {
    questionId: q.questionId,
    position: q.position,
    prompt: q.prompt,
    type: q.type,
    difficulty: q.difficulty,
    category: q.category,
    choices:
      q.type === 'multiple_choice' && q.choices
        ? q.choices.map((c) => ({ id: c.id, text: c.text }))
        : null,
    codeSnippet: q.type === 'code_output' ? q.codeSnippet : null,
  };
}

/**
 * Converts an Attempt document to the safe Attempt response shape defined in API contract.
 */
export function toSafeAttempt(attempt: Attempt): AttemptResponseDto {
  const answeredQuestionIds = (attempt.answers || []).map((a) => a.questionId);

  return {
    id: attempt.id,
    interviewId: attempt.interviewId,
    interviewTitle: attempt.interviewTitle,
    userId: attempt.userId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    finishedAt: attempt.finishedAt ?? null,
    timeLimitSeconds: attempt.timeLimitSeconds,
    questions: (attempt.questions || []).map(toSafeAttemptQuestion),
    answeredQuestionIds,
  };
}

/**
 * Converts an Attempt document to the summary item in GET /attempts list.
 * score, maxScore, percentage, and readiness are null while in_progress.
 */
export function toAttemptListItem(attempt: Attempt): AttemptListItemDto {
  const isInProgress = attempt.status === 'in_progress';

  return {
    id: attempt.id,
    interviewId: attempt.interviewId,
    interviewTitle: attempt.interviewTitle,
    status: attempt.status,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt ?? null,
    score: isInProgress ? null : (attempt.score ?? null),
    maxScore: isInProgress ? null : (attempt.maxScore ?? null),
    percentage: isInProgress ? null : (attempt.percentage ?? null),
    readiness: isInProgress ? null : (attempt.readiness ?? null),
  };
}

/**
 * Builds the comprehensive results response for GET /attempts/:id/results.
 * Shows submitted vs expected, points earned, max points, and explanation for each question.
 */
export function toAttemptResults(attempt: Attempt): AttemptResultsResponseDto {
  const answersMap = new Map<number, any>();
  for (const a of attempt.answers || []) {
    answersMap.set(a.questionId, a.answer);
  }

  const items: AttemptResultItemDto[] = (attempt.questions || []).map((q) => {
    const userAns = answersMap.get(q.questionId);

    // Build submitted shape
    let submitted: Record<string, any> | null = null;
    if (userAns) {
      if (q.type === 'multiple_choice') {
        submitted = { choiceId: userAns.choiceId };
      } else {
        submitted = { text: userAns.text };
      }
    }

    // Build expected shape
    let expected: Record<string, any> = {};
    if (q.type === 'multiple_choice') {
      const correctChoice = (q.choices || []).find((c) => c.isCorrect);
      expected = { correctChoiceId: correctChoice?.id ?? '' };
    } else if (q.type === 'short_answer') {
      expected = {
        expectedKeywords: q.expectedKeywords || [],
        requiredKeywordCount: q.requiredKeywordCount ?? 1,
      };
    } else if (q.type === 'code_output') {
      expected = {
        expectedOutput: q.expectedOutput ?? '',
      };
    }

    // Score the individual question snapshot
    const scoreRes = scoreQuestion(
      {
        questionId: q.questionId,
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        choices: q.choices,
        expectedKeywords: q.expectedKeywords,
        requiredKeywordCount: q.requiredKeywordCount,
        expectedOutput: q.expectedOutput,
      },
      userAns,
    );

    return {
      questionId: q.questionId,
      position: q.position,
      prompt: q.prompt,
      type: q.type,
      submitted,
      expected,
      points: scoreRes.points,
      maxPoints: scoreRes.maxPoints,
      explanation: scoreRes.explanation,
    };
  });

  return {
    attemptId: attempt.id,
    interviewId: attempt.interviewId,
    interviewTitle: attempt.interviewTitle,
    status: attempt.status as 'finished' | 'timed_out',
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt ?? null,
    score: attempt.score ?? 0,
    maxScore: attempt.maxScore ?? 0,
    percentage: attempt.percentage ?? 0.0,
    readiness: attempt.readiness || 'needs_practice',
    items,
  };
}
