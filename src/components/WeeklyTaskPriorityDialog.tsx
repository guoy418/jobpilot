import { X } from "lucide-react";
import type { MouseEvent } from "react";
import type { OpportunityAction } from "../types";

export type PendingWeeklyTaskPriority = {
  title: string;
  detail: string;
  sourceLabel: string;
  level: OpportunityAction;
};

const priorityOptions: Array<{ value: OpportunityAction; label: string; detail: string }> = [
  { value: "P0", label: "P0", detail: "今天必须推进" },
  { value: "P1", label: "P1", detail: "优先练习" },
  { value: "P2", label: "P2", detail: "本周完成" },
  { value: "P3", label: "P3", detail: "有空再练" },
];

type BackdropHandler = (event: MouseEvent<HTMLDivElement>) => void;

export function WeeklyTaskPriorityDialog({
  task,
  onLevelChange,
  onConfirm,
  onClose,
  onBackdropMouseDown,
  onBackdropClick,
}: {
  task: PendingWeeklyTaskPriority;
  onLevelChange: (level: OpportunityAction) => void;
  onConfirm: () => void;
  onClose: () => void;
  onBackdropMouseDown: BackdropHandler;
  onBackdropClick: BackdropHandler;
}) {
  return (
    <div
      className="asset-preview weekly-priority-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-priority-dialog-title"
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
    >
      <div className="asset-preview-panel weekly-priority-panel" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} aria-label="关闭">
          <X size={16} />
        </button>
        <div className="section-title">
          <span>{task.sourceLabel}</span>
          <h2 id="weekly-priority-dialog-title">确认练习优先级</h2>
        </div>
        <div className="weekly-priority-preview">
          <strong>{task.title}</strong>
        </div>
        <div className="weekly-priority-options" aria-label="选择本周计划优先级">
          {priorityOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={task.level === option.value ? "active-filter" : ""}
              aria-pressed={task.level === option.value}
              onClick={() => onLevelChange(option.value)}
            >
              <span>{option.label}</span>
              <small>{option.detail}</small>
            </button>
          ))}
        </div>
        <div className="button-row confirm-actions">
          <button className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button" onClick={onConfirm}>
            加入本周计划
          </button>
        </div>
      </div>
    </div>
  );
}
