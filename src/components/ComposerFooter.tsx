import { Check, Sparkles } from "lucide-react";
import type { ComposerStep, ModuleComposer, ModuleComposerSource } from "../types";
import { canRunSourceParse, uploadStatusLabel } from "../utils/composerSource";

type InterviewInputMode = "review-json" | "raw-transcript";

const parseButtonLabel = ({
  composer,
  source,
  composerParsing,
  interviewInputMode,
}: {
  composer: ModuleComposer;
  source: ModuleComposerSource;
  composerParsing: boolean;
  interviewInputMode: InterviewInputMode;
}) => {
  if (composerParsing) return "正在处理...";
  if (!canRunSourceParse(source)) return uploadStatusLabel(source);
  if (composer === "interview" && interviewInputMode === "review-json") return "导入复盘";
  if (composer === "interview") return "开始整理";
  return "开始整理";
};

export function ComposerFooter({
  composerStep,
  composer,
  source,
  composerParsing,
  interviewInputMode,
  onParse,
  onSubmit,
  onBackToSource,
}: {
  composerStep: ComposerStep;
  composer: ModuleComposer;
  source: ModuleComposerSource;
  composerParsing: boolean;
  interviewInputMode: InterviewInputMode;
  onParse: () => void;
  onSubmit: () => void;
  onBackToSource: () => void;
}) {
  return (
    <div className="button-row">
      {composerStep === "source" && composer !== "answer" ? (
        <button className="primary-button" onClick={onParse} disabled={!canRunSourceParse(source) || composerParsing}>
          <Sparkles size={16} />
          <span>{parseButtonLabel({ composer, source, composerParsing, interviewInputMode })}</span>
        </button>
      ) : (
        <button className="primary-button" onClick={onSubmit}>
          <Check size={16} />
          <span>创建正式记录</span>
        </button>
      )}
      {composerStep === "review" && composer !== "answer" && (
        <button className="secondary-button" onClick={onBackToSource}>
          返回材料
        </button>
      )}
    </div>
  );
}
