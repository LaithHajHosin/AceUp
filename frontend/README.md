# PrepPressure frontend

The frontend is the React + TypeScript client for the PrepPressure practice platform. The current app is aligned with the v3 workflow: login/register, protected routes, JWT-backed user session, interview attempts, result review, and profile viewing.

## Local setup

```powershell
cd frontend
npm install
npm run dev
```

## Production checks

```powershell
npm run build
npm run lint
```

## API configuration

The client reads its API base from `VITE_API_BASE_URL` and defaults to `http://localhost:3000/api/v1`.

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Never place secrets or internal keys in frontend environment variables. The browser exposes `VITE_*` values.

## Project docs

- [`../docs/SPECIFICATION.md`](../docs/SPECIFICATION.md)
- [`../docs/API-CONTRACT.md`](../docs/API-CONTRACT.md)
- [`../docs/TEAM-OWNERSHIP.md`](../docs/TEAM-OWNERSHIP.md)
- [`../docs/04_Laith_Tasks.md`](../docs/04_Laith_Tasks.md)

The frontend depends on the authenticated API routes described in the contract, including auth, attempts, results, and profile views.
