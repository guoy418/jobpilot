import type { ComposerSourceKind, ModuleComposer, ModuleComposerDraft, ModuleComposerSource } from "./types";

export const createModuleComposerSource = (sourceKind: ComposerSourceKind = "manual"): ModuleComposerSource => ({
  fileName: "",
  sourceKind,
  rawText: "",
  note: "",
});

export const inferComposerSourceKind = (fileName: string, fallback: ModuleComposer): ComposerSourceKind => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.startsWith("http")) return "job-link";
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(lowerName)) return "screenshot";
  if (/\.(m4a|mp3|wav|aac|ogg)$/i.test(lowerName)) return "audio";
  if (/\.(txt|md|doc|docx)$/i.test(lowerName)) return fallback === "interview" ? "transcript" : "jd-text";
  if (/\.(pdf|doc|docx)$/i.test(lowerName)) return fallback === "resume" ? "resume-file" : "jd-text";
  if (fallback === "resume") return "resume-file";
  if (fallback === "interview") return "transcript";
  if (fallback === "opportunity") return "jd-text";
  return "manual";
};

export const fileBaseName = (fileName: string) =>
  fileName
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim() || "";

export const detectCompany = (text: string) => {
  const knownCompanies = ["字节跳动", "腾讯", "阿里云", "阿里", "小红书", "美团", "百度", "快手", "京东", "网易", "拼多多"];
  return knownCompanies.find((company) => text.includes(company)) || "";
};

export const detectCity = (text: string) => {
  const knownCities = ["上海", "北京", "杭州", "深圳", "广州", "成都", "南京"];
  return knownCities.find((city) => text.includes(city)) || "上海";
};

export const detectRoleTitle = (text: string, fallback = "") => {
  const titleMatch = text.match(/([\u4e00-\u9fa5A-Za-z]+(?:前端|产品|数据|运营|算法|后端|全栈|增长)[\u4e00-\u9fa5A-Za-z]*(?:实习生|工程师|经理|岗位|开发)?)/);
  return titleMatch?.[1]?.slice(0, 18) || fallback || "待确认岗位";
};

export const createModuleComposerDraft = (resumeId = "", opportunityId = ""): ModuleComposerDraft => ({
  company: "",
  title: "",
  city: "上海",
  deadline: "待定",
  priority: "B",
  match: "HIGH",
  action: "P1",
  resumeId,
  nextAction: "补齐信息后推进",
  sourceLabel: "模块内新增",
  sourceText: "",
  fileName: "",
  linkedOpportunityId: opportunityId,
  role: "",
  round: "一面",
  date: "Today",
  question: "",
  framework: "背景 -> 目标 -> 动作 -> 指标结果 -> 复盘限制",
  answer: "",
  relatedRoles: "",
  roles: "",
  points: "",
  summary: "",
});
