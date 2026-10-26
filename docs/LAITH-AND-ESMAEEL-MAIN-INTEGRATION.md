# Team Integration Guide (`main`) & v2-to-v3 Questions Handoff

This guide covers two essential topics for merging into `main`:
1. **How Laith, Esmaeel, Shiam, and Adham integrate with Badr's v3 Backend Platform, Global JWT Guard, and MongoDB Storage Contract (`02_API_CONTRACT.pdf` & `06_Badr_Tasks.pdf`)**.
2. **Handoff Reference for Shiam Ezzo (`questions` & `interviews` modules)**: how the Question Bank transitioned from v2 to v3 (`ownerId`, `ownerUsername`, `PublicQuestion` vs `OwnerQuestion`, and `QUESTION_IN_USE` delete protection).

---

## Part 1: Integrating with Badr's v3 Platform on `main`

### 1.1 Single-Line Module Registration in `backend/src/app.module.ts` (Shiam & Esmaeel)

Badr owns `backend/src/app.module.ts`. Under the "nobody waits" rule (`00_README.pdf` & `06_Badr_Tasks.pdf` §6):
- **Shiam** adds only `QuestionsModule` and `InterviewsModule` to the `imports` array in `backend/src/app.module.ts` when opening her PR.
- **Esmaeel** adds only `AttemptsModule` to the `imports` array in `backend/src/app.module.ts` when opening his PR.

```ts
// backend/src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/.env'],
      validate: validateEnv,
    }),
    MongooseModule.forRootAsync({ ... }),
    AuthModule,
    UsersModule,
    QuestionsModule,   // <-- Shiam adds this line in her PR
    InterviewsModule,  // <-- Shiam adds this line in her PR
    AttemptsModule,    // <-- Esmaeel adds this line in his PR
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

### 1.2 Reading the Authenticated User in Controllers (Shiam & Esmaeel)

Because Badr registers `JwtAuthGuard` globally via `APP_GUARD`:
- **Every endpoint in `questions`, `interviews`, and `attempts` is automatically protected by Bearer JWT authentication.**
- **Zero imports from `src/auth/`**: Shiam and Esmaeel must **not** import anything from `backend/src/auth/`.
- After `JwtAuthGuard` verifies the token, it attaches the frozen shape from Contract §1 onto the Express request object:

```ts
request.user = { userId: number, username: string }
```

In any controller (`QuestionsController`, `InterviewsController`, `AttemptsController`), read `request.user.userId` directly via `@Req()`:

```ts
@Post()
async create(
  @Req() req: { user: { userId: number; username: string } },
  @Body() dto: CreateQuestionDto,
) {
  return this.questionsService.create(req.user.userId, dto);
}
```

### 1.3 Testing Modules in Isolation by Overriding `APP_GUARD` (Shiam & Esmaeel)

In isolated e2e tests (`questions.e2e-spec.ts`, `interviews.e2e-spec.ts`, `attempts.e2e-spec.ts`), Shiam and Esmaeel can either:
1. Override `JwtAuthGuard` (or test their module standalone with a fake guard that sets `req.user = { userId: 1, username: 'alex_dev' }`), **or**
2. Once merged with Badr's `AuthModule`, call `POST /api/v1/auth/register` to obtain a real `accessToken` and send `Authorization: Bearer <accessToken>`.

### 1.4 Cross-Collection Native Driver Reads & Numeric IDs (Contract §8)

Modules never import each other's services or Mongoose models. Instead, each module injects `@InjectConnection() private readonly connection: Connection` and reads other collections via `this.connection.collection('<name>')`:

| Module Owner | Writes To Collection(s) | Counter Key in `counters` | Reads From Other Collections via `connection.collection(...)` |
| --- | --- | --- | --- |
| **Badr** | `users` | `'users'` | Reads `questions` (`ownerId`), `interviews` (`ownerId`), `attempts` (`userId`, `status`, `percentage`, `answers`) for `GET /users/:id/profile` |
| **Shiam** | `questions`, `interviews` | `'questions'`, `'interviews'` | Reads `users` (`{ id, username }`) to populate `ownerUsername`; reads `interviews` (`questionIds`) & `attempts` (`questions.questionId`) before `DELETE /questions/:id` |
| **Esmaeel** | `attempts` | `'attempts'` | Reads `interviews` (`{ id, title, questionIds, timeLimitSeconds }`) and `questions` (full question docs) during `POST /attempts` to snapshot the interview |

Each module implements its own private numeric ID helper on `counters` using its own `_id` key (`'users'`, `'questions'`, `'interviews'`, `'attempts'`):

```ts
const result = await this.connection
  .collection<{ _id: string; seq: number }>('counters')
  .findOneAndUpdate(
    { _id: '<your_key>' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
```

### 1.5 Frontend Auth & API Integration (Laith & Adham — Contract §9)

1. **Base URL**: `import.meta.env.VITE_API_URL` (`http://localhost:3000/api/v1`).
2. **LocalStorage Keys (Frozen)**:
   - `preppressure.token`: raw JWT string (`accessToken` from `POST /auth/login` or `POST /auth/register`).
   - `preppressure.user`: JSON-serialized `PrivateUser` (`{ id, username, email, displayName, bio, createdAt }`).
3. **Automatic Logout on `401`**:
   - Whenever any feature API call (`auth`, `profile`, `attempts`, `questions`, `interviews`) receives HTTP `401`, it must remove `preppressure.token` and `preppressure.user` from `localStorage` and dispatch:
     ```ts
     window.dispatchEvent(new Event('preppressure:logout'));
     ```
   - Laith's `AuthContext` listens for `'preppressure:logout'` and redirects the user to `/login`.

---

## Part 2: v2-to-v3 Question Bank Handoff Note for Shiam Ezzo (`07_Shiam_Tasks.pdf`)

In v3, ownership of `backend/src/questions/**` and `backend/src/interviews/**` belongs to **Shiam Ezzo**. Below is the exact checklist of what changed between the v2 Question Bank and the v3 Question Bank specification so Shiam can implement `backend/src/questions/**` smoothly:

1. **Ownership & Auth (`ownerId` & `ownerUsername`)**:
   - In v2, question creation/modification used an `x-internal-tool-key` header. In v3, `x-internal-tool-key` is completely gone.
   - `POST /api/v1/questions` sets `ownerId = req.user.userId` (from Badr's JWT guard, never from the request body).
   - `PATCH /api/v1/questions/:id` and `DELETE /api/v1/questions/:id` check `question.ownerId === req.user.userId`. If not equal, throw `403 Forbidden` with `code: 'NOT_OWNER'`.
   - Every response includes `ownerUsername: string | null`, looked up from Badr's `users` collection via `this.connection.collection('users').findOne({ id: question.ownerId })` (`null` if the user no longer exists).
2. **Two Response Shapes (`PublicQuestion` vs. `OwnerQuestion`)**:
   - **`PublicQuestion`** (returned to non-owners):
     - Includes `id`, `ownerId`, `ownerUsername`, `prompt`, `category`, `difficulty`, `type`, `choices` (`[{ id, text }]` **without** `isCorrect` for `multiple_choice`, `null` for other types), `codeSnippet` (string for `code_output`, `null` for other types), `createdAt`, `updatedAt`.
     - Never includes `choices[].isCorrect`, `expectedKeywords`, `requiredKeywordCount`, or `expectedOutput`.
   - **`OwnerQuestion`** (returned on `POST /questions`, `PATCH /questions/:id`, and `GET /questions/:id` when `req.user.userId === question.ownerId`):
     - Includes all `PublicQuestion` fields plus `choices[].isCorrect`, `expectedKeywords`, `requiredKeywordCount`, and `expectedOutput` (`null` when not relevant to the question's `type`).
3. **Query Filters on `GET /api/v1/questions`**:
   - Optional query params: `category`, `difficulty`, `type`, `ownerId` (positive integer), `search` (case-insensitive substring match on `prompt`).
   - Unknown query fields are automatically rejected with `400` by Badr's global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
4. **Cross-Collection Delete Protection (`409 QUESTION_IN_USE`)**:
   - Before deleting a question in `DELETE /api/v1/questions/:id`, check via the native driver:
     - `this.connection.collection('interviews').findOne({ questionIds: id })`
     - `this.connection.collection('attempts').findOne({ 'questions.questionId': id })`
   - If either exists, throw `409 Conflict` with `code: 'QUESTION_IN_USE'`.
