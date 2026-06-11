# Interview Review Pipeline

JobPilot treats interview review as two different inputs:

- `InterviewReviewJSON v1`: already organized review content. It is normalized locally and never calls an LLM.
- Raw transcript/audio transcript: unorganized interview text. It must use AI review; local regex rules must not silently create formal review results.

## Runtime Flow

1. `server/parser.mjs` builds a lightweight draft and imports `InterviewReviewJSON v1` when present.
2. `server/aiProvider.mjs` checks provider configuration. Raw interview transcripts without AI return `ai-not-configured`.
3. `server/interviewReview/chunker.mjs` splits transcripts by speaker/question boundaries first, then applies overlap and max chunk limits.
4. `server/interviewReview/pipeline.mjs` runs chunk review calls with limited concurrency.
5. `server/interviewReview/schema.mjs` normalizes each chunk result into the platform Q/A shape.
6. `server/interviewReview/merge.mjs` deduplicates overlap results and prefers complete answers/reviews.

## AI Contract

Each chunk call is a full Node A review, not a hidden local fallback:

- Input: one transcript chunk plus optional company/role/round hints.
- Output JSON: `company`, `role`, `round`, `date`, `qaPairs`.
- Each `qaPairs` item must include `question`, `originalAnswer`, `type`, `score`, `critique`, `weak`, `framework`, `optimizedAnswer`.
- Boundary fields `sourceChunkId`, `isPartial`, and `boundaryNote` are allowed for merge-time decisions.

If the model returns invalid JSON, the pipeline makes one repair call for the same chunk. If no valid reviewed Q/A remains, the API returns `ai-parser-failed` or `ai-review-empty` with no local Q/A fallback.

## Iteration Rules

- Change prompts in `server/interviewReview/prompts.mjs`.
- Change chunk boundary behavior in `server/interviewReview/chunker.mjs`.
- Change field compatibility in `server/interviewReview/schema.mjs`.
- Change dedupe or overlap handling in `server/interviewReview/merge.mjs`.
- Add regression coverage in `server/check.mjs` whenever the contract changes.
