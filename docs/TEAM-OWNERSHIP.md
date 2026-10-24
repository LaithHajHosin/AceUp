# Team Ownership and Coordination

This project follows a no-waiting workflow: each file has one owner, and work is coordinated so that one person can continue without waiting on another team member.

## 1. Ownership rules

- Every file has exactly one owner.
- No two people edit the same file.
- The only allowed exception is a single registration line added during merge time.
- Backend modules do not import each other.
- Frontend features do not import each other.

## 2. Contract-first workflow

The API contract is treated as the source of truth before implementation begins.

- The contract fixes URLs, field names, error codes, collection names, and stored document shapes.
- Everyone implements against the contract, not each other’s code.

## 3. Git workflow

- Work in feature branches.
- Keep each branch focused on one owner’s work.
- Open PRs after validating the area in isolation.
- Merge only after reviewing the contract and impact on other modules.
- Keep merge conflicts minimal by separating ownership domains.

## 4. Integration day

On the integration day, the team combines independently validated modules.

- Backend checks run in a single integrated environment.
- Frontend feature pages are wired together using route URLs rather than direct imports.
- The contract is re-checked before deployment or release.

## 5. Coordination expectations

- If a file change impacts the API contract, the contract coordinator must review the PR.
- Frontend pages should use URL-based navigation between features.
- Shared data should be pulled from the backend or mocks, not from another feature’s internal state.

## 6. Person-specific ownership

- Laith: frontend shell, auth pages, take-interview flow, results, profile
- Esmaeel: backend attempts handling and results logic
- Badr: backend platform, auth, user profile stats, Swagger
- Shiam: backend questions and interviews modules, full-flow testing
- Adham: frontend questions and interviews pages

## 7. Working principle

The team’s goal is to finish independently without blocking each other. The contract and ownership model make this possible.
