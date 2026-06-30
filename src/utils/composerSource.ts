import type { ModuleComposerSource } from "../types";
import { isApiEnabled } from "../appConfig";

const text = (value: string) => value.trim();
const urlPattern = /https?:\/\/[^\s"'<>，。)）]+/i;

export const extractJobLinkFromSource = (source: ModuleComposerSource) => {
  if (source.sourceKind !== "job-link") return "";
  const candidates = [source.note, source.rawText, source.fileName].map(text).filter(Boolean);
  for (const candidate of candidates) {
    const url = candidate.match(urlPattern)?.[0];
    if (url) return url;
  }
  return candidates[0] ?? "";
};

export const isJobLinkOnlyText = (value: string) => {
  const normalized = text(value);
  const url = normalized.match(urlPattern)?.[0];
  if (!url) return false;
  const remainder = normalized
    .replace(url, "")
    .replace(/^(?:招聘链接|投递链接|岗位链接|链接|url)[:：\s-]*/i, "")
    .replace(/[，。,；;、\s()（）[\]【】"'<>《》-]/g, "");
  return remainder.length === 0;
};

export const failedExtractionStatuses = new Set([
  "stored-file-missing",
  "empty-pdf-text",
  "empty-docx-text",
  "ai-not-configured",
  "ocr-unavailable",
  "empty-ocr-text",
  "ocr-provider-failed",
  "transcription-unavailable",
  "empty-transcription-text",
  "transcription-provider-failed",
  "transcription-provider-unsupported",
  "ai-parser-failed",
  "ai-parser-invalid-json",
  "ai-review-empty",
  "unsupported-file-type",
  "file-extraction-failed",
  "text-encoding-failed",
]);

export const extractionStatusLabel = (status?: string) => {
  if (!status) return "";
  const labels: Record<string, string> = {
    "local-text": "已读取文本文件",
    "local-pdf-text": "已读取 PDF 内容",
    "local-docx-text": "已读取文档内容",
    "ai-ocr": "已识别图片文字",
    "ai-transcription": "已完成录音转写",
    "interview-json": "已导入复盘内容",
    "ai-not-configured": "请先完成智能整理设置",
    "stored-file-missing": "找不到已上传文件，请重新上传",
    "empty-pdf-text": "PDF 里没有读到文字，请换文件或粘贴文字",
    "empty-docx-text": "文档里没有读到文字，请检查文件内容",
    "ocr-unavailable": "图片识别需要先开启智能整理",
    "empty-ocr-text": "没有识别出文字，请换更清晰的截图",
    "ocr-provider-failed": "图片识别失败，请检查设置后重试",
    "transcription-unavailable": "录音转文字需要先开启",
    "empty-transcription-text": "没有转写出文字，请检查录音内容",
    "transcription-provider-failed": "录音转文字失败，请检查设置或音频格式",
    "transcription-provider-unsupported": "当前服务商不支持录音转写，请用 OpenAI 或兼容接口",
    "ai-review": "已整理面试复盘",
    "ai-parser-failed": "面试复盘整理失败",
    "ai-parser-invalid-json": "整理结果格式不对，请重试",
    "ai-review-empty": "没有整理出有效问题",
    "unsupported-file-type": "当前文件类型不能自动读取",
    "file-extraction-failed": "文件提取失败，请换文件或粘贴文字",
    "text-encoding-failed": "文本编码无法识别，请用 UTF-8 重新导出或直接粘贴文字",
  };
  return labels[status] ?? status;
};

export const uploadStatusLabel = (source: ModuleComposerSource) => {
  if (source.rawText.trim()) return "已读取文字，可以继续";
  if (extractJobLinkFromSource(source)) return "链接已填写，可以继续";
  if (source.uploadStatus === "reading") return "正在读取文本文件...";
  if (source.uploadStatus === "uploading") return "正在保存文件...";
  if (source.uploadStatus === "stored") return "文件已准备好";
  if (source.uploadStatus === "failed") return "文件保存失败，请重新选择或粘贴文字";
  if (source.uploadStatus === "local-only") return "文件已选择；如无法读取，请直接粘贴文字";
  if (source.fileName) return "文件已选择";
  if (source.sourceKind === "job-link") return "请填写招聘链接";
  return "未选择文件";
};

export const canRunSourceParse = (source: ModuleComposerSource) => {
  if (source.rawText.trim()) return true;
  if (extractJobLinkFromSource(source)) return true;
  if (!source.fileName.trim()) return false;
  if (source.uploadStatus === "reading" || source.uploadStatus === "uploading") return false;
  return Boolean(isApiEnabled && source.storageUri);
};
