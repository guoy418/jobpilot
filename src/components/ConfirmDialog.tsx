import { X } from "lucide-react";
import type { MouseEvent } from "react";
import type { OpportunityEndReason } from "../types";

export type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  eyebrow?: string;
  confirmTone?: "danger" | "primary";
  cancelLabel?: string;
  contentKind?: "end-opportunity";
  onConfirm: () => void;
};

export type EndOpportunityDraft = {
  reason: OpportunityEndReason;
  note: string;
};

const endReasonOptions: Array<{ value: OpportunityEndReason; label: string }> = [
  { value: "REJECTED", label: "被拒" },
  { value: "CLOSED", label: "岗位关闭" },
  { value: "WITHDRAWN", label: "不再考虑" },
  { value: "OTHER", label: "其他" },
];

type BackdropHandler = (event: MouseEvent<HTMLDivElement>) => void;

export function ConfirmDialog({
  dialog,
  endOpportunityDraft,
  onEndOpportunityDraftChange,
  onClose,
  onConfirm,
  onBackdropMouseDown,
  onBackdropClick,
}: {
  dialog: ConfirmDialogState;
  endOpportunityDraft: EndOpportunityDraft;
  onEndOpportunityDraftChange: (patch: Partial<EndOpportunityDraft>) => void;
  onClose: () => void;
  onConfirm: () => void;
  onBackdropMouseDown: BackdropHandler;
  onBackdropClick: BackdropHandler;
}) {
  return (
    <div
      className="asset-preview confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
    >
      <div className="asset-preview-panel confirm-panel" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} aria-label="关闭">
          <X size={16} />
        </button>
        <div className="section-title">
          <span>{dialog.eyebrow ?? "确认删除"}</span>
          <h2 id="confirm-dialog-title">{dialog.title}</h2>
        </div>
        <p>{dialog.description}</p>
        {dialog.contentKind === "end-opportunity" ? (
          <div className="end-opportunity-form">
            <span>结束原因</span>
            <div className="end-reason-grid">
              {endReasonOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={endOpportunityDraft.reason === option.value ? "active-filter" : ""}
                  aria-pressed={endOpportunityDraft.reason === option.value}
                  onClick={() => onEndOpportunityDraftChange({ reason: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label>
              <span>备注</span>
              <textarea
                value={endOpportunityDraft.note}
                onChange={(event) => onEndOpportunityDraftChange({ note: event.target.value })}
                placeholder="例如：HR 通知岗位暂停招聘；或自己决定不再继续。"
              />
            </label>
          </div>
        ) : null}
        <div className="button-row confirm-actions">
          <button className="secondary-button" onClick={onClose}>
            {dialog.cancelLabel ?? "取消"}
          </button>
          <button className={dialog.confirmTone === "primary" ? "primary-button" : "destructive-button"} onClick={onConfirm}>
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
