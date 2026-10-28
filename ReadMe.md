# PrepPressure

Practice technical interviews against the clock — and get a score you can actually explain.

---

## Overview

PrepPressure is a full-stack technical interview practice engine and role-based data management platform built with React, TypeScript, Express, and persistent storage.

- **Deterministic Scoring**: Explanations and points follow transparent rules without arbitrary AI variance.
- **Role-Based Access Control**:
  - **Admin**: System-wide oversight, user role management, attempt monitoring, and dataset reset.
  - **Author**: Creates and manages technical questions and interview tracks with strict ownership checks (`403 NOT_OWNER`).
  - **Candidate**: Takes timed interview tracks, answers questions under clock pressure, and reviews detailed result breakdowns.
- **API Documentation**: Live interactive Swagger UI served at `/docs` with JWT Bearer Token authorization.

---

## Local Setup & Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **pnpm** / **yarn**

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone <your-repo-url>
cd preppressure

# Install dependencies
npm install
```

### 3. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```

Your `.env` file contains sensible defaults that work out of the box:
```env
PORT=3000
JWT_SECRET="preppressure_ultra_secure_jwt_secret_key_v3_frozen"
JWT_EXPIRES_IN=3600
# Optional: MONGODB_URI. If omitted, the server automatically uses durable local storage (.data/db.json)
# MONGODB_URI="mongodb://localhost:27017/preppressure"
CORS_ORIGIN="http://localhost:3000"
```

### 4. Run the Application
Start the full-stack development server:
```bash
npm run dev
```

Open your browser to:
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **Interactive Swagger API Docs**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **OpenAPI 3.0 Specification**: [http://localhost:3000/docs-json](http://localhost:3000/docs-json)

---

## Demo Test Accounts

The platform comes pre-seeded with 40+ verified questions across frontend and backend technologies, starter interview tracks, and 3 pre-configured demo users:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `secret123` | Full RBAC oversight, user management, and system-wide attempts |
| **Author** | `alex_dev` | `secret123` | Owns existing question banks and interview tracks |
| **Candidate** | `sara_candidate` | `secret123` | Student account with past attempts and stats |

*(You can also click any of the "Quick Test Accounts" buttons directly on the login screen to fill credentials instantly).*

---

## Project Structure

```
├── server.ts                  # Express full-stack entry point + Vite middleware
├── server/
│   ├── auth.ts                # JWT authentication, crypto hashing, and auth guards
│   ├── db.ts                  # Durable document store with atomic sequence counters
│   ├── routes.ts              # REST API v1 endpoints (/auth, /users, /questions, /interviews, /attempts, /admin)
│   ├── scoring.ts             # Deterministic scoring engine & lazy timeout handler
│   ├── seedData.ts            # 40+ seeded questions, 4 interview tracks, demo accounts
│   └── swagger.ts             # OpenAPI 3.0 JSON spec and embedded Swagger UI
├── src/
│   ├── App.tsx                # Client-side router and view orchestration
│   ├── main.tsx               # React 19 DOM entry point
│   ├── components/            # Top Navbar (3-zone contract), CountdownTimer
│   ├── context/               # AuthContext (token persistence, 401 logout listener)
│   ├── features/
│   │   ├── admin/             # Role-based data management console
│   │   ├── attempts/          # Live interview runner, countdown, and result breakdown
│   │   ├── auth/              # Sign in & registration forms
│   │   ├── interviews/        # Track catalog, track builder, and track details
│   │   ├── profile/           # User statistics and bio editor
│   │   └── questions/         # Question bank with filters, creator form, detail view
│   ├── lib/api.ts             # Unified fetch client with Bearer token injection
│   └── types/index.ts         # TypeScript interfaces matching contract data models
├── .env.example               # Environment variables template
├── package.json
└── tsconfig.json
```

---

## Available Scripts

- `npm run dev`: Runs the full-stack server (Express backend + Vite development middleware) on port 3000.
- `npm run build`: Compiles TypeScript and creates optimized production client assets in `dist/`.
- `npm run lint`: Validates types via `tsc --noEmit`.
- `npm start`: Starts the production server using `node server.ts` or `tsx server.ts`.
