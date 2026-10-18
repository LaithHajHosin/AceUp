# Integration Guide for Leader Laith & Esmaeel — Merging into `main`

**Author:** Badr Al Jerf  
**Target Audience:**  
- **Laith Haj Hosin** (Team Leader, Repository Integration, `main.ts`, `app.module.ts`, & Frontend Setup/Interview Connection)  
- **Esmaeel Mahfoud** (Sessions Backend, Question Snapshots, Timing & Scoring Engine)  

This guide provides the exact steps, file imports, and copy-pasteable code blocks so **Laith** and **Esmaeel** can integrate Badr's Question Bank module (`QuestionsModule`, `DatabaseModule`, `GlobalHttpExceptionFilter`, `InternalToolGuard`, and `SeedQuestionsService`) into `main` without any conflicts.

---

## Part 1: Guide for Leader Laith Haj Hosin (Merging into `main` & Frontend Wiring)

### 1. Backend Dependencies Added in `backend/package.json`
When merging `member-Badr` into `main`, ensure `backend/package.json` includes these 5 packages under `"dependencies"`:

```json
{
  "dependencies": {
    "@nestjs/common": "^12.0.1",
    "@nestjs/core": "^12.0.1",
    "@nestjs/mongoose": "^12.0.0",
    "@nestjs/platform-express": "^12.0.1",
    "@nestjs/swagger": "^12.0.2",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "mongoose": "^9.11.2",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  }
}
```

Then run inside `backend/`:
```bash
npm install
```

---

### 2. How `backend/src/app.module.ts` Should Look After Merging Both Badr & Esmaeel
In `backend/src/app.module.ts`, register `DatabaseModule`, Badr's `QuestionsModule`, and Esmaeel's `SessionsModule` (and `HistoryModule` if separated):

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { QuestionsModule } from './questions/questions.module.js';
// When Esmaeel merges his module, add:
// import { SessionsModule } from './sessions/sessions.module.js';

@Module({
  imports: [
    DatabaseModule,
    QuestionsModule,
    // SessionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

### 3. How `backend/src/main.ts` Configures Prefix, Validation, Error Envelope & Swagger
`backend/src/main.ts` is already configured to satisfy the entire `API-CONTRACT.md` for both Badr's and Esmaeel's routes:
- Sets `app.enableCors()` so your Vite frontend can call `http://localhost:3000/api/v1`.
- Sets `app.setGlobalPrefix('api/v1', { exclude: ['/'] })` so `@Controller('questions')` becomes `/api/v1/questions` and `@Controller('sessions')` becomes `/api/v1/sessions`.
- Registers `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` and converts validation errors into `{ statusCode: 400, code: 'VALIDATION_ERROR', message: '...', details: { errors: [...] } }`.
- Registers `GlobalHttpExceptionFilter` so every thrown `AppHttpException` returns `{ statusCode, code, message, details? }` — matching your `isErrorEnvelope()` check in `frontend/src/api/client.ts` 1-for-1!
- Mounts Swagger UI at `http://localhost:3000/api/docs` with the `x-internal-tool-key` security scheme.

---

### 4. How Laith's Frontend (`SetupPage.tsx` & `api/questions.ts`) Connects to Badr's Backend
We verified your `feature/laith-setup-interview` branch (`5435f2a`):
1. **DTO Alignment:** Your `PublicQuestion` and `QuestionListResponse` in `frontend/src/types/api.ts` match `QuestionPublicDto` and `QuestionListResponseDto` **100%**.
2. **Categories on `SetupPage.tsx`:** Your `SetupPage.tsx` calls `getQuestions()` (`GET /api/v1/questions`) on mount and extracts unique categories dynamically:
   - The backend automatically seeds **78 questions** across 4 categories: `react`, `typescript`, `nodejs`, and `mongodb`.
   - In `react` + `medium`, there are **7 active questions** (IDs `108–114`, including Sara's React key question from Section 5 of the spec). This allows starting a 6-question session while requesting 10 questions triggers `409 INSUFFICIENT_QUESTIONS` with `details: { availableCount: 7 }` for **Live Demo Acceptance Test #1**.

---

## Part 2: Guide for Esmaeel Mahfoud (Connecting `SessionsModule` to `QuestionsModule`)

### 1. Importing `QuestionsModule` into `SessionsModule`
`QuestionsModule` exports `QuestionsService`. In `backend/src/sessions/sessions.module.ts`, import `QuestionsModule` so NestJS can inject `QuestionsService` into `SessionsService`:

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionsModule } from '../questions/questions.module.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';
import { ScoringService } from './scoring.service.js';
import { Session, SessionSchema } from './schemas/session.schema.js';

@Module({
  imports: [
    QuestionsModule, // <-- Gives SessionsService access to QuestionsService
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, ScoringService],
  exports: [SessionsService],
})
export class SessionsModule {}
```

---

### 2. Fetching Active Questions & Creating Session Snapshots (`POST /api/v1/sessions`)
In `SessionsService`, inject `QuestionsService` and call `findActiveForSession(category, difficulty)`:
- It uses the `{ active: 1, category: 1, difficulty: 1 }` compound index.
- It normalizes `category` (`trim().toLowerCase()`) automatically.
- It returns full internal `Question[]` objects **including** private grading fields (`choices[].isCorrect`, `expectedKeywords`, `requiredKeywordCount`, `expectedOutput`, `codeSnippet`) so you can snapshot them directly into the `Session` document!

```ts
import { HttpStatus, Injectable } from '@nestjs/common';
import { AppHttpException } from '../common/exceptions/app-http.exception.js';
import { QuestionsService } from '../questions/questions.service.js';
import { toQuestionPublicDto } from '../questions/dto/question-filter.dto.js';

@Injectable()
export class SessionsService {
  constructor(private readonly questionsService: QuestionsService) {}

  async createSession(dto: CreateSessionDto) {
    // 1. Fetch all active questions matching category & difficulty (includes grading keys)
    const availableQuestions = await this.questionsService.findActiveForSession(
      dto.category,
      dto.difficulty,
    );

    // 2. Enforce Business Rule #3: Reject with 409 INSUFFICIENT_QUESTIONS + details.availableCount
    if (availableQuestions.length < dto.questionCount) {
      throw new AppHttpException(
        HttpStatus.CONFLICT,
        'INSUFFICIENT_QUESTIONS',
        `Requested ${dto.questionCount} questions, but only ${availableQuestions.length} active matching questions are available.`,
        { availableCount: availableQuestions.length },
      );
    }

    // 3. Randomly shuffle and pick `dto.questionCount` distinct questions for the session snapshot
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const snapshotQuestions = shuffled.slice(0, dto.questionCount);

    // 4. Save snapshotQuestions inside your Session document in MongoDB...
    // 5. When returning the active session to the candidate, redact grading fields:
    const safeQuestions = snapshotQuestions.map((q) => toQuestionPublicDto(q));
    return {
      // ...session fields,
      questions: safeQuestions,
    };
  }
}
```

---

### 3. How `DELETE /api/v1/internal/questions/:id` Checks Your `sessions` Collection (`409 QUESTION_IN_USE`)
To satisfy Business Rule #2 under Question Bank (*"A question that already appears in any session cannot be deleted — it can only be deactivated"*):
- When `DELETE /api/v1/internal/questions/:id` is called, `QuestionsService.isQuestionUsedInAnySession(questionId)` automatically runs:
  ```ts
  this.connection.db.collection('sessions').countDocuments(
    {
      $or: [
        { 'questions.id': questionId },
        { 'questions.questionId': questionId },
      ],
    },
    { limit: 1 },
  );
  ```
- **What Esmaeel needs to ensure in `session.schema.ts`:**
  1. Name the Mongoose collection `'sessions'` (`@Schema({ collection: 'sessions', timestamps: true })`).
  2. Store the snapshotted questions in an array property named `questions` where each snapshotted question keeps its numeric `id` (or `questionId`).
  3. *(Optional for in-memory unit tests)*: You can also call `this.questionsService.markQuestionUsedInSession(q.id)` when creating a session so even in-memory tests without MongoDB immediately enforce `409 QUESTION_IN_USE`!

---

### 4. Using `AppHttpException` for All Session Error Codes
To keep every error across `Questions` and `Sessions` in the exact `{ statusCode, code, message, details? }` envelope required by `docs/API-CONTRACT.md`, import `AppHttpException` from `../common/exceptions/app-http.exception.js`:

```ts
// 404 SESSION_NOT_FOUND
throw new AppHttpException(HttpStatus.NOT_FOUND, 'SESSION_NOT_FOUND', `Session ${id} not found.`);

// 409 SESSION_NOT_ACTIVE
throw new AppHttpException(HttpStatus.CONFLICT, 'SESSION_NOT_ACTIVE', 'Session is no longer in progress.');

// 409 SESSION_NOT_ENDED
throw new AppHttpException(HttpStatus.CONFLICT, 'SESSION_NOT_ENDED', 'Results are not available until the session ends.');

// 409 DUPLICATE_ANSWER
throw new AppHttpException(HttpStatus.CONFLICT, 'DUPLICATE_ANSWER', 'An answer for this question has already been submitted.');

// 409 QUESTION_NOT_IN_SESSION
throw new AppHttpException(HttpStatus.CONFLICT, 'QUESTION_NOT_IN_SESSION', 'Question does not belong to this session.');

// 400 ANSWER_TYPE_MISMATCH
throw new AppHttpException(HttpStatus.BAD_REQUEST, 'ANSWER_TYPE_MISMATCH', 'Submitted answer type does not match question type.');

// 400 INVALID_CHOICE
throw new AppHttpException(HttpStatus.BAD_REQUEST, 'INVALID_CHOICE', 'Selected choiceId is not valid for this question.');
```
