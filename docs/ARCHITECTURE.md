# PrepPressure System Architecture & Technical Specification

## 1. System Overview & Technology Stack
PrepPressure is a technical interview preparation web platform engineered as a decoupled client-server architecture:
* **Frontend:** React 18+, TypeScript, Vite, React Router, Tailwind CSS.
* **Backend:** NestJS (Node.js framework) using TypeScript and modular architecture.
* **Database & ODM:** MongoDB with Mongoose. Uses numeric application-level sequence counters instead of raw MongoDB ObjectIds in public APIs.
* **API Documentation:** OpenAPI / Swagger decorators documenting all public and guarded routes, DTO schemas, and headers.

---

## 2. Core Architectural Principles
* **Canonical Specification:** The project follows a strict implementation blueprint. Unilateral additions or alterations of endpoint names, DTO fields, error codes, or enums are prohibited without a coordinated PR.
* **Authoritative Server Clock & Timers:** The backend is the single source of truth for time, session lifecycles, and evaluation. Frontend countdown timers are derived exclusively from server-provided `deadlineAt` timestamps.
* **Session Snapshots:** When a session is initialized (`POST /api/v1/sessions`), questions are snapshotted directly into the session document (including prompt, type, choices, code snippet, and private evaluation keys). Subsequent edits or deactivations of questions in the Question Bank never alter historical session results.
* **Strict Redaction & Security:** Public question lists (`GET /api/v1/questions`), individual details (`GET /api/v1/questions/:id`), and active session payloads strictly omit private grading fields (`isCorrect`, `expectedKeywords`, `requiredKeywordCount`, `expectedOutput`).

---

## 3. NestJS Module Breakdown & Responsibilities
* **`DatabaseModule`:** Manages MongoDB connection pooling, Mongoose initialization, and global configuration.
* **`QuestionsModule`:** Handles public question bank filtering, querying, and public serialization (`GET /api/v1/questions`, `GET /api/v1/questions/:id`).
* **`InternalQuestionsModule`:** Manages guarded administrative CRUD operations (`POST`, `PATCH`, `DELETE`, and soft-delete `PATCH /deactivate`) protected by `InternalToolGuard`.
* **`SessionsModule`:** Handles session creation, active state retrieval, answer submission with duplicate and deadline validation, manual finish, timeout enforcement, and results calculation.
* **`HistoryModule`:** Handles exact-match display name history searches (`GET /api/v1/history`) and past session detail lookups (`GET /api/v1/history/:sessionId`).
* **Shared Infrastructure:** 
  * `IdSequenceService`: Atomic counter service ensuring application-level numeric IDs across collections.
  * `ScoringService`: Pure, deterministic grading logic for multiple choice, keyword substring matching, and code output validation.

---

## 4. Data Models & Mongoose Schemas

### Question Document Schema
* `id` (Number, Unique, Indexed): Numeric application ID.
* `prompt` (String, Trimmed, Required): Main question text.
* `category` (String, Trimmed, Required): Topic classification (e.g., `arrays`, `react`, `algorithms`, `system-design`).
* `difficulty` (Enum: `easy`, `medium`, `hard`).
* `type` (Enum: `multiple_choice`, `short_answer`, `code_output`).
* `active` (Boolean, Default: `true`): Soft availability flag.
* `choices` (Array, Optional): Required for `multiple_choice` (2–6 items with unique `id`, `text`, and exact one `isCorrect: true`).
* `expectedKeywords` (Array of Strings, Optional): Required for `short_answer` (2–6 items).
* `requiredKeywordCount` (Number, Optional): Minimum required keyword matches ($1$ to `keywordCount`).
* `expectedOutput` (String, Optional): Required non-empty string for `code_output`.
* `codeSnippet` (String, Optional): Display-only inert code snippet for `code_output` questions.
* Timestamps: `createdAt`, `updatedAt`.

### Session Document Schema
* `id` (Number, Unique, Indexed): Numeric session ID.
* `displayName` (String): Candidate-entered display name (1–80 chars).
* `displayNameNormalized` (String, Indexed): Lowercased/trimmed display name for history lookup indexes (`{displayNameNormalized: 1, startedAt: -1}`).
* `category` & `difficulty` (Strings).
* `status` (Enum: `in_progress`, `finished`, `timed_out`).
* `startedAt`, `deadlineAt`, `finishedAt` (Dates).
* `timePerQuestionSeconds` (Number): Easy = 60s, Medium = 90s, Hard = 120s.
* `questions` (Array): Internal snapshot copy of selected questions with full grading metadata.
* `answers` (Array): Submitted candidate responses (`questionId`, `type`, choice/text, `submittedAt`, earned points, and scoring notes).
* `score` (Object): Total earned points, maximum possible points, percentage score, and readiness evaluation level.

---

## 5. Scoring Algorithms & Timing Specifications
* **Timing & Grace Periods:**
  * Total duration = `questionCount * secondsPerQuestion`.
  * `deadlineAt = startedAt + totalDuration`.
  * A 5-second network grace period (`+5000ms`) is permitted on answer submissions. Submissions arriving past `deadlineAt + 5000ms` automatically transition the session status to `timed_out` and reject the answer.
* **Scoring Rules by Question Type:**
  * **Difficulty Weights:** Easy = 1 point, Medium = 2 points, Hard = 3 points.
  * **Multiple Choice:** Selecting the correct `choiceId` earns full points; incorrect choices earn 0.
  * **Short Answer:** Case-insensitive substring matching against `expectedKeywords`. Matches $\ge$ `requiredKeywordCount` earn full points; $1$ to `required-1` matches earn **half points**; zero matches earn 0.
  * **Code Output:** Normalizes CRLF/CR line endings to LF, trims outer whitespace, and performs an exact string comparison against `expectedOutput`. **No code execution (`eval`, sandboxes, or server runtimes) is used.** Earns full points or zero.
* **Readiness Levels:**
  * **Ready:** $\ge 85.0\%$
  * **Almost ready:** $60.0\%$ to $< 84.9\%$
  * **Needs practice:** $< 60.0\%$

---

## 6. Security, Guards & Client-Side Voice Storage
* **Internal Tool Guard (`InternalToolGuard`):** Protects routes under `/api/v1/internal/*`. Requires the HTTP header `x-internal-tool-key` matching the backend environment variable `INTERNAL_TOOL_KEY`. Fails closed (`401 Unauthorized`) if missing or incorrect.
* **History Privacy & Authentication Warning:** History lookup is keyed purely by display names and numeric session IDs. There are no user accounts, passwords, or JWT tokens. The UI and documentation explicitly warn users not to input sensitive personal information.
* **Browser-Local Voice Recording:** Optional voice notes use the browser `MediaRecorder` API and store audio blobs locally in **IndexedDB** (not localStorage). Audio recordings never traverse the network or touch MongoDB, accompanied by an explicit local storage limitation notice.