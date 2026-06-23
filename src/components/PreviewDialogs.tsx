import { X } from "lucide-react";
import type { MouseEvent } from "react";
import { sourceKindLabel } from "../domain";
import type { SessionFile, SourceAsset } from "../types";
import { SectionTitle } from "./AppPrimitives";

type BackdropHandler = (event: MouseEvent<HTMLDivElement>) => void;

export function AssetPreviewDialog({
  asset,
  onClose,
  onBackdropMouseDown,
  onBackdropClick,
  onOpenStoredFile,
}: {
  asset: SourceAsset;
  onClose: () => void;
  onBackdropMouseDown: BackdropHandler;
  onBackdropClick: BackdropHandler;
  onOpenStoredFile: (storageUri: string) => void;
}) {
  return (
    <div
      className="asset-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-preview-title"
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
    >
      <div className="asset-preview-panel" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} aria-label="关闭">
          <X size={16} />
        </button>
        <SectionTitle titleId="asset-preview-title" label={sourceKindLabel[asset.kind]} title={asset.title} action={asset.createdAt} />
        <p>{asset.detail}</p>
        <textarea readOnly value={asset.content || "当前原材料只有元信息。若该材料来自文件上传，可以点击下方打开原文件。"} />
        <div className="button-row">
          {asset.storageUri && (
            <button className="secondary-button" onClick={() => onOpenStoredFile(asset.storageUri!)}>
              打开原文件
            </button>
          )}
          {asset.kind === "job-link" && asset.content?.startsWith("http") && (
            <button className="secondary-button" onClick={() => window.open(asset.content, "_blank", "noopener,noreferrer")}>
              打开链接
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SessionFilePreviewDialog({
  file,
  onClose,
  onBackdropMouseDown,
  onBackdropClick,
  onOpenStoredFile,
}: {
  file: SessionFile;
  onClose: () => void;
  onBackdropMouseDown: BackdropHandler;
  onBackdropClick: BackdropHandler;
  onOpenStoredFile: (storageUri: string) => void;
}) {
  return (
    <div
      className="asset-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-file-preview-title"
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
    >
      <div className="asset-preview-panel" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} aria-label="关闭">
          <X size={16} />
        </button>
        <SectionTitle
          titleId="session-file-preview-title"
          label={file.kind === "audio" ? "原录音" : "文字稿"}
          title={file.fileName}
          action={file.uploadedAt}
        />
        <p>
          {file.detail}
          {file.duration ? ` / ${file.duration}` : ""}
        </p>
        <textarea readOnly value={file.content || "当前材料只有文件元信息；如果原文件已存储，可以点击下方打开原文件。"} />
        <div className="button-row">
          {file.storageUri && (
            <button className="secondary-button" onClick={() => onOpenStoredFile(file.storageUri!)}>
              打开原文件
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
