# PrepPressure Specification (v3)

This document captures the current product direction for the project. When the API contract and this specification disagree, the contract wins.

## 1. Product overview

PrepPressure is an interview-practice platform for technical preparation.

- Visitors can register and log in.
- Login returns a JWT access token.
- The token is sent as an `Authorization` header on every authenticated request.
- Only `POST /auth/register` and `POST /auth/login` are public.
- Users can create questions in three formats: `multiple_choice`, `short_answer`, and `code_output`.
- Users can create interviews made from 1 to 20 questions with a total time limit.
- Logged-in users can view all questions and interviews, while only owners can edit or delete them.
- Anyone can take any interview; each attempt has a timer and result page.
- Each user has a profile page with statistics such as created questions, created interviews, attempts, answers, and score summaries.
- The backend exposes Swagger at `/docs` so the team can try endpoints with a token.

## 2. Tech stack

- Frontend: React + TypeScript + Vite + React Router
- Backend: NestJS + TypeScript + MongoDB + Mongoose
- Auth: `@nestjs/jwt` and `@nestjs/passport` (or a hand-written guard using `@nestjs/jwt`)
- Security: `bcrypt` for password hashing
- Validation: `class-validator` and `class-transformer`
- API docs: `@nestjs/swagger`

Course rules that remain in force:

- No `populate`
- No aggregation pipelines
- Numeric public IDs only
- Never execute candidate-written code
- Never commit secrets

## 3. Data model summary

### User

- `id`: number
- `username`: unique, lowercase
- `email`: unique, lowercase
- `passwordHash`: never returned to clients
- `displayName`
- `bio`: optional
- `createdAt`, `updatedAt`

### Question

- `id`, `ownerId`
- `prompt`
- `category`
- `difficulty`: `easy | medium | hard`
- `type`
- Type-specific fields
- `createdAt`, `updatedAt`

Questions support three types:

- `multiple_choice`: 2 to 6 choices, one correct answer
- `short_answer`: keywords + required keyword count
- `code_output`: code snippet and expected output

### Interview

- `id`, `ownerId`
- `title`, `description`
- `category`, `difficulty`
- `questionIds` (1 to 20 distinct IDs)
- `timeLimitSeconds` (30 to 3600)
- `createdAt`, `updatedAt`

### Attempt

- `id`, `interviewId`, `userId`
- `status`: `in_progress | finished | timed_out`
- `startedAt`, `deadlineAt`, `finishedAt`
- `questions`: snapshot of the questions at the moment the attempt started
- `answers`, `score`, `maxScore`, `percentage`, `readiness`

The snapshot prevents later edits/deletions from altering historical attempts.

## 4. Ownership and permission rules

- Register/login: any visitor
- Read questions, interviews, and profiles: any logged-in user
- Edit/delete a question or interview: only the owner
- Seee question answer keys: only the question owner
- Start an attempt on any interview: any logged-in user
- Read/answer/finish an attempt and view results: only the user who started it
- Edit own profile: only that user, through `/users/me`

## 5. Attempt timing

- `deadlineAt = startedAt + interview.timeLimitSeconds`
- Answers are accepted until `deadlineAt + 5 seconds`
- If an attempt is still `in_progress` after that window, it becomes `timed_out` the next time it is read or written
- `finished` and `timed_out` are terminal states

## 6. Scoring

- Each question is worth 1 point
- `maxScore` equals the number of questions in the attempt
- `multiple_choice`: correct choice = 1, otherwise 0
- `short_answer`: keyword match scoring is calculated server-side and deterministic
- `code_output`: exact normalized comparison
- Unanswered questions = 0
- `percentage = round(score / maxScore * 100, 1 decimal)`
- `readiness` values:
  - `< 60` → `needs_practice`
  - `60 to < 85` → `almost_ready`
  - `>= 85` → `ready`

The frontend never calculates correctness or score.

## 7. Notes for the team

This project is built with a "nobody waits" workflow:

- The API contract is frozen before implementation starts.
- Each file has a single owner.
- Backend modules are isolated and avoid cross-importing one another.
- Frontend features use their own API and type files.
- Each team member validates their own area before integration.

## 8. Required frontend behavior

The frontend should support:

- login and register screens
- JWT persistence in local storage
- route protection for authenticated pages
- attempt creation and completion
- timer display driven by backend deadlines
- result explanations per question
- profile pages for the current user and others

## 9. Documentation path

Project docs live in:

- `docs/SPECIFICATION.md`
- `docs/API-CONTRACT.md`
- `docs/TEAM-OWNERSHIP.md`
- `docs/04_Laith_Tasks.md`

This repository also includes a project-level README and per-app READMEs for frontend and backend.
