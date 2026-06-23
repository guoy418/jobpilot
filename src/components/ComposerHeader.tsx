import type { ComposerStep, ModuleComposer } from "../types";
import { SectionTitle } from "./AppPrimitives";

const composerTitle = (composer: ModuleComposer) => {
  if (composer === "opportunity") return "新增岗位";
  if (composer === "interview") return "新增面试复盘";
  if (composer === "resume") return "上传简历版本";
  return "新增答案卡";
};

const composerDescription = (composer: ModuleComposer, composerStep: ComposerStep) => {
  if (composerStep === "review") {
    return composer === "opportunity" ? "确认公司、岗位和下一步动作，可补充其他信息。" : "请检查整理结果，补齐必要信息后保存。";
  }
  if (composer === "interview") return "选择你现在手里的材料：已经整理好的复盘文档可以直接导入；只有原始转写稿时，可以让系统帮你整理。";
  if (composer === "opportunity") return "上传 JD 文件，粘贴招聘链接，或直接粘贴文字至岗位描述。";
  if (composer === "resume") return "上传简历文件，系统会尽量帮你提取版本名称、适合方向和核心卖点。";
  return "上传文件，或直接粘贴文字内容。系统会尽量帮你提取关键信息。";
};

export function ComposerHeader({ composer, composerStep }: { composer: ModuleComposer; composerStep: ComposerStep }) {
  return (
    <>
      <SectionTitle
        titleId="composer-dialog-title"
        label={composerStep === "source" ? "步骤 1 / 2" : "步骤 2 / 2"}
        title={composerTitle(composer)}
        action={composerStep === "source" ? "选择材料" : "确认内容"}
      />
      <p>{composerDescription(composer, composerStep)}</p>
      <div className="composer-steps">
        <span className={composerStep === "source" ? "active-step" : ""}>01 选择材料</span>
        <span className={composerStep === "review" ? "active-step" : ""}>02 确认内容</span>
      </div>
    </>
  );
}
