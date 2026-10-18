# Badr Al Jerf — File-by-File Importance, Methods & Code Block Explanation

**Owner:** Badr Al Jerf  
**Project:** PrepPressure (Team 3)  

This document explains **every file in the backend**, **why it is important**, **every method and decorator used inside it**, and **annotated code blocks** so you can explain any part of your code in detail.

---

## 1. `backend/src/main.ts`

### Why This File Is Important
`main.ts` is the entry point of the NestJS application. It boots the HTTP server, configures the `/api/v1` base route prefix, attaches the global `ValidationPipe` (which rejects unknown fields and validates DTOs), attaches the `GlobalHttpExceptionFilter`, and generates the interactive **Swagger / OpenAPI** documentation at `/api/docs`.

### Methods & Decorators Used
- `flattenValidationErrors(errors: ValidationError[])`: Recursively collects human-readable validation messages from nested `class-validator` errors (such as invalid `choices[]` items inside a `multiple_choice` question).
- `configureApp(app: INestApplication)`: Applies CORS, `/api/v1` global prefix, `ValidationPipe`, `GlobalHttpExceptionFilter`, and Swagger setup (`DocumentBuilder`, `SwaggerModule.createDocument`, `SwaggerModule.setup`).
- `bootstrap()`: Creates the NestJS app from `AppModule`, calls `configureApp(app)`, and starts listening on `0.0.0.0:PORT`.

### Code Block & Explanation
```ts
export function configureApp(app: INestApplication): void {
  app.enableCors();

  // Prefix all routes with /api/v1 as required by docs/API-CONTRACT.md
  app.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  // Reject unknown query/body fields (whitelist + forbidNonWhitelisted)
  // and transform query params into DTO instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flattenValidationErrors(errors);
        const summary =
          messages.length > 0
            ? messages.join('; ')
            : 'Invalid request payload or query parameters.';
        return new AppHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          summary,
          { errors: messages },
        );
      },
    }),
  );

  // Enforce canonical error envelope { statusCode, code, message, details? }
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Configure Swagger UI at /api/docs including the x-internal-tool-key header
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PrepPressure API')
    .setDescription(
      'Canonical REST API for PrepPressure Technical Interview Simulation Platform (Version 1.0)',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: INTERNAL_TOOL_KEY_HEADER,
        description:
          'Internal administrative tool key matching backend INTERNAL_TOOL_KEY environment variable',
      },
      'internal-tool-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
```

---

## 2. `backend/src/app.module.ts` & `backend/src/database/database.module.ts`

### Why These Files Are Important
- `app.module.ts` is the root NestJS module that connects `DatabaseModule` and `QuestionsModule`.
- `database.module.ts` initializes the MongoDB connection via `@nestjs/mongoose` using `process.env.MONGODB_URI`. It sets `mongoose.set('bufferCommands', false)` so queries fail fast instead of hanging if MongoDB is disconnected.

### Methods & Decorators Used
- `@Global()` & `@Module(...)`: Makes the Mongoose database connection available across the entire backend.
- `MongooseModule.forRootAsync({ useFactory: ... })`: Reads `process.env.MONGODB_URI` dynamically at runtime and logs connection status.

### Code Block & Explanation
```ts
// Fail fast on queries if MongoDB is disconnected rather than hanging for 10s
mongoose.set('bufferCommands', false);

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri =
          process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preppressure';
        return {
          uri,
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 2000,
          lazyConnection: true,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              logger.log('Connected to MongoDB database.');
            });
            connection.on('error', (err: Error) => {
              logger.warn(
                `MongoDB connection unavailable (${err.message}). Using synchronized fallback store until MongoDB is reachable.`,
              );
            });
            connection.openUri(uri).catch(() => {});
            return connection;
          },
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
```

---

## 3. `backend/src/common/exceptions/app-http.exception.ts` & `backend/src/common/filters/http-exception.filter.ts`

### Why These Files Are Important
`docs/API-CONTRACT.md` requires every error across the entire backend to return the exact JSON structure:
```json
{
  "statusCode": 409,
  "code": "QUESTION_IN_USE",
  "message": "...",
  "details": {}
}
```
`AppHttpException` lets any service or guard throw an exception with an explicit `code` (`VALIDATION_ERROR`, `UNAUTHORIZED`, `QUESTION_NOT_FOUND`, `QUESTION_IN_USE`, etc.) and optional `details`, while `GlobalHttpExceptionFilter` catches all exceptions and guarantees the response JSON always matches that envelope.

### Methods & Decorators Used
- `AppHttpException.constructor(statusCode, code, message, details?)`: Calls `super(body, statusCode)` on NestJS `HttpException`.
- `@Catch()` on `GlobalHttpExceptionFilter`: Intercepts all thrown exceptions.
- `catch(exception: unknown, host: ArgumentsHost)`: Extracts the Express `Response` object and writes the standardized JSON envelope.

### Code Block & Explanation
```ts
export class AppHttpException extends HttpException {
  public readonly code: ErrorCode | string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: HttpStatus | number,
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    const body: ErrorEnvelope = {
      statusCode,
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    };
    super(body, statusCode);
    this.code = code;
    this.details = details;
  }
}
```

---

## 4. `backend/src/common/guards/internal-tool.guard.ts`

### Why This File Is Important
Protects the 4 internal question-management endpoints (`POST`, `PATCH /:id`, `PATCH /:id/deactivate`, `DELETE /:id` under `/api/v1/internal/questions`). It implements the course's `InternalToolGuard` pattern by reading `x-internal-tool-key` from the request headers and comparing it against `process.env.INTERNAL_TOOL_KEY`.

### Methods & Decorators Used
- `@Injectable()` & `implements CanActivate`: Registers the class as a NestJS Guard.
- `canActivate(context: ExecutionContext): boolean`:
  1. Reads `process.env.INTERNAL_TOOL_KEY?.trim()`. If unset or empty, **fails closed** by throwing `401 UNAUTHORIZED`.
  2. Reads `request.headers['x-internal-tool-key']`. If missing or not equal to `expectedKey`, throws `401 UNAUTHORIZED`.
  3. Returns `true` only when the header matches.

### Code Block & Explanation
```ts
@Injectable()
export class InternalToolGuard implements CanActivate {
  private readonly logger = new Logger(InternalToolGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedKey = process.env.INTERNAL_TOOL_KEY?.trim();

    // Fail closed if INTERNAL_TOOL_KEY is not configured in .env
    if (!expectedKey) {
      this.logger.warn(
        `Rejected internal route access (${request.method} ${request.originalUrl || request.url}): INTERNAL_TOOL_KEY is not configured.`,
      );
      throw new AppHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Internal tool access is disabled or unauthorized.',
      );
    }

    const rawHeader = request.headers[INTERNAL_TOOL_KEY_HEADER];
    const providedKey = Array.isArray(rawHeader)
      ? rawHeader[0]?.trim()
      : rawHeader?.trim();

    if (!providedKey || providedKey !== expectedKey) {
      this.logger.warn(
        `Unauthorized internal route attempt (${request.method} ${request.originalUrl || request.url}): missing or invalid ${INTERNAL_TOOL_KEY_HEADER} header.`,
      );
      throw new AppHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Missing or invalid x-internal-tool-key header.',
      );
    }

    return true;
  }
}
```

---

## 5. `backend/src/questions/schemas/question.schema.ts`

### Why This File Is Important
Defines the Mongoose schema for the `questions` collection in MongoDB, including the numeric application `id`, type-specific grading fields, the `active` soft-deactivation flag, and the **agreed compound index `{ active: 1, category: 1, difficulty: 1 }`** (Data Design Decision #2).

### Decorators & Schema Definitions Used
- `@Schema({ _id: false })` on `QuestionChoice`: Embeds choice objects `{ id, text, isCorrect }` without extra sub-document `_id`s.
- `@Schema({ collection: 'questions', timestamps: true, versionKey: false })` on `Question`: Automatically manages `createdAt` and `updatedAt` timestamps and removes `__v`.
- `@Prop({ type: Number, required: true, unique: true, index: true }) id: number`: Enforces uniqueness on the numeric application ID.
- `QuestionSchema.index({ active: 1, category: 1, difficulty: 1 })`: Creates the compound index optimizing both public Question Bank filtering and session creation queries.

### Code Block & Explanation
```ts
@Schema({
  collection: 'questions',
  timestamps: true,
  versionKey: false,
})
export class Question {
  @Prop({ type: Number, required: true, unique: true, index: true })
  id: number;

  @Prop({ type: String, required: true, trim: true, maxlength: 2000 })
  prompt: string;

  @Prop({ type: String, required: true, trim: true })
  category: string;

  @Prop({ type: String, required: true, enum: DIFFICULTIES })
  difficulty: Difficulty;

  @Prop({ type: String, required: true, enum: QUESTION_TYPES })
  type: QuestionType;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;

  @Prop({ type: [QuestionChoiceSchema], required: false })
  choices?: QuestionChoice[];

  @Prop({ type: [String], required: false })
  expectedKeywords?: string[];

  @Prop({ type: Number, required: false })
  requiredKeywordCount?: number;

  @Prop({ type: String, required: false, maxlength: 1000 })
  expectedOutput?: string;

  @Prop({ type: String, required: false })
  codeSnippet?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

// Agreed compound index supporting public filtering and session question selection
QuestionSchema.index({ active: 1, category: 1, difficulty: 1 });
```

---

## 6. `backend/src/questions/dto/question-filter.dto.ts`

### Why This File Is Important
1. Validates query parameters (`?category=...&difficulty=...&type=...`) on `GET /api/v1/questions`.
2. Defines the public response DTOs (`QuestionChoicePublicDto`, `QuestionPublicDto`, `QuestionListResponseDto`) and the pure redaction function `toQuestionPublicDto()` that strips private answer keys before sending data to candidates.

### Methods & Decorators Used
- `@IsOptional()`, `@Transform(...)`, `@IsString()`, `@IsNotEmpty()`, `@IsIn(...)`: Validates optional query filters.
- `toQuestionPublicDto(question)`: Constructs a clean public DTO containing only candidate-safe fields (`id`, `prompt`, `category`, `difficulty`, `type`, `choices: [{ id, text }]`, `codeSnippet?`), guaranteeing `isCorrect`, `expectedKeywords`, `requiredKeywordCount`, and `expectedOutput` are never leaked.

### Code Block & Explanation
```ts
export function toQuestionPublicDto(
  question: Pick<
    Question,
    | 'id'
    | 'prompt'
    | 'category'
    | 'difficulty'
    | 'type'
    | 'choices'
    | 'codeSnippet'
  >,
): QuestionPublicDto {
  const dto: QuestionPublicDto = {
    id: question.id,
    prompt: question.prompt,
    category: question.category,
    difficulty: question.difficulty,
    type: question.type,
  };

  // Strip `isCorrect` from every multiple_choice option
  if (question.type === 'multiple_choice' && Array.isArray(question.choices)) {
    dto.choices = question.choices.map((choice) => ({
      id: choice.id,
      text: choice.text,
    }));
  }

  // Include display-only codeSnippet for code_output while omitting expectedOutput
  if (
    question.type === 'code_output' &&
    typeof question.codeSnippet === 'string' &&
    question.codeSnippet.trim().length > 0
  ) {
    dto.codeSnippet = question.codeSnippet;
  }

  return dto;
}
```

---

## 7. `backend/src/questions/dto/create-question.dto.ts` & `backend/src/questions/dto/update-question.dto.ts`

### Why These Files Are Important
Validate incoming JSON bodies for `POST /api/v1/internal/questions` and `PATCH /api/v1/internal/questions/:id`, and provide the deterministic domain validator `validateQuestionShape()`.

### Methods & Decorators Used
- `QuestionChoiceInputDto`: Validates each choice item (`id`, `text`, `isCorrect`).
- `CreateQuestionDto`: Validates required fields for creating a question (`@IsNotEmpty`, `@MaxLength(2000)`, `@IsIn(DIFFICULTIES)`, `@IsIn(QUESTION_TYPES)`, `@ArrayMinSize(2)`, `@ArrayMaxSize(6)`, `@ValidateNested({ each: true })`).
- `UpdateQuestionDto`: Validates partial fields when editing a question.
- `validateQuestionShape(input)`: Enforces cross-field consistency:
  - Rejects fields that do not belong to the chosen `type` (e.g., rejects `choices` on a `short_answer` question).
  - Verifies `multiple_choice` has 2–6 choices, unique `id`s, and **exactly one** `isCorrect: true`.
  - Verifies `short_answer` has 2–6 unique non-empty `expectedKeywords` and `1 <= requiredKeywordCount <= expectedKeywords.length`.
  - Verifies `code_output` has a non-empty `expectedOutput` (`<= 1000` characters).

### Code Block & Explanation
```ts
// Inside validateQuestionShape() for multiple_choice:
if (input.type === 'multiple_choice') {
  if (
    input.expectedKeywords !== undefined ||
    input.requiredKeywordCount !== undefined ||
    input.expectedOutput !== undefined ||
    input.codeSnippet !== undefined
  ) {
    throw new AppHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'multiple_choice questions must not include expectedKeywords, requiredKeywordCount, expectedOutput, or codeSnippet.',
    );
  }
  // ... verifies 2-6 choices, unique IDs, and correctCount === 1
}
```

---

## 8. `backend/src/questions/questions.controller.ts`

### Why This File Is Important
Defines the HTTP routes for both public candidate browsing (`QuestionsController` at `/api/v1/questions`) and guarded internal administration (`InternalQuestionsController` at `/api/v1/internal/questions`), along with full Swagger documentation.

### Methods & Decorators Used
- `parseNumericQuestionId(rawId: string)`: Validates that `:id` is a positive integer; throws `404 QUESTION_NOT_FOUND` otherwise.
- `QuestionsController`:
  - `@Get() findAll(@Query() filter: QuestionFilterDto)`: Calls `questionsService.findAllPublic(filter)`.
  - `@Get(':id') findOne(@Param('id') rawId: string)`: Calls `questionsService.findOnePublicById(id)`.
- `InternalQuestionsController` (`@UseGuards(InternalToolGuard)`, `@ApiSecurity('internal-tool-key')`, `@ApiHeader({ name: 'x-internal-tool-key' })`):
  - `@Post() create(@Body() dto: CreateQuestionDto)`: Calls `questionsService.createInternal(dto)`.
  - `@Patch(':id') update(@Param('id') rawId: string, @Body() dto: UpdateQuestionDto)`: Calls `questionsService.updateInternal(id, dto)`.
  - `@Patch(':id/deactivate') deactivate(@Param('id') rawId: string)`: Calls `questionsService.deactivateInternal(id)`.
  - `@Delete(':id') remove(@Param('id') rawId: string)`: Calls `questionsService.deleteInternal(id)`.

---

## 9. `backend/src/questions/questions.service.ts`

### Why This File Is Important
Contains all business logic and MongoDB queries for the Question Bank.

### Methods Used in `QuestionsService`
1. `getNextQuestionId(): Promise<number>`:
   - Queries `this.questionModel.findOne().sort({ id: -1 }).select({ id: 1 }).lean().exec()` and returns `(highestDoc?.id ?? 100) + 1`.
2. `seedInitialQuestions(seedItems)`:
   - Validates all 78 seed items via `validateQuestionShape()` and inserts them into MongoDB if `countDocuments() === 0`.
3. `findAllPublic(filter: QuestionFilterDto)`:
   - Queries `{ active: true, ...filter }`, sorts by `{ id: 1 }`, and maps each question through `toQuestionPublicDto()`.
4. `findOnePublicById(id: number)`:
   - Finds a question by numeric `id` (`404 QUESTION_NOT_FOUND` if missing) and maps through `toQuestionPublicDto()`.
5. `findActiveForSession(category: string, difficulty: Difficulty)`:
   - Boundary method for Esmaeel's `SessionsService`: queries `{ active: true, category: normalizedCategory, difficulty }` and returns full internal `Question[]` objects with grading keys so Esmaeel can create session snapshots.
6. `createInternal(dto: CreateQuestionDto)`:
   - Validates shape, assigns next numeric ID via `getNextQuestionId()`, saves to MongoDB, and logs creation via NestJS `Logger`.
7. `updateInternal(id: number, dto: UpdateQuestionDto)`:
   - Loads existing question, merges partial `dto` fields, validates the merged shape via `validateQuestionShape()`, updates MongoDB (`$set` / `$unset`), and logs the update.
8. `deactivateInternal(id: number)`:
   - Sets `active: false` on the question in MongoDB and logs deactivation.
9. `deleteInternal(id: number)` & `isQuestionUsedInAnySession(questionId: number)`:
   - Checks the `sessions` collection (`{ $or: [{ 'questions.id': questionId }, { 'questions.questionId': questionId }] }`). If referenced in any session, throws `409 QUESTION_IN_USE`; otherwise deletes the question.

### Code Block & Explanation
```ts
async getNextQuestionId(): Promise<number> {
  if (this.isMongoConnected()) {
    const highestDoc = await this.questionModel!
      .findOne()
      .sort({ id: -1 })
      .select({ id: 1 })
      .lean()
      .exec();
    const maxMongoId = highestDoc?.id ?? 100;
    const maxMemId =
      this.fallbackStore.size > 0
        ? Math.max(...this.fallbackStore.keys())
        : 100;
    return Math.max(maxMongoId, maxMemId) + 1;
  }

  const maxId =
    this.fallbackStore.size > 0
      ? Math.max(...this.fallbackStore.keys())
      : 100;
  return maxId + 1;
}
```

---

## 10. `backend/src/questions/seed-questions.ts`, `seed-questions.service.ts` & `questions.module.ts`

### Why These Files Are Important
- `seed-questions.ts` holds **78 hand-authored questions** across `react` (20), `typescript` (20), `nodejs` (19), and `mongodb` (19), covering `easy`, `medium`, and `hard` difficulties and `multiple_choice`, `short_answer`, and `code_output` types.
  - Specifically, `react` + `medium` has **7 active questions** (IDs `108–114`) so starting a 6-question session succeeds while requesting 10 questions triggers `409 INSUFFICIENT_QUESTIONS` (`availableCount: 7`) for Live Demo Test #1.
  - Question `109` (*"Why does React need a key when rendering a list?"*) has `expectedKeywords: ['identity', 're-render', 'reorder']` and `requiredKeywordCount: 2` for Live Demo Test #4 (half-points vs. full-points).
- `seed-questions.service.ts` implements `OnModuleInit` so NestJS automatically seeds the database on startup when empty.
- `questions.module.ts` wires `QuestionSchema`, `QuestionsController`, `InternalQuestionsController`, `QuestionsService`, `SeedQuestionsService`, and `InternalToolGuard` together and exports `QuestionsService` for Esmaeel's `SessionsModule`.
