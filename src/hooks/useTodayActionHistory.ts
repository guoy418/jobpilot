import { useEffect, useMemo, useState } from "react";
import type { TodayAction } from "../selectors";
import type { TodayActionHistoryItem, TodayActionHistoryStatus, TodayCreatedRecordInput } from "../types";
import { localDateKey } from "../utils/date";
import {
  fillMissingTodayActionHistoryDates,
  mergeTodayActionHistoryItems,
  parseTodayActionHistory,
  pruneMissingTodayShownActionHistoryItems,
  recordShownTodayActions,
  recordTodayActionResolution,
  recordTodayCreatedRecord,
  todayActionHistoryStorageKey,
} from "../utils/todayActionHistory";
import { todayActionKey } from "../utils/todayActions";

const readHistory = () => {
  if (typeof window === "undefined") return [];
  return parseTodayActionHistory(window.localStorage.getItem(todayActionHistoryStorageKey));
};

const writeHistory = (items: TodayActionHistoryItem[]) => {
  if (typeof window === "undefined") return;
  const storedItems = readHistory();
  const mergedItems = pruneMissingTodayShownActionHistoryItems(mergeTodayActionHistoryItems(storedItems, items), items);
  window.localStorage.setItem(todayActionHistoryStorageKey, JSON.stringify(mergedItems));
};

const clampHistoryDateToToday = (dateKey: string) => {
  const todayDateKey = localDateKey();
  return dateKey <= todayDateKey ? dateKey : todayDateKey;
};

export function useTodayActionHistory(actions: TodayAction[]) {
  const [historyItems, setHistoryItems] = useState<TodayActionHistoryItem[]>(readHistory);
  const [currentDateKey, setCurrentDateKey] = useState(() => localDateKey());
  const todayActionSignature = useMemo(
    () =>
      actions
        .map((action) =>
          [
            todayActionKey(action),
            action.source,
            action.sourceLabel,
            action.title,
            action.detail,
            action.level,
            action.targetId,
            action.taskId,
          ].join("|"),
        )
        .join("\n"),
    [actions],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshCurrentDateKey = () => {
      setCurrentDateKey((dateKey) => {
        const nextDateKey = localDateKey();
        return nextDateKey === dateKey ? dateKey : nextDateKey;
      });
    };
    const intervalId = window.setInterval(refreshCurrentDateKey, 60 * 1000);

    window.addEventListener("focus", refreshCurrentDateKey);
    document.addEventListener("visibilitychange", refreshCurrentDateKey);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshCurrentDateKey);
      document.removeEventListener("visibilitychange", refreshCurrentDateKey);
    };
  }, []);

  useEffect(() => {
    const timestamp = new Date().toISOString();
    setHistoryItems((items) => {
      const safeDateKey = clampHistoryDateToToday(currentDateKey);
      const latestItems = mergeTodayActionHistoryItems(readHistory(), items);
      const carriedHistory = fillMissingTodayActionHistoryDates(latestItems, actions, safeDateKey, timestamp);
      return recordShownTodayActions(carriedHistory, actions, safeDateKey, timestamp);
    });
  }, [currentDateKey, todayActionSignature]);

  useEffect(() => {
    try {
      writeHistory(historyItems);
    } catch {
      // History is helpful context, but should never block the daily workflow.
    }
  }, [historyItems]);

  const recordResolved = (action: TodayAction, status: Exclude<TodayActionHistoryStatus, "shown">) => {
    const timestamp = new Date().toISOString();
    setHistoryItems((items) =>
      recordTodayActionResolution(mergeTodayActionHistoryItems(readHistory(), items), action, status, clampHistoryDateToToday(currentDateKey), timestamp),
    );
  };

  const recordCreated = (record: TodayCreatedRecordInput) => {
    const timestamp = new Date().toISOString();
    setHistoryItems((items) => recordTodayCreatedRecord(mergeTodayActionHistoryItems(readHistory(), items), record, clampHistoryDateToToday(currentDateKey), timestamp));
  };

  return {
    historyItems,
    recordCompletedTodayAction: (action: TodayAction) => recordResolved(action, "completed"),
    recordDismissedTodayAction: (action: TodayAction) => recordResolved(action, "dismissed"),
    recordCreatedTodayRecord: recordCreated,
    recordResolvedTodayAction: recordResolved,
  };
}
