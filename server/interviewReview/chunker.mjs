import { compact } from "./schema.mjs";

export const DEFAULT_CHUNK_OPTIONS = {
  charLimit: 6_000,
  overlap: 900,
  absoluteMaxChunks: 40,
};

export const estimateRequiredChunkCount = (textLength = 0, options = {}) => {
  const charLimit = options.charLimit ?? DEFAULT_CHUNK_OPTIONS.charLimit;
  const overlap = options.overlap ?? DEFAULT_CHUNK_OPTIONS.overlap;
  if (textLength <= charLimit) return 1;
  const step = Math.max(1, charLimit - overlap);
  return Math.ceil((textLength - overlap) / step);
};

export const resolveChunkBudget = (textLength = 0, options = {}) => {
  const settings = { ...DEFAULT_CHUNK_OPTIONS, ...options };
  const requiredChunks = estimateRequiredChunkCount(textLength, settings);
  const absoluteMaxChunks = settings.absoluteMaxChunks ?? DEFAULT_CHUNK_OPTIONS.absoluteMaxChunks;
  return {
    ...settings,
    requiredChunks,
    absoluteMaxChunks,
    truncated: requiredChunks > absoluteMaxChunks,
  };
};

const insertSpeakerBreaks = (text = "") =>
  compact(text)
    .replace(/\s*(?=(?:面试官|候选人|本人|我|HR|Q\d*|A\d*|问|答)[:：])/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const splitOversizedSegment = (segment, options) => {
  const chunks = [];
  const step = Math.max(1, options.charLimit - options.overlap);
  for (let start = 0; start < segment.length; start += step) {
    chunks.push(segment.slice(start, start + options.charLimit));
  }
  return chunks;
};

const tailWithinOverlap = (segments, overlap) => {
  const tail = [];
  let size = 0;
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (!tail.length && segment.length > overlap) {
      tail.unshift(segment.slice(Math.max(0, segment.length - overlap)));
      break;
    }
    if (tail.length && size + segment.length > overlap) break;
    tail.unshift(segment);
    size += segment.length;
  }
  return tail;
};

export const splitInterviewTranscriptChunks = (text = "", options = {}) => {
  const sourceText = insertSpeakerBreaks(text);
  if (!sourceText) {
    return { chunks: [], truncated: false, requiredChunks: 0, processedChunks: 0, sourceCharLength: 0 };
  }

  const budget = resolveChunkBudget(sourceText.length, options);
  const settings = budget;
  if (sourceText.length <= settings.charLimit) {
    return {
      chunks: [{ id: "chunk-1", index: 0, total: 1, text: sourceText }],
      truncated: false,
      requiredChunks: 1,
      processedChunks: 1,
      sourceCharLength: sourceText.length,
    };
  }

  const chunks = [];
  const segments = sourceText
    .split(/\n{2,}|\n(?=(?:面试官|候选人|本人|我|HR|Q\d*|A\d*|问|答)[:：])/)
    .map(compact)
    .filter(Boolean);
  let currentSegments = [];

  const pushCurrent = () => {
    if (!currentSegments.length) return;
    chunks.push(currentSegments.join("\n\n"));
    currentSegments = tailWithinOverlap(currentSegments, settings.overlap);
  };

  for (const segment of segments.length ? segments : [sourceText]) {
    if (segment.length > settings.charLimit) {
      pushCurrent();
      chunks.push(...splitOversizedSegment(segment, settings));
      currentSegments = [];
      continue;
    }

    const nextSegments = [...currentSegments, segment];
    if (nextSegments.join("\n\n").length > settings.charLimit) {
      pushCurrent();
      currentSegments = [...currentSegments, segment];
      if (currentSegments.join("\n\n").length > settings.charLimit) {
        currentSegments = [segment];
      }
    } else {
      currentSegments = nextSegments;
    }
  }
  pushCurrent();

  const truncated = chunks.length > settings.absoluteMaxChunks || budget.truncated;
  const limited = chunks.slice(0, settings.absoluteMaxChunks);
  return {
    chunks: limited.map((chunk, index) => ({
      id: `chunk-${index + 1}`,
      index,
      total: limited.length,
      text: chunk,
    })),
    truncated,
    requiredChunks: Math.max(budget.requiredChunks, chunks.length),
    processedChunks: limited.length,
    sourceCharLength: sourceText.length,
  };
};
