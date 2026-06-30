import { describe, expect, it } from "vitest";

import type { TodayAction } from "../selectors";
import { todayActionKey } from "./todayActions";
import { applyTodayActionTitleOverrides, parseTodayActionTitleOverrides, setTodayActionTitleOverride } from "./todayActionTitles";

const makeAction = (patch: Partial<TodayAction> = {}): TodayAction => ({
  level: "P1",
  title: "投递示例公司前端实习",
  detail: "整理材料",
  page: "opportunityDetail",
  filter: "P1",
  source: "opportunity",
  targetId: "opp-1",
  ...patch,
});

describe("today action title overrides", () => {
  it("parses only non-empty string overrides", () => {
    expect(
      parseTodayActionTitleOverrides(
        JSON.stringify({
          "opportunity:opp-1": "  自定义投递标题  ",
          "interview:int-1": "",
          "weekly:task-1": 42,
        }),
      ),
    ).toEqual({
      "opportunity:opp-1": "自定义投递标题",
    });
    expect(parseTodayActionTitleOverrides("not json")).toEqual({});
  });

  it("applies overrides by today action key", () => {
    const action = makeAction();
    const overrides = setTodayActionTitleOverride({}, action, "  今天先投这家公司  ");
    const [titledAction] = applyTodayActionTitleOverrides([action], overrides);

    expect(titledAction.title).toBe("今天先投这家公司");
    expect(todayActionKey(titledAction)).toBe("opportunity:opp-1");
  });

  it("keeps fallback title keys stable after applying an override", () => {
    const fallbackAction = makeAction({
      title: "临时行动",
      page: "weekly",
      filter: "",
      source: "weekly",
      targetId: undefined,
      taskId: undefined,
    });
    const originalKey = todayActionKey(fallbackAction);
    const overrides = setTodayActionTitleOverride({}, fallbackAction, "改名后的临时行动");
    const [titledAction] = applyTodayActionTitleOverrides([fallbackAction], overrides);

    expect(originalKey).toBe("weekly:临时行动");
    expect(titledAction.title).toBe("改名后的临时行动");
    expect(todayActionKey(titledAction)).toBe(originalKey);
  });
});
