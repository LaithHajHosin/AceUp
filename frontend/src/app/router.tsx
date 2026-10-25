import { Navigate, Route, Routes } from "react-router-dom";
import App from "../App";
import { InterviewPage } from "../pages/Interview/InterviewPage";
import { SetupPage } from "../pages/Setup/SetupPage";

import { QuestionsListPage } from "../features/questions/QuestionsListPage";
import { QuestionDetailPage } from "../features/questions/QuestionDetailPage";
import { QuestionFormPage } from "../features/questions/QuestionFormPage";

import { InterviewsListPage } from "../features/interviews/InterviewsListPage";
import { InterviewDetailPage } from "../features/interviews/InterviewDetailPage";
import { InterviewFormPage } from "../features/interviews/InterviewFormPage";

function UnavailablePage({ title }: { title: string }) {
  return (
    <section className="placeholder-page">
      <span className="eyebrow">Coming soon</span>
      <h1>{title}</h1>
      <p>This part of PrepPressure is being built by your project team.</p>
    </section>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<App />}>
        <Route index element={<Navigate replace to="/setup" />} />
        <Route path="/setup" element={<SetupPage />} />

        {/* Existing practice flow — preserved */}
        <Route path="/interview/:sessionId" element={<InterviewPage />} />

        {/* Adham's question management routes */}
        <Route path="/questions" element={<QuestionsListPage />} />
        <Route path="/questions/new" element={<QuestionFormPage />} />
        <Route path="/questions/:id/edit" element={<QuestionFormPage />} />
        <Route path="/questions/:id" element={<QuestionDetailPage />} />

        {/* Adham's interview management routes */}
        <Route path="/interviews" element={<InterviewsListPage />} />
        <Route path="/interviews/new" element={<InterviewFormPage />} />
        <Route path="/interviews/:id/edit" element={<InterviewFormPage />} />
        <Route path="/interviews/:id" element={<InterviewDetailPage />} />

        {/* Existing team pages — preserved */}
        <Route
          path="/results"
          element={<UnavailablePage title="Session results" />}
        />
        <Route
          path="/results/:sessionId"
          element={<UnavailablePage title="Session results" />}
        />
        <Route
          path="/history"
          element={<UnavailablePage title="Practice history" />}
        />

        <Route path="*" element={<Navigate replace to="/setup" />} />
      </Route>
    </Routes>
  );
}
