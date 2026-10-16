import { Navigate, Route, Routes } from 'react-router-dom'
import App from '../App'
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
        <Route index element={<Navigate replace to="/setup" />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/interview/:sessionId" element={<InterviewPage />} />
        <Route path="/questions" element={<UnavailablePage title="Question bank" />} />
        <Route path="/results" element={<UnavailablePage title="Session results" />} />
        <Route path="/results/:sessionId" element={<UnavailablePage title="Session results" />} />
        <Route path="/history" element={<UnavailablePage title="Practice history" />} />
        <Route path="*" element={<Navigate replace to="/setup" />} />
      </Route>
    </Routes>
  )
}
