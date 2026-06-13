import { parseTranscriptQaPairs } from "../parser.mjs";
import { compact } from "./schema.mjs";

export const normalizeQuestionKey = (question = "") =>
  compact(question)
    .toLowerCase()
    .replace(/[？?。！!，,、；;：:\s"'“”‘’（）()[\]{}<>《》]/g, "")
    .replace(/^(?:请|能不能|可以|麻烦你|简单)?(?:介绍|讲讲|说说|描述一下)/, "讲")
    .slice(0, 80);

const collapseWhitespace = (value = "") => compact(value).replace(/\s+/g, "");

const questionCore = (question = "") => {
  const key = normalizeQuestionKey(question);
  return key.length > 24 ? key.slice(0, 24) : key;
};

const scoreQuestionMatch = (left = "", right = "") => {
  const leftKey = normalizeQuestionKey(left);
  const rightKey = normalizeQuestionKey(right);
  if (!leftKey || !rightKey) return 0;
  if (leftKey === rightKey) return 1;
  const shorter = leftKey.length <= rightKey.length ? leftKey : rightKey;
  const longer = leftKey.length > rightKey.length ? leftKey : rightKey;
  if (shorter.length >= 10 && longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  const leftCore = questionCore(left);
  const rightCore = questionCore(right);
  if (leftCore.length >= 8 && rightCore.includes(leftCore)) return 0.82;
  if (rightCore.length >= 8 && leftCore.includes(rightCore)) return 0.82;
  return 0;
};

export const areSimilarQuestions = (left = "", right = "") => scoreQuestionMatch(left, right) >= 0.72;

const stripAnswerLead = (value = "") =>
  compact(value)
    .replace(/^(?:A\d*|Answer\s*\d*|回答\s*\d*|答|候选人|我(?:回答|说)?|本人)[:：.)、\s-]*/i, "")
    .trim();

const nextQuestionIndex = (text = "", from = 0) => {
  const slice = text.slice(from);
  const patterns = [
    /\n\s*(?:面试官|HR|问|Q\d*|Question\s*\d*)[:：]/i,
    /\n\s*[^。！？\n]{4,120}[?？]/,
    /(?:^|[。！？\s])(?:面试官|HR)[:：]/,
  ];
  let best = -1;
  for (const pattern of patterns) {
    const match = slice.search(pattern);
    if (match > 0 && (best < 0 || match < best)) best = match;
  }
  return best >= 0 ? from + best : -1;
};

export const extractAnswerSpanForQuestion = (sourceText = "", question = "") => {
  const source = compact(sourceText);
  const normalizedQuestion = compact(question);
  if (!source || !normalizedQuestion) return "";

  const directIndex = source.indexOf(normalizedQuestion);
  if (directIndex >= 0) {
    const answerStart = directIndex + normalizedQuestion.length;
    const answerEnd = nextQuestionIndex(source, answerStart);
    const span = stripAnswerLead(answerEnd >= 0 ? source.slice(answerStart, answerEnd) : source.slice(answerStart));
    if (span.length >= 8) return span;
  }

  const core = questionCore(normalizedQuestion);
  if (core.length >= 8) {
    const coreIndex = collapseWhitespace(source).indexOf(core);
    if (coreIndex >= 0) {
      const roughStart = Math.max(0, coreIndex - 40);
      const roughEnd = Math.min(source.length, coreIndex + normalizedQuestion.length + 4000);
      const window = source.slice(roughStart, roughEnd);
      const localQuestionIndex = window.indexOf(normalizedQuestion.slice(0, Math.min(24, normalizedQuestion.length)));
      const anchor = localQuestionIndex >= 0 ? localQuestionIndex + normalizedQuestion.length : normalizedQuestion.length;
      const answerEnd = nextQuestionIndex(window, anchor);
      const span = stripAnswerLead(answerEnd >= 0 ? window.slice(anchor, answerEnd) : window.slice(anchor));
      if (span.length >= 8) return span;
    }
  }

  const questionMatches = [...source.matchAll(/([^。！？\n]{4,160}[?？])/g)];
  let bestMatch = null;
  let bestScore = 0;
  for (const match of questionMatches) {
    const score = scoreQuestionMatch(normalizedQuestion, match[1]);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = match;
    }
  }
  if (!bestMatch || bestScore < 0.72) return "";

  const answerStart = (bestMatch.index ?? 0) + bestMatch[0].length;
  const answerEnd = nextQuestionIndex(source, answerStart);
  return stripAnswerLead(answerEnd >= 0 ? source.slice(answerStart, answerEnd) : source.slice(answerStart));
};

const preferLongerAnswer = (left = "", right = "") => {
  const current = compact(left);
  const incoming = compact(right);
  if (!incoming || incoming === "待补充原回答。") return current;
  if (!current || current === "待补充原回答。") return incoming;
  if (incoming.includes(current)) return incoming;
  if (current.includes(incoming)) return current;
  return incoming.length > current.length ? incoming : current;
};

const preferClearerQuestion = (aiQuestion = "", localQuestion = "") => {
  const ai = compact(aiQuestion);
  const local = compact(localQuestion);
  if (!local) return ai;
  if (!ai) return local;
  if (local.includes(ai) && local.length > ai.length) return local;
  if (ai.includes(local)) return ai;
  return ai.length >= local.length ? ai : local;
};

export const findBestTranscriptMatch = (question = "", extracted = []) => {
  let best = null;
  let bestScore = 0;
  for (const item of extracted) {
    const score = scoreQuestionMatch(question, item.question);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return bestScore >= 0.72 ? best : null;
};

export const buildTranscriptQaIndex = (sourceText = "", options = {}) =>
  parseTranscriptQaPairs(sourceText, { limit: options.limit ?? 96 });

export const enrichOriginalAnswersFromTranscript = (pairs = [], sourceText = "", options = {}) => {
  if (!pairs.length || !compact(sourceText)) return pairs;

  const extracted = buildTranscriptQaIndex(sourceText, options);

  return pairs.map((pair) => {
    const match = findBestTranscriptMatch(pair.question, extracted);
    const anchored = extractAnswerSpanForQuestion(sourceText, pair.question);
    const candidates = [pair.originalAnswer, match?.originalAnswer, anchored].filter(Boolean);
    const originalAnswer = candidates.reduce((best, next) => preferLongerAnswer(best, next), "");
    const question = match ? preferClearerQuestion(pair.question, match.question) : pair.question;
    return {
      ...pair,
      question,
      originalAnswer: originalAnswer || pair.originalAnswer,
    };
  });
};

export const supplementPairsFromTranscript = (pairs = [], sourceText = "", options = {}) => {
  const enriched = enrichOriginalAnswersFromTranscript(pairs, sourceText, options);
  const extracted = buildTranscriptQaIndex(sourceText, options);
  if (!extracted.length) return enriched;

  const supplemented = [...enriched];
  for (const local of extracted) {
    if (supplemented.some((pair) => areSimilarQuestions(pair.question, local.question))) continue;
    supplemented.push({
      question: local.question,
      originalAnswer: local.originalAnswer,
      type: local.type || "BEHAVIORAL",
      score: local.score || 2,
      critique: "已从文字稿识别到问题，但智能整理未自动生成完整评价；建议重新整理或手动补充。",
      weak: true,
      framework: local.framework || "情境 -> 任务 -> 行动 -> 结果 -> 复盘",
      optimizedAnswer: "待补充优化回答。",
      sourceChunkId: "transcript-local",
      isPartial: false,
      boundaryNote: "",
    });
  }
  return supplemented;
};
