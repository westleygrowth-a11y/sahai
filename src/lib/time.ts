export const TIMEZONE = "Asia/Karachi";
export function localParts(date: Date, timezone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")) };
}
export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-PK", { timeZone: TIMEZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}
export function startOfWeek(now: Date) {
  const { day, weekday } = localParts(now);
  const midnight = new Date(`${day}T00:00:00+05:00`);
  midnight.setUTCDate(midnight.getUTCDate() - (weekday + 6) % 7);
  return midnight;
}
