# PrepPressure — Full-Stack Technical Interview Practice Engine & Role-Based Dashboard

A high-fidelity, full-stack technical interview practice engine and data management platform adhering strictly to the **v3 Frozen API Contract & Specification**. Users practice timed technical interviews with deterministic scoring, review explainable results, inspect profile statistics, and manage question banks with role-based access control (Admin oversees all data; users manage their own authored content).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural design aligns directly with the specifications in the project files (`01_Master_Project_Specification.md`, `02_API_CONTRACT.md`, `03_Team_Coordination.md`) and your confirmed answers:

- **Role-Based Data Management**: Implemented with two tiers: **Admin** (can inspect, edit, or delete any question/interview, view all platform attempts, and manage users) and **Standard User/Author** (can author questions, assemble interviews, take any interview, view personal attempts and stats, and edit only their own creations with strict 403 enforcement).
- **Persistence Engine**: Dual-mode storage engine supporting **Direct MongoDB** (`MONGODB_URI` env var) with a transparent **Local Disk Persistent Document Store** fallback (`.data/db.json`). This guarantees 100% data durability across server restarts, provides atomic numeric ID counters (`counters` collection), and runs out-of-the-box in any environment without external database hurdles.
- **Seeded Content**: Seeded with **40+ comprehensive technical interview questions** across React, TypeScript, Node.js, NestJS, MongoDB, Git, and Algorithms, covering all 3 question types (`multiple_choice`, `short_answer`, `code_output`), plus pre-built starter interviews ready for immediate practice.
- **API & Swagger**: Fully interactive Swagger UI and OpenAPI documentation at `/docs` with JWT Bearer Token authorization as required by the contract.

---

## 1. Overview & Core Concept

### What It Does
PrepPressure simulates high-pressure technical interview sessions under realistic time constraints without arbitrary AI hallucination:
1. **Explore & Prepare**: Browse question banks and interview tracks filtered by category, difficulty (`easy`, `medium`, `hard`), and type (`multiple_choice`, `short_answer`, `code_output`).
2. **Timed Interview Sessions**: Start timed attempts. Questions are locked in a snapshot at start time so subsequent edits or deletions never alter historical attempts.
3. **Deterministic Scoring Engine**:
   - **Multiple Choice**: Full points (1.0) for the correct choice, otherwise 0.
   - **Short Answer**: Case-insensitive keyword matching. $\ge$ required keywords yields full credit (1.0); at least 1 keyword yields half credit (0.5); 0 yields 0.
   - **Code Output**: Normalized whitespace and line endings comparison yields 1.0 or 0.
   - **Readiness Rating**: Categorized into `ready` ($\ge 85\%$), `almost_ready` ($60\%\dots <85\%$), or `needs_practice` ($<60\%$).
4. **Lazy Timers & Grace Period**: The backend strictly enforces `deadlineAt + 5s` grace period. Late answers or expired sessions lazily convert to `timed_out`.
5. **Secure Dashboard & Role-Based Management**:
   - Authors manage their own questions and track their creation metrics.
   - Administrators access a dedicated management suite to oversee all questions, interviews, and user attempts with safety guards (`409 QUESTION_IN_USE`).

---

## 2. User Experience & Visual Design

### Aesthetic Direction & Visual Identity
Following the SaaS & Dashboard guidelines:
- **Palette**: Sophisticated dark slate (`#0B0F19` canvas, `#111827` surface, `#1E293B` borders) with crisp neutral light mode options, subtle indigo/violet brand accent (`#6366F1`), emerald success (`#10B981`), amber warning (`#F59E0B`), and rose alert (`#EF4444`).
- **Typography**: Clean contemporary neo-grotesque sans (`Plus Jakarta Sans` / `Outfit`) for structured headers, paired with tabular numerals (`JetBrains Mono` / `tabular-nums`) for timers, scores, and statistics.
- **Zero-Pill Discipline**: Metadata displayed as clean unboxed inline text with subtle typographic separators (`·` or `/`). Interactive filters styled as clean segmented tab bars.
- **Top Bar Contract**: Single-line brand wordmark + clean navigation links (`Questions`, `Interviews`, `My Attempts`, `Profile`, `Admin Console`) + primary action / user badge.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PrepPressure    Questions  ·  Interviews  ·  My Attempts  ·  API Docs (/docs)  ·  [Alex ▼] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Dashboard Overview                                                                     │
│                                                                                        │
│ ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────────────────┐  │
│ │ Completed Attempts     │  │ Average Score          │  │ Readiness Benchmark       │  │
│ │ 14 attempts            │  │ 82.4%                  │  │ Almost Ready              │  │
│ └────────────────────────┘  └────────────────────────┘  └───────────────────────────┘  │
│                                                                                        │
│ Available Interview Tracks                                                             │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ React & Modern Frontend Architecture  ·  Medium  ·  6 Questions  ·  9m 00s         │ │
│ │ Author: @alex_dev  ·  Updated 2h ago                       [ Start Interview ]     │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Key User Flows
1. **Authentication Flow**:
   - Register new account or log in with credentials.
   - JWT stored securely in `preppressure.token` and user profile in `preppressure.user`.
   - Automatic 401 handling dispatches `preppressure:logout` to redirect cleanly.
2. **Taking an Interview Flow (`/interviews/:id/take` → `/attempts/:id`)**:
   - Starting creates an attempt with immutable snapshot of questions.
   - Candidate views one question at a time or browses questions in the attempt.
   - High-contrast live countdown timer with 30s visual warning.
   - Answer submission is verified immediately (`accepted: true`); duplicate or late answers return appropriate contract errors (`409 ANSWER_DUPLICATE`, `409 ANSWER_LATE`).
   - Manual "Finish" or automatic timeout ends the attempt.
3. **Result Review Flow (`/attempts/:id/results`)**:
   - Displays final score, percentage, readiness level, and duration.
   - Question-by-question breakdown with submitted answer, expected answer/keywords, points awarded, and human-readable explanation.
4. **Question Bank & Authoring Flow (`/questions`, `/questions/new`, `/questions/:id/edit`)**:
   - Filter by category, difficulty, question type, and search substring.
   - Authors and Admins edit existing items; deletion checks usage across interviews/attempts (`409 QUESTION_IN_USE`).
5. **Role-Based Admin Console (`/admin`)**:
   - Overview of all users, attempts, question usage health, and quick actions to manage system content safely.

---

## 3. Key Product Decisions & Trade-Offs

- **Backend Architecture (Unified Full-Stack Express Server)**:
  - *Decision*: A unified Node.js server (`server.ts`) serving the exact NestJS-compatible REST API at `/api/v1/*`, hosting Swagger UI at `/docs`, and mounting Vite middleware for instant frontend rendering.
  - *Why*: Eliminates CORS issues, port friction, and multi-process startup failures, while fulfilling 100% of the API contract specifications.
- **Persistence Engine**:
  - *Decision*: Mongo-compatible driver layer that attempts connection to MongoDB if configured, and seamlessly falls back to an atomic disk-persisted document collection in `.data/db.json`.
  - *Why*: Guarantees data survives restarts, implements atomic numeric counters (`counters` collection for `users`, `questions`, `interviews`, `attempts`), and enforces zero-data-loss.
- **Security & Ownership**:
  - *Decision*: Strict JWT verification on all endpoints (except `/auth/register` and `/auth/login`). Ownership guard checks `item.ownerId === request.user.userId || user.role === 'admin'`. Answer keys are scrubbed from public endpoints and active attempts.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 Vite React Client                               │
│  ┌───────────────┐ ┌────────────────┐ ┌────────────────┐ ┌───────────────────┐  │
│  │ Auth & Login  │ │ Question Bank  │ │ Interview List │ │ Live Attempt View │  │
│  │ & Profile     │ │ & Form Builder │ │ & Track Detail │ │ & Timer Runner    │  │
│  └───────┬───────┘ └───────┬────────┘ └───────┬────────┘ └─────────┬─────────┘  │
│          └─────────────────┼──────────────────┴────────────────────┘            │
│                            │ HTTP Bearer JWT                                    │
└────────────────────────────┼────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Express Backend (`server.ts`)                          │
│  ┌───────────────────────┐  ┌─────────────────────────────────────────────────┐ │
│  │ Global JWT Auth Guard │  │ Swagger UI Documentation (/docs, /docs-json)    │ │
│  └───────────┬───────────┘  └─────────────────────────────────────────────────┘ │
│              ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ API v1 Controllers: /auth, /users, /questions, /interviews, /attempts      │ │
│  │ - Deterministic Scoring Calculator & Snapshot Archiver                     │ │
│  │ - Lazy Timeout Checker (deadlineAt + 5s grace period)                      │ │
│  │ - Ownership & Role Validator (Owner / Admin)                               │ │
│  └───────────────────────────────────┬────────────────────────────────────────┘ │
│                                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ Database Layer: MongoDB Driver or Durable Document Store                   │ │
│  │ Collections: `users`, `questions`, `interviews`, `attempts`, `counters`    │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Endpoints Implemented (Frozen Contract Compliant):
- `POST /api/v1/auth/register` (public, validates user format, returns token + user)
- `POST /api/v1/auth/login` (public, username/email check, returns token + user)
- `GET /api/v1/auth/me` (private user details)
- `PATCH /api/v1/users/me` (update displayName, bio)
- `GET /api/v1/users/:id/profile` (public user + computed statistics)
- `GET /api/v1/questions` (query filters: category, difficulty, type, ownerId, search)
- `GET /api/v1/questions/:id` (scrubs answers unless requester is owner/admin)
- `POST /api/v1/questions` (creates question with auto-increment numeric ID)
- `PATCH /api/v1/questions/:id` (owner or admin only)
- `DELETE /api/v1/questions/:id` (checks for `QUESTION_IN_USE` before deletion)
- `GET /api/v1/interviews` (lists interview summaries)
- `GET /api/v1/interviews/:id` (returns detail with question list)
- `POST /api/v1/interviews` (validates 1–20 questions, creates interview)
- `PATCH /api/v1/interviews/:id` (owner or admin only)
- `DELETE /api/v1/interviews/:id` (owner or admin only)
- `POST /api/v1/attempts` (starts attempt, snapshots questions with hidden answer keys)
- `GET /api/v1/attempts` (returns current user's attempts)
- `GET /api/v1/attempts/:id` (evaluates lazy timeout, returns attempt state)
- `POST /api/v1/attempts/:id/answers` (records answer, enforces grace period & uniqueness)
- `POST /api/v1/attempts/:id/finish` (scores attempt deterministically)
- `GET /api/v1/attempts/:id/results` (detailed review with points and explanations)
- `GET /docs` & `GET /docs-json` (OpenAPI Swagger UI with Bearer Token Authorize button)
