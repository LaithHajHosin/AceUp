import { ApiError, request } from "../../api/client";
import { mockInterviews, mockQuestions } from "./mocks";
import type {
  InterviewDetail,
  InterviewFilters,
  InterviewInput,
  InterviewSummary,
  PublicQuestion,
} from "./types";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

function userId(): number {
  try {
    const user = JSON.parse(
      localStorage.getItem("preppressure.user") || "null",
    );

    return typeof user?.id === "number" ? user.id : 1;
  } catch {
    return 1;
  }
}

function query(filters: InterviewFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.difficulty) {
    params.set("difficulty", filters.difficulty);
  }

  if (filters.ownerId !== undefined) {
    params.set("ownerId", String(filters.ownerId));
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  const value = params.toString();
  return value ? `?${value}` : "";
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("preppressure.token");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    return await request<T>(path, {
      ...options,
      headers: {
        ...authHeaders(),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      localStorage.removeItem("preppressure.token");
      localStorage.removeItem("preppressure.user");
      window.dispatchEvent(new Event("preppressure:logout"));
    }

    throw error;
  }
}

function toInterviewSummary(interview: InterviewDetail): InterviewSummary {
  return {
    id: interview.id,
    ownerId: interview.ownerId,
    ownerUsername: interview.ownerUsername,
    title: interview.title,
    description: interview.description,
    category: interview.category,
    difficulty: interview.difficulty,
    questionCount: interview.questionCount,
    timeLimitSeconds: interview.timeLimitSeconds,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  };
}

function detailFromInput(
  input: InterviewInput,
  id: number,
  existing?: InterviewDetail,
): InterviewDetail {
  const now = new Date().toISOString();

  const questions = input.questionIds.flatMap((questionId) => {
    const question = mockQuestions.find((item) => item.id === questionId);

    return question ? [question] : [];
  });

  return {
    id,
    ownerId: existing?.ownerId ?? userId(),
    ownerUsername: existing?.ownerUsername ?? "demo-user",
    title: input.title,
    description: input.description,
    category: input.category,
    difficulty: input.difficulty,
    questionCount: questions.length,
    timeLimitSeconds: input.timeLimitSeconds,
    questions,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function getInterviews(
  filters: InterviewFilters = {},
): Promise<InterviewSummary[]> {
  if (!USE_MOCKS) {
    return apiRequest<InterviewSummary[]>(`/interviews${query(filters)}`);
  }

  return mockInterviews
    .filter(
      (item) =>
        (!filters.category ||
          item.category === filters.category.toLowerCase()) &&
        (!filters.difficulty || item.difficulty === filters.difficulty) &&
        (filters.ownerId === undefined || item.ownerId === filters.ownerId) &&
        (!filters.search ||
          item.title.toLowerCase().includes(filters.search.toLowerCase())),
    )
    .map(toInterviewSummary);
}

export async function getInterview(id: number): Promise<InterviewDetail> {
  if (!USE_MOCKS) {
    return apiRequest<InterviewDetail>(`/interviews/${id}`);
  }

  const interview = mockInterviews.find((item) => item.id === id);

  if (!interview) {
    throw new ApiError("Interview not found.", 404, "NOT_FOUND");
  }

  return interview;
}

export async function createInterview(
  input: InterviewInput,
): Promise<InterviewDetail> {
  if (!USE_MOCKS) {
    return apiRequest<InterviewDetail>("/interviews", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  const interview = detailFromInput(
    input,
    Math.max(0, ...mockInterviews.map((item) => item.id)) + 1,
  );

  mockInterviews.push(interview);

  return interview;
}

export async function updateInterview(
  id: number,
  input: Partial<InterviewInput>,
): Promise<InterviewDetail> {
  if (!USE_MOCKS) {
    return apiRequest<InterviewDetail>(`/interviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  const interview = mockInterviews.find((item) => item.id === id);

  if (!interview) {
    throw new ApiError("Interview not found.", 404, "NOT_FOUND");
  }

  if (interview.ownerId !== userId()) {
    throw new ApiError(
      "Only the owner can edit this interview.",
      403,
      "NOT_OWNER",
    );
  }

  const merged: InterviewInput = {
    title: input.title ?? interview.title,
    description: input.description ?? interview.description,
    category: input.category ?? interview.category,
    difficulty: input.difficulty ?? interview.difficulty,
    questionIds:
      input.questionIds ?? interview.questions.map((question) => question.id),
    timeLimitSeconds: input.timeLimitSeconds ?? interview.timeLimitSeconds,
  };

  const updated = detailFromInput(merged, id, interview);

  Object.assign(interview, updated);

  return interview;
}

export async function deleteInterview(id: number): Promise<void> {
  if (!USE_MOCKS) {
    await apiRequest<void>(`/interviews/${id}`, {
      method: "DELETE",
    });

    return;
  }

  const index = mockInterviews.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new ApiError("Interview not found.", 404, "NOT_FOUND");
  }

  if (mockInterviews[index].ownerId !== userId()) {
    throw new ApiError(
      "Only the owner can delete this interview.",
      403,
      "NOT_OWNER",
    );
  }

  mockInterviews.splice(index, 1);
}

export async function getQuestionsForPicker(
  search = "",
): Promise<PublicQuestion[]> {
  if (!USE_MOCKS) {
    const params = new URLSearchParams();

    if (search) {
      params.set("search", search);
    }

    const value = params.toString();

    return apiRequest<PublicQuestion[]>(
      `/questions${value ? `?${value}` : ""}`,
    );
  }

  return mockQuestions.filter(
    (question) =>
      !search || question.prompt.toLowerCase().includes(search.toLowerCase()),
  );
}
