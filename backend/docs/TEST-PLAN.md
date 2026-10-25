# PrepPressure — Questions and Interviews Test Plan

Status meanings: **PASS** = verified against the integrated application; **FAIL** = reproduced; **PENDING** = not yet runnable because integration or MongoDB/auth setup is missing.

| Acceptance rule | Test owner | Status | Evidence / notes |
|---|---|---|---|
| GET questions returns newest first | Shiam | PENDING | Questions e2e test after Mongo/auth integration |
| Filters category, difficulty, type, ownerId and prompt search | Shiam | PENDING | Verify unknown query fields return 400 |
| Public question responses never expose answer keys | Shiam | PENDING | Check all question types |
| Owner can see answer keys | Shiam | PENDING | OwnerQuestion response |
| Non-owner PATCH returns 403 NOT_OWNER | Shiam | PENDING | Test with two user IDs |
| Non-owner DELETE returns 403 NOT_OWNER | Shiam | PENDING | Test with two user IDs |
| MC has 2–6 choices, unique IDs, exactly one correct | Shiam | PENDING | Unit validation tests |
| Short answer has 2–6 non-empty keywords and valid required count | Shiam | PENDING | Unit validation tests |
| Code output requires expectedOutput | Shiam | PENDING | Unit validation tests |
| Fields belonging to another type are rejected | Shiam | PENDING | Unit validation tests |
| PATCH validates the complete merged question | Shiam | PENDING | Unit validation tests |
| Deleting a question used by an interview returns 409 QUESTION_IN_USE | Shiam | PENDING | Insert raw interview document |
| Deleting a question used by an attempt returns 409 QUESTION_IN_USE | Shiam | PENDING | Insert raw attempt with questions[].questionId |
| Interview list filters and sorts newest first | Shiam | PENDING | Integration test |
| Interview questionIds must contain 1–20 distinct positive IDs | Shiam | PENDING | DTO/service validation |
| Unknown interview question ID returns 400 QUESTION_NOT_FOUND_IN_LIST | Shiam | PENDING | Integration test |
| Interview detail preserves questionIds order | Shiam | PENDING | Integration test |
| Interview detail always contains public question forms | Shiam | PENDING | Verify no scoring fields |
| Deleted questions are skipped in interview detail | Shiam | PENDING | Integration test |
| Non-owner cannot PATCH/DELETE interview | Shiam | PENDING | Verify 403 NOT_OWNER |
| Seed creates at least 40 questions, 4+ categories, all difficulties and types | Shiam | PENDING | Run seed against test DB |
| Seed can run twice without duplicate seed user/questions | Shiam | PENDING | Compare counts before/after second run |
| Swagger documents both modules | Shiam | PENDING | Verify /docs after integration |
| Whole flow works across auth, questions, interviews, attempts and profile | Shiam | PENDING | Full-flow e2e on integration day |
