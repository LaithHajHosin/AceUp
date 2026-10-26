# PrepPressure — Backend Data Flow Guide (v3: Platform, Auth, Users & Profile Stats)

This document explains how every HTTP request flows through **Badr Al Jerf's** v3 backend foundation (`backend/src/main.ts`, `backend/src/app.module.ts`, `backend/src/config/env.validation.ts`, `backend/src/auth/**`, and `backend/src/users/**`) under the frozen `docs/API-CONTRACT.md` (v3).

---

## 1. End-to-End Request Pipeline Overview

```text
Incoming HTTP Request (http://localhost:3000/api/v1/...)
   │
   ▼
[1. Startup & App Bootstrap] (backend/src/main.ts + backend/src/config/env.validation.ts)
   • Validates MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, PORT, CORS_ORIGIN at startup
   • Refuses to boot if MONGODB_URI or JWT_SECRET is missing
   • Configures CORS from CORS_ORIGIN
   • Sets global prefix '/api/v1'
   • Mounts Swagger UI at '/docs' (outside '/api/v1') with Bearer auth & persistAuthorization: true
   │
   ▼
[2. Global JWT Auth Guard] (backend/src/auth/jwt-auth.guard.ts — registered via APP_GUARD)
   • Checks @Public() metadata via Reflector (only POST /auth/register & POST /auth/login)
   • If not public: extracts 'Authorization: Bearer <token>'
   • Verifies signature & expiration via JwtService.verifyAsync(token)
   • Attaches frozen identity: request.user = { userId: payload.sub, username: payload.username }
   • Missing/invalid/expired token -> throws 401 { code: 'UNAUTHORIZED' }
   │
   ▼
[3. Global ValidationPipe] (backend/src/main.ts)
   • Runs class-transformer (@Transform) to trim strings and lowercase username/email
   • Runs class-validator rules on DTOs
   • Rejects unknown body properties (whitelist: true, forbidNonWhitelisted: true) with 400
   │
   ▼
[4. Controller Routing] (AuthController / UsersController)
   • Dispatches validated DTO & authenticated request.user to AuthService / UsersService / ProfileStatsService
   │
   ▼
[5. Service & MongoDB Storage Layer] (Contract §8)
   • UsersService writes exclusively to 'users' collection and 'counters' key 'users'
   • ProfileStatsService reads 'questions', 'interviews', and 'attempts' via native driver (connection.collection('<name>'))
   • Serializes responses into PrivateUserDto / PublicUserDto / UserProfileResponseDto (never exposing passwordHash or _id)
```

---

## 2. Detailed Flow by Endpoint

### Flow A: `POST /api/v1/auth/register` (Public)

1. **Guard Bypass**: `AuthController.register` is decorated with `@Public()`. `JwtAuthGuard` inspects `IS_PUBLIC_KEY` via `Reflector` and immediately returns `true`.
2. **DTO Normalization & Validation (`RegisterDto`)**:
   - `username`: trimmed, lowercased, 3–30 chars, matches `/^[a-z0-9_]+$/`.
   - `email`: trimmed, lowercased, validated with `@IsEmail()`.
   - `password`: 8–72 chars.
   - `displayName`: trimmed, 2–50 chars.
3. **Password Hashing (`AuthService.register`)**:
   - Hashes plaintext `dto.password` using `bcrypt.hash(dto.password, 10)` (10 salt rounds).
4. **Uniqueness Check & Numeric ID Assignment (`UsersService.createUser`)**:
   - Checks if `username` already exists in `users` → if so, throws `409 Conflict` with `code: 'USERNAME_TAKEN'`.
   - Checks if `email` already exists in `users` → if so, throws `409 Conflict` with `code: 'EMAIL_TAKEN'`.
   - Atomically increments the `users` sequence counter in the `counters` collection:
     ```ts
     connection.collection('counters').findOneAndUpdate(
       { _id: 'users' },
       { $inc: { seq: 1 } },
       { upsert: true, returnDocument: 'after' },
     );
     ```
   - Inserts the new user document into `users` with `bio: null` and `passwordHash` (`select: false`).
5. **JWT Issuance**:
   - `AuthService` signs `{ sub: user.id, username: user.username }` using `JWT_SECRET` and `JWT_EXPIRES_IN` (default `1h` = `3600` seconds).
   - Returns `201 Created` with `{ accessToken, tokenType: 'Bearer', expiresIn: 3600, user: PrivateUser }`.

---

### Flow B: `POST /api/v1/auth/login` (Public)

1. **Guard Bypass**: Decorated with `@Public()`.
2. **DTO Validation (`LoginDto`)**: Validates non-empty `usernameOrEmail` and `password`.
3. **Lookup with Explicit `+passwordHash` Selection**:
   - Because `passwordHash` has `select: false` in `UserSchema`, `UsersService.findByUsernameOrEmailWithPassword` explicitly runs `.select('+passwordHash')` against `{ $or: [{ username: normalized }, { email: normalized }] }`.
4. **Anti-Enumeration Verification (`AuthService.login`)**:
   - Whether the user does not exist **or** `bcrypt.compare(dto.password, user.passwordHash)` returns `false`, `AuthService` throws the **exact same** `401 Unauthorized` response:
     ```json
     {
       "statusCode": 401,
       "error": "Unauthorized",
       "code": "INVALID_CREDENTIALS",
       "message": "Invalid username/email or password."
     }
     ```
   - This prevents attackers from enumerating valid usernames or emails.
5. **JWT Issuance**: Signs `{ sub: user.id, username: user.username }` and returns `200 OK` with `AuthResponseDto`.

---

### Flow C: `GET /api/v1/auth/me` (Protected)

1. **JWT Verification (`JwtAuthGuard`)**:
   - Extracts Bearer token, verifies signature and expiration, and sets `request.user = { userId: payload.sub, username: payload.username }`.
2. **User Lookup (`AuthService.getMe`)**:
   - Queries `UsersService.findPrivateById(req.user.userId)`.
   - If the user was deleted after the token was issued, throws `401 UNAUTHORIZED`.
   - Returns `200 OK` with `PrivateUserDto` (`{ id, username, email, displayName, bio, createdAt }`).

---

### Flow D: `PATCH /api/v1/users/me` (Protected)

1. **JWT Verification**: Populates `req.user.userId`.
2. **DTO Validation (`UpdateMeDto`)**:
   - `displayName` (optional): trimmed string, 2–50 chars.
   - `bio` (optional): trimmed string up to 300 chars, or `null` to clear the bio.
   - Any extra field (such as `email`, `username`, or `id`) is rejected with `400 Bad Request` by `forbidNonWhitelisted: true`.
3. **Atomic Update (`UsersService.updateMe`)**:
   - Updates `{ id: req.user.userId }` in `users` via `findOneAndUpdate({ id: userId }, { $set: updates }, { new: true })`.
   - Returns `200 OK` with the updated `PrivateUserDto`.

---

### Flow E: `GET /api/v1/users/:id/profile` (Protected)

1. **JWT Verification**: Requires a valid Bearer token (`401 UNAUTHORIZED` otherwise).
2. **Parameter Validation**: Ensures `:id` is a positive integer (`400 VALIDATION_FAILED` otherwise).
3. **Parallel User + Cross-Collection Stats Read**:
   - `UsersService.findPublicByIdOrThrow(id)` fetches the user and maps to `PublicUserDto` (**omitting both `email` and `passwordHash`**), or throws `404 NOT_FOUND`.
   - `ProfileStatsService.getStatsForUser(id)` reads across collections using the native MongoDB driver (`connection.collection('<name>')`) and Contract §8 fields only (no Mongoose `populate`, no `aggregate` pipelines):
     - `questions`: `countDocuments({ ownerId: userId })` → `questionsCreated`
     - `interviews`: `countDocuments({ ownerId: userId })` → `interviewsCreated`
     - `attempts`: `find({ userId }, { projection: { status: 1, percentage: 1, answers: 1, _id: 0 } }).toArray()`
       - Counts `status === 'in_progress'` → `attemptsInProgress`
       - Counts `status === 'finished' || status === 'timed_out'` → `attemptsCompleted`
       - Sums `answers.length` across all user attempts → `questionsAnswered`
       - Computes `averagePercentage` and `bestPercentage` (rounded to 1 decimal place) across completed attempts, or returns `null` if the user has 0 completed attempts.

---

## 3. Discussion Answers ("Things to Think About" in `06_Badr_Tasks.pdf`)

1. **How will the guard know a route is public without other modules importing anything?**
   - Only `POST /auth/register` and `POST /auth/login` in the entire application are public, and both live inside Badr's `AuthController`. Therefore `@Public()` (`SetMetadata('isPublic', true)`) is only imported inside `auth.controller.ts` and read by `JwtAuthGuard` via NestJS's `Reflector`. Other backend modules (`questions`, `interviews`, `attempts`) never need to import `@Public()` or `JwtAuthGuard`.
2. **Login must not reveal whether the username exists. Why does that matter?**
   - Returning different status codes or error messages for "user not found" vs. "wrong password" enables **account enumeration attacks**, allowing attackers to harvest valid usernames/emails for targeted brute-force or phishing attacks. Both cases return `401 INVALID_CREDENTIALS` with the identical message `"Invalid username/email or password."`.
3. **`averagePercentage` without aggregation: what is the minimum data you need to read from `attempts`?**
   - Using `.find({ userId }, { projection: { status: 1, percentage: 1, answers: 1, _id: 0 } })`, we only read `status`, `percentage`, and `answers` (skipping the heavy `questions` snapshot array). From those three fields we compute `attemptsCompleted`, `attemptsInProgress`, `questionsAnswered`, `averagePercentage`, and `bestPercentage` in a single pass in memory.
4. **What should happen to the token if a user is deleted?**
   - Because JWTs are stateless, a signed token remains cryptographically valid until its `exp` timestamp (`JWT_EXPIRES_IN`). However, `GET /auth/me` and `PATCH /users/me` verify that the user record still exists in `users` (returning `401 UNAUTHORIZED` / `404 NOT_FOUND` if deleted). If immediate revocation across all endpoints were required in production, we could either check user existence in `JwtAuthGuard` or maintain a short-TTL token revocation list / `tokenVersion` counter on the user document.
