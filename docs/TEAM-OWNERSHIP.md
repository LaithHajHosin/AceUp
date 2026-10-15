# PrepPressure Team Ownership & Collaboration Protocol

## 1. Member Ownership Matrix & Component Mapping

| Team Member | Domain Ownership | Primary Files & Responsibilities |
| :--- | :--- | :--- |
| **Laith Haj Hosin** | Frontend Foundation & Interview Flow | `frontend/src/main.tsx`, `App.tsx`, router, `lib/apiClient.ts`, `types/api.ts`, `features/setup/**`, `features/interview/**` |
| **Esmaeel Mahfoud** | Session Backend & Scoring Engine | `backend/src/sessions/**`, `scoring.service.ts`, session lifecycle/timing, results APIs, unit/integration tests |
| **Badr Al Jerf** | Question Schema, APIs & Management Guard | `backend/src/questions/**`, `internal-questions/**`, `guards/internal-tool.guard.ts`, `seed/seed-questions.ts` |
| **Shiam Ezzo** | Acceptance Testing & Quality Assurance | `docs/TEST-PLAN.md`, acceptance matrix, backend test suites (`*.spec.ts`), verification review |
| **Adham Albasha** | Question Bank, Results & History Screens | `frontend/src/features/question-bank/**`, `results/**`, `history/**`, shared UI components |
| **Hassan Alloush** | *Unavailable* | No assigned tasks or delivery dependencies while unavailable. |

---

## 2. Repository Layout & Structure

preppressure/
├── frontend/             # React single-page application
├── backend/              # NestJS backend application
├── docs/
│   ├── API-CONTRACT.md   # Canonical endpoints and DTO definitions
│   ├── ARCHITECTURE.md   # System architecture and data models
│   ├── TEAM-OWNERSHIP.md # Team boundaries and Git workflow
│   └── TEST-PLAN.md      # Acceptance matrix and test suites
├── README.md             # Setup, installation, and run instructions
├── .gitignore            # Excludes node_modules, build output, .env, audio
└── .env.example          # Environment variable template (no secrets)



---

## 3. Git Workflow & Collaboration Rules
* **Branching Strategy:** Work must be performed on short-lived feature or fix branches (`feature/<name>` or `fix/<name>`). Small, atomic pull requests are required.
* **No Direct Pushes:** Direct commits to `main` are strictly prohibited. Every PR requires peer review and passing test checks.
* **Secret Management:** Never commit `node_modules`, build artifacts, `.env` files, real API keys, database dumps, or local audio recordings. Always commit `.env.example` with variable names only.
* **Conflict Resolution:** If implementation boundaries overlap (e.g., shared API types or router manifests), the designated owner coordinates and reviews changes. Do not independently invent endpoint aliases or unagreed payload fields.

---

## 4. Contract-First Integration Workflow
1. **Contract Agreement:** All team members agree on `docs/API-CONTRACT.md` before coding API-dependent features.
2. **Mock Generation:** Laith generates shared TypeScript interfaces and mock JSON fixtures matching the contract so frontend development can proceed in parallel.
3. **Backend Implementation:** Esmaeel and Badr implement exact payload shapes and validate responses against test fixtures.
4. **Quality & Acceptance:** Shiam executes the acceptance test matrix (`TEST-PLAN.md`) across all integration boundaries.
5. **Contract Updates:** Any approved contract modification requires an atomic update across the documentation, backend DTOs/controllers, frontend client types/mocks, and test suites.
