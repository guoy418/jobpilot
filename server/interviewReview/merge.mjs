import { compact, normalizeInterviewReviewPair } from "./schema.mjs";

const normalizeQuestionKey = (question = "") =>
  compact(question)
    .toLowerCase()
    .replace(/[？?。！!，,、；;：:\s"'“”‘’（）()[\]{}<>《》]/g, "")
    .replace(/^(?:请|能不能|可以|麻烦你|简单)?(?:介绍|讲讲|说说|描述一下)/, "讲")
    .slice(0, 80);

const areSimilarQuestions = (left = "", right = "") => {
  const leftKey = normalizeQuestionKey(left);
  const rightKey = normalizeQuestionKey(right);
  if (!leftKey || !rightKey) return false;
  return leftKey === rightKey || (leftKey.length > 10 && rightKey.includes(leftKey)) || (rightKey.length > 10 && leftKey.includes(rightKey));
};

const hasContent = (value = "") => compact(value) && compact(value) !== "待补充原回答。";

const preferLonger = (current = "", next = "") => (compact(next).length > compact(current).length ? next : current);

export const mergeInterviewReviewPairs = (pairs = [], options = {}) => {
  const limit = options.limit ?? 24;
  const merged = [];

  for (const pair of pairs) {
    const normalized = normalizeInterviewReviewPair(pair, { includeMetadata: true, requireReview: options.requireReview });
    if (!normalized) continue;
    const existing = merged.find((item) => areSimilarQuestions(item.question, normalized.question));
    if (!existing) {
      merged.push(normalized);
      continue;
    }

    if (hasContent(normalized.originalAnswer) && (!hasContent(existing.originalAnswer) || normalized.originalAnswer.length > existing.originalAnswer.length)) {
      existing.originalAnswer = normalized.originalAnswer;
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
