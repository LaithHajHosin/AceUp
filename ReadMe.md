# PrepPressure (AceUp) — Technical Interview Simulation Platform

Practice technical interviews against the clock — and get a deterministic score you can explain.

---

## 1. Overview

**PrepPressure** is a full-stack technical interview preparation platform built with **React + TypeScript (Vite)** on the frontend and **NestJS + Mongoose (MongoDB)** on the backend, documented with **Swagger / OpenAPI**.

Candidates can:
- Browse the active **Question Bank** filtered by `category`, `difficulty`, and `type` (with all private answer keys and grading fields redacted).
- Configure and start a timed interview session (`5–10` distinct, randomly selected active questions for a chosen category and difficulty).
- Answer `multiple_choice`, `short_answer`, and `code_output` questions against an authoritative server-enforced deadline (`+5s` network grace period).
- Receive deterministic, explainable scoring (`Ready`, `Almost ready`, or `Needs practice`) including matched vs. missed keywords on short-answer questions.
- Review past attempts in **History** by candidate display name.

> **Privacy & Security Warning (History Lookup):** History lookup by `displayName` and numeric `sessionId` is **not authentication** and does not provide account privacy. Candidates must **never** enter sensitive personal information, passwords, or private identifiers as their display name.

---

## 2. Environment Variables & Configuration

Copy `.env.example` to `.env` (never commit `.env` or real secrets to Git):

```bash
cp .env.example .env
```

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port for the NestJS backend server | `3000` |
| `MONGODB_URI` | MongoDB connection string for Mongoose persistence | `mongodb://127.0.0.1:27017/preppressure` |
| `INTERNAL_TOOL_KEY` | Secret key required by `InternalToolGuard` via the `x-internal-tool-key` HTTP header for `/api/v1/internal/questions/*` | *(set locally in `.env`, never commit)* |

### Internal Guard Configuration (`InternalToolGuard`)
All internal question-management routes (`POST`, `PATCH`, `PATCH /:id/deactivate`, `DELETE` under `/api/v1/internal/questions`) are protected by `InternalToolGuard`:
- Every request must include the HTTP header `x-internal-tool-key` matching `process.env.INTERNAL_TOOL_KEY`.
- If `INTERNAL_TOOL_KEY` is unset, empty, or does not match the request header, the guard **fails closed** with `401 UNAUTHORIZED`.
- In **Swagger UI (`/api/docs`)**, click **Authorize**, enter your configured `INTERNAL_TOOL_KEY` value under `internal-tool-key`, and execute internal endpoints interactively.

---

## 3. Question Bank Seed Initialization

On application startup (`OnModuleInit` in `SeedQuestionsService`), the backend checks whether the `questions` collection is empty:
- If the database is empty (`countDocuments() === 0`), it automatically seeds **78 team-authored, hand-checkable questions** (IDs `101–178`) across **4 categories** (`react`, `typescript`, `nodejs`, `mongodb`), **all 3 difficulties** (`easy`, `medium`, `hard`), and **all 3 types** (`multiple_choice`, `short_answer`, `code_output`).
- Newly created questions compute the next sequential numeric application ID directly via `QuestionModel.findOne().sort({ id: -1 }).select({ id: 1 }).lean().exec()` (`maxId + 1`).
- On subsequent backend restarts, existing database records (including newly created, edited, or deactivated questions) are preserved without duplication.

---

## 4. Data Design Decisions (Section 12 Specification)

### Decision 1: Relationship & Historical Immutability Decision (Sessions vs. Question Bank)
- **Rule to Guarantee:** Editing or deactivating a question in the Question Bank must **never** alter sessions that already exist (Business Rule #4).
- **Chosen Design:** **Embedded Question Snapshots inside Session Documents + Soft Deactivation + Guarded Delete Check**.
  1. When a session starts (`POST /api/v1/sessions`), `QuestionsService.findActiveForSession(category, difficulty)` retrieves matching active questions and copies an immutable snapshot of the selected questions (including prompt, choices, and private grading criteria) directly into the `Session` document's `questions` array. No Mongoose `ObjectId` references or `populate()` joins are used.
  2. When an operator updates (`PATCH /api/v1/internal/questions/:id`) or deactivates (`PATCH /api/v1/internal/questions/:id/deactivate`) a question, only the master document in the `questions` collection is updated; past and active sessions evaluate and render exclusively from their embedded snapshot.
  3. When an operator attempts to hard-delete a question (`DELETE /api/v1/internal/questions/:id`), `QuestionsService` checks whether any document in `sessions` references `{ 'questions.id': id }`. If used, deletion is rejected with `409 QUESTION_IN_USE`, directing the operator to soft-deactivate the question (`active = false`) instead.

### Decision 2: Database Index Decision
- **Frequent Query 1 (Question Bank & Session Selection):** Selecting active questions by `category` and `difficulty` (`{ active: true, category, difficulty }`) runs every time a candidate checks available questions on the Setup screen, starts a new session (`POST /api/v1/sessions`), or filters the public Question Bank (`GET /api/v1/questions`).
  - **Index Added:** Compound index `{ active: 1, category: 1, difficulty: 1 }` (plus `{ id: 1 }` unique index) on the `questions` collection (`backend/src/questions/schemas/question.schema.ts`).
  - **Why:** Following MongoDB's **ESR (Equality, Sort, Range)** indexing rule, placing the exact-match equality fields `active`, `category`, and `difficulty` in a compound index allows MongoDB to satisfy both session creation queries and Question Bank filter prefix queries (`{ active: true }` and `{ active: true, category }`) via a fast index scan (`IXSCAN`) rather than a full collection scan (`COLLSCAN`).
- **Frequent Query 2 (Candidate History Lookup):** Listing past sessions by normalized candidate display name sorted newest first (`GET /api/v1/history?displayName=...`).
  - **Index Added:** Compound index `{ displayNameNormalized: 1, startedAt: -1 }` on the `sessions` collection, supporting equality filtering on `displayNameNormalized` and an in-order reverse sort on `startedAt` without an in-memory sort stage.

---

## 5. Installation, Running & Testing

```bash
# Install backend dependencies
npm install

# Start the NestJS backend + Swagger UI on http://localhost:3000 (Swagger at /api/docs)
npm run dev

# Build and run backend tests (Vitest unit + e2e) and linter
npm run build
npm run test
npm --prefix backend run test:e2e
npm run lint
```

---

## 6. Documentation Index

- [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) — Shared canonical REST API specification and DTO contracts.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System architecture, module responsibilities, and scoring rules.
- [`docs/TEAM-OWNERSHIP.md`](docs/TEAM-OWNERSHIP.md) — Team member ownership matrix and Git collaboration rules.
- [`docs/BACKEND-DATA-FLOW.md`](docs/BACKEND-DATA-FLOW.md) — End-to-end flow of backend data across validation pipes, guards, services, and MongoDB indexes.
- [`docs/LAITH-AND-ESMAEEL-MAIN-INTEGRATION.md`](docs/LAITH-AND-ESMAEEL-MAIN-INTEGRATION.md) — Step-by-step guide helping Leader Laith and Esmaeel merge and integrate changes into `main`.
- [`docs/BADR-FILE-BY-FILE-EXPLANATION.md`](docs/BADR-FILE-BY-FILE-EXPLANATION.md) — File-by-file breakdown of importance, methods, decorators, and annotated code blocks.
