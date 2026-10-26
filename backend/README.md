
## Questions and interviews

The Questions module provides a searchable public question bank. Public responses hide answer keys and private scoring fields. Only the question owner receives private question data. Question payloads are validated according to their type, and PATCH validates the final merged question. A question cannot be deleted while referenced by an interview or an attempt.

The Interviews module lets users create interviews containing 1–20 distinct existing questions, with a time limit from 30 to 3600 seconds. Interview details return questions in the original `questionIds` order using the public question shape. Deleted questions are skipped. Only the owner can edit or delete an interview.

The modules create indexes for numeric question and interview IDs, question category/difficulty/type, question owner, interview owner, and interview question IDs.

## Testing

Run these commands from `backend/`:

- `npm test` — run the Vitest test suite.
- `npm run test:e2e` — run the configured end-to-end test suite.
- `npm run build` — compile the NestJS application.

The Questions and Interviews tests cover their validation and contract acceptance cases. The full application flow test requires the integrated Auth, Attempts, and Users/Profile modules and a working MongoDB connection.

On integration day, enable the full-flow test in PowerShell and run the end-to-end suite:

```powershell
$env:RUN_FULL_FLOW="true"
npm run test:e2e
```

To return to the default test behavior in the current terminal:

```powershell
Remove-Item Env:RUN_FULL_FLOW
```
