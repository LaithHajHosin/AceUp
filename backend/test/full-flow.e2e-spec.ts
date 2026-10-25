import { describe, it } from 'vitest';

// Integration-day test placeholder by design: it must use the real HTTP auth and attempts
// modules once those teammate-owned modules have been merged. Do not fake the whole app here.
describe('full application flow (integration day)',()=>{
  it.todo('registers users A and B; A creates questions and an interview; B can read but cannot edit; B takes and finishes the interview; results and profile stats are correct; A edits a question and B old result stays unchanged');
});
