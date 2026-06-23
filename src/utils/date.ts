export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDueDateDisplay = (value?: string | null) => {
  const text = value?.trim();
  if (!text) return "";

  const datePart = text.split("T")[0];
  const dateKeyMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(datePart);
  if (dateKeyMatch) {
    return `${dateKeyMatch[1]}-${dateKeyMatch[2].padStart(2, "0")}-${dateKeyMatch[3].padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return localDateKey(parsed);

  return text;
};
