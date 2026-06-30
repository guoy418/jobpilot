import type { TodayAction } from "../selectors";
import type {
  OpportunityAction,
  TodayActionHistoryActionItem,
  TodayActionHistoryItem,
  TodayActionHistorySource,
  TodayActionHistoryStatus,
  TodayCreatedRecordHistoryItem,
  TodayCreatedRecordInput,
  TodayCreatedRecordKind,
} from "../types";
import { localDateKey } from "./date";
import { todayActionKey } from "./todayActions";

export const todayActionHistoryStorageKey = "jobpilot.todayActionHistory.v1";

const historyStatuses = new Set<TodayActionHistoryStatus>(["shown", "completed", "dismissed"]);
const historySources = new Set<TodayActionHistorySource>(["opportunity", "interview", "weekly"]);
const createdRecordTypes = new Set<TodayCreatedRecordKind>(["opportunity", "interview", "answer", "weekly", "resume"]);
const opportunityActions = new Set<OpportunityAction>(["P0", "P1", "P2", "P3"]);
const maxCarryoverBackfillDays = 31;
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
export type TodayActionHistoryDateSummary = {
  total: number;
  actionTotal: number;
  created: number;
  completed: number;
  dismissed: number;
  resolved: number;
  shown: number;
};
const createdRecordTypeLabel: Record<TodayCreatedRecordKind, string> = {
  opportunity: "岗位",
  interview: "面试复盘",
  answer: "答案卡",
  weekly: "训练任务",
  resume: "简历版本",
};
const dateTitleWeekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object";
const stringOrUndefined = (value: unknown) => (typeof value === "string" && value ? value : undefined);
const isHistoryDateKey = (value: string) => dateKeyPattern.test(value);
const isPastOrTodayHistoryDateKey = (dateKey: string, todayDateKey: string) => isHistoryDateKey(dateKey) && dateKey <= todayDateKey;

export const isFutureTodayActionHistoryDateKey = (dateKey: string, todayDateKey = localDateKey()) => isHistoryDateKey(dateKey) && dateKey > todayDateKey;

export const parseTodayActionHistoryDateKey = (dateKey: string) => {
  const [year = "0", month = "1", day = "1"] = dateKey.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
};

const addDaysToTodayActionHistoryDateKey = (dateKey: string, days: number) => {
  const date = parseTodayActionHistoryDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
};

const buildTodayActionHistoryDateRange = (startDateKey: string, endDateKey: string, maxDays: number) => {
  const range: string[] = [];
  let cursor = startDateKey;

  while (cursor <= endDateKey && range.length < maxDays) {
    range.push(cursor);
    cursor = addDaysToTodayActionHistoryDateKey(cursor, 1);
  }

  return range;
};

export const createTodayActionHistoryCalendarState = (todayDateKey = localDateKey()) => ({
  selectedDate: todayDateKey,
  visibleMonth: parseTodayActionHistoryDateKey(todayDateKey),
});

export const buildTodayActionHistoryMonthCells = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      dateKey: localDateKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
    };
  });
};

export const formatTodayActionHistoryDateTitle = (dateKey: string) => {
  const date = parseTodayActionHistoryDateKey(dateKey);
  return `${date.getMonth() + 1}月${date.getDate()}日 · 周${dateTitleWeekdayLabels[date.getDay()]}`;
};

export const normalizeTodayActionHistory = (
  history: TodayActionHistoryItem[],
  todayDateKey = localDateKey(),
): TodayActionHistoryItem[] => {
  const nextHistory = history.filter((item) => isPastOrTodayHistoryDateKey(item.date, todayDateKey));
  return nextHistory.length === history.length ? history : nextHistory;
};

export const isTodayActionHistoryActionItem = (item: TodayActionHistoryItem): item is TodayActionHistoryActionItem =>
  item.kind !== "created";

export const isTodayCreatedRecordHistoryItem = (item: TodayActionHistoryItem): item is TodayCreatedRecordHistoryItem =>
  item.kind === "created";

const coerceCreatedRecordItem = (value: Record<string, unknown>): TodayCreatedRecordHistoryItem | null => {
  const date = stringOrUndefined(value.date);
  const recordKey = stringOrUndefined(value.recordKey);
  const recordType = stringOrUndefined(value.recordType);
  const title = stringOrUndefined(value.title);
  const createdAt = stringOrUndefined(value.createdAt);
  if (!date || !isHistoryDateKey(date) || !recordKey || !recordType || !title || !createdAt || !createdRecordTypes.has(recordType as TodayCreatedRecordKind)) return null;

  const safeRecordType = recordType as TodayCreatedRecordKind;
  return {
    kind: "created",
    id: stringOrUndefined(value.id) ?? `${date}:created:${recordKey}`,
    date,
    recordKey,
    recordType: safeRecordType,
    recordTypeLabel: stringOrUndefined(value.recordTypeLabel) ?? createdRecordTypeLabel[safeRecordType],
    title,
    detail: stringOrUndefined(value.detail) ?? "",
    targetId: stringOrUndefined(value.targetId),
    createdAt,
  };
};

const coerceHistoryItem = (value: unknown): TodayActionHistoryItem | null => {
  if (!isRecord(value)) return null;
  if (value.kind === "created") return coerceCreatedRecordItem(value);
  if (value.kind && value.kind !== "action") return null;

  const date = stringOrUndefined(value.date);
  const actionKey = stringOrUndefined(value.actionKey);
  const source = stringOrUndefined(value.source);
  const title = stringOrUndefined(value.title);
  const shownAt = stringOrUndefined(value.shownAt);
  const rawStatus = stringOrUndefined(value.status);
  const status = rawStatus === "removed" ? "shown" : rawStatus;
  const level = stringOrUndefined(value.level);
  if (!date || !isHistoryDateKey(date) || !actionKey || !source || !title || !shownAt || !status || !level) return null;
  if (!historySources.has(source as TodayActionHistorySource) || !historyStatuses.has(status as TodayActionHistoryStatus) || !opportunityActions.has(level as OpportunityAction)) return null;

  return {
    kind: "action",
    id: stringOrUndefined(value.id) ?? `${date}:${actionKey}`,
    date,
    actionKey,
    source: source as TodayActionHistorySource,
    sourceLabel: stringOrUndefined(value.sourceLabel),
    title,
    detail: stringOrUndefined(value.detail) ?? "",
    level: level as OpportunityAction,
    targetId: stringOrUndefined(value.targetId),
    taskId: stringOrUndefined(value.taskId),
    status: status as TodayActionHistoryStatus,
    shownAt,
    resolvedAt: status === "shown" ? undefined : stringOrUndefined(value.resolvedAt),
  };
};

export const parseTodayActionHistory = (value: string | null, todayDateKey = localDateKey()): TodayActionHistoryItem[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return normalizeTodayActionHistory(
      parsed.map(coerceHistoryItem).filter((item): item is TodayActionHistoryItem => Boolean(item)),
      todayDateKey,
    );
  } catch {
    return [];
  }
};

export const createTodayActionHistoryItem = (
  action: TodayAction,
  date: string,
  timestamp: string,
  status: TodayActionHistoryStatus = "shown",
): TodayActionHistoryActionItem => {
  const actionKey = todayActionKey(action);
  return {
    kind: "action",
    id: `${date}:${actionKey}`,
    date,
    actionKey,
    source: action.source,
    sourceLabel: action.sourceLabel,
    title: action.title,
    detail: action.detail,
    level: action.level,
    targetId: action.targetId,
    taskId: action.taskId,
    status,
    shownAt: timestamp,
    resolvedAt: status === "shown" ? undefined : timestamp,
  };
};

export const recordShownTodayActions = (
  history: TodayActionHistoryItem[],
  actions: TodayAction[],
  date: string,
  timestamp: string,
  todayDateKey = localDateKey(),
): TodayActionHistoryItem[] => {
  const normalizedHistory = normalizeTodayActionHistory(history, todayDateKey);
  if (!isPastOrTodayHistoryDateKey(date, todayDateKey)) return normalizedHistory;
  const recordedKeys = new Set(
    normalizedHistory.filter(isTodayActionHistoryActionItem).filter((item) => item.date === date).map((item) => item.actionKey),
  );
  const nextItems: TodayActionHistoryActionItem[] = [];

  actions.forEach((action) => {
    const actionKey = todayActionKey(action);
    if (recordedKeys.has(actionKey)) return;
    recordedKeys.add(actionKey);
    nextItems.push(createTodayActionHistoryItem(action, date, timestamp));
  });

  return nextItems.length ? [...normalizedHistory, ...nextItems] : normalizedHistory;
};

const snapshotTodayActionHistoryItemForDate = (item: TodayActionHistoryActionItem, date: string): TodayActionHistoryActionItem => ({
  ...item,
  id: `${date}:${item.actionKey}`,
  date,
  status: "shown",
  resolvedAt: undefined,
});

const updateTodayActionHistoryItemSnapshot = (
  item: TodayActionHistoryActionItem,
  action: TodayAction,
): TodayActionHistoryActionItem => {
  const nextItem = createTodayActionHistoryItem(action, item.date, item.shownAt);
  return {
    ...nextItem,
    id: item.id,
    status: item.status,
    resolvedAt: item.resolvedAt,
  };
};

const isSameTodayActionHistoryItem = (a: TodayActionHistoryActionItem, b: TodayActionHistoryActionItem) =>
  a.kind === b.kind &&
  a.id === b.id &&
  a.date === b.date &&
  a.actionKey === b.actionKey &&
  a.source === b.source &&
  a.sourceLabel === b.sourceLabel &&
  a.title === b.title &&
  a.detail === b.detail &&
  a.level === b.level &&
  a.targetId === b.targetId &&
  a.taskId === b.taskId &&
  a.status === b.status &&
  a.shownAt === b.shownAt &&
  a.resolvedAt === b.resolvedAt;

const actionHistoryMergeKey = (item: TodayActionHistoryActionItem) => `${item.date}:action:${item.actionKey}`;
const createdHistoryMergeKey = (item: TodayCreatedRecordHistoryItem) => `${item.date}:created:${item.recordKey}`;

const shouldReplaceTodayActionHistoryActionItem = (
  existing: TodayActionHistoryActionItem,
  next: TodayActionHistoryActionItem,
) => {
  if (next.status === "shown") return existing.status === "shown";
  return true;
};

export const mergeTodayActionHistoryItems = (
  existingHistory: TodayActionHistoryItem[],
  nextHistory: TodayActionHistoryItem[],
  todayDateKey = localDateKey(),
): TodayActionHistoryItem[] => {
  const merged = new Map<string, TodayActionHistoryItem>();
  const order: string[] = [];

  const addItem = (item: TodayActionHistoryItem) => {
    const key = isTodayActionHistoryActionItem(item) ? actionHistoryMergeKey(item) : createdHistoryMergeKey(item);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      order.push(key);
      return;
    }
    if (isTodayActionHistoryActionItem(existing) && isTodayActionHistoryActionItem(item)) {
      if (shouldReplaceTodayActionHistoryActionItem(existing, item)) merged.set(key, item);
      return;
    }
    merged.set(key, item);
  };

  normalizeTodayActionHistory(existingHistory, todayDateKey).forEach(addItem);
  normalizeTodayActionHistory(nextHistory, todayDateKey).forEach(addItem);

  return order.map((key) => merged.get(key)).filter((item): item is TodayActionHistoryItem => Boolean(item));
};

export const pruneMissingTodayShownActionHistoryItems = (
  history: TodayActionHistoryItem[],
  authoritativeHistory: TodayActionHistoryItem[],
  todayDateKey = localDateKey(),
): TodayActionHistoryItem[] => {
  const normalizedHistory = normalizeTodayActionHistory(history, todayDateKey);
  const authoritativeTodayShownKeys = new Set(
    normalizeTodayActionHistory(authoritativeHistory, todayDateKey)
      .filter(isTodayActionHistoryActionItem)
      .filter((item) => item.date === todayDateKey && item.status === "shown")
      .map(actionHistoryMergeKey),
  );
  const nextHistory = normalizedHistory.filter(
    (item) =>
      !(
        isTodayActionHistoryActionItem(item) &&
        item.date === todayDateKey &&
        item.status === "shown" &&
        !authoritativeTodayShownKeys.has(actionHistoryMergeKey(item))
      ),
  );
  return nextHistory.length === history.length ? history : nextHistory;
};

export const fillMissingTodayActionHistoryDates = (
  history: TodayActionHistoryItem[],
  actions: TodayAction[],
  todayDate: string,
  _timestamp: string,
  maxDateKey = localDateKey(),
): TodayActionHistoryItem[] => {
  const effectiveTodayDate = todayDate <= maxDateKey ? todayDate : maxDateKey;
  const normalizedHistory = normalizeTodayActionHistory(history, effectiveTodayDate);
  const currentActionsByKey = new Map(actions.map((action) => [todayActionKey(action), action]));
  let changed = normalizedHistory !== history;

  const snapshotHistory = normalizedHistory.reduce<TodayActionHistoryItem[]>((items, item) => {
    if (!isTodayActionHistoryActionItem(item) || item.date !== effectiveTodayDate || item.status !== "shown") {
      items.push(item);
      return items;
    }

    const currentAction = currentActionsByKey.get(item.actionKey);
    if (!currentAction) {
      changed = true;
      return items;
    }

    const nextItem = updateTodayActionHistoryItemSnapshot(item, currentAction);
    items.push(nextItem);
    if (!isSameTodayActionHistoryItem(item, nextItem)) changed = true;
    return items;
  }, []);
  const actionItems = snapshotHistory
    .filter(isTodayActionHistoryActionItem)
    .filter((item) => isPastOrTodayHistoryDateKey(item.date, effectiveTodayDate) && item.date < effectiveTodayDate);

  if (actionItems.length === 0) return changed ? snapshotHistory : history;

  const earliestActionDate = actionItems.reduce((earliest, item) => (item.date < earliest ? item.date : earliest), actionItems[0].date);
  const oldestBackfillDate = addDaysToTodayActionHistoryDateKey(effectiveTodayDate, -(maxCarryoverBackfillDays - 1));
  const startDate = earliestActionDate < oldestBackfillDate ? oldestBackfillDate : earliestActionDate;
  const lastBackfillDate = addDaysToTodayActionHistoryDateKey(effectiveTodayDate, -1);
  const dateRange = buildTodayActionHistoryDateRange(startDate, lastBackfillDate, maxCarryoverBackfillDays);
  if (dateRange.length === 0) return changed ? snapshotHistory : history;

  const sortedActionItems = actionItems
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const dateSort = a.item.date.localeCompare(b.item.date);
      return dateSort === 0 ? a.index - b.index : dateSort;
    });
  const actionItemsByDate = sortedActionItems.reduce<Map<string, TodayActionHistoryActionItem[]>>((itemsByDate, { item }) => {
    itemsByDate.set(item.date, [...(itemsByDate.get(item.date) ?? []), item]);
    return itemsByDate;
  }, new Map());
  const carryoverActions = new Map<string, TodayActionHistoryActionItem>();

  sortedActionItems.forEach(({ item }) => {
    if (item.date >= startDate) return;
    if (item.status === "shown") {
      carryoverActions.set(item.actionKey, item);
      return;
    }
    carryoverActions.delete(item.actionKey);
  });

  const carryoverItems: TodayActionHistoryActionItem[] = [];
  dateRange.forEach((date) => {
    const existingItems = actionItemsByDate.get(date) ?? [];
    const existingActionKeys = new Set(existingItems.map((item) => item.actionKey));

    Array.from(carryoverActions.entries()).forEach(([actionKey, item]) => {
      if (existingActionKeys.has(actionKey)) return;
      const nextItem = snapshotTodayActionHistoryItemForDate(item, date);
      carryoverItems.push(nextItem);
      carryoverActions.set(actionKey, nextItem);
      existingActionKeys.add(actionKey);
    });

    existingItems.forEach((item) => {
      if (item.status === "shown") {
        carryoverActions.set(item.actionKey, item);
        return;
      }
      carryoverActions.delete(item.actionKey);
    });
  });

  const combinedHistory = [...snapshotHistory, ...carryoverItems];

  return carryoverItems.length || changed ? combinedHistory : history;
};

export const recordTodayActionResolution = (
  history: TodayActionHistoryItem[],
  action: TodayAction,
  status: Exclude<TodayActionHistoryStatus, "shown">,
  date: string,
  timestamp: string,
  todayDateKey = localDateKey(),
): TodayActionHistoryItem[] => {
  const normalizedHistory = normalizeTodayActionHistory(history, todayDateKey);
  if (!isPastOrTodayHistoryDateKey(date, todayDateKey)) return normalizedHistory;
  const actionKey = todayActionKey(action);
  let matched = false;
  const nextHistory = normalizedHistory.map((item) => {
    if (!isTodayActionHistoryActionItem(item)) return item;
    if (item.date !== date || item.actionKey !== actionKey) return item;
    matched = true;
    return { ...updateTodayActionHistoryItemSnapshot(item, action), status, resolvedAt: timestamp };
  });

  if (matched) return nextHistory;
  return [...normalizedHistory, createTodayActionHistoryItem(action, date, timestamp, status)];
};

export const createTodayCreatedRecordHistoryItem = (
  record: TodayCreatedRecordInput,
  date: string,
  timestamp: string,
): TodayCreatedRecordHistoryItem => {
  const recordKey = record.recordKey ?? `${record.recordType}:${record.targetId ?? `${timestamp}:${record.title}`}`;
  return {
    kind: "created",
    id: `${date}:created:${recordKey}`,
    date,
    recordKey,
    recordType: record.recordType,
    recordTypeLabel: createdRecordTypeLabel[record.recordType],
    title: record.title,
    detail: record.detail ?? "",
    targetId: record.targetId,
    createdAt: timestamp,
  };
};

export const recordTodayCreatedRecord = (
  history: TodayActionHistoryItem[],
  record: TodayCreatedRecordInput,
  date: string,
  timestamp: string,
  todayDateKey = localDateKey(),
): TodayActionHistoryItem[] => {
  const normalizedHistory = normalizeTodayActionHistory(history, todayDateKey);
  if (!isPastOrTodayHistoryDateKey(date, todayDateKey)) return normalizedHistory;
  const nextItem = createTodayCreatedRecordHistoryItem(record, date, timestamp);
  const exists = normalizedHistory
    .filter(isTodayCreatedRecordHistoryItem)
    .some((item) => item.date === date && item.recordKey === nextItem.recordKey);
  return exists ? normalizedHistory : [...normalizedHistory, nextItem];
};

export const getTodayActionHistoryForDate = (history: TodayActionHistoryItem[], date: string, todayDateKey = localDateKey()) =>
  isPastOrTodayHistoryDateKey(date, todayDateKey)
    ? normalizeTodayActionHistory(history, todayDateKey).filter((item) => item.date === date)
    : [];

export const getVisibleHistoryItemsForDate = (
  history: TodayActionHistoryItem[],
  selectedDate: string,
  todayDateKey = localDateKey(),
  todayActions: TodayAction[] = [],
) => {
  const dateItems = getTodayActionHistoryForDate(history, selectedDate, todayDateKey);
  if (selectedDate !== todayDateKey) return dateItems;

  const shownAtByActionKey = new Map(
    dateItems
      .filter(isTodayActionHistoryActionItem)
      .map((item) => [item.actionKey, item.shownAt]),
  );
  const createdItems = dateItems.filter(isTodayCreatedRecordHistoryItem);
  const currentActionItems = todayActions.map((action) => {
    const actionKey = todayActionKey(action);
    return createTodayActionHistoryItem(action, todayDateKey, shownAtByActionKey.get(actionKey) ?? `${todayDateKey}T00:00:00.000Z`);
  });

  return [...createdItems, ...currentActionItems];
};

export const summarizeTodayActionHistoryDate = (items: TodayActionHistoryItem[]): TodayActionHistoryDateSummary => {
  const actionItems = items.filter(isTodayActionHistoryActionItem);
  const completed = actionItems.filter((item) => item.status === "completed").length;
  const dismissed = actionItems.filter((item) => item.status === "dismissed").length;
  const resolved = completed + dismissed;
  const created = items.filter(isTodayCreatedRecordHistoryItem).length;
  return {
    total: items.length,
    actionTotal: actionItems.length,
    created,
    completed,
    dismissed,
    resolved,
    shown: actionItems.length - resolved,
  };
};

export const formatDaySummaryLabel = (summary: TodayActionHistoryDateSummary) => {
  const parts: string[] = [];
  if (summary.actionTotal > 0) parts.push(`${summary.actionTotal}行动`);
  if (summary.created > 0) parts.push(`${summary.created}新建`);
  return parts.join(" · ");
};
