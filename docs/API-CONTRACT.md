# PrepPressure API Contract

**Version:** 1.0  
**Base path:** `/api/v1`  
**Content type:** `application/json`  
**Source:** PrepPressure Master Project Specification and team implementation guides.

This document is the shared API source of truth. Do not independently rename routes, fields, enum values, status values, or error codes. An approved contract change must update backend DTOs/controllers, frontend types/client/mocks, Swagger, and tests in the same change.

## Conventions

- IDs are numeric application IDs. Do not expose MongoDB ObjectIds.
- Public routes below require no account authentication. The internal question-management routes require `x-internal-tool-key`.
- All request bodies and query parameters must be validated. Whitelist known fields and reject unknown fields.
- Use stable error envelopes: `{ "statusCode": number, "code": string, "message": string, "details"?: object }`.
- Public question/session data must not reveal answer keys or scoring internals while a session is active.
- Enum values are case-sensitive.

## Shared enums

```ts
type QuestionType = "multiple_choice" | "short_answer" | "code_output";
type Difficulty = "easy" | "medium" | "hard";
type SessionStatus = "in_progress" | "finished" | "timed_out";
```

## Public question DTOs

A question's stored/internal model may include private scoring fields; public DTOs must not.

```ts
interface QuestionChoicePublicDto {
  id: string;
  text: string;
}

interface QuestionPublicDto {
  id: number;
  prompt: string;
  category: string;
  difficulty: Difficulty;
  type: QuestionType;
  choices?: QuestionChoicePublicDto[]; // multiple_choice only
  codeSnippet?: string; // code_output display-only text, if present
}
interface QuestionListResponse { items: QuestionPublicDto[]; }
```

Never include `isCorrect`, `expectedKeywords`, `requiredKeywordCount`, or `expectedOutput` in public question responses. `codeSnippet` is inert display text and must never be executed.

## Session and answer DTOs

```ts
interface CreateSessionRequest {
  displayName: string; // trimmed, 1–80 chars
  category: string;
  difficulty: Difficulty;
  questionCount: number; // integer 5–10
}

type AnswerPayload =
  | { type: "multiple_choice"; choiceId: string }
  | { type: "short_answer"; text: string }
  | { type: "code_output"; text: string };

interface SubmitAnswerRequest {
  questionId: number;
  answer: AnswerPayload;
}
```

Create-session success returns a safe session representation containing `id`, `displayName`, `category`, `difficulty`, `questionCount`, `status`, `startedAt`, `deadlineAt`, `timePerQuestionSeconds`, and safe question snapshots. Session detail uses the same safety rule: while `status` is `in_progress`, no expected answers, correct-choice flags, keyword criteria, expected output, or score internals may be sent.

An accepted answer is stored with `questionId`, `type`, the matching `choiceId` or `text`, and `submittedAt`. The server determines correctness and score; clients may not submit `score`, `isCorrect`, `expectedOutput`, `keywords`, or `status`.

## Endpoints

### Question bank

| Method and path | Access | Contract |
|---|---|---|
| `GET /questions` | Public | Returns `{ items: QuestionPublicDto[] }` for active questions only. Optional filters: `category`, `difficulty`, `type`; filters combine. |
| `GET /questions/:id` | Public | Safe public question detail by numeric ID; `404` if not found. |

### Sessions

| Method and path | Access | Contract |
|---|---|---|
| `POST /sessions` | Public | Create a session with 5–10 distinct, randomly selected active questions matching category and difficulty. |
| `GET /sessions/:id` | Public | Current session state and safe question snapshots. No expected-answer data while active. |
| `POST /sessions/:id/answers` | Public | Accept one answer per session question, validate membership/type/choice/deadline. |
| `POST /sessions/:id/finish` | Public | Finish manually and persist score. Ended states are terminal and immutable. Repeated finish after end returns existing ended state. |
| `GET /sessions/:id/results` | Public | `409 SESSION_NOT_ENDED` until finished or timed out; then return score and per-question explanations. |

### History

| Method and path | Access | Contract |
|---|---|---|
| `GET /history?displayName=...` | Public | History lookup by exact display name; query value must be URL-encoded by clients. |
| `GET /history/:sessionId` | Public | Past session detail and saved answers, with active-session privacy redaction. |

History lookup by display name and numeric session ID is **not authentication** and does not provide account privacy. UI and README must warn users not to use sensitive personal information.

### Internal question management

All routes below require `x-internal-tool-key`; the backend reads the expected value from `INTERNAL_TOOL_KEY`. Fail closed when unset, never hardcode/commit the secret, and never expose it to the frontend.

| Method and path | Access | Contract |
|---|---|---|
| `POST /internal/questions` | Guarded | Create a validated question. |
| `PATCH /internal/questions/:id` | Guarded | Update a question after validating the complete resulting shape. Existing session snapshots must not change. |
| `PATCH /internal/questions/:id/deactivate` | Guarded | Set `active=false`; preserve the record and history. |
| `DELETE /internal/questions/:id` | Guarded | Delete only if never referenced by a session; otherwise `409 QUESTION_IN_USE`. Recommend deactivation instead. |

## Validation and behavior

### Question rules

Stored question model:

```ts
interface Question {
  id: number;
  prompt: string;
  category: string;
  difficulty: Difficulty;
  type: QuestionType;
  active: boolean;
  choices?: { id: string; text: string; isCorrect: boolean }[];
  expectedKeywords?: string[];
  requiredKeywordCount?: number;
  expectedOutput?: string;
  codeSnippet?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- `prompt` and `category` are trimmed and non-empty; prompt max 2000 characters is recommended.
- `multiple_choice`: 2–6 choices, unique choice IDs, non-empty choice text, exactly one `isCorrect=true`.
- `short_answer`: 2–6 non-empty expected keywords; `requiredKeywordCount` is an integer from 1 through keyword count.
- `code_output`: non-empty `expectedOutput` (maximum 1000 characters unless explicitly agreed otherwise); optional `codeSnippet` is display-only.
- Reject fields irrelevant to the selected type. PATCH must not produce an invalid type/field combination.
- Public DTOs always redact answer-key fields.

### Session creation and timing

- Trim and validate `displayName` (1–80 chars), category, difficulty, and integer `questionCount` (5–10).
- Select distinct active questions matching category and difficulty. If fewer than requested are available, return `409 INSUFFICIENT_QUESTIONS` with `details.availableCount`; do not silently reduce the requested count.
- `startedAt` is server time. Time per question: easy `60` seconds, medium `90`, hard `120`. `deadlineAt = startedAt + questionCount × timePerQuestionSeconds`.
- Session snapshots are the source of truth for scoring and historical results. Editing/deactivating a question must not alter an existing session.

### Answer submission

- Session ID not found: `404 SESSION_NOT_FOUND` (or consistent `SESSION_NOT_FOUND` error).
- Only `in_progress` sessions accept answers; otherwise `409 SESSION_NOT_ACTIVE`.
- Deadline enforcement uses server time and a 5,000 ms grace period. After `deadlineAt + 5000ms`, mark the session `timed_out`, persist finish time and score, and reject the answer.
- Question must belong to the session snapshot; otherwise `QUESTION_NOT_IN_SESSION`.
- At most one accepted answer per question; duplicate returns `409 DUPLICATE_ANSWER`. Enforce atomically/serially to cover races.
- Answer type must match the question (`ANSWER_TYPE_MISMATCH`). MC `choiceId` must be one of the offered choices (`INVALID_CHOICE`).
- Short-answer and code-output `text` must be non-empty and at most 1000 characters.
- Reject unknown fields, including client-supplied score/correctness/expected answer fields.

### Scoring

- Difficulty points: easy = 1, medium = 2, hard = 3.
- Multiple choice: correct choice gets full points; incorrect or unanswered gets zero.
- Short answer: count expected keywords found as case-insensitive substrings. Matches at least `requiredKeywordCount` = full points; 1 through required-count-minus-one = half points; zero or unanswered = zero. Results explain matched keywords.
- Code output: normalize CRLF and CR to LF, trim outer whitespace, then exact string compare to expected output. Full or zero points only. Never execute code.
- Percentage = earned / possible × 100, rounded to one decimal.
- Readiness: `Ready` at 85% or higher; `Almost ready` at 60% through below 85%; `Needs practice` below 60%.
- Scoring must be deterministic and pure/testable. Persist final score at finish/timeout or deterministically recalculate from immutable snapshots.

### Results

Results are available only after `finished` or `timed_out`. Include earned/possible points, percentage, readiness level, terminal status, and per-question submitted/expected answer, points awarded/possible, and deterministic explanation. Short-answer explanations include matched keywords. MC may reveal the correct choice only after the session ends.

## Error codes

At minimum, keep these stable where applicable:

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request or unknown field |
| 401 | `UNAUTHORIZED` | Missing/invalid internal key |
| 404 | `QUESTION_NOT_FOUND` | Numeric question ID does not exist |
| 404 | `SESSION_NOT_FOUND` | Numeric session ID does not exist |
| 409 | `INSUFFICIENT_QUESTIONS` | Not enough matching active questions; include `details.availableCount` |
| 409 | `SESSION_NOT_ACTIVE` | Session is not in progress |
| 409 | `SESSION_NOT_ENDED` | Results requested before terminal state |
| 409 | `DUPLICATE_ANSWER` | Question already has an accepted answer |
| 409 | `QUESTION_NOT_IN_SESSION` | Question is not in the session snapshot |
| 400 | `ANSWER_TYPE_MISMATCH` | Submitted answer type differs from question type |
| 400 | `INVALID_CHOICE` | Choice ID is not offered for that question |
| 409 | `QUESTION_IN_USE` | Question has been referenced by a session |

Use a consistent envelope: `{ "statusCode": 409, "code": "INSUFFICIENT_QUESTIONS", "message": "...", "details": { "availableCount": 3 } }`.

## Example requests

Create session:

```json
{
  "displayName": "Alex",
  "category": "arrays",
  "difficulty": "medium",
  "questionCount": 5
}
```

Submit a short answer:

```json
{
  "questionId": 104,
  "answer": {
    "type": "short_answer",
    "text": "A stack uses last-in, first-out order."
  }
}
```

Multiple choice uses `{ "type": "multiple_choice", "choiceId": "b" }`; code output uses `{ "type": "code_output", "text": "predicted output" }`.

## Operational requirements

- Document all routes, DTOs, headers, status codes and errors in Swagger.
- Log session creation, accepted/rejected answer metadata, finish/timeout and question-management events. Do not log full free-text answers, expected keys, or internal secrets.
- Use MongoDB/Mongoose ordinary queries; no aggregation, `populate`, or ObjectId references. Use a shared numeric ID sequence service.
- History index: `{ displayNameNormalized: 1, startedAt: -1 }`.
-