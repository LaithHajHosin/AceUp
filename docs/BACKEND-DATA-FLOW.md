# PrepPressure — Backend Data Flow & Lifecycle Guide (Badr's Domain)

**Owner:** Badr Al Jerf  
**Stack:** NestJS · Swagger (`@nestjs/swagger`) · Mongoose (`@nestjs/mongoose`) · MongoDB · `.env` · `class-validator` / `class-transformer` · Guards · DTOs  

This document traces **how data moves through the backend** from server startup and incoming HTTP requests all the way to MongoDB storage, session snapshot selection, and redacted public responses.

---

## 1. End-to-End Backend Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. SERVER BOOTSTRAP (backend/src/main.ts & DatabaseModule)                  │
│   • Connects Mongoose to process.env.MONGODB_URI (bufferCommands = false)   │
│   • Registers Global Prefix: /api/v1                                        │
│   • Registers Global ValidationPipe (whitelist + forbidNonWhitelisted)      │
│   • Registers GlobalHttpExceptionFilter ({ statusCode, code, message })     │
│   • Mounts Swagger UI at /api/docs                                          │
│   • SeedQuestionsService.onModuleInit() seeds 78 questions if DB is empty   │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. INCOMING HTTP REQUEST                                                    │
│   • Public Routes:   GET /api/v1/questions, GET /api/v1/questions/:id       │
│   • Internal Routes: POST, PATCH /:id, PATCH /:id/deactivate, DELETE /:id   │
│                      under /api/v1/internal/questions                       │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │ Public Request                      │ Internal Request
                    │ (No Guard)                          ▼
                    │                      ┌──────────────────────────────────┐
                    │                      │ 3. GUARD LAYER                   │
                    │                      │    (InternalToolGuard)           │
                    │                      │ • Reads x-internal-tool-key      │
                    │                      │ • Compares with process.env.     │
                    │                      │   INTERNAL_TOOL_KEY              │
                    │                      │ • Fails closed (401 UNAUTHORIZED)│
                    │                      │   if unset, empty, or mismatched │
                    │                      └──────────────┬───────────────────┘
                    └───────────────────┬─────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. DTO & VALIDATION PIPE LAYER                                              │
│   • Query Filter: QuestionFilterDto (category?, difficulty?, type?)         │
│   • Create Body:  CreateQuestionDto (prompt, category, difficulty, type...) │
│   • Update Body:  UpdateQuestionDto (partial fields)                        │
│   • Rejects unknown fields or invalid types with 400 VALIDATION_ERROR       │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. CONTROLLER LAYER (QuestionsController & InternalQuestionsController)     │
│   • Parses & validates numeric :id parameter (parseNumericQuestionId)       │
│   • Routes validated DTOs to QuestionsService methods                       │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. SERVICE & DOMAIN LOGIC LAYER (QuestionsService)                          │
│   • validateQuestionShape(): Enforces cross-field & type-exclusivity rules  │
│   • getNextQuestionId(): Finds max numeric `id` via sort({ id: -1 }) + 1    │
│   • isQuestionUsedInAnySession(): Queries `sessions` collection before      │
│     DELETE; throws 409 QUESTION_IN_USE if referenced                        │
│   • toQuestionPublicDto(): Strips private grading fields before returning   │
│     any public response                                                     │
│   • findActiveForSession(): Supplies full internal questions to Esmaeel     │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. MONGODB & MONGOOSE SCHEMA LAYER (QuestionSchema)                         │
│   • Collection: `questions`                                                 │
│   • Unique Index: `{ id: 1 }` (Fast numeric ID lookup & max-ID sorting)     │
│   • Compound Index: `{ active: 1, category: 1, difficulty: 1 }`             │
│     (Fast index scan for public filtering and session question selection)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Step-by-Step Data Flows by Operation

### Flow A: Application Startup & Repeatable Seeding (`OnModuleInit`)
1. NestJS initializes `DatabaseModule` and `QuestionsModule`.
2. `SeedQuestionsService.onModuleInit()` runs automatically and calls `questionsService.seedInitialQuestions(SEED_QUESTIONS)`.
3. **Validation Gate:** Every item in `SEED_QUESTIONS` (78 hand-authored questions across `react`, `typescript`, `nodejs`, `mongodb`) is passed through `validateQuestionShape()` to verify that all seeded data satisfies the contract rules.
4. **Idempotency Check:** `questionModel.countDocuments()` checks if the `questions` collection in MongoDB is empty:
   - **If `count === 0` (First start):** Inserts all 78 questions (`id: 101` through `178`) into MongoDB via `insertMany()`.
   - **If `count > 0` (Subsequent restarts):** Skips seeding so existing database records, edits, and deactivations survive backend restarts without duplication.

---

### Flow B: Public Question Browsing (`GET /api/v1/questions`)
1. **Incoming Request:** Candidate or frontend calls `GET /api/v1/questions?category=react&difficulty=medium`.
2. **DTO Validation (`QuestionFilterDto`):**
   - `ValidationPipe` transforms and trims `category` (`"react"`), verifies `difficulty` is in `['easy', 'medium', 'hard']`, and verifies `type` (if present) is in `['multiple_choice', 'short_answer', 'code_output']`.
   - If the client sends an unknown query param (e.g., `?hack=1`) or invalid enum (`?difficulty=extreme`), `ValidationPipe` immediately throws `400 VALIDATION_ERROR`.
3. **Database Query (`QuestionsService.findAllPublic`):**
   - Builds a MongoDB query filter: `{ active: true, category: 'react', difficulty: 'medium' }`.
   - MongoDB uses the compound index `{ active: 1, category: 1, difficulty: 1 }` to locate matching active documents in $O(\log N)$ time and sorts them by `{ id: 1 }`.
4. **Redaction (`toQuestionPublicDto`):**
   - Each database document is mapped into a fresh `QuestionPublicDto` object containing **only**:
     - `id`, `prompt`, `category`, `difficulty`, `type`
     - `choices: [{ id, text }]` (for `multiple_choice` — `isCorrect` is stripped!)
     - `codeSnippet` (for `code_output` — `expectedOutput` is stripped!)
     - For `short_answer`, `expectedKeywords` and `requiredKeywordCount` are completely omitted.
5. **Outgoing Response:** Returns `200 OK` with `{ items: QuestionPublicDto[] }`.

---

### Flow C: Public Single Question Lookup (`GET /api/v1/questions/:id`)
1. **Incoming Request:** Client requests `GET /api/v1/questions/109`.
2. **ID Parsing (`parseNumericQuestionId`):** Verifies `:id` is a positive integer; otherwise throws `404 QUESTION_NOT_FOUND`.
3. **Database Lookup:** Queries `questionModel.findOne({ id: 109 }).lean().exec()` using the unique `{ id: 1 }` index.
   - If no document matches, throws `404 QUESTION_NOT_FOUND`.
4. **Redaction & Response:** Passes the document through `toQuestionPublicDto()` and returns `200 OK`.

---

### Flow D: Guarded Question Creation (`POST /api/v1/internal/questions`)
1. **Incoming Request:** Operator or Swagger UI sends `POST /api/v1/internal/questions` with header `x-internal-tool-key` and JSON body.
2. **Guard Check (`InternalToolGuard.canActivate`):**
   - Reads `process.env.INTERNAL_TOOL_KEY`. If unset or empty, fails closed with `401 UNAUTHORIZED`.
   - Compares `request.headers['x-internal-tool-key']` against `process.env.INTERNAL_TOOL_KEY`. If missing or unequal, throws `401 UNAUTHORIZED`.
3. **Pipe & Cross-Field Validation (`CreateQuestionDto` + `validateQuestionShape`):**
   - `ValidationPipe` validates field types and rejects any unknown JSON properties.
   - `validateQuestionShape()` enforces type-specific rules:
     - **`multiple_choice`**: Must have 2–6 choices, unique `id`s, non-empty `text`, and **exactly one** `isCorrect: true`. Must not include `expectedKeywords`, `requiredKeywordCount`, `expectedOutput`, or `codeSnippet`.
     - **`short_answer`**: Must have 2–6 unique non-empty `expectedKeywords` and an integer `requiredKeywordCount` between `1` and `expectedKeywords.length`. Must not include `choices`, `expectedOutput`, or `codeSnippet`.
     - **`code_output`**: Must have a non-empty `expectedOutput` (`<= 1000` chars) and optional `codeSnippet`. Must not include `choices`, `expectedKeywords`, or `requiredKeywordCount`.
4. **Direct Numeric ID Assignment (`getNextQuestionId`):**
   - Queries `questionModel.findOne().sort({ id: -1 }).select({ id: 1 }).lean().exec()` and adds `1` (e.g., `178 + 1 = 179`).
5. **Persistence & Logging:**
   - Saves the document to MongoDB, logs `Question created: id=179 ...` via NestJS `Logger`, and returns `201 Created`.

---

### Flow E: Guarded Question Update (`PATCH /api/v1/internal/questions/:id`)
1. **Guard & ID Lookup:** Verified by `InternalToolGuard`. Loads existing question by numeric `id` (`404 QUESTION_NOT_FOUND` if missing).
2. **Holistic Merge & Validation:**
   - Merges the partial `UpdateQuestionDto` fields onto the existing question document.
   - Runs `validateQuestionShape(mergedCandidate)` on the **complete resulting shape** so a partial update can never leave a question in an inconsistent state (e.g., reducing `expectedKeywords` below `requiredKeywordCount` or mixing `choices` onto a `short_answer` question).
3. **Database Update & Snapshot Isolation:**
   - Updates the document in the `questions` collection (`$set` updated fields, `$unset` fields irrelevant to the target type).
   - **Historical Session Safety:** Because active and finished sessions store their own embedded copy of questions in the `sessions` collection, editing a question in `questions` never alters past sessions.

---

### Flow F: Guarded Deactivation vs. Deletion (`PATCH /:id/deactivate` & `DELETE /:id`)
1. **Soft Deactivation (`PATCH /api/v1/internal/questions/:id/deactivate`):**
   - Sets `active: false` on the question in MongoDB.
   - The deactivated question immediately stops appearing in `GET /api/v1/questions` and `findActiveForSession()`, while remaining intact in database history.
2. **Hard Deletion (`DELETE /api/v1/internal/questions/:id`):**
   - Calls `isQuestionUsedInAnySession(id)`, which queries MongoDB's `sessions` collection:
     ```ts
     this.connection.db.collection('sessions').countDocuments(
       { $or: [{ 'questions.id': questionId }, { 'questions.questionId': questionId }] },
       { limit: 1 }
     )
     ```
   - **If `count > 0` (Used in any session):** Rejects deletion with `409 QUESTION_IN_USE` and instructs the operator to use `PATCH /api/v1/internal/questions/:id/deactivate` instead.
   - **If `count === 0` (Never used):** Deletes the document from `questions` and returns `{ deleted: true, id }`.

---

### Flow G: Session Question Selection Boundary (`findActiveForSession`)
When Esmaeel's `SessionsService` handles `POST /api/v1/sessions`:
1. `SessionsService` calls `await this.questionsService.findActiveForSession(category, difficulty)`.
2. `QuestionsService` queries `{ active: true, category: category.trim().toLowerCase(), difficulty }` using the `{ active: 1, category: 1, difficulty: 1 }` compound index.
3. Returns the full internal `Question[]` array **including** `choices[].isCorrect`, `expectedKeywords`, `requiredKeywordCount`, and `expectedOutput`.
4. If `matching.length < questionCount`, `SessionsService` throws `409 INSUFFICIENT_QUESTIONS` with `details: { availableCount: matching.length }`. Otherwise, `SessionsService` picks `questionCount` random distinct questions and embeds them into the new `Session` document.
