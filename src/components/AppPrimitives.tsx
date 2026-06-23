import { Send, type LucideIcon } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { apiBaseUrl } from "../appConfig";
import { statusLabel } from "../domain";
import type { Opportunity } from "../types";

type ApiModeStatus = "checking" | "online" | "offline" | "demo" | "mock";

type ApiModeBadgeState = {
  status: ApiModeStatus;
  dbPath?: string;
  checkedAt?: string;
};

export function PageIntro({
  label,
  title,
  detail,
  action,
  helpTooltip = "",
  helpLabel = "说明",
}: {
  label: string;
  title: string;
  detail: string;
  action: string;
  helpTooltip?: string;
  helpLabel?: string;
}) {
  return (
    <div className="page-intro">
      <div className="section-title">
        <span>{label}</span>
        <h2>
          {title}
          {helpTooltip ? (
            <span className="field-tooltip section-title-help" tabIndex={0} data-tooltip={helpTooltip} aria-label={helpLabel}>
              ?
            </span>
          ) : null}
        </h2>
        <em>{action}</em>
      </div>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}

export function SectionTitle({ label, title, action, titleId }: { label: string; title: string; action: string; titleId?: string }) {
  return (
    <div className="section-title">
      <span>{label}</span>
      <h2 id={titleId}>{title}</h2>
      <em>{action}</em>
    </div>
  );
}

export function ApiModeBadge({ apiMode, onRefresh }: { apiMode: ApiModeBadgeState; onRefresh: () => void }) {
  const label =
    apiMode.status === "online"
      ? "已连接"
      : apiMode.status === "checking"
        ? "检查中"
        : apiMode.status === "offline"
          ? "未连接"
          : apiMode.status === "demo"
            ? "演示模式"
            : "本机模式";
  const detail =
    apiMode.status === "online"
      ? apiMode.dbPath
        ? "数据会保存在本机"
        : "数据服务已可用"
      : apiMode.status === "offline"
        ? "当前使用浏览器数据"
        : apiMode.status === "demo"
          ? "当前是演示数据"
          : apiMode.status === "mock"
            ? "数据保存在浏览器中"
            : "正在检查保存方式";

  return (
    <div className={`api-mode-badge ${apiMode.status}`} title={apiMode.dbPath || apiBaseUrl}>
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      {apiMode.checkedAt && <em>{apiMode.checkedAt}</em>}
      <button className="mini-button" onClick={onRefresh} disabled={apiMode.status === "checking"}>
        刷新
      </button>
    </div>
  );
}

export function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ReviewBlock({
  label,
  value,
  readOnly,
  compact,
  onChange,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  compact?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className={`review-block${compact ? " compact-review-block" : ""}`}>
      <span>{label}</span>
      <textarea readOnly={readOnly} value={value} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

export function WeeklyTagEditor({
  label,
  values,
  onAdd,
  onUse,
}: {
  label: string;
  values: string[];
  onAdd: (value: string) => void;
  onUse: (label: string, value: string) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="weekly-tags">
      <span>{label}</span>
      <div className="focus-grid">
        {values.map((item) => (
          <button key={item} onClick={() => onUse(label, item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="tag-input-row">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`添加${label}`} />
        <button
          className="secondary-button compact-button"
          onClick={() => {
            onAdd(draft);
            setDraft("");
          }}
        >
          添加
        </button>
      </div>
    </div>
  );
}

export function ListPager({
  page,
  pageCount,
  onPageChange,
  alwaysShow = false,
  className = "",
  label = "列表",
}: {
  page: number;
  pageCount: number;
  onPageChange: (nextPage: number) => void;
  alwaysShow?: boolean;
  className?: string;
  label?: string;
}) {
  if (!alwaysShow && pageCount <= 1) return null;

  return (
    <div className={`pager-row ${className}`.trim()} aria-label={`${label}分页`}>
      <button
        type="button"
        className="ghost-button compact-button"
        disabled={page === 0}
        aria-label={`${label}上一页`}
        onClick={() => onPageChange(Math.max(0, page - 1))}
      >
        上一页
      </button>
      <span>
        {page + 1} / {pageCount}
      </span>
      <button
        type="button"
        className="ghost-button compact-button"
        disabled={page >= pageCount - 1}
        aria-label={`${label}下一页`}
        onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
      >
        下一页
      </button>
    </div>
  );
}

export function StatusPill({ status }: { status: Opportunity["status"] }) {
  return <span className={`status-pill ${status.toLowerCase().replace(/\s/g, "-")}`}>{statusLabel[status]}</span>;
}

export function SegmentedProgress({ value, segments }: { value: number; segments: number }) {
  const filled = Math.round((value / 100) * segments);
  return (
    <div className="segmented-progress" aria-label={`${value}%`} style={{ "--segments": segments } as CSSProperties}>
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className={index < filled ? "filled" : ""} />
      ))}
    </div>
  );
}

export function EmptyState({ title, detail, className = "" }: { title: string; detail: string; className?: string }) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

export function ExportAction({
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className="export-action" onClick={onClick}>
      <Icon size={20} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <Send size={16} />
    </button>
  );
}
