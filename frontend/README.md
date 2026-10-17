# PrepPressure frontend

The frontend is a React, TypeScript, and Vite application. From this directory:

```powershell
npm install
npm run dev
```

The development server prints the local URL. To build and lint:

```powershell
npm run build
npm run lint
```

## API configuration

The client calls `http://localhost:3000/api/v1` by default. Set
`VITE_API_BASE_URL` in a local `.env` file to use a different API base URL, for
example:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Do not put secrets in Vite environment variables: values prefixed with `VITE_`
are included in the browser bundle. The internal question-management key must
never be provided to the frontend.

The Setup and Interview flows use the request and response shapes documented in
[`../docs/API-CONTRACT.md`](../docs/API-CONTRACT.md). They require the backend
question and session endpoints to be running.
