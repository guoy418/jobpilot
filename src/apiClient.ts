import { apiBaseUrl, isApiEnabled } from "./appConfig";
import type { AnswerCard, InterviewSession, Opportunity, QaPair, ResumeVersion, WeeklyPlan, WeeklyTask } from "./types";

const assertApiEnabled = () => {
  if (!isApiEnabled) {
    throw new Error("API is disabled");
  }
};

export type InitialApiData = {
  opportunities: Opportunity[];
  interviewSessions: InterviewSession[];
  answerCards: AnswerCard[];
  resumeVersions: ResumeVersion[];
  weeklyPlan: WeeklyPlan;
};

const getJson = async <T,>(path: string): Promise<T> => {
  assertApiEnabled();
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const sendJson = async <T,>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> => {
  assertApiEnabled();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${method} ${path} returned ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const createAnswerCardApi = (answer: AnswerCard): Promise<AnswerCard> => sendJson<AnswerCard>("/api/answers", "POST", answer);

export const updateAnswerCardApi = (id: string, patch: Partial<AnswerCard>): Promise<AnswerCard> =>
  sendJson<AnswerCard>(`/api/answers/${encodeURIComponent(id)}`, "PATCH", patch);

export const deleteAnswerCardApi = (id: string): Promise<{ ok: boolean; id: string }> =>
  sendJson<{ ok: boolean; id: string }>(`/api/answers/${encodeURIComponent(id)}`, "DELETE");

export const updateWeeklyPlanApi = (patch: Partial<Omit<WeeklyPlan, "tasks">>): Promise<WeeklyPlan> =>
  sendJson<WeeklyPlan>("/api/weekly-plan/current", "PATCH", patch);

export const createWeeklyTaskApi = (task: WeeklyTask): Promise<WeeklyTask> =>
  sendJson<WeeklyTask>("/api/weekly-plan/current/tasks", "POST", task);

export const updateWeeklyTaskApi = (id: string, patch: Partial<WeeklyTask>): Promise<WeeklyTask> =>
  sendJson<WeeklyTask>(`/api/weekly-tasks/${encodeURIComponent(id)}`, "PATCH", patch);

export const deleteWeeklyTaskApi = (id: string): Promise<{ ok: boolean; id: string }> =>
  sendJson<{ ok: boolean; id: string }>(`/api/weekly-tasks/${encodeURIComponent(id)}`, "DELETE");

export const createResumeVersionApi = (resume: ResumeVersion): Promise<ResumeVersion> =>
  sendJson<ResumeVersion>("/api/resumes", "POST", resume);

export const updateResumeVersionApi = (id: string, patch: Partial<ResumeVersion>): Promise<ResumeVersion> =>
  sendJson<ResumeVersion>(`/api/resumes/${encodeURIComponent(id)}`, "PATCH", patch);

export const deleteResumeVersionApi = (id: string): Promise<{ ok: boolean; id: string }> =>
  sendJson<{ ok: boolean; id: string }>(`/api/resumes/${encodeURIComponent(id)}`, "DELETE");

export const createInterviewSessionApi = (session: InterviewSession): Promise<InterviewSession> =>
  sendJson<InterviewSession>("/api/interviews", "POST", session);

export const updateInterviewSessionApi = (id: string, patch: Partial<InterviewSession>): Promise<InterviewSession> =>
  sendJson<InterviewSession>(`/api/interviews/${encodeURIComponent(id)}`, "PATCH", patch);

export const deleteInterviewSessionApi = (id: string): Promise<{ ok: boolean; id: string }> =>
  sendJson<{ ok: boolean; id: string }>(`/api/interviews/${encodeURIComponent(id)}`, "DELETE");

export const createQaPairApi = (interviewId: string, qaPair: QaPair): Promise<QaPair> =>
  sendJson<QaPair>(`/api/interviews/${encodeURIComponent(interviewId)}/qa`, "POST", qaPair);

export const updateQaPairApi = (id: string, patch: Partial<QaPair>): Promise<QaPair> =>
  sendJson<QaPair>(`/api/qa-pairs/${encodeURIComponent(id)}`, "PATCH", patch);

export const deleteQaPairApi = (id: string): Promise<{ ok: boolean; id: string }> =>
  sendJson<{ ok: boolean; id: string }>(`/api/qa-pairs/${encodeURIComponent(id)}`, "DELETE");

export const createOpportunityApi = (opportunity: Opportunity): Promise<Opportunity> =>
  sendJson<Opportunity>("/api/opportunities", "POST", opportunity);

export const updateOpportunityApi = (id: string, patch: Partial<Opportunity>): Promise<Opportunity> =>
  sendJson<Opportunity>(`/api/opportunities/${encodeURIComponent(id)}`, "PATCH", patch);

export const deleteOpportunityApi = (id: string): Promise<{ ok: boolean; id: string }> =>
  sendJson<{ ok: boolean; id: string }>(`/api/opportunities/${encodeURIComponent(id)}`, "DELETE");

export const loadInitialApiData = async (): Promise<InitialApiData> => {
  assertApiEnabled();
  const [opportunities, interviewSessions, answerCards, resumeVersions, weeklyPlan] = await Promise.all([
    getJson<Opportunity[]>("/api/opportunities"),
    getJson<InterviewSession[]>("/api/interviews"),
    getJson<AnswerCard[]>("/api/answers"),
    getJson<ResumeVersion[]>("/api/resumes"),
    getJson<WeeklyPlan>("/api/weekly-plan/current"),
  ]);

  if (!opportunities.length || !interviewSessions.length || !answerCards.length || !resumeVersions.length || !weeklyPlan) {
    throw new Error("API returned incomplete initial data");
  }

  return {
    opportunities,
    interviewSessions,
    answerCards,
    resumeVersions,
    weeklyPlan,
  };
};
