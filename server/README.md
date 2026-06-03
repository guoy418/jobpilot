# JobPilot Local API Skeleton

This is the local backend skeleton for the v0.7 prototype.

## Status

- Read APIs for the current frontend modules
- Write APIs for Opportunity Management, Interview Review, Answer Library, Resume Versions, and Weekly Plan
- Local SQLite database using Node's built-in `node:sqlite`
- Seed data mirrors the frontend mock records
- Frontend hydrates initial state from this API and falls back to local mock data when the API is unavailable
- No auth
- No file storage
- No AI parsing

## Commands

```bash
npm run api
npm run api:check
```

Default API URL:

`http://127.0.0.1:8787`

SQLite file:

`server/data/jobpilot.local.sqlite`

## Endpoints

```text
GET /api/health
GET /api/opportunities
POST /api/opportunities
GET /api/opportunities/:id
PATCH /api/opportunities/:id
DELETE /api/opportunities/:id
POST /api/opportunities/:id/progress
GET /api/opportunities/:id/source-assets
GET /api/opportunities/:id/timeline
GET /api/interviews
POST /api/interviews
GET /api/interviews/:id
PATCH /api/interviews/:id
DELETE /api/interviews/:id
POST /api/interviews/:id/qa
PATCH /api/qa-pairs/:id
DELETE /api/qa-pairs/:id
GET /api/answers
POST /api/answers
PATCH /api/answers/:id
DELETE /api/answers/:id
GET /api/resumes
POST /api/resumes
GET /api/resumes/:id
PATCH /api/resumes/:id
DELETE /api/resumes/:id
GET /api/resumes/:id/linked-opportunities
GET /api/weekly-plan/current
PATCH /api/weekly-plan/current
POST /api/weekly-plan/current/tasks
PATCH /api/weekly-tasks/:id
DELETE /api/weekly-tasks/:id
GET /api/dashboard/summary
GET /api/dashboard/today-actions
```

`GET /api/opportunities/:id/pipeline` is intentionally left as `501 not_implemented`.
The next backend step should port the existing frontend `buildOpportunityPipeline()` logic into a shared/backend selector.

## Next Steps

1. Port shared derived selectors, starting with `buildOpportunityPipeline()`, into backend/shared code.
2. Add delete/edit UI for Opportunity Management if the product wants direct destructive controls.
3. Replace any remaining local-only edge mutations with API writes.
4. Keep Today Todo derived from formal records.
5. Add AI parse endpoints only after schemas are validated.
