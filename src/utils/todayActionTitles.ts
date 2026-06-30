import type { TodayAction } from "../selectors";
import { todayActionKey } from "./todayActions";

export const todayActionTitleOverridesStorageKey = "jobpilot.todayActionTitleOverrides.v1";

export type TodayActionTitleOverrides = Record<string, string>;

export const parseTodayActionTitleOverrides = (value: string | null): TodayActionTitleOverrides => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce<TodayActionTitleOverrides>((overrides, [key, title]) => {
      const trimmedKey = key.trim();
      const trimmedTitle = typeof title === "string" ? title.trim() : "";
      if (trimmedKey && trimmedTitle) overrides[trimmedKey] = trimmedTitle;
      return overrides;
    }, {});
  } catch {
    return {};
  }
};

export const setTodayActionTitleOverride = (
  overrides: TodayActionTitleOverrides,
  action: TodayAction,
  title: string,
): TodayActionTitleOverrides => {
  const actionKey = todayActionKey(action);
  const trimmedTitle = title.trim();
  if (!actionKey || !trimmedTitle) return overrides;

  const nextOverrides = { ...overrides };
  nextOverrides[actionKey] = trimmedTitle;
  return nextOverrides;
};

export const applyTodayActionTitleOverrides = (actions: TodayAction[], overrides: TodayActionTitleOverrides): TodayAction[] =>
  actions.map((action) => {
    const actionKey = todayActionKey(action);
    const title = overrides[actionKey]?.trim();
    if (!title) return action;
    return { ...action, title, actionKey };
  });
