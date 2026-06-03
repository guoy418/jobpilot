import type {
  InterviewSession,
  Opportunity,
  OpportunityAction,
  OpportunityStatus,
  PipelineStage,
  PipelineStageState,
  SourceAsset,
} from "./types";

export const statusLabel: Record<OpportunityStatus, string> = {
  "TO APPLY": "待投递",
  APPLIED: "已投递",
  "WRITTEN TEST": "笔试",
  INTERVIEWING: "面试中",
  WAITING: "等结果",
  OFFER: "Offer",
};

export const sourceKindLabel: Record<SourceAsset["kind"], string> = {
  "jd-text": "JD 原文",
  "job-link": "招聘链接",
  screenshot: "页面截图",
  "referral-note": "内推记录",
};

export const submittedStatuses: OpportunityStatus[] = ["APPLIED", "WRITTEN TEST", "INTERVIEWING", "WAITING", "OFFER"];
export const opportunityStatusFlow: OpportunityStatus[] = ["TO APPLY", "APPLIED", "WRITTEN TEST", "INTERVIEWING", "WAITING", "OFFER"];

export const opportunityStatusAction: Record<OpportunityStatus, OpportunityAction> = {
  "TO APPLY": "P0",
  APPLIED: "P1",
  "WRITTEN TEST": "P1",
  INTERVIEWING: "P1",
  WAITING: "P2",
  OFFER: "P3",
};

export const opportunityStatusNextAction: Record<OpportunityStatus, string> = {
  "TO APPLY": "补齐材料后投递",
  APPLIED: "三天后跟进投递结果",
  "WRITTEN TEST": "完成笔试并同步结果",
  INTERVIEWING: "准备下一轮面试",
  WAITING: "等待结果并准备复盘",
  OFFER: "整理 Offer 信息和取舍",
};

let idSequence = 0;
export const makeId = (prefix: string) => {
  idSequence = (idSequence + 1) % 10000;
  return `${prefix}-${Date.now().toString().slice(-5)}-${idSequence.toString().padStart(4, "0")}-${Math.floor(Math.random() * 90 + 10)}`;
};

export const formatNow = () =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

const hasTimelineSignal = (opportunity: Opportunity, keyword: string) =>
  opportunity.timeline.some((event) => `${event.title} ${event.detail}`.includes(keyword));

export const buildOpportunityPipeline = (opportunity: Opportunity, sessions: InterviewSession[]): PipelineStage[] => {
  const currentIndex = opportunityStatusFlow.indexOf(opportunity.status);
  const hasWrittenTest = opportunity.status === "WRITTEN TEST" || hasTimelineSignal(opportunity, "笔试");
  const hasInterview = sessions.length > 0 || opportunity.status === "INTERVIEWING" || opportunity.status === "WAITING" || opportunity.status === "OFFER";

  const stageState = (stageStatus: OpportunityStatus, optional = false): PipelineStageState => {
    const stageIndex = opportunityStatusFlow.indexOf(stageStatus);
    if (stageStatus === opportunity.status) return "current";
    if (optional && stageStatus === "WRITTEN TEST" && currentIndex > stageIndex && !hasWrittenTest) return "skipped";
    if (stageIndex < currentIndex) return "done";
    return "next";
  };

  return [
    {
      key: "to-apply",
      label: "待投递",
      state: stageState("TO APPLY"),
      detail: opportunity.status === "TO APPLY" ? opportunity.nextAction : `已使用 ${opportunity.resumeId ? "简历版本" : "待选简历"} 建档`,
      source: "system",
    },
    {
      key: "applied",
      label: "已投递",
      state: stageState("APPLIED"),
      detail: submittedStatuses.includes(opportunity.status) ? "投递动作已完成或被手动确认" : "点击“标记已投递”后自动推进",
      source: "manual",
    },
    {
      key: "written-test",
      label: "笔试",
      state: stageState("WRITTEN TEST", true),
      detail: hasWrittenTest ? "已记录笔试或测评节点" : "不是每个岗位都有，未出现时可跳过",
      source: hasWrittenTest ? "manual" : "system",
    },
    {
      key: "interview",
      label: "约面",
      state: stageState("INTERVIEWING"),
      detail: hasInterview ? (sessions.length > 0 ? `${sessions.length} 场面试已关联` : "已进入面试/等结果阶段") : "添加面试复盘后自动推进到这里",
      source: sessions.length > 0 ? "system" : "manual",
      subItems: sessions.map((session) => ({
        label: session.round,
        detail: `${session.company} / ${session.role} / ${session.date}`,
        state: "done",
      })),
    },
    {
      key: "waiting",
      label: "等结果",
      state: stageState("WAITING"),
      detail: opportunity.status === "WAITING" ? opportunity.nextAction : "面试结束后可手动切到等结果",
      source: "manual",
    },
    {
      key: "offer",
      label: "Offer",
      state: stageState("OFFER"),
      detail: opportunity.status === "OFFER" ? "已进入 Offer 对比和取舍" : "最终结果节点",
      source: "manual",
    },
  ];
};
