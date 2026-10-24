# Laith Tasks

## Scope

Laith owns the frontend foundation and the authenticated user experience for PrepPressure.

## Responsibilities

- App entry, router, and app shell
- Login and register screens
- Token persistence and route protection
- Interview-taking flow with a timer
- Results pages
- User profile pages and stats
- Contract coordination when API changes are proposed

## Required files

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/app/router.tsx`
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/layout/Navbar.tsx`
- `frontend/src/features/auth/AuthContext.tsx`
- `frontend/src/features/auth/ProtectedRoute.tsx`
- `frontend/src/features/auth/LoginPage.tsx`
- `frontend/src/features/auth/RegisterPage.tsx`
- `frontend/src/features/auth/api.ts`
- `frontend/src/features/auth/types.ts`
- `frontend/src/features/auth/mocks.ts`
- `frontend/src/features/attempts/StartAttemptPage.tsx`
- `frontend/src/features/attempts/TakeAttemptPage.tsx`
- `frontend/src/features/attempts/AnswerInput.tsx`
- `frontend/src/features/attempts/Timer.tsx`
- `frontend/src/features/attempts/ResultsPage.tsx`
- `frontend/src/features/attempts/api.ts`
- `frontend/src/features/attempts/types.ts`
- `frontend/src/features/attempts/mocks.ts`
- `frontend/src/features/profile/ProfilePage.tsx`
- `frontend/src/features/profile/UserProfilePage.tsx`
- `frontend/src/features/profile/StatsCards.tsx`
- `frontend/src/features/profile/api.ts`
- `frontend/src/features/profile/types.ts`
- `frontend/src/features/profile/mocks.ts`
- `frontend/.env.example`
- `frontend/README.md`

## Implementation order

1. Commit the spec, contract, and team ownership docs plus the README skeleton.
2. Build the app shell and route structure.
3. Implement auth context and login/register flow with local token storage.
4. Build the attempt flow with mock data.
5. Add results and profile pages.
6. Add loading, empty, and error states.
7. Validate the app with the real backend on integration day.

## Success checklist

- Without a token, every page except `/login` and `/register` redirects to `/login`.
- Any `401` logs the user out.
- All three question types can be answered; code is never executed.
- The timer is derived from `deadlineAt` and handles timeout cases gracefully.
- Duplicate and late answer errors are shown clearly.
- Results are only shown after the attempt ends.
- Profile pages show correct stats and allow editing the current user’s display name and bio.
- The app works with mock data and the real backend.

## Notes

The project follows a mock-first workflow while the backend is being built. The frontend should therefore expose mock data support, but the same routes and contracts must work once the real API is connected.
