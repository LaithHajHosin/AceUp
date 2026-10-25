import type {
  InterviewDetail,
  InterviewSummary,
  PublicQuestion,
} from "./types";

const mockQuestions: PublicQuestion[] = [
  {
    id: 1,
    ownerId: 1,
    ownerUsername: "adham",
    prompt: "What is the difference between let and const in JavaScript?",
    category: "javascript",
    difficulty: "easy",
    type: "short_answer",
    choices: null,
    codeSnippet: null,
    createdAt: "2026-10-24T10:00:00.000Z",
    updatedAt: "2026-10-24T10:00:00.000Z",
  },
  {
    id: 2,
    ownerId: 1,
    ownerUsername: "adham",
    prompt:
      "Which array method creates a new array by transforming each element?",
    category: "javascript",
    difficulty: "easy",
    type: "multiple_choice",
    choices: [
      { id: 1, text: "forEach()" },
      { id: 2, text: "map()" },
      { id: 3, text: "push()" },
      { id: 4, text: "pop()" },
    ],
    codeSnippet: null,
    createdAt: "2026-10-24T10:00:00.000Z",
    updatedAt: "2026-10-24T10:00:00.000Z",
  },
];

export { mockQuestions };

export const mockInterviews: InterviewDetail[] = [
  {
    id: 1,
    ownerId: 1,
    ownerUsername: "adham",
    title: "JavaScript Fundamentals",
    description: "Practice core JavaScript concepts.",
    category: "javascript",
    difficulty: "easy",
    questionCount: 2,
    timeLimitSeconds: 600,
    questions: mockQuestions,
    createdAt: "2026-10-24T10:00:00.000Z",
    updatedAt: "2026-10-24T10:00:00.000Z",
  },
];

export const mockInterviewSummaries: InterviewSummary[] = mockInterviews.map(
  (interview) => ({
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
  }),
);
