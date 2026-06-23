import { Upload } from "lucide-react";
import type { ModuleComposer, ModuleComposerSource } from "../types";
import { extractionStatusLabel, uploadStatusLabel } from "../utils/composerSource";

type InterviewInputMode = "review-json" | "raw-transcript";

const uploadHint = (composer: ModuleComposer, interviewInputMode: InterviewInputMode) => {
  if (composer === "opportunity") return "支持截图、PDF、.txt、.md。";
  if (composer === "interview") {
    return interviewInputMode === "review-json" ? "支持 .json，或包含同样 JSON 结构的 .txt / .md。" : "支持录音、.txt、.md、.docx。";
  }
  return "支持图片、PDF、.txt、.md、.docx。";
};

const acceptedFileTypes = (composer: ModuleComposer, interviewInputMode: InterviewInputMode) => {
  if (composer === "opportunity") return "image/*,.pdf,.txt,.md";
  if (composer === "interview") return interviewInputMode === "review-json" ? ".json,.txt,.md" : "audio/*,.txt,.md,.docx";
  return "image/*,.pdf,.txt,.md,.docx";
};

const sourceTextLabel = (composer: ModuleComposer, interviewInputMode: InterviewInputMode) => {
  if (composer === "opportunity") return "岗位描述";
  if (composer === "interview" && interviewInputMode === "review-json") return "整理好的复盘内容";
  return "原始录音转写稿";
};

const sourceTextPlaceholder = (composer: ModuleComposer, interviewInputMode: InterviewInputMode) => {
  if (composer === "opportunity") return "粘贴岗位描述后，可以继续确认岗位信息。";
  if (composer === "interview" && interviewInputMode === "review-json") {
    return "把外部工具整理好的复盘粘贴到这里。内容应包含原问题、原回答、评价、优化框架、优化回答。";
  }
  return "把未整理的面试转写稿粘贴到这里。";
};

export function ComposerSourceStep({
  composer,
  source,
  interviewInputMode,
  interviewReviewJsonPrompt,
  onInterviewInputModeChange,
  onSourceChange,
  onSourcePatch,
  onFileSelected,
  onClearParseNotice,
  onTemplateCopied,
}: {
  composer: ModuleComposer;
  source: ModuleComposerSource;
  interviewInputMode: InterviewInputMode;
  interviewReviewJsonPrompt: string;
  onInterviewInputModeChange: (mode: InterviewInputMode) => void;
  onSourceChange: (key: keyof ModuleComposerSource, value: string) => void;
  onSourcePatch: (patch: Partial<ModuleComposerSource>) => void;
  onFileSelected: (files: FileList | null) => void;
  onClearParseNotice: () => void;
  onTemplateCopied: () => void;
}) {
  return (
    <div className={`composer-source-grid ${composer === "resume" ? "resume-file-only" : ""}`.trim()}>
      {composer === "interview" && (
        <div className="interview-import-mode wide-field">
          <button
            className={interviewInputMode === "review-json" ? "active-import-mode" : ""}
            aria-pressed={interviewInputMode === "review-json"}
            onClick={() => {
              onInterviewInputModeChange("review-json");
              onSourcePatch({ sourceKind: "transcript", fileName: "", storageUri: undefined, extractionStatus: undefined });
              onClearParseNotice();
            }}
          >
            <strong>我已经整理好了</strong>
            <span>粘贴或上传复盘文档，直接生成面试复盘</span>
          </button>
          <button
            className={interviewInputMode === "raw-transcript" ? "active-import-mode" : ""}
            aria-pressed={interviewInputMode === "raw-transcript"}
            onClick={() => {
              onInterviewInputModeChange("raw-transcript");
              onSourcePatch({ sourceKind: "transcript", extractionStatus: undefined });
              onClearParseNotice();
            }}
          >
            <strong>帮我整理文字稿</strong>
            <span>粘贴原始转写稿，让系统先整理问题</span>
          </button>
        </div>
      )}

      <label className="upload-dropzone">
        <Upload size={22} />
        <strong>{source.fileName || (composer === "interview" && interviewInputMode === "review-json" ? "上传复盘文档" : "选择文件")}</strong>
        <small>{uploadHint(composer, interviewInputMode)}</small>
        <small>{uploadStatusLabel(source)}</small>
        {source.extractionStatus && <small>{extractionStatusLabel(source.extractionStatus)}</small>}
        <input type="file" accept={acceptedFileTypes(composer, interviewInputMode)} onChange={(event) => onFileSelected(event.target.files)} />
      </label>

      {composer !== "interview" && composer !== "resume" && (
        <div className="source-side">
          <label>
            <span>材料类型</span>
            <select value={source.sourceKind} onChange={(event) => onSourceChange("sourceKind", event.target.value as ModuleComposerSource["sourceKind"])}>
              <option value="jd-text">岗位描述 / 文件</option>
              <option value="screenshot">岗位截图</option>
              <option value="job-link">招聘链接</option>
            </select>
          </label>
          {composer === "opportunity" && source.sourceKind === "job-link" ? (
            <label>
              <span>招聘链接</span>
              <input value={source.note} onChange={(event) => onSourceChange("note", event.target.value)} placeholder="https://jobs.example.com/..." />
            </label>
          ) : (
            <label>
              <span>{composer === "opportunity" ? "招聘链接" : "备注说明"}</span>
              <input value={source.note} onChange={(event) => onSourceChange("note", event.target.value)} placeholder="https://jobs.example.com/..." />
            </label>
          )}
        </div>
      )}

      {composer !== "resume" && (
        <label className="wide-field source-text-input">
          <span>{sourceTextLabel(composer, interviewInputMode)}</span>
          <textarea value={source.rawText} onChange={(event) => onSourceChange("rawText", event.target.value)} placeholder={sourceTextPlaceholder(composer, interviewInputMode)} />
        </label>
      )}
      {composer === "interview" && interviewInputMode === "review-json" && (
        <div className="wide-field interview-json-guide">
          <div>
            <strong>还没有整理？可以先复制整理模板</strong>
            <span>把面试文字稿贴到常用 AI 工具里整理，再把结果粘回上面的输入框。</span>
          </div>
          <textarea readOnly value={interviewReviewJsonPrompt} />
          <button
            className="secondary-button compact-button"
            onClick={() => {
              void navigator.clipboard?.writeText(interviewReviewJsonPrompt);
              onTemplateCopied();
            }}
          >
            复制整理模板
          </button>
        </div>
      )}
    </div>
  );
}
