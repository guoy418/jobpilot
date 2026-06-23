import { Archive, FileDown, PanelRight, Settings, Upload } from "lucide-react";
import { ExportAction, PageIntro, SectionTitle } from "./AppPrimitives";

type AiSettingsShape = {
  provider: "none" | "openai" | "anthropic" | "custom";
  model: string;
  apiKey: string;
  parseMode: "mock" | "assist";
  transcriptionMode: "mock" | "assist";
  endpoint: string;
  notes: string;
};

export function SettingsPage({
  isPublicDemo,
  isApiEnabled,
  aiSettings,
  onAiSettingsChange,
  onSaveSettings,
  onResetSettings,
  onExportBackup,
  onImportBackup,
  onExportAnswerCards,
  onExportInterviewReviews,
}: {
  isPublicDemo: boolean;
  isApiEnabled: boolean;
  aiSettings: AiSettingsShape;
  onAiSettingsChange: (patch: Partial<AiSettingsShape>) => void;
  onSaveSettings: () => void;
  onResetSettings: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onExportAnswerCards: () => void;
  onExportInterviewReviews: () => void;
}) {
  return (
    <section className="surface">
      <PageIntro
        label="设置与备份"
        title="管理数据和智能整理"
        detail="在这里备份数据、导出复习材料，也可以选择是否开启智能整理能力。"
        action={isPublicDemo ? "演示模式" : isApiEnabled ? "本地保存" : "浏览器保存"}
      />
      <div className="settings-grid">
        <ExportAction icon={Archive} title="备份全部数据" detail="保存岗位、面试、答案和简历记录。" onClick={onExportBackup} />
        <ExportAction icon={Upload} title="恢复备份" detail="从之前导出的备份文件恢复数据。" onClick={onImportBackup} />
        <ExportAction icon={FileDown} title="导出答案卡" detail="下载一份方便复习的材料。" onClick={onExportAnswerCards} />
        <ExportAction icon={PanelRight} title="导出面试复盘" detail="下载问题、复盘建议和优化回答。" onClick={onExportInterviewReviews} />
      </div>
      <div className="settings-panel">
        <SectionTitle label="智能整理" title="让系统帮你读材料" action={aiSettings.provider === "none" ? "未开启" : "已配置"} />
        <p>默认可以直接读取文字文件。需要识别截图、转写录音或整理长文本时，可以在这里接入你自己的模型服务。</p>
        <div className="draft-edit-grid">
          <label>
            <span>服务商</span>
            <select value={aiSettings.provider} onChange={(event) => onAiSettingsChange({ provider: event.target.value as AiSettingsShape["provider"] })}>
              <option value="none">暂不启用</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="custom">自定义兼容接口</option>
            </select>
          </label>
          <label>
            <span>模型</span>
            <input value={aiSettings.model} onChange={(event) => onAiSettingsChange({ model: event.target.value })} placeholder="填写你常用的模型名称" />
          </label>
          <label>
            <span>文字材料整理</span>
            <select value={aiSettings.parseMode} onChange={(event) => onAiSettingsChange({ parseMode: event.target.value as AiSettingsShape["parseMode"] })}>
              <option value="mock">基础整理</option>
              <option value="assist">智能整理</option>
            </select>
          </label>
          <label>
            <span>录音转文字</span>
            <select
              value={aiSettings.transcriptionMode}
              onChange={(event) => onAiSettingsChange({ transcriptionMode: event.target.value as AiSettingsShape["transcriptionMode"] })}
            >
              <option value="mock">暂不启用</option>
              <option value="assist">启用转写</option>
            </select>
          </label>
          <label className="wide-field">
            <span>访问密钥（只保存在本机）</span>
            <input
              type="password"
              value={aiSettings.apiKey}
              onChange={(event) => onAiSettingsChange({ apiKey: event.target.value })}
              placeholder="可选，只有开启智能整理时需要"
            />
          </label>
          <label className="wide-field">
            <span>服务地址（可选）</span>
            <input value={aiSettings.endpoint} onChange={(event) => onAiSettingsChange({ endpoint: event.target.value })} placeholder="使用自定义服务时填写" />
          </label>
          <label className="wide-field">
            <span>备注</span>
            <textarea value={aiSettings.notes} onChange={(event) => onAiSettingsChange({ notes: event.target.value })} placeholder="例如：用于整理面试文字稿或识别截图。" />
          </label>
        </div>
        <div className="button-row">
          <button className="primary-button" onClick={onSaveSettings}>
            <Settings size={16} />
            <span>保存设置</span>
          </button>
          <button className="secondary-button" onClick={onResetSettings}>
            重置设置
          </button>
        </div>
      </div>
    </section>
  );
}
