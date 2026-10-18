# PrepPressure — Pure NestJS Question Bank Backend & Documentation Plan

This plan restructures the workspace into a **pure, zero-bloat NestJS backend** inside `backend/`—completely removing `frontend/`, Vite, and unnecessary wrapper files—using only **NestJS, Swagger, Mongoose, MongoDB, `.env`, `class-validator` / `class-transformer` validators, `InternalToolGuard`, and DTOs**, alongside **three dedicated technical guides** explaining the backend data flow, `main` branch integration for Laith and Esmaeel, and a file-by-file method/code breakdown.

---

## User Review & Confirmed Decisions

> [!IMPORTANT]
> **Zero Code Modification Until Approved**: No files have been modified or deleted during this planning phase. Once you click **Proceed**, we will remove all frontend/Vite and extra wrapper files, streamline the NestJS backend, and generate all three documentation guides.

- **Confirmed Decision 1 (Keep `backend/` Folder & Delete `frontend/` Folder)**:
  - Delete the entire `frontend/` directory and all Vite configs so there is zero frontend bloat.
  - Wire the root `package.json` (`dev`, `build`, `lint`, `test`) directly to `backend`, running the NestJS API and Swagger UI (`/api/docs`) on `0.0.0.0:3000`.
- **Confirmed Decision 2 (Direct Numeric ID Calculation in `QuestionsService`)**:
  - Remove the separate `common/sequence/` (`counter.schema.ts`, `id-sequence.service.ts`, `sequence.module.ts`) files and duplicate re-export folders (`src/guards/`, `src/seed/`, `src/internal-questions/`, `src/setup-app.ts`).
  - Compute the next numeric `id` directly inside `QuestionsService` using `this.questionModel.findOne().sort({ id: -1 }).select({ id: 1 }).lean().exec()` (`(maxDoc?.id ?? 100) + 1`).
- **Confirmed Decision 3 (Keep Separate `database.module.ts` & Exception Filter Files)**:
  - Keep `backend/src/database/database.module.ts`, `backend/src/common/filters/http-exception.filter.ts`, `backend/src/common/exceptions/app-http.exception.ts`, and `backend/src/common/guards/internal-tool.guard.ts`.
  - Configure the `/api/v1` global prefix, `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`), `GlobalHttpExceptionFilter`, and Swagger OpenAPI setup directly inside `backend/src/main.ts`.
- **Confirmed Decision 4 (Three Comprehensive Documentation Guides in `docs/`)**:
  1. `docs/BACKEND-DATA-FLOW.md` — End-to-end explanation of how requests and data flow through the backend, database indexes, validation pipes, guard, and public redaction.
  2. `docs/LAITH-AND-ESMAEEL-MAIN-INTEGRATION.md` — Step-by-step instructions and exact code blocks helping **Laith** and **Esmaeel** integrate `QuestionsModule`, `DatabaseModule`, `GlobalHttpExceptionFilter`, and `main.ts` into the `main` branch.
  3. `docs/BADR-FILE-BY-FILE-EXPLANATION.md` — Detailed guide explaining each file's importance, every method and decorator inside it, with annotated code blocks.

---

## 1. Overview & Core Concept

- **What It Does**:
  - Runs a standalone, contract-compliant **NestJS + Mongoose + Swagger** backend on port `3000`.
  - Implements Badr's exact Question Bank ownership domain:
    - `GET /api/v1/questions` (public browsing with `category`, `difficulty`, `type` filters and strict redaction of private grading fields).
    - `GET /api/v1/questions/:id` (public safe question detail by numeric ID, or `404 QUESTION_NOT_FOUND`).
    - `POST /api/v1/internal/questions` (guarded by `InternalToolGuard` via `x-internal-tool-key`; creates a validated question with the next sequential numeric ID).
    - `PATCH /api/v1/internal/questions/:id` (guarded; validates merged question shape without altering historical session snapshots).
    - `PATCH /api/v1/internal/questions/:id/deactivate` (guarded soft-delete setting `active = false`).
    - `DELETE /api/v1/internal/questions/:id` (guarded; checks the `sessions` collection and throws `409 QUESTION_IN_USE` if the question was ever used in a session).
  - Seeds **78 team-authored questions** across `react`, `typescript`, `nodejs`, and `mongodb` on startup (`OnModuleInit`) when the database is empty.

---

## 2. Developer Experience & Swagger API Console

- **Interactive Swagger UI (`/api/docs`)**:
  - Visiting `/api/docs` (or the root preview URL, which redirects or links directly to `/api/docs`) presents the OpenAPI 3.0 specification grouped into:
    1. `Questions (Public)` — Unauthenticated candidate endpoints returning redacted `QuestionPublicDto` responses.
    2. `Internal Question Management (Guarded)` — Protected routes displaying the `x-internal-tool-key` security lock and header parameter so instructors can test `401 UNAUTHORIZED` (without key) and `201/200` (with key) live in Swagger (Live Demo Acceptance Test #8).
- **Clean Technology Stack**:
  - Strictly limited to `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/mongoose`, `mongoose`, `@nestjs/swagger`, `class-validator`, `class-transformer`, and `.env` environment variables.

---

## 3. Key Architectural Decisions & Trade-Offs

### Decision 1: Direct Max-ID Lookup in `QuestionsService` (`sort({ id: -1 })`)
- **Chosen Approach**: Generate the next numeric `id` directly inside `QuestionsService.getNextQuestionId()` by querying the highest existing `id` in the `questions` collection (`findOne().sort({ id: -1 }).select({ id: 1 }).lean()`) and adding `1` (starting at `101` if empty).
- **Why**: Eliminates 3 extra sequence/counter files (`counter.schema.ts`, `id-sequence.service.ts`, `sequence.module.ts`) while leveraging the existing unique `{ id: 1 }` index on the `questions` collection for an $O(\log N)$ index lookup.

### Decision 2: Consolidating Bootstrap Setup Directly in `main.ts`
- **Chosen Approach**: Configure `app.setGlobalPrefix('api/v1')`, `app.useGlobalPipes(new ValidationPipe(...))`, `app.useGlobalFilters(new GlobalHttpExceptionFilter())`, and `SwaggerModule.setup('api/docs', ...)` directly in `backend/src/main.ts`, while keeping `DatabaseModule` and `GlobalHttpExceptionFilter` as clean modular files.
- **Why**: Makes `main.ts` self-contained and immediately understandable for both Badr during his presentation and Laith/Esmaeel when merging into `main`.

---

## 4. Technical Architecture & Backend Data Flow

### Architecture & Request Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Incoming HTTP Request (Port 3000)                        │
│              /api/v1/questions  OR  /api/v1/internal/questions              │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │ Public Request                      │ Internal Request
                    │                                     ▼
                    │                      ┌──────────────────────────────────┐
                    │                      │        InternalToolGuard         │
                    │                      │ • Reads header x-internal-tool-key│
                    │                      │ • Matches process.env.INTERNAL_  │
                    │                      │   TOOL_KEY                       │
                    │                      │ • Throws 401 UNAUTHORIZED if     │
                    │                      │   missing or mismatched          │
                    │                      └──────────────┬───────────────────┘
                    └───────────────────┬─────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│             Global ValidationPipe (Configured in main.ts)                   │
│  • whitelist: true, forbidNonWhitelisted: true, transform: true             │
│  • Validates QuestionFilterDto / CreateQuestionDto / UpdateQuestionDto      │
│  • Rejects unknown query/body fields with 400 VALIDATION_ERROR              │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              QuestionsController & InternalQuestionsController              │
│  • Routes GET /questions, GET /questions/:id                                │
│  • Routes POST, PATCH /:id, PATCH /:id/deactivate, DELETE /:id              │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              QuestionsService                               │
│  • validateQuestionShape(): Enforces 2–6 choices (1 correct),               │
│    2–6 keywords (valid requiredKeywordCount), or expectedOutput             │
│  • getNextQuestionId(): Queries QuestionModel.findOne().sort({ id: -1 })    │
│  • toQuestionPublicDto(): Strips isCorrect, expectedKeywords,               │
│    requiredKeywordCount, expectedOutput from all public responses           │
│  • findActiveForSession(category, difficulty): Returns full internal        │
│    Question objects for Esmaeel's Session snapshot creation                 │
│  • isQuestionUsedInAnySession(id): Checks `sessions` collection before      │
│    DELETE; throws 409 QUESTION_IN_USE if referenced                         │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
                    ▼                                     ▼
┌───────────────────────────────────────┐  ┌──────────────────────────────────┐
│     Question Mongoose Schema          │  │      SeedQuestionsService        │
│  • Collection: `questions`            │  │  • Runs OnModuleInit             │
│  • Unique Index: `{ id: 1 }`          │  │  • Seeds 78 hand-authored        │
│  • Compound Index: `{ active: 1,      │  │    questions across 4 categories │
│    category: 1, difficulty: 1 }`      │  │    when collection is empty      │
└───────────────────────────────────────┘  └──────────────────────────────────┘
```

### Structure of the Three Documentation Deliverables

1. **`docs/BACKEND-DATA-FLOW.md`**:
   - Step-by-step trace of all 6 endpoints from HTTP request to MongoDB query and HTTP response.
   - How data transformations happen at each boundary (DTO validation → Cross-field domain check → Mongoose document persistence → Public DTO redaction vs. Session Snapshot extraction → Global Error Filter formatting).
2. **`docs/LAITH-AND-ESMAEEL-MAIN-INTEGRATION.md`**:
   - **Section for Leader Laith**: How to merge `main.ts`, `app.module.ts`, `.env.example`, and Swagger setup into `main`, and how his frontend `api/questions.ts` and `SetupPage.tsx` connect to `/api/v1/questions`.
   - **Section for Esmaeel**: How `SessionsModule` imports `QuestionsModule`, injects `QuestionsService`, calls `findActiveForSession(category, difficulty)` to build session snapshots, throws `AppHttpException` for consistent error envelopes, and stores `questions[].id` in the `sessions` collection so `DELETE /api/v1/internal/questions/:id` enforces `409 QUESTION_IN_USE`.
3. **`docs/BADR-FILE-BY-FILE-EXPLANATION.md`**:
   - Dedicated section for every single backend file:
     - Why the file exists and its role in the architecture.
     - Every class, method, and NestJS/Mongoose/Swagger decorator used in the file.
     - Annotated code blocks explaining the exact logic line by line.
