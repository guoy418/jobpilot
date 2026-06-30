import { describe, expect, it } from "vitest";

import type { TodayAction } from "../selectors";
import {
  buildTodayActionHistoryMonthCells,
  createTodayActionHistoryCalendarState,
  fillMissingTodayActionHistoryDates,
  formatDaySummaryLabel,
  formatTodayActionHistoryDateTitle,
  getTodayActionHistoryForDate,
  getVisibleHistoryItemsForDate,
  isFutureTodayActionHistoryDateKey,
  isTodayCreatedRecordHistoryItem,
  mergeTodayActionHistoryItems,
  parseTodayActionHistory,
  pruneMissingTodayShownActionHistoryItems,
  recordShownTodayActions,
  recordTodayActionResolution,
  recordTodayCreatedRecord,
  summarizeTodayActionHistoryDate,
} from "./todayActionHistory";

const todayKey = "2026-06-29";

const makeAction = (overrides: Partial<TodayAction> = {}): TodayAction => ({
  level: "P1",
  title: "投递示例公司前端实习",
  detail: "补充简历 / 使用 FE v1",
  page: "opportunityDetail",
  filter: "P1",
  source: "opportunity",
  sourceLabel: "岗位推进 / 示例公司",
  targetId: "opp-1",
  ...overrides,
});

const makeWeeklyAction = (overrides: Partial<TodayAction> = {}): TodayAction =>
  makeAction({
    level: "P2",
    title: "整理一版前端项目表达",
    detail: "训练计划: 项目亮点讲清楚",
    page: "weekly",
    filter: "",
    source: "weekly",
    sourceLabel: "本周计划 / 计划动作",
    targetId: "task-project-expression",
    taskId: "task-project-expression",
    ...overrides,
  });

const hasActionStatus = (items: unknown[], status: string) =>
  items.some((item) => {
    if (!item || typeof item !== "object" || !("status" in item)) return false;
    return item.status === status;
  });

const hasRemovedStatus = (items: unknown[]) => hasActionStatus(items, "removed");

describe("today action history", () => {
  it("formats detail date titles on one natural line", () => {
    expect(formatTodayActionHistoryDateTitle("2026-06-29")).toBe("6月29日 · 周一");
    expect(formatTodayActionHistoryDateTitle("2026-06-16")).toBe("6月16日 · 周二");
  });

  it("formats calendar summary labels without mixing actions and created records", () => {
    expect(formatDaySummaryLabel({ total: 10, actionTotal: 10, created: 0, completed: 0, dismissed: 0, resolved: 0, shown: 10 })).toBe("10行动");
    expect(formatDaySummaryLabel({ total: 2, actionTotal: 0, created: 2, completed: 0, dismissed: 0, resolved: 0, shown: 0 })).toBe("2新建");
    expect(formatDaySummaryLabel({ total: 12, actionTotal: 10, created: 2, completed: 4, dismissed: 1, resolved: 5, shown: 5 })).toBe("10行动 · 2新建");
    expect(formatDaySummaryLabel({ total: 0, actionTotal: 0, created: 0, completed: 0, dismissed: 0, resolved: 0, shown: 0 })).toBe("");
  });

  it("records shown snapshots once per day and action key", () => {
    const action = makeAction();
    const first = recordShownTodayActions([], [action, action], "2026-06-26", "2026-06-26T09:00:00.000Z", todayKey);
    const second = recordShownTodayActions(first, [action], "2026-06-26", "2026-06-26T10:00:00.000Z", todayKey);
    const third = recordShownTodayActions(second, [action], "2026-06-27", "2026-06-27T09:00:00.000Z", todayKey);

    expect(first).toHaveLength(1);
    expect(second).toBe(first);
    expect(third).toHaveLength(2);
    expect(first[0]).toMatchObject({
      date: "2026-06-26",
      title: "投递示例公司前端实习",
      status: "shown",
      shownAt: "2026-06-26T09:00:00.000Z",
    });
    expect(third[1]).toMatchObject({
      date: "2026-06-27",
      title: "投递示例公司前端实习",
      status: "shown",
      shownAt: "2026-06-27T09:00:00.000Z",
    });
  });

  it("updates the action snapshot when resolving after a title edit", () => {
    const shownAction = makeAction();
    const editedAction = makeAction({ title: "今天先投示例公司" });
    const shown = recordShownTodayActions([], [shownAction], todayKey, "2026-06-29T09:00:00.000Z", todayKey);
    const completed = recordTodayActionResolution(shown, editedAction, "completed", todayKey, "2026-06-29T11:00:00.000Z", todayKey);

    expect(getTodayActionHistoryForDate(completed, todayKey, todayKey)).toEqual([
      expect.objectContaining({
        actionKey: "opportunity:opp-1",
        title: "今天先投示例公司",
        status: "completed",
      }),
    ]);
  });

  it("fills missing past dates for unresolved actions and uses current actions for today", () => {
    const action = makeAction();
    const currentAction = makeAction({ title: "投递示例公司前端实习（今日更新）" });
    const history = recordShownTodayActions([], [action], "2026-06-26", "2026-06-26T09:00:00.000Z", todayKey);
    const filled = fillMissingTodayActionHistoryDates(
      history,
      [currentAction],
      todayKey,
      "2026-06-29T09:00:00.000Z",
      todayKey,
    );
    const withTodaySnapshot = recordShownTodayActions(
      filled,
      [currentAction],
      todayKey,
      "2026-06-29T09:00:00.000Z",
      todayKey,
    );

    expect(getTodayActionHistoryForDate(filled, "2026-06-26", todayKey)).toHaveLength(1);
    expect(getTodayActionHistoryForDate(filled, "2026-06-27", todayKey)).toHaveLength(1);
    expect(getTodayActionHistoryForDate(filled, "2026-06-28", todayKey)).toHaveLength(1);
    expect(getTodayActionHistoryForDate(filled, todayKey, todayKey)).toEqual([]);
    expect(getTodayActionHistoryForDate(filled, "2026-06-27", todayKey)[0]).toMatchObject({
      date: "2026-06-27",
      title: "投递示例公司前端实习",
      status: "shown",
    });
    expect(getTodayActionHistoryForDate(withTodaySnapshot, todayKey, todayKey)).toEqual([
      expect.objectContaining({
        date: todayKey,
        title: "投递示例公司前端实习（今日更新）",
        status: "shown",
      }),
    ]);
    expect(getVisibleHistoryItemsForDate(filled, todayKey, todayKey, [currentAction])).toEqual([
      expect.objectContaining({
        date: todayKey,
        title: "投递示例公司前端实习（今日更新）",
        status: "shown",
      }),
    ]);
  });

  it("does not complete stale carryover actions missing from current today actions", () => {
    const currentAction = makeAction();
    const staleWeeklyAction = makeWeeklyAction();
    const updatedCurrentAction = makeAction({ title: "投递示例公司前端实习（今日更新）" });
    const history = recordShownTodayActions(
      [],
      [currentAction, staleWeeklyAction],
      "2026-06-26",
      "2026-06-26T09:00:00.000Z",
      todayKey,
    );
    const filled = fillMissingTodayActionHistoryDates(
      history,
      [updatedCurrentAction],
      todayKey,
      "2026-06-29T09:00:00.000Z",
      todayKey,
    );
    const withTodaySnapshot = recordShownTodayActions(
      filled,
      [updatedCurrentAction],
      todayKey,
      "2026-06-29T09:00:00.000Z",
      todayKey,
    );

    expect(getTodayActionHistoryForDate(filled, "2026-06-27", todayKey)).toHaveLength(2);
    expect(getTodayActionHistoryForDate(filled, "2026-06-28", todayKey)).toHaveLength(2);
    expect(getTodayActionHistoryForDate(filled, "2026-06-28", todayKey)).toEqual([
      expect.objectContaining({
        actionKey: "opportunity:opp-1",
        status: "shown",
      }),
      expect.objectContaining({
        actionKey: "weekly:task-project-expression",
        status: "shown",
      }),
    ]);
    expect(getTodayActionHistoryForDate(withTodaySnapshot, todayKey, todayKey)).toEqual([
      expect.objectContaining({
        actionKey: "opportunity:opp-1",
        title: "投递示例公司前端实习（今日更新）",
        status: "shown",
      }),
    ]);
    expect(getVisibleHistoryItemsForDate(filled, todayKey, todayKey, [updatedCurrentAction])).toEqual([
      expect.objectContaining({
        actionKey: "opportunity:opp-1",
        title: "投递示例公司前端实习（今日更新）",
        status: "shown",
      }),
    ]);
    expect(hasActionStatus(withTodaySnapshot, "completed")).toBe(false);
    expect(hasRemovedStatus(withTodaySnapshot)).toBe(false);
  });

  it("only records completed after explicit completion resolution", () => {
    const action = makeAction();
    const history = recordShownTodayActions([], [action], "2026-06-26", "2026-06-26T09:00:00.000Z", todayKey);
    const filled = fillMissingTodayActionHistoryDates(history, [action], todayKey, "2026-06-29T09:00:00.000Z", todayKey);

    expect(hasActionStatus(filled, "completed")).toBe(false);

    const completed = recordTodayActionResolution(filled, action, "completed", "2026-06-28", "2026-06-28T11:00:00.000Z", todayKey);

    expect(getTodayActionHistoryForDate(completed, "2026-06-28", todayKey)).toEqual([
      expect.objectContaining({
        actionKey: "opportunity:opp-1",
        status: "completed",
        resolvedAt: "2026-06-28T11:00:00.000Z",
      }),
    ]);
    expect(summarizeTodayActionHistoryDate(getTodayActionHistoryForDate(completed, "2026-06-28", todayKey))).toEqual({
      total: 1,
      actionTotal: 1,
      created: 0,
      completed: 1,
      dismissed: 0,
      resolved: 1,
      shown: 0,
    });
  });

  it("drops stale unresolved today snapshots instead of writing removed", () => {
    const staleStoredToday = recordShownTodayActions(
      [],
      [makeAction(), makeWeeklyAction({ targetId: "task-result-expression", taskId: "task-result-expression" })],
      todayKey,
      "2026-06-29T08:00:00.000Z",
      todayKey,
    );
    const authoritative = fillMissingTodayActionHistoryDates(
      staleStoredToday,
      [makeAction({ title: "投递示例公司前端实习（今日更新）" })],
      todayKey,
      "2026-06-29T09:00:00.000Z",
      todayKey,
    );
    const merged = mergeTodayActionHistoryItems(staleStoredToday, authoritative, todayKey);
    const pruned = pruneMissingTodayShownActionHistoryItems(merged, authoritative, todayKey);

    expect(getTodayActionHistoryForDate(authoritative, todayKey, todayKey)).toEqual([
      expect.objectContaining({ actionKey: "opportunity:opp-1", title: "投递示例公司前端实习（今日更新）", status: "shown" }),
    ]);
    expect(getTodayActionHistoryForDate(pruned, todayKey, todayKey)).toEqual([
      expect.objectContaining({ actionKey: "opportunity:opp-1", title: "投递示例公司前端实习（今日更新）", status: "shown" }),
    ]);
    expect(hasRemovedStatus(pruned)).toBe(false);
  });

  it("stops carrying an action after it is completed or dismissed", () => {
    const completedAction = makeAction();
    const dismissedAction = makeWeeklyAction();
    const firstDay = recordShownTodayActions([], [completedAction, dismissedAction], "2026-06-26", "2026-06-26T09:00:00.000Z", todayKey);
    const secondDay = recordShownTodayActions(firstDay, [completedAction, dismissedAction], "2026-06-27", "2026-06-27T09:00:00.000Z", todayKey);
    const completed = recordTodayActionResolution(secondDay, completedAction, "completed", "2026-06-27", "2026-06-27T11:00:00.000Z", todayKey);
    const dismissed = recordTodayActionResolution(completed, dismissedAction, "dismissed", "2026-06-27", "2026-06-27T12:00:00.000Z", todayKey);
    const filled = fillMissingTodayActionHistoryDates(dismissed, [completedAction, dismissedAction], todayKey, "2026-06-29T09:00:00.000Z", todayKey);

    expect(getTodayActionHistoryForDate(filled, "2026-06-26", todayKey)).toHaveLength(2);
    expect(getTodayActionHistoryForDate(filled, "2026-06-27", todayKey)).toEqual([
      expect.objectContaining({ actionKey: "opportunity:opp-1", status: "completed" }),
      expect.objectContaining({ actionKey: "weekly:task-project-expression", status: "dismissed" }),
    ]);
    expect(getTodayActionHistoryForDate(filled, "2026-06-28", todayKey)).toEqual([]);
    expect(getTodayActionHistoryForDate(filled, todayKey, todayKey)).toEqual([]);
  });

  it("keeps completed history when later shown snapshots are merged", () => {
    const action = makeAction();
    const shown = recordShownTodayActions([], [action], "2026-06-26", "2026-06-26T09:00:00.000Z", todayKey);
    const completed = recordTodayActionResolution(shown, action, "completed", "2026-06-26", "2026-06-26T11:00:00.000Z", todayKey);
    const staleShown = recordShownTodayActions([], [makeAction({ title: "后续标题变化" })], "2026-06-26", "2026-06-26T12:00:00.000Z", todayKey);
    const merged = mergeTodayActionHistoryItems(completed, staleShown, todayKey);
    const dateItems = getTodayActionHistoryForDate(merged, "2026-06-26", todayKey);

    expect(dateItems).toHaveLength(1);
    expect(dateItems[0]).toMatchObject({
      title: "投递示例公司前端实习",
      status: "completed",
      resolvedAt: "2026-06-26T11:00:00.000Z",
    });
  });

  it("parses legacy removed records as shown and clears resolvedAt", () => {
    const parsed = parseTodayActionHistory(
      JSON.stringify([
        {
          id: "2026-06-26:weekly:task-project-expression",
          date: "2026-06-26",
          actionKey: "weekly:task-project-expression",
          source: "weekly",
          title: "整理一版前端项目表达",
          detail: "训练计划: 项目亮点讲清楚",
          level: "P2",
          status: "removed",
          shownAt: "2026-06-26T09:00:00.000Z",
          resolvedAt: "2026-06-29T09:00:00.000Z",
        },
      ]),
      todayKey,
    );

    expect(parsed).toEqual([
      expect.objectContaining({
        actionKey: "weekly:task-project-expression",
        status: "shown",
        resolvedAt: undefined,
      }),
    ]);
  });

  it("uses current today actions for today's visible history items", () => {
    const staleAction = makeWeeklyAction();
    const currentAction = makeAction({ title: "投递示例公司前端实习（首页当前）" });
    const created = recordTodayCreatedRecord(
      [],
      {
        recordType: "answer",
        title: "项目复盘怎么讲",
        detail: "背景 -> 动作 -> 结果",
        targetId: "answer-1",
        recordKey: "answer:answer-1",
      },
      todayKey,
      "2026-06-29T13:00:00.000Z",
      todayKey,
    );
    const history = recordShownTodayActions(created, [staleAction], todayKey, "2026-06-29T08:00:00.000Z", todayKey);
    const visibleTodayItems = getVisibleHistoryItemsForDate(history, todayKey, todayKey, [currentAction]);
    const visiblePastItems = getVisibleHistoryItemsForDate(history, "2026-06-28", todayKey, [currentAction]);

    expect(visibleTodayItems).toEqual([
      expect.objectContaining({ kind: "created", recordKey: "answer:answer-1" }),
      expect.objectContaining({ kind: "action", actionKey: "opportunity:opp-1", title: "投递示例公司前端实习（首页当前）", status: "shown" }),
    ]);
    expect(visibleTodayItems).not.toEqual(expect.arrayContaining([expect.objectContaining({ actionKey: "weekly:task-project-expression" })]));
    expect(visiblePastItems).toEqual([]);
    expect(summarizeTodayActionHistoryDate(visibleTodayItems)).toEqual({
      total: 2,
      actionTotal: 1,
      created: 1,
      completed: 0,
      dismissed: 0,
      resolved: 0,
      shown: 1,
    });
  });

  it("does not copy created records while filling action dates", () => {
    const action = makeAction();
    const shown = recordShownTodayActions([], [action], "2026-06-26", "2026-06-26T09:00:00.000Z", todayKey);
    const created = recordTodayCreatedRecord(
      shown,
      {
        recordType: "answer",
        title: "项目复盘怎么讲",
        detail: "背景 -> 动作 -> 结果",
        targetId: "answer-1",
        recordKey: "answer:answer-1",
      },
      "2026-06-26",
      "2026-06-26T13:00:00.000Z",
      todayKey,
    );
    const filled = fillMissingTodayActionHistoryDates(created, [action], "2026-06-28", "2026-06-28T09:00:00.000Z", todayKey);

    expect(getTodayActionHistoryForDate(filled, "2026-06-26", todayKey).filter(isTodayCreatedRecordHistoryItem)).toHaveLength(1);
    expect(getTodayActionHistoryForDate(filled, "2026-06-27", todayKey).filter(isTodayCreatedRecordHistoryItem)).toHaveLength(0);
    expect(getTodayActionHistoryForDate(filled, "2026-06-28", todayKey).filter(isTodayCreatedRecordHistoryItem)).toHaveLength(0);
    expect(summarizeTodayActionHistoryDate(getTodayActionHistoryForDate(filled, "2026-06-26", todayKey))).toEqual({
      total: 2,
      actionTotal: 1,
      created: 1,
      completed: 0,
      dismissed: 0,
      resolved: 0,
      shown: 1,
    });
  });

  it("keeps created records after shown, carryover, merge, and resolution writes", () => {
    const action = makeWeeklyAction({ title: "新增功能", targetId: "task-new-feature", taskId: "task-new-feature" });
    const created = recordTodayCreatedRecord(
      [],
      {
        recordType: "weekly",
        title: "新增功能",
        detail: "完成新增功能验证",
        targetId: "task-new-feature",
        recordKey: "weekly:task-new-feature",
      },
      "2026-06-26",
      "2026-06-26T08:30:00.000Z",
      todayKey,
    );
    const shown = recordShownTodayActions(created, [action], "2026-06-26", "2026-06-26T09:00:00.000Z", todayKey);
    const carried = fillMissingTodayActionHistoryDates(shown, [action], todayKey, "2026-06-29T09:00:00.000Z", todayKey);
    const completed = recordTodayActionResolution(carried, action, "completed", todayKey, "2026-06-29T10:00:00.000Z", todayKey);
    const merged = mergeTodayActionHistoryItems(created, completed, todayKey);
    const createdItems = getTodayActionHistoryForDate(merged, "2026-06-26", todayKey).filter(isTodayCreatedRecordHistoryItem);

    expect(createdItems).toHaveLength(1);
    expect(createdItems[0]).toMatchObject({
      recordType: "weekly",
      title: "新增功能",
      recordKey: "weekly:task-new-feature",
    });
  });

  it("filters future action and created history", () => {
    const state = createTodayActionHistoryCalendarState(todayKey);
    const cells = buildTodayActionHistoryMonthCells(state.visibleMonth);
    const parsed = parseTodayActionHistory(
      JSON.stringify([
        {
          kind: "created",
          id: "2026-06-26:created:answer:answer-1",
          date: "2026-06-26",
          recordKey: "answer:answer-1",
          recordType: "answer",
          recordTypeLabel: "答案卡",
          title: "项目复盘怎么讲",
          detail: "背景 -> 动作 -> 结果",
          targetId: "answer-1",
          createdAt: "2026-06-26T13:00:00.000Z",
        },
        {
          kind: "created",
          id: "2026-06-30:created:answer:answer-2",
          date: "2026-06-30",
          recordKey: "answer:answer-2",
          recordType: "answer",
          recordTypeLabel: "答案卡",
          title: "未来创建记录",
          createdAt: "2026-06-30T13:00:00.000Z",
        },
        {
          id: "2026-06-30:opportunity:opp-1",
          date: "2026-06-30",
          actionKey: "opportunity:opp-1",
          source: "opportunity",
          title: "未来行动",
          detail: "不应展示",
          level: "P1",
          status: "shown",
          shownAt: "2026-06-30T09:00:00.000Z",
        },
      ]),
      todayKey,
    );

    expect(state.selectedDate).toBe(todayKey);
    expect(cells).toHaveLength(42);
    expect(cells.some((cell) => cell.dateKey === todayKey && cell.isCurrentMonth)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ kind: "created", date: "2026-06-26", recordKey: "answer:answer-1" });
    expect(getTodayActionHistoryForDate(parsed, "2026-06-30", todayKey)).toEqual([]);
  });

  it("identifies only valid dates after today as future history dates", () => {
    expect(isFutureTodayActionHistoryDateKey("2026-06-28", todayKey)).toBe(false);
    expect(isFutureTodayActionHistoryDateKey(todayKey, todayKey)).toBe(false);
    expect(isFutureTodayActionHistoryDateKey("2026-06-30", todayKey)).toBe(true);
    expect(isFutureTodayActionHistoryDateKey("2026-07-01", todayKey)).toBe(true);
    expect(isFutureTodayActionHistoryDateKey("invalid", todayKey)).toBe(false);
  });

  it("can create resolved records even if shown was not written first", () => {
    const dismissed = recordTodayActionResolution([], makeWeeklyAction({ taskId: "task-1" }), "dismissed", "2026-06-26", "2026-06-26T12:00:00.000Z", todayKey);
    const summary = summarizeTodayActionHistoryDate(dismissed);

    expect(dismissed[0]).toMatchObject({
      status: "dismissed",
      shownAt: "2026-06-26T12:00:00.000Z",
      resolvedAt: "2026-06-26T12:00:00.000Z",
    });
    expect(summary).toEqual({ total: 1, actionTotal: 1, created: 0, completed: 0, dismissed: 1, resolved: 1, shown: 0 });
  });
});
