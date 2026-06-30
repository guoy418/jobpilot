import type { OpportunityAction, OpportunityMatch, OpportunityPriority, OpportunityStatus } from "../src/types";

type OpportunityDeadlineLike = {
  deadline?: string;
  dueDate?: string | null;
};

type OpportunityActionInput = OpportunityDeadlineLike & {
  status: OpportunityStatus;
  match?: OpportunityMatch;
  priority?: OpportunityPriority;
};

type OpportunityActionLike = OpportunityActionInput & {
  action?: OpportunityAction;
  actionManual?: boolean;
};

type RestorableOpportunityLike = {
  previousStatus?: OpportunityStatus | null;
  status: OpportunityStatus;
};

type WeeklyPlanLike = {
  weekStart?: string;
};

type TimelineEventLike = {
  id?: string;
  occurredAt?: string;
  title?: string;
  detail?: string;
  status?: string;
};

type OpportunitySubmittedLike = {
  status: OpportunityStatus;
  previousStatus?: OpportunityStatus | null;
  timeline?: TimelineEventLike[];
};

type SubmittedTransitionEventInput = {
  id: string;
  occurredAt?: string;
  fromStatus?: OpportunityStatus;
  toStatus: OpportunityStatus;
};

export const statusLabel: Record<OpportunityStatus, string>;
export const submittedStatuses: OpportunityStatus[];
export const opportunityStatusFlow: OpportunityStatus[];
export const opportunityStatusAction: Record<OpportunityStatus, OpportunityAction>;
export const opportunityStatusNextAction: Record<OpportunityStatus, string>;
export const opportunityActionValues: OpportunityAction[];
export const opportunityActionPriorityRank: Record<OpportunityAction, number>;
export const compareOpportunityActions: (left: OpportunityAction, right: OpportunityAction) => number;
export const inferDueDateFromText: (deadline?: string) => string;
export const normalizeOpportunityDeadline: (deadline?: string | null) => string;
export const normalizeOpportunityDueDate: (dueDate?: string | null) => string;
export const normalizeOpportunityDeadlinePatch: <Patch extends object>(patch?: Patch) => Patch & {
  deadline?: string;
  dueDate?: string;
};
export const getOpportunityDueDate: (opportunity: OpportunityDeadlineLike) => string;
export const getOpportunityDaysUntilDue: (opportunity: OpportunityDeadlineLike) => number | null;
export const isOpportunityDueSoon: (opportunity: OpportunityDeadlineLike) => boolean;
export const computeOpportunityAction: (input: OpportunityActionInput) => OpportunityAction;
export const resolveOpportunityAction: (opportunity: OpportunityActionLike) => OpportunityAction;
export const defaultOpportunityNextAction: (status: OpportunityStatus) => string;
export const getRestorableOpportunityStatus: (
  opportunity: RestorableOpportunityLike,
  hasLinkedInterviews?: boolean,
) => Exclude<OpportunityStatus, "ENDED">;
export const shouldAdvanceLinkedOpportunityAfterInterview: (status: OpportunityStatus) => boolean;
export const parseDateLike: (value?: string, now?: Date) => Date | null;
export const getWeeklyWindow: (weeklyPlan?: WeeklyPlanLike | null, now?: Date) => { start: Date; end: Date };
export const isSubmittedTimelineEvent: (event?: TimelineEventLike | null) => boolean;
export const isSubmittedOrLaterStatus: (status?: OpportunityStatus | null) => boolean;
export const shouldRecordSubmittedTransition: (opportunity: OpportunitySubmittedLike, nextStatus: OpportunityStatus) => boolean;
export const createSubmittedTransitionEvent: (input: SubmittedTransitionEventInput) => TimelineEventLike & { id: string; status: "done" };
export const getOpportunitySubmittedAt: (opportunity: OpportunitySubmittedLike, now?: Date) => Date | null;
export const countWeeklySubmittedApplications: (opportunities?: OpportunitySubmittedLike[], weeklyPlan?: WeeklyPlanLike | null, now?: Date) => number;
