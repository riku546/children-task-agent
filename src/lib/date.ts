export function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
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
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short"
  }).format(new Date(value));
}
