# PrepPressure

PrepPressure is an interview-practice application with a React frontend and a
NestJS API. The shared API shapes and endpoint behavior are documented in
[`docs/API-CONTRACT.md`](docs/API-CONTRACT.md).

## Frontend

Install dependencies and start the Vite development server:

```powershell
cd frontend
npm install
npm run dev
```

The frontend uses `http://localhost:3000/api/v1` by default. To point it at a
different API, set `VITE_API_BASE_URL` in a local `frontend/.env` file. For
example:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Never place secrets in Vite environment variables; they are exposed to the
browser. In particular, the internal question-management key belongs only on
the backend.

See [`frontend/README.md`](frontend/README.md) for frontend build and lint
commands. The Setup and Interview flows require the corresponding question and
session API endpoints to be available.
