import { X } from "lucide-react";
import type { MouseEvent } from "react";
import type { ComposerStep, ModuleComposer, ModuleComposerDraft, ModuleComposerSource, Opportunity, ResumeVersion } from "../types";
import { ComposerFooter } from "./ComposerFooter";
import { ComposerHeader } from "./ComposerHeader";
import { ComposerReviewFields } from "./ComposerReviewFields";
import { ComposerSourceStep } from "./ComposerSourceStep";

type InterviewInputMode = "review-json" | "raw-transcript";
type BackdropHandler = (event: MouseEvent<HTMLDivElement>) => void;
type UpdateComposerDraft = <Field extends keyof ModuleComposerDraft>(field: Field, value: ModuleComposerDraft[Field]) => void;

export function ModuleComposerDialog({
  composer,
  composerStep,
  composerSource,
  composerDraft,
  composerParseNotice,
  composerParsing,
  interviewInputMode,
  interviewReviewJsonPrompt,
  opportunities,
  resumeList,
  onClose,
  onBackdropMouseDown,
  onBackdropClick,
  onInterviewInputModeChange,
  onSourceChange,
  onSourcePatch,
  onFileSelected,
  onClearParseNotice,
  onTemplateCopied,
  onDraftChange,
  onParse,
  onSubmit,
  onBackToSource,
}: {
  composer: ModuleComposer;
  composerStep: ComposerStep;
  composerSource: ModuleComposerSource;
  composerDraft: ModuleComposerDraft;
  composerParseNotice: string;
  composerParsing: boolean;
  interviewInputMode: InterviewInputMode;
  interviewReviewJsonPrompt: string;
  opportunities: Opportunity[];
  resumeList: ResumeVersion[];
  onClose: () => void;
  onBackdropMouseDown: BackdropHandler;
  onBackdropClick: BackdropHandler;
  onInterviewInputModeChange: (mode: InterviewInputMode) => void;
  onSourceChange: (field: keyof ModuleComposerSource, value: string) => void;
  onSourcePatch: (patch: Partial<ModuleComposerSource>) => void;
  onFileSelected: (files: FileList | null) => void;
  onClearParseNotice: () => void;
  onTemplateCopied: () => void;
  onDraftChange: UpdateComposerDraft;
  onParse: () => void;
  onSubmit: () => void;
  onBackToSource: () => void;
}) {
  return (
    <div className="asset-preview" role="dialog" aria-modal="true" aria-labelledby="composer-dialog-title" onMouseDown={onBackdropMouseDown} onClick={onBackdropClick}>
      <div className="asset-preview-panel module-composer-panel" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} aria-label="关闭">
          <X size={16} />
        </button>
        <ComposerHeader composer={composer} composerStep={composerStep} />

        {composerStep === "source" && composer !== "answer" && (
          <ComposerSourceStep
            composer={composer}
            source={composerSource}
            interviewInputMode={interviewInputMode}
            interviewReviewJsonPrompt={interviewReviewJsonPrompt}
            onInterviewInputModeChange={onInterviewInputModeChange}
            onSourceChange={onSourceChange}
            onSourcePatch={onSourcePatch}
            onFileSelected={onFileSelected}
            onClearParseNotice={onClearParseNotice}
            onTemplateCopied={onTemplateCopied}
          />
        )}

        {composerStep === "review" && (
          <ComposerReviewFields composer={composer} draft={composerDraft} opportunities={opportunities} resumeList={resumeList} updateDraft={onDraftChange} />
        )}

        {composerParseNotice && (
          <div className={`composer-parse-notice ${composerParsing ? "is-loading" : "is-error"}`} role="status">
            {composerParseNotice}
          </div>
        )}

        <ComposerFooter
          composerStep={composerStep}
          composer={composer}
          source={composerSource}
          composerParsing={composerParsing}
          interviewInputMode={interviewInputMode}
          onParse={onParse}
          onSubmit={onSubmit}
          onBackToSource={onBackToSource}
        />
      </div>
    </div>
  );
}
