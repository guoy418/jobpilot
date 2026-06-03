import { submittedStatuses } from "./domain";
import type { InterviewSession, Opportunity, OpportunityAction, Page, ResumeVersion, WeeklyPlan } from "./types";

export type TodayAction = {
  level: OpportunityAction;
  title: string;
  detail: string;
  page: Page;
  filter: string;
  targetId?: string;
};

export type DashboardSummary = {
  submittedApplications: number;
  urgentCount: number;
  pendingReviewCount: number;
  toApplyCount: number;
  inProgressCount: number;
  p0Count: number;
  p1Count: number;
  weakInterviewCount: number;
  applicationGap: number;
};

export const selectResumeName = (resumeList: ResumeVersion[], resumeId: string) =>
  resumeList.find((resume) => resume.id === resumeId)?.name ?? "未选择简历";

export const selectDashboardSummary = (
  opportunities: Opportunity[],
  interviewSessions: InterviewSession[],
  weeklyPlan: WeeklyPlan,
): DashboardSummary => {
  const submittedApplications = opportunities.filter((item) => submittedStatuses.includes(item.status)).length;
  const urgentCount = opportunities.filter((item) => item.action === "P0" || item.action === "P1").length;
  const pendingReviewCount = interviewSessions.flatMap((item) => item.qaPairs).filter((pair) => pair.weak).length;
  const toApplyCount = opportunities.filter((item) => item.status === "TO APPLY").length;
  const inProgressCount = opportunities.filter((item) => item.status !== "TO APPLY" && item.status !== "OFFER").length;
  const p0Count = opportunities.filter((item) => item.action === "P0").length;
  const p1Count = opportunities.filter((item) => item.action === "P1").length;
  const weakInterviewCount = interviewSessions.filter((item) => item.qaPairs.some((pair) => pair.weak)).length;
  const applicationGap = Math.max(0, weeklyPlan.targetApplications - submittedApplications);

  return {
    submittedApplications,
    urgentCount,
    pendingReviewCount,
    toApplyCount,
    inProgressCount,
    p0Count,
    p1Count,
    weakInterviewCount,
    applicationGap,
  };
};

export const selectTodayActions = (
  opportunities: Opportunity[],
  interviewSessions: InterviewSession[],
  weeklyPlan: WeeklyPlan,
  resumeList: ResumeVersion[],
): TodayAction[] => {
  const opportunityActionItems: TodayAction[] = opportunities
    .filter((item) => item.status !== "OFFER")
    .map((item) => ({
      level: item.action,
      title:
        item.status === "TO APPLY"
          ? `投递${item.company}${item.title}`
          : item.status === "WRITTEN TEST"
            ? `完成${item.company}${item.title}笔试`
            : item.status === "INTERVIEWING"
              ? `准备${item.company}${item.title}`
              : `跟进${item.company}${item.title}`,
      detail: `${item.nextAction} / 使用 ${selectResumeName(resumeList, item.resumeId)}`,
      page: "opportunityDetail",
      filter: item.action,
      targetId: item.id,
    }));

  const interviewActionItems: TodayAction[] = interviewSessions
    .filter((session) => session.qaPairs.some((pair) => pair.weak))
    .map((session) => ({
      level: "P1",
      title: `复盘${session.company}${session.round}`,
      detail: `${session.qaPairs.filter((pair) => pair.weak).length} 个薄弱回答需要处理`,
      page: "interviews",
      filter: "",
      targetId: session.id,
    }));

  const weeklyActionItems: TodayAction[] = weeklyPlan.tasks
    .filter((task) => task.status === "open")
    .map((task) => ({
      level: "P2",
      title: task.title,
      detail: `${task.sourceLabel}: ${task.detail}`,
      page: "weekly",
      filter: "",
      targetId: task.id,
    }));

  const rawTodayActions = [...opportunityActionItems, ...interviewActionItems, ...weeklyActionItems];
  return rawTodayActions.filter(
    (action, index, actions) => actions.findIndex((candidate) => candidate.title === action.title) === index,
  );
};
