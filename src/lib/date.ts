export function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameDate(value: string | null, offsetDays: number) {
  if (!value) return false;
  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + offsetDays);

  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime() === target.getTime();
}

export function formatDateJa(value: string | null) {
  if (!value) return "期限なし";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "期限なし";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short"
  }).format(date);
}
