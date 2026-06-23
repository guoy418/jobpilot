import { ChevronLeft, ChevronRight } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { opportunityStatusFlow, resolveOpportunityAction, statusLabel } from "../domain";
import type { Opportunity, OpportunityStatus } from "../types";
import { OPPORTUNITY_BOARD_COLUMN_PAGE_SIZE, paginateList } from "../utils/pagination";
import { SectionTitle } from "./AppPrimitives";

type OpportunityVisibilityFilter = "ACTIVE" | "ENDED" | "ALL";

const activeOpportunityBoardStatuses = opportunityStatusFlow.filter((status) => status !== "ENDED");

export function BoardView({
  opportunities,
  scope,
  openOpportunity,
}: {
  opportunities: Opportunity[];
  scope: OpportunityVisibilityFilter;
  openOpportunity: (id: string) => void;
}) {
  const [columnPages, setColumnPages] = useState<Partial<Record<OpportunityStatus, number>>>({});
  const boardStatuses = useMemo<OpportunityStatus[]>(
    () =>
      scope === "ENDED"
        ? ["ENDED"]
        : scope === "ALL"
          ? [...activeOpportunityBoardStatuses, "ENDED"]
          : activeOpportunityBoardStatuses,
    [scope],
  );
  const columnStateKey = useMemo(() => opportunities.map((item) => `${item.status}:${item.id}`).join("|"), [opportunities]);

  useEffect(() => {
    setColumnPages({});
  }, [scope, columnStateKey]);

  const setColumnPage = (status: OpportunityStatus, nextPage: number) => {
    setColumnPages((current) => ({ ...current, [status]: nextPage }));
  };

  return (
    <section className="board board-embedded" style={{ "--board-column-count": Math.max(boardStatuses.length, 1) } as CSSProperties}>
      {boardStatuses.map((status) => {
        const columnOpportunities = opportunities.filter((item) => item.status === status);
        const columnPage = columnPages[status] ?? 0;
        const columnList = paginateList(columnOpportunities, columnPage, OPPORTUNITY_BOARD_COLUMN_PAGE_SIZE);
        const isEndedColumn = status === "ENDED";

        return (
          <div className={`board-column ${isEndedColumn ? "board-column-ended" : ""}`} key={status}>
            <SectionTitle label="看板分组" title={statusLabel[status]} action={`${columnOpportunities.length}`} />
            {columnList.visible.map((item) => (
              <button className={`job-card job-card-button board-job-card ${isEndedColumn ? "job-card-ended" : ""}`} key={item.id} onClick={() => openOpportunity(item.id)}>
                <span className={`priority ${resolveOpportunityAction(item).toLowerCase()}`}>{resolveOpportunityAction(item)}</span>
                <h3>{item.title}</h3>
                <p>{item.company}</p>
              </button>
            ))}
            {columnOpportunities.length === 0 && <p className="board-column-empty">暂无岗位</p>}
            {columnList.pageCount > 1 && (
              <div className="board-column-pager" aria-label={`${statusLabel[status]}分页`}>
                <button
                  type="button"
                  aria-label={`${statusLabel[status]}上一页`}
                  disabled={columnList.safePage === 0}
                  onClick={() => setColumnPage(status, Math.max(0, columnList.safePage - 1))}
                >
                  <ChevronLeft size={13} aria-hidden="true" />
                </button>
                <span>
                  {columnList.safePage + 1} / {columnList.pageCount}
                </span>
                <button
                  type="button"
                  aria-label={`${statusLabel[status]}下一页`}
                  disabled={columnList.safePage >= columnList.pageCount - 1}
                  onClick={() => setColumnPage(status, Math.min(columnList.pageCount - 1, columnList.safePage + 1))}
                >
                  <ChevronRight size={13} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
