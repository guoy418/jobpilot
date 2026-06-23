import { CalendarClock } from "lucide-react";
import { useRef } from "react";
import { formatDueDateDisplay } from "../utils/date";

const openNativeDatePicker = (input: HTMLInputElement | null) => {
  if (!input) return;
  input.focus();
  try {
    input.showPicker?.();
  } catch {
    // showPicker requires a direct user gesture in some browsers; focus keeps the field usable.
  }
};

export function DatePickerInput({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayValue = formatDueDateDisplay(value);

  return (
    <div className="date-picker-control">
      <input
        id={id}
        type="text"
        readOnly
        value={displayValue}
        placeholder="选择日期"
        aria-label={label}
        onClick={() => openNativeDatePicker(inputRef.current)}
      />
      <input
        ref={inputRef}
        className="date-picker-native"
        type="date"
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="date-picker-button"
        aria-label={`打开${label}选择器`}
        onClick={() => openNativeDatePicker(inputRef.current)}
      >
        <CalendarClock size={16} />
      </button>
    </div>
  );
}
