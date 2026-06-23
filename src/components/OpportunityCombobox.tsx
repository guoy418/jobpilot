import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { statusLabel } from "../domain";
import type { Opportunity } from "../types";

export function OpportunityCombobox({
  opportunities,
  value,
  onChange,
  emptyLabel,
  searchPlaceholder = "搜索公司、岗位或城市",
}: {
  opportunities: Opportunity[];
  value: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === value);
  const filteredOpportunities = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return opportunities;
    return opportunities.filter((opportunity) => {
      if (opportunity.id === value) return true;
      return `${opportunity.company} ${opportunity.title} ${opportunity.city}`.toLowerCase().includes(keyword);
    });
  }, [opportunities, search, value]);

  const chooseOpportunity = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setSearch("");
  };

  useEffect(() => {
    if (!open) return;
    const closeFromOutside = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", closeFromOutside);
    return () => document.removeEventListener("mousedown", closeFromOutside);
  }, [open]);

  return (
    <div className="opportunity-combobox" ref={rootRef}>
      <button
        type="button"
        className="opportunity-combobox-trigger"
        onClick={() => setOpen((visible) => !visible)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setSearch("");
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={selectedOpportunity ? `当前关联岗位：${selectedOpportunity.company} / ${selectedOpportunity.title}` : emptyLabel}
      >
        <span>{selectedOpportunity ? `${selectedOpportunity.company} / ${selectedOpportunity.title}` : emptyLabel}</span>
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div className="opportunity-combobox-menu" id={listboxId} role="listbox" aria-label="选择关联岗位">
          <input
            autoFocus
            value={search}
            aria-label="搜索关联岗位"
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setSearch("");
              }
            }}
            placeholder={searchPlaceholder}
          />
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={!value ? "selected-option" : ""}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chooseOpportunity("")}
          >
            {emptyLabel}
          </button>
          {filteredOpportunities.map((opportunity) => (
            <button
              type="button"
              role="option"
              aria-selected={opportunity.id === value}
              className={opportunity.id === value ? "selected-option" : ""}
              key={opportunity.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseOpportunity(opportunity.id)}
            >
              <strong>
                {opportunity.company} / {opportunity.title}
              </strong>
              <span>
                {opportunity.city} · {statusLabel[opportunity.status]}
              </span>
            </button>
          ))}
          {filteredOpportunities.length === 0 ? <p>没有匹配的岗位</p> : null}
        </div>
      ) : null}
    </div>
  );
}
