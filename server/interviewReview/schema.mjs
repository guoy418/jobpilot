const asRecord = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : null);

export const compact = (value = "") => String(value ?? "").trim();

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
  const source = asRecord(root);
  if (!source) return null;
  const rawPairs = Array.isArray(source.qaPairs) ? source.qaPairs : Array.isArray(source.questions) ? source.questions : [];
  const qaPairs = rawPairs
    .map((item) => normalizeInterviewReviewPair(item, options))
    .filter(Boolean);
  if (!qaPairs.length && options.requirePairs !== false) return null;

  return {
    company: textField(source.company),
    role: textField(source.role),
    round: textField(source.round),
    date: textField(source.date) || "Today",
    sourceText: textField(source.sourceText),
    note: textField(source.note),
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
