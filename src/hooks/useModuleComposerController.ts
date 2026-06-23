import { useState } from "react";
import { uploadFileApi } from "../apiClient";
import { isApiEnabled } from "../appConfig";
import { createModuleComposerDraft, createModuleComposerSource, inferComposerSourceKind } from "../composerModel";
import { readTextFile } from "../textEncoding";
import type { ComposerStep, ModuleComposer, ModuleComposerDraft, ModuleComposerSource, QaPair } from "../types";

const defaultSourceKindForComposer = (composer: ModuleComposer): ModuleComposerSource["sourceKind"] => {
  if (composer === "resume") return "resume-file";
  if (composer === "interview") return "transcript";
  if (composer === "opportunity") return "jd-text";
  return "manual";
};

const composerStartMessage = (composer: ModuleComposer) => {
  if (composer === "opportunity") return "开始新增岗位";
  if (composer === "interview") return "开始新增面试复盘";
  if (composer === "resume") return "开始上传简历";
  return "开始新增答案卡";
};

export function useModuleComposerController({
  initialResumeId,
  initialOpportunityId,
  onMessage,
}: {
  initialResumeId: string;
  initialOpportunityId: string;
  onMessage: (message: string) => void;
}) {
  const [composer, setComposer] = useState<ModuleComposer | null>(null);
  const [composerStep, setComposerStep] = useState<ComposerStep>("source");
  const [composerSource, setComposerSource] = useState<ModuleComposerSource>(() => createModuleComposerSource());
  const [composerParsedQaPairs, setComposerParsedQaPairs] = useState<Array<Omit<QaPair, "id">>>([]);
  const [interviewInputMode, setInterviewInputMode] = useState<"review-json" | "raw-transcript">("review-json");
  const [composerParseNotice, setComposerParseNotice] = useState("");
  const [composerParsing, setComposerParsing] = useState(false);
  const [composerDraft, setComposerDraft] = useState<ModuleComposerDraft>(() => createModuleComposerDraft(initialResumeId, initialOpportunityId));

  const closeComposer = () => setComposer(null);

  const resetComposerDraft = (resumeId: string, linkedOpportunityId = "") => {
    setComposerDraft(createModuleComposerDraft(resumeId, linkedOpportunityId));
  };

  const openComposer = (kind: ModuleComposer, defaultResumeId: string, linkedOpportunityId = "") => {
    setComposer(kind);
    setComposerStep(kind === "answer" ? "review" : "source");
    setInterviewInputMode("review-json");
    setComposerSource(createModuleComposerSource(defaultSourceKindForComposer(kind)));
    setComposerParsedQaPairs([]);
    setComposerParseNotice("");
    setComposerParsing(false);
    setComposerDraft(createModuleComposerDraft(defaultResumeId, linkedOpportunityId));
    onMessage(composerStartMessage(kind));
  };

  const updateComposerSource = (field: keyof ModuleComposerSource, value: string) => {
    setComposerSource((source) => ({ ...source, [field]: value } as ModuleComposerSource));
  };

  const patchComposerSource = (patch: Partial<ModuleComposerSource>) => {
    setComposerSource((source) => ({ ...source, ...patch }));
  };

  const updateComposerDraft = <Field extends keyof ModuleComposerDraft>(field: Field, value: ModuleComposerDraft[Field]) => {
    setComposerDraft((draft) => ({ ...draft, [field]: value } as ModuleComposerDraft));
  };

  const handleComposerFileSelected = (fileList: FileList | null) => {
    if (!composer) return;
    const file = fileList?.[0];
    if (!file) return;
    const sourceKind = inferComposerSourceKind(file.name, composer);
    setComposerSource((source) => ({
      ...source,
      fileName: file.name,
      sourceKind,
      rawText: "",
      storageUri: undefined,
      extractionStatus: undefined,
      uploadStatus: isApiEnabled ? "uploading" : "local-only",
      fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    }));
    setComposerParseNotice("");
    onMessage("已选择材料");

    if (/\.(txt|md|json)$/i.test(file.name)) {
      onMessage("正在读取文件");
      setComposerSource((source) => ({ ...source, uploadStatus: "reading" }));
      void readTextFile(file)
        .then((decoded) => {
          if (decoded.garbled) {
            setComposerSource((source) => ({
              ...source,
              rawText: "",
              extractionStatus: "text-encoding-failed",
              uploadStatus: "failed",
            }));
            setComposerParseNotice("文本文件编码无法识别，看起来像乱码。请用 UTF-8 重新导出转写稿，或直接粘贴文字内容。");
            onMessage("文本编码无法识别");
            return;
          }
          setComposerSource((source) => ({
            ...source,
            rawText: decoded.text,
            extractionStatus: "local-text",
            uploadStatus: isApiEnabled ? source.uploadStatus : "stored",
          }));
          onMessage("文件已读取");
        })
        .catch(() => {
          setComposerSource((source) => ({ ...source, uploadStatus: "failed" }));
          onMessage("文件读取失败");
        });
    }

    if (isApiEnabled) {
      void uploadFileApi(file)
        .then((storedFile) => {
          setComposerSource((source) => ({
            ...source,
            storageUri: storedFile.storageUri,
            fileSize: storedFile.fileSize,
            uploadStatus: "stored",
          }));
          onMessage("文件已保存");
        })
        .catch(() => {
          setComposerSource((source) => ({ ...source, uploadStatus: "local-only" }));
          onMessage("文件已选择");
        });
    }
  };

  return {
    composer,
    composerStep,
    composerSource,
    composerParsedQaPairs,
    interviewInputMode,
    composerParseNotice,
    composerParsing,
    composerDraft,
    closeComposer,
    openComposer,
    updateComposerSource,
    patchComposerSource,
    updateComposerDraft,
    handleComposerFileSelected,
    resetComposerDraft,
    setComposer,
    setComposerStep,
    setComposerSource,
    setComposerParsedQaPairs,
    setInterviewInputMode,
    setComposerParseNotice,
    setComposerParsing,
    setComposerDraft,
  };
}
