# PrepPressure

PrepPressure is an interview-practice platform for technical preparation. The project has moved to the v3 user-authenticated model: users register and log in with JWT-based access, create questions and interviews, take attempts, review results, and view profile statistics.

## Project documentation

- [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) — product specification and rules
- [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) — frozen API contract and payload shapes
- [`docs/TEAM-OWNERSHIP.md`](docs/TEAM-OWNERSHIP.md) — ownership and workflow rules
- [`docs/04_Laith_Tasks.md`](docs/04_Laith_Tasks.md) — frontend/auth/attempt/profile task breakdown

## Stack

- Frontend: React + TypeScript + Vite + React Router
- Backend: NestJS + TypeScript + MongoDB + Mongoose
- Auth: JWT access tokens and protected endpoints
- Docs: Swagger UI at `/docs`

## Local setup

### Backend

```powershell
cd backend
npm install
npm run start:dev
```

The API runs on the default NestJS port and serves the Swagger docs from `/docs` once the app is running.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend defaults to the local API base URL:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Set this in `frontend/.env` if required. Never place secrets inside frontend environment variables.

## Current project status

The repository is aligned with the v3 product updates, including:

- account-based flows with JWT-backed identity
- protected routes and authenticated access
- interview attempts with timing and results
- user profile and stats views
- auth-aware frontend behavior and contract-driven APIs

See the frontend and backend README files for app-specific setup and commands.
