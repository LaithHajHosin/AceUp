import { request } from "../../api/client";
import type {
  OwnerQuestion,
  PublicQuestion,
  QuestionFilters,
  QuestionInput,
} from "./types";

function buildQuery(filters: QuestionFilters = {}) {
  const params = new URLSearchParams();

  if (filters.category) params.set("category", filters.category);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.type) params.set("type", filters.type);
  if (filters.ownerId) params.set("ownerId", String(filters.ownerId));
  if (filters.search) params.set("search", filters.search);

  const query = params.toString();
  return query ? `?${query}` : "";
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
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? (error as { statusCode: number }).statusCode
        : undefined;

    if (statusCode === 401) {
      localStorage.removeItem("preppressure.token");
      localStorage.removeItem("preppressure.user");
      window.dispatchEvent(new Event("preppressure:logout"));
    }

    throw error;
  }
}

export function getQuestions(filters: QuestionFilters = {}) {
  return apiRequest<PublicQuestion[]>(`/questions${buildQuery(filters)}`);
}

export function getQuestion(id: number) {
  return apiRequest<OwnerQuestion | PublicQuestion>(`/questions/${id}`);
}

export function createQuestion(input: QuestionInput) {
  return apiRequest<OwnerQuestion>("/questions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateQuestion(id: number, input: Partial<QuestionInput>) {
  return apiRequest<OwnerQuestion>(`/questions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteQuestion(id: number) {
  return apiRequest<void>(`/questions/${id}`, {
    method: "DELETE",
  });
}
