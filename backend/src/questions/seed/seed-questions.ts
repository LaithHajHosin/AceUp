export const SEED_USERNAME = 'prepbot';
export const SEED_QUESTIONS: any[] = [
  {
    prompt: 'What is the time complexity of reading an array element by index?',
    category: 'arrays',
    difficulty: 'easy',
    type: 'multiple_choice',
    choices: [
      { id: 'a', text: 'O(1)', isCorrect: true },
      { id: 'b', text: 'O(n)', isCorrect: false },
    ],
  },
  {
    prompt: 'Which operation adds an item to the end of a JavaScript array?',
    category: 'javascript',
    difficulty: 'easy',
    type: 'short_answer',
    expectedKeywords: ['push', 'array'],
    requiredKeywordCount: 1,
  },
  {
    prompt: 'What does this code print?',
    category: 'javascript',
    difficulty: 'easy',
    type: 'code_output',
    codeSnippet: 'console.log(2 + 3)',
    expectedOutput: '5',
  },
  {
    prompt: 'Which data structure follows FIFO order?',
    category: 'queues',
    difficulty: 'easy',
    type: 'multiple_choice',
    choices: [
      { id: 'a', text: 'Queue', isCorrect: true },
      { id: 'b', text: 'Stack', isCorrect: false },
    ],
  },
  {
    prompt: 'Name the structure that follows LIFO order.',
    category: 'stacks',
    difficulty: 'easy',
    type: 'short_answer',
    expectedKeywords: ['stack', 'lifo'],
    requiredKeywordCount: 1,
  },
  {
    prompt: 'What does this code print?',
    category: 'javascript',
    difficulty: 'easy',
    type: 'code_output',
    codeSnippet: 'console.log(typeof 42)',
    expectedOutput: 'number',
  },
];
const categories = [
  'arrays',
  'javascript',
  'stacks',
  'queues',
  'strings',
  'objects',
  'recursion',
  'sorting',
];
const difficulties = ['easy', 'medium', 'hard'];
for (let i = 0; i < 42; i++) {
  const base = SEED_QUESTIONS[i % SEED_QUESTIONS.length];
  const category = categories[i % categories.length];
  const difficulty = difficulties[i % 3];
  if (base.type === 'multiple_choice')
    SEED_QUESTIONS.push({
      ...base,
      prompt: `Practice ${i + 1}: ${base.prompt}`,
      category,
      difficulty,
      choices: base.choices.map((c: { id: string; text: string; isCorrect: boolean }) => ({ ...c }))
    });
  else if (base.type === 'short_answer')
    SEED_QUESTIONS.push({
      ...base,
      prompt: `Practice ${i + 1}: ${base.prompt}`,
      category,
      difficulty,
      expectedKeywords: [...base.expectedKeywords],
    });
  else
    SEED_QUESTIONS.push({
      ...base,
      prompt: `Practice ${i + 1}: ${base.prompt}`,
      category,
      difficulty,
    });
}
