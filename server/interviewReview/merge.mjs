import { compact, normalizeInterviewReviewPair } from "./schema.mjs";
import { areSimilarQuestions } from "./transcriptAnswers.mjs";

const hasContent = (value = "") => compact(value) && compact(value) !== "待补充原回答。";

const preferLonger = (current = "", next = "") => (compact(next).length > compact(current).length ? next : current);

export const mergeOriginalAnswers = (left = "", right = "", options = {}) => {
  const current = compact(left);
  const incoming = compact(right);
  if (!current) return incoming;
  if (!incoming) return current;
  if (current === incoming) return current;
  if (incoming.includes(current)) return incoming;
  if (current.includes(incoming)) return current;

  for (let size = Math.min(current.length, incoming.length); size >= 3; size -= 1) {
    if (current.slice(-size) === incoming.slice(0, size)) {
      return `${current}${incoming.slice(size)}`;
    }
    if (incoming.slice(-size) === current.slice(0, size)) {
      return `${incoming}${current.slice(size)}`;
    }
  }

  if (options.allowConcat) {
    return `${current}\n${incoming}`;
  }

  return preferLonger(current, incoming);
};

export const mergeInterviewReviewPairs = (pairs = [], options = {}) => {
  const limit = options.limit ?? Math.max(48, pairs.length);
  const merged = [];

  for (const pair of pairs) {
    const normalized = normalizeInterviewReviewPair(pair, { includeMetadata: true, requireReview: options.requireReview });
    if (!normalized) continue;
    const existing = merged.find((item) => areSimilarQuestions(item.question, normalized.question));
    if (!existing) {
      merged.push(normalized);
      continue;
    }

    if (hasContent(normalized.originalAnswer) || hasContent(existing.originalAnswer)) {
      existing.originalAnswer = mergeOriginalAnswers(existing.originalAnswer, normalized.originalAnswer, {
        allowConcat: true,
      });
    }
    if (normalized.isPartial === false && existing.isPartial === true) {
      existing.critique = normalized.critique;
      existing.framework = normalized.framework;
      existing.optimizedAnswer = normalized.optimizedAnswer;
      existing.isPartial = false;
    } else {
      existing.critique = preferLonger(existing.critique, normalized.critique);
      existing.framework = preferLonger(existing.framework, normalized.framework);
      existing.optimizedAnswer = preferLonger(existing.optimizedAnswer, normalized.optimizedAnswer);
    }
    if (!hasContent(existing.type) || existing.type === "OTHER") existing.type = normalized.type;
    existing.boundaryNote = [existing.boundaryNote, normalized.boundaryNote].filter(Boolean).join(" / ");
  }

  return merged.slice(0, limit).map((pair) => normalizeInterviewReviewPair(pair)).filter(Boolean);
};
