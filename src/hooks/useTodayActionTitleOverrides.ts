import { useEffect, useState } from "react";
import type { TodayAction } from "../selectors";
import {
  parseTodayActionTitleOverrides,
  setTodayActionTitleOverride,
  todayActionTitleOverridesStorageKey,
  type TodayActionTitleOverrides,
} from "../utils/todayActionTitles";

const loadTodayActionTitleOverrides = (): TodayActionTitleOverrides => {
  if (typeof window === "undefined") return {};
  return parseTodayActionTitleOverrides(window.localStorage.getItem(todayActionTitleOverridesStorageKey));
};

export function useTodayActionTitleOverrides() {
  const [titleOverrides, setTitleOverrides] = useState<TodayActionTitleOverrides>(loadTodayActionTitleOverrides);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(todayActionTitleOverridesStorageKey, JSON.stringify(titleOverrides));
  }, [titleOverrides]);

  const saveTodayActionTitleOverride = (action: TodayAction, title: string) => {
    setTitleOverrides((overrides) => setTodayActionTitleOverride(overrides, action, title));
  };

  return {
    titleOverrides,
    saveTodayActionTitleOverride,
  };
}
