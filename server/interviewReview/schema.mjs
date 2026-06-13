const asRecord = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : null);

export const compact = (value = "") => String(value ?? "").trim();

const tryParseJson = (candidate) => {
  const value = compact(candidate);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const pairFieldsFromRoot = (source) => ({
  question: source.question,
  originalAnswer: source.originalAnswer,
  answer: source.answer,
  type: source.type,
  questionType: source.questionType,
  score: source.score,
  critique: source.critique,
  evaluation: source.evaluation,
  weak: source.weak,
  framework: source.framework,
  improvedFramework: source.improvedFramework,
  optimizedAnswer: source.optimizedAnswer,
  polishedAnswer: source.polishedAnswer,
  sourceChunkId: source.sourceChunkId,
  isPartial: source.isPartial,
  boundaryNote: source.boundaryNote,
});

export const coerceInterviewReviewParsedRoot = (parsed) => {
  if (Array.isArray(parsed)) return { qaPairs: parsed };
  const source = asRecord(parsed);
  if (!source) return null;
  if (typeof source.qaPairs === "string") {
    const parsedPairs = tryParseJson(source.qaPairs);
    if (Array.isArray(parsedPairs)) return { ...source, qaPairs: parsedPairs };
  }
  const rawPairs = source.qaPairs ?? source.questions ?? source.qa_pairs;
  if (compact(source.question) && !Array.isArray(rawPairs)) {
    const {
      question: _q,
      originalAnswer: _a,
      answer: _b,
      type: _t,
      questionType: _qt,
      score: _s,
      critique: _c,
      evaluation: _e,
      weak: _w,
      framework: _f,
      improvedFramework: _if,
      optimizedAnswer: _o,
      polishedAnswer: _p,
      sourceChunkId: _sc,
      isPartial: _ip,
      boundaryNote: _bn,
      ...rest
    } = source;
    return { ...rest, qaPairs: [pairFieldsFromRoot(source)] };
  }
  if (Array.isArray(source.qa_pairs) && !Array.isArray(source.qaPairs)) {
    return { ...source, qaPairs: source.qa_pairs };
  }
  return source;
};

export const salvageReviewRootFromText = (text = "", options = {}) => {
  const value = compact(text);
  if (!value) return null;
  const pairs = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const candidate = value.slice(start, index + 1);
        if (/"question"\s*:/.test(candidate)) {
          const item = tryParseJson(candidate);
          if (item) pairs.push(item);
        }
        start = -1;
      }
    }
  }
  return pairs.length ? { qaPairs: pairs } : null;
};

const textField = (value) => compact(value);

const numberField = (value, fallback) => {
  const score = Number(value);
  return Number.isFinite(score) ? Math.min(5, Math.max(1, Math.round(score))) : fallback;
};

const booleanField = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (/^(true|yes|1|weak|需要|薄弱)$/i.test(value.trim())) return true;
    if (/^(false|no|0|done|可复用|已处理)$/i.test(value.trim())) return false;
  }
  return fallback;
};

const cleanQuestionTitle = (value = "") =>
  compact(value)
    .replace(/^问题簇\s*[｜|:：-]?\s*/i, "")
    .replace(/^考察点\s*[：:]\s*/i, "")
    .trim();

const cleanReviewFramework = (value = "") =>
  compact(value)
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:考察点|常见问法|回答框架|推荐案例\/?证据|推荐案例|证据|追问提醒)\s*[：:]\s*/i, "")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");

export const normalizeInterviewReviewPair = (item, options = {}) => {
  const source = asRecord(item);
  if (!source) return null;
  const question = cleanQuestionTitle(source.question);
  if (!question) return null;
  const requireReview = options.requireReview === true;
  const critique = textField(source.evaluation) || textField(source.critique);
  const framework = textField(source.improvedFramework) || textField(source.framework);
  const optimizedAnswer = textField(source.polishedAnswer) || textField(source.optimizedAnswer);
  if (requireReview && (!critique || !framework || !optimizedAnswer)) return null;

  const normalized = {
    question,
    originalAnswer: textField(source.originalAnswer) || textField(source.answer) || "待补充原回答。",
    type: textField(source.questionType) || textField(source.type) || "BEHAVIORAL",
    score: numberField(source.score, critique ? 3 : 2),
    critique: critique || "建议补充更具体的例子、指标和复盘。",
    weak: booleanField(source.weak, true),
    framework: cleanReviewFramework(framework) || "情境 -> 任务 -> 行动 -> 结果 -> 复盘",
    optimizedAnswer: optimizedAnswer || "按推荐框架重写回答。",
  };

  if (options.includeMetadata) {
    normalized.sourceChunkId = textField(source.sourceChunkId);
    normalized.isPartial = booleanField(source.isPartial, false);
    normalized.boundaryNote = textField(source.boundaryNote);
  }

  return normalized;
};

export const normalizeInterviewReviewRoot = (root, options = {}) => {
  const source = coerceInterviewReviewParsedRoot(root);
  if (!source) return null;
  const coerced = asRecord(source);
  if (!coerced) return null;
  const rawPairs = Array.isArray(coerced.qaPairs)
    ? coerced.qaPairs
    : Array.isArray(coerced.questions)
      ? coerced.questions
      : Array.isArray(coerced.qa_pairs)
        ? coerced.qa_pairs
        : [];
  const qaPairs = rawPairs
    .map((item) => normalizeInterviewReviewPair(item, options))
    .filter(Boolean);
  if (!qaPairs.length && options.requirePairs !== false) return null;

  return {
    company: textField(coerced.company),
    role: textField(coerced.role),
    round: textField(coerced.round),
    date: textField(coerced.date) || "Today",
    sourceText: textField(coerced.sourceText),
    note: textField(coerced.note),
    qaPairs,
  };
};

export const parseInterviewReviewJsonText = (rawText = "") => {
  const text = compact(rawText);
  if (!text.startsWith("{")) return null;
  try {
    const root = asRecord(JSON.parse(text));
    if (!root) return null;
    const version = textField(root.schemaVersion || root.version);
    if (version && !["InterviewReviewJSON v1", "v1", "1"].includes(version)) return null;
    const normalized = normalizeInterviewReviewRoot(root);
    if (!normalized) return null;
    return {
      ...normalized,
      sourceText: normalized.sourceText || text,
      note: normalized.note || "由 InterviewReviewJSON v1 导入，可继续编辑后再生成答案卡。",
      extractionStatus: "interview-json",
      aiStatus: "not-used",
      aiError: "",
    };
  } catch {
    return null;
  }
};
