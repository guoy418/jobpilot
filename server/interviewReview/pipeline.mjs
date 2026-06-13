import { splitInterviewTranscriptChunks } from "./chunker.mjs";
import { mergeInterviewReviewPairs } from "./merge.mjs";
import { buildChunkReviewPrompt, INTERVIEW_REVIEW_SYSTEM_PROMPT } from "./prompts.mjs";
import { resolveInterviewReviewRuntime } from "./runtime.mjs";
import { coerceInterviewReviewParsedRoot, compact, normalizeInterviewReviewRoot, salvageReviewRootFromText } from "./schema.mjs";
import { supplementPairsFromTranscript } from "./transcriptAnswers.mjs";
import { isGarbledTextContent } from "../textEncoding.mjs";

const runLimited = async (items, limit, worker) => {
  const results = new Array(items.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
};

const attachChunkId = (pair, chunk) => ({
  ...pair,
  sourceChunkId: pair.sourceChunkId || chunk.id,
});

const parseChunkReview = (parsed, chunk, fallback, rawContent = "") => {
  const parsedRoot =
    coerceInterviewReviewParsedRoot(parsed) ??
    salvageReviewRootFromText(rawContent, { includeMetadata: true, requireReview: true });
  if (!parsedRoot) return null;

  const coerced = coerceInterviewReviewParsedRoot(parsedRoot);
  const rawPairs = Array.isArray(coerced?.qaPairs)
    ? coerced.qaPairs
    : Array.isArray(coerced?.questions)
      ? coerced.questions
      : Array.isArray(coerced?.qa_pairs)
        ? coerced.qa_pairs
        : [];

  const normalized = normalizeInterviewReviewRoot(
    {
      ...coerced,
      qaPairs: rawPairs.map((pair) => attachChunkId(pair, chunk)),
    },
    { includeMetadata: true, requireReview: true, requirePairs: false },
  );
  if (!normalized) return null;
  return {
    company: normalized.company || fallback.company,
    role: normalized.role || fallback.role,
    round: normalized.round || fallback.round,
    date: normalized.date || fallback.date,
    qaPairs: normalized.qaPairs,
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const errorMessage = (error) => (error instanceof Error ? error.message : String(error));

const isRetriableProviderError = (error) => {
  const message = errorMessage(error);
  return (
    /timed out after/i.test(message) ||
    /returned 429|returned 503|returned 502/i.test(message) ||
    /engine_overloaded|rate.?limit|too many requests/i.test(message)
  );
};

const retryDelayMs = (error, attempt, reviewRuntime) => {
  const message = errorMessage(error);
  if (/timed out after/i.test(message)) return attempt === 0 ? 2_000 : reviewRuntime.retryDelayMs;
  return reviewRuntime.retryDelayMs * (attempt + 1);
};

const withProviderRetry = async (reviewRuntime, operation, attempt = 0) => {
  try {
    return await operation();
  } catch (error) {
    if (attempt < reviewRuntime.maxRetries - 1 && isRetriableProviderError(error)) {
      await sleep(retryDelayMs(error, attempt, reviewRuntime));
      return withProviderRetry(reviewRuntime, operation, attempt + 1);
    }
    throw error;
  }
};

const formatReviewFailure = (chunkId, error) => {
  const message = errorMessage(error);
  if (/429|engine_overloaded/i.test(message)) {
    return `${chunkId}: 模型服务繁忙（已自动重试），请稍等几分钟后再点「重新整理」。`;
  }
  if (/timed out after/i.test(message)) {
    return `${chunkId}: 模型响应超时（已自动重试），可缩短文稿或稍后再试。`;
  }
  return `${chunkId}: ${message}`;
};

const reviewChunkWithAi = async (config, payload, fallback, chunk, runtime, reviewRuntime) => {
  const prompt = buildChunkReviewPrompt(payload, fallback, chunk, reviewRuntime);
  const content = await withProviderRetry(reviewRuntime, () =>
    runtime.callChatModel(config, prompt, {
      maxTokens: reviewRuntime.maxTokens,
      systemPrompt: INTERVIEW_REVIEW_SYSTEM_PROMPT,
      timeoutMs: reviewRuntime.timeoutMs,
    }),
  );
  let parsed = runtime.jsonFromText(content);
  let rawContent = content;
  if (!parsed) {
    const repairedContent = await withProviderRetry(reviewRuntime, () =>
      runtime.callChatModel(
        config,
        [
          "上一轮分块复盘输出不是 JSON。请把同一片段重新整理成可解析 JSON。",
          "只返回 JSON。字段: company, role, round, date, qaPairs。",
          "qaPairs 字段: question, originalAnswer, type, score, critique, weak, framework, optimizedAnswer, sourceChunkId, isPartial, boundaryNote。",
          `错误输出片段:\n${runtime.previewAiContent(content, 900)}`,
          `原任务:\n${prompt}`,
        ].join("\n\n"),
        {
          maxTokens: reviewRuntime.maxTokens,
          systemPrompt: INTERVIEW_REVIEW_SYSTEM_PROMPT,
          timeoutMs: reviewRuntime.repairTimeoutMs,
        },
      ),
    );
    rawContent = repairedContent;
    parsed = runtime.jsonFromText(repairedContent);
  }
  return parseChunkReview(parsed, chunk, fallback, rawContent);
};

export const parseInterviewTranscriptWithAi = async (config, payload, fallback, runtime) => {
  const sourceText = compact(payload.rawText || payload.sourceText || fallback.sourceText);
  if (!sourceText) {
    return {
      ...fallback,
      qaPairs: [],
      extractionStatus: "ai-review-empty",
      aiStatus: "failed",
      aiError: "没有可用于 AI 复盘的面试文字稿。",
    };
  }
  if (isGarbledTextContent(sourceText)) {
    return {
      ...fallback,
      qaPairs: [],
      extractionStatus: "text-encoding-failed",
      aiStatus: "failed",
      aiError: "面试文字稿看起来像乱码，通常是文件编码不对。请用 UTF-8 重新导出转写稿，或直接粘贴文字内容后重试。",
    };
  }

  const reviewRuntime = resolveInterviewReviewRuntime(config);
  const chunkPlan = splitInterviewTranscriptChunks(sourceText, reviewRuntime.chunkOptions);
  const { chunks, truncated, requiredChunks, processedChunks, sourceCharLength } = chunkPlan;
  const failures = [];
  const chunkResults = await runLimited(chunks, reviewRuntime.concurrency, async (chunk) => {
    try {
      return await reviewChunkWithAi(config, payload, fallback, chunk, runtime, reviewRuntime);
    } catch (error) {
      failures.push(formatReviewFailure(chunk.id, error));
      return null;
    }
  });

  const successfulChunks = chunkResults.filter(Boolean);
  const chunkPairCounts = successfulChunks.map((chunk) => chunk.qaPairs?.length ?? 0);
  const mergedPairs = mergeInterviewReviewPairs(successfulChunks.flatMap((chunk) => chunk.qaPairs ?? []), {
    requireReview: true,
    limit: Math.max(48, chunks.length * 6),
  });
  const qaPairs = mergedPairs.length > 0 ? supplementPairsFromTranscript(mergedPairs, sourceText) : [];
  const truncationWarning = truncated
    ? `文稿约 ${sourceCharLength} 字，需 ${requiredChunks} 段整理，本次只处理了前 ${processedChunks} 段，后半部分内容可能未纳入。可尝试缩短文稿或分段导入。`
    : "";

  if (!qaPairs.length) {
    return {
      ...fallback,
      qaPairs: [],
      extractionStatus: failures.length ? "ai-parser-failed" : "ai-review-empty",
      aiStatus: "failed",
      aiError: failures[0] || "模型没有从面试文字稿中生成有效复盘。请检查文稿内容、模型配置或重试。",
    };
  }

  const metadataSource = successfulChunks.find((item) => compact(item.company) || compact(item.role) || compact(item.round)) ?? {};
  return {
    ...fallback,
    company: metadataSource.company || fallback.company,
    role: metadataSource.role || fallback.role,
    round: metadataSource.round || fallback.round,
    date: metadataSource.date || fallback.date,
    qaPairs,
    extractionStatus: "ai-review",
    aiStatus: failures.length ? "partial" : "used",
    aiError: [truncationWarning, failures.length ? `部分文稿分块整理失败，已保留 ${qaPairs.length} 个问题。首个错误：${failures[0]}` : ""]
      .filter(Boolean)
      .join(" "),
    note:
      compact(fallback.note) ||
      `已将文字稿分成 ${chunks.length} 段整理（全文约 ${sourceCharLength} 字），${successfulChunks.length} 段返回了问题（${chunkPairCounts.join("+") || "0"}），合并后共 ${qaPairs.length} 个问题。${truncationWarning}`,
  };
};
