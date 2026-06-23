import { useEffect, useState } from "react";
import type { TodayAction } from "../selectors";
import { localDateKey as todayDateKey } from "../utils/date";
import { todayActionKey } from "../utils/todayActions";

const dismissedTodayStorageKey = "jobpilot.dismissedToday.v1";

const loadDismissedTodayIds = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(dismissedTodayStorageKey) ?? "{}") as { date?: string; ids?: string[] };
    return saved.date === todayDateKey() && Array.isArray(saved.ids) ? new Set(saved.ids) : new Set<string>();
  } catch {
    return new Set<string>();
  }
};

export function useDismissedTodayActions() {
  const [dismissedTodayIds, setDismissedTodayIds] = useState<Set<string>>(() => loadDismissedTodayIds());

  useEffect(() => {
    window.localStorage.setItem(dismissedTodayStorageKey, JSON.stringify({ date: todayDateKey(), ids: [...dismissedTodayIds] }));
  }, [dismissedTodayIds]);

  const dismissTodayAction = (action: TodayAction) => {
    setDismissedTodayIds((ids) => new Set(ids).add(todayActionKey(action)));
  };

  const isTodayActionDismissed = (action: TodayAction) => dismissedTodayIds.has(todayActionKey(action));

  return {
    dismissTodayAction,
    isTodayActionDismissed,
  };
}
