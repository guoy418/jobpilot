import type { WeeklyTask } from "../types";

export const GRID_PAGE_SIZE = 6;
export const WEEKLY_PRACTICE_FIRST_PAGE_TASKS = 5;
export const OPPORTUNITY_TABLE_PAGE_SIZE = 6;
export const OPPORTUNITY_BOARD_COLUMN_PAGE_SIZE = 3;

export const listPageCount = (length: number, pageSize: number) => Math.max(1, Math.ceil(length / pageSize));

export const clampListPage = (page: number, pageCount: number) => Math.min(Math.max(page, 0), Math.max(pageCount - 1, 0));

export const paginateList = <T,>(items: T[], page: number, pageSize: number) => {
  const pageCount = listPageCount(items.length, pageSize);
  const safePage = clampListPage(page, pageCount);
  return {
    pageCount,
    safePage,
    visible: items.slice(safePage * pageSize, safePage * pageSize + pageSize),
  };
};

export const paginateWeeklyGroupTasks = (tasks: WeeklyTask[], page: number, groupId: string) => {
  if (groupId === "practice") {
    const needsSecondPage = tasks.length > WEEKLY_PRACTICE_FIRST_PAGE_TASKS;
    const pageCount = needsSecondPage
      ? 1 + Math.ceil((tasks.length - WEEKLY_PRACTICE_FIRST_PAGE_TASKS) / GRID_PAGE_SIZE)
      : 1;
    const safePage = clampListPage(page, pageCount);
    if (safePage === 0) {
      return {
        pageCount,
        safePage,
        visible: tasks.slice(0, WEEKLY_PRACTICE_FIRST_PAGE_TASKS),
      };
    }
    const start = WEEKLY_PRACTICE_FIRST_PAGE_TASKS + (safePage - 1) * GRID_PAGE_SIZE;
    return {
      pageCount,
      safePage,
      visible: tasks.slice(start, start + GRID_PAGE_SIZE),
    };
  }
  return paginateList(tasks, page, GRID_PAGE_SIZE);
};
