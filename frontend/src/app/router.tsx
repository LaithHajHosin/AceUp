import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import App from '../App'
import { LoginPage } from '../features/auth/LoginPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { RegisterPage } from '../features/auth/RegisterPage'
import { StartAttemptPage } from '../features/attempts/StartAttemptPage'
import { ResultsPage } from '../features/attempts/ResultsPage'
import { TakeAttemptPage } from '../features/attempts/TakeAttemptPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { InterviewPage } from '../pages/Interview/InterviewPage'
import { SetupPage } from '../pages/Setup/SetupPage'

function UnavailablePage({ title }: { title: string }) {
  return (
    <section className="placeholder-page">
      <span className="eyebrow">Coming soon</span>
      <h1>{title}</h1>
      <p>This part of PrepPressure is being built by your project team.</p>
    </section>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<App />}>
        <Route index element={<Navigate replace to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/interview/:sessionId" element={<InterviewPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/interviews/:id/take" element={<StartAttemptPage />} />
          <Route path="/attempts/:id" element={<TakeAttemptPage />} />
          <Route path="/attempts/:id/results" element={<ResultsPage />} />
          <Route path="/questions" element={<UnavailablePage title="Question bank" />} />
          <Route path="/results" element={<UnavailablePage title="Session results" />} />
          <Route path="/results/:sessionId" element={<UnavailablePage title="Session results" />} />
          <Route path="/history" element={<UnavailablePage title="Practice history" />} />
        </Route>

        <Route path="*" element={<Navigate replace to="/login" />} />
      </Route>
    </Routes>
  )
}
