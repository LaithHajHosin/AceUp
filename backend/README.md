# PrepPressure backend

This backend is the NestJS API for the PrepPressure application. It follows the v3 product specification: user accounts, JWT auth, question and interview management, attempt tracking, result scoring, and profile stats.

## Local setup

```powershell
cd backend
npm install
npm run start:dev
```

## Useful commands

```powershell
npm run build
npm run lint
npm run test
npm run test:e2e
npm run test:cov
```

## API docs

When the backend is running, the Swagger UI is available at:

```text
http://localhost:3000/docs
```

The app should enforce authenticated access to most routes, while allowing anonymous access only to register and login endpoints.

## Key notes

- JWT tokens are sent in the `Authorization` header as `Bearer <token>`.
- Public routes: `/auth/register` and `/auth/login`
- Most endpoints require authentication and ownership checks.
- The API contract is documented in [`../docs/API-CONTRACT.md`](../docs/API-CONTRACT.md).
- The product rules are documented in [`../docs/SPECIFICATION.md`](../docs/SPECIFICATION.md).
