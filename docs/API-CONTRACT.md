# PrepPressure API Contract

This document is the frozen contract for the v3 project. Any field names, URLs, error codes, collections, and stored shapes in this document take precedence over older or informal notes.

## 1. Base URL

The API is served under a versioned base path:

- `/api/v1`

In local development, the frontend typically calls `http://localhost:3000/api/v1`.

## 2. Authentication

### Public endpoints

- `POST /auth/register`
- `POST /auth/login`

### Auth header

Every authenticated request must include:

```http
Authorization: Bearer <jwt>
```

### Auth errors

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `409 USERNAME_TAKEN`
- `409 EMAIL_TAKEN`
- `401 INVALID_CREDENTIALS`

## 3. User endpoints

### `POST /auth/register`

Creates a user account.

Request body:

```json
{
  "username": "alex",
  "email": "alex@example.com",
  "password": "Password123!",
  "displayName": "Alex",
  "bio": "Frontend engineer"
}
```

Response:

```json
{
  "user": {
    "id": 1,
    "username": "alex",
    "email": "alex@example.com",
    "displayName": "Alex",
    "bio": "Frontend engineer",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "token": "jwt.token.here"
}
```

### `POST /auth/login`

Request body:

```json
{
  "identifier": "alex",
  "password": "Password123!"
}
```

Response:

```json
{
  "user": {
    "id": 1,
    "username": "alex",
    "email": "alex@example.com",
    "displayName": "Alex",
    "bio": "Frontend engineer"
  },
  "token": "jwt.token.here"
}
```

### `PATCH /users/me`

Updates the current user profile.

Request body:

```json
{
  "displayName": "Alex A.",
  "bio": "Senior frontend engineer"
}
```

## 4. Question endpoints

### `GET /questions`

Returns a list of public questions.

Example response:

```json
{
  "items": [
    {
      "id": 1,
      "ownerId": 42,
      "prompt": "Explain closures.",
      "category": "javascript",
      "difficulty": "medium",
      "type": "multiple_choice",
      "choices": [
        { "id": "a", "text": "A" },
        { "id": "b", "text": "B" }
      ]
    }
  ]
}
```

Question answer metadata is only returned to the owner on the question routes.

## 5. Interview endpoints

### `POST /interviews`

Creates an interview that can be attempted by any user.

Example request body:

```json
{
  "title": "JavaScript fundamentals",
  "description": "Warm-up interview for junior developers",
  "category": "javascript",
  "difficulty": "medium",
  "questionIds": [1, 2, 3],
  "timeLimitSeconds": 600
}
```

## 6. Attempt endpoints

### `POST /attempts`

Starts a new attempt for an interview.

Request body:

```json
{
  "interviewId": 7
}
```

Response shape:

```json
{
  "id": 10,
  "interviewId": 7,
  "userId": 3,
  "status": "in_progress",
  "startedAt": "2025-01-01T00:00:00.000Z",
  "deadlineAt": "2025-01-01T00:10:00.000Z",
  "questions": [
    {
      "id": 1,
      "prompt": "Explain closures",
      "category": "javascript",
      "difficulty": "medium",
      "type": "multiple_choice",
      "choices": [
        { "id": "a", "text": "A" },
        { "id": "b", "text": "B" }
      ]
    }
  ]
}
```

### `POST /attempts/:id/answers`

Saves an answer.

The payload uses a question-specific type:

```json
{
  "questionId": 1,
  "answer": {
    "type": "multiple_choice",
    "choiceId": "b"
  }
}
```

Possible errors:

- `409 ANSWER_LATE`
- `409 DUPLICATE_ANSWER`
- `409 ATTEMPT_ENDED`

### `POST /attempts/:id/finish`

Finishes an attempt manually.

### `GET /attempts/:id/results`

Returns a result summary for the user who created the attempt.

## 7. Result payload

Results include the attempt's score, percentage, readiness, and per-question explanations.

Example structure:

```json
{
  "id": 10,
  "interviewId": 7,
  "status": "finished",
  "score": 7,
  "maxScore": 10,
  "percentage": 70,
  "readiness": "almost_ready",
  "answers": [
    {
      "questionId": 1,
      "submittedAnswer": { "type": "multiple_choice", "choiceId": "b" },
      "expectedAnswer": { "type": "multiple_choice", "choiceId": "a" },
      "isCorrect": false,
      "explanation": "The correct choice is A because ..."
    }
  ]
}
```

## 8. Profile endpoints

### `GET /users/:id/profile`

Returns public information and stats for a user.

### `GET /users/me`

Returns the current authenticated user's profile.

### `GET /attempts`

Returns the current user's attempt history.

## 9. Error envelope

The API should return a consistent JSON error payload:

```json
{
  "statusCode": 401,
  "code": "INVALID_CREDENTIALS",
  "message": "The supplied credentials are invalid.",
  "details": {}
}
```

Common statuses:

- `400 BAD_REQUEST`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 CONFLICT`
- `422 UNPROCESSABLE_ENTITY`

## 10. Storage guidance

The backend stores data in MongoDB collections that reflect the domain model. Public IDs are numeric values. Actual Mongo document shapes should remain contract-aligned and should not expose object IDs to the client.

## 11. Frontend implementation notes

The frontend must not recompute scoring or attempt correctness. It should treat the backend as the source of truth for timers, attempt lifecycle, and results.

The frontend should store the JWT in local storage under the keys defined by the contract, and it should redirect any unauthenticated route to `/login`.

## 12. Contract ownership

This file is maintained by the project contract coordinator. If a team member needs a contract change, they should coordinate through the pull request workflow defined in `docs/TEAM-OWNERSHIP.md`.
