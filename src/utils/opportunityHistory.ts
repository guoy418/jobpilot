import type { TimelineEvent } from "../types";

export const historyTimelinePlaceholder = "10.1 投递岗位\n10.5 一面\n10.8 跟进 HR";

const isTimelineOccurredAtPrefix = (value = "") => /^(\d{1,4}[./-]\d{1,2}(?:[./-]\d{1,2})?|\d{1,2}月\d{1,2}(?:日|号)?|Next)$/i.test(value);

export const formatOpportunityHistory = (timeline: TimelineEvent[] = []) =>
  timeline
    .filter((event) => event.status === "done")
    .map((event) => [event.occurredAt && event.occurredAt !== "历史" ? event.occurredAt : "", event.title, event.detail ? `- ${event.detail}` : ""].filter(Boolean).join(" "))
    .join("\n");

export const parseOpportunityHistory = (value: string, existingTimeline: TimelineEvent[] = []) => {
  const existingDone = existingTimeline.filter((event) => event.status === "done");
  const doneEvents: TimelineEvent[] = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^(\S+)\s+(.+)$/);
      const hasOccurredAtPrefix = Boolean(match && isTimelineOccurredAtPrefix(match[1]));
      const body = match ? match[2].trim() : line;
      const [title, ...detailParts] = (hasOccurredAtPrefix ? body : line).split(/\s+-\s+/);
      return {
        id: existingDone[index]?.id ?? `TL-HISTORY-${Date.now()}-${index}`,
        occurredAt: hasOccurredAtPrefix ? match![1] : "",
        title: title.trim(),
        detail: detailParts.join(" - ").trim(),
        status: "done" as const,
      };
    });
  return [...doneEvents, ...existingTimeline.filter((event) => event.status === "next")];
};
