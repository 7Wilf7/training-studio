export function getPeriodRange(period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();

  if (period.type === "all") return [new Date(2000, 0, 1), new Date(2100, 0, 1)];

  if (period.type === "week") {
    const offset = period.offset || 0;
    const d = new Date(now);
    const dayOfWeek = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayOfWeek + offset * 7);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setDate(d.getDate() + 7);
    return [d, end];
  }

  if (period.type === "month") {
    const yy = period.year ?? y;
    const mm = period.month ?? m;
    return [new Date(yy, mm, 1), new Date(yy, mm + 1, 1)];
  }

  if (period.type === "year") {
    const yy = period.year ?? y;
    return [new Date(yy, 0, 1), new Date(yy + 1, 0, 1)];
  }

  return [new Date(2000, 0, 1), new Date(2100, 0, 1)];
}

export function getPeriodLabel(period) {
  const now = new Date();
  if (period.type === "all") return "All Time";
  if (period.type === "week") {
    if (period.offset === 0) return "This Week";
    if (period.offset === -1) return "Last Week";
    return `${Math.abs(period.offset)} weeks ago`;
  }
  if (period.type === "month") {
    const yy = period.year ?? now.getFullYear();
    const mm = period.month ?? now.getMonth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (yy === now.getFullYear() && mm === now.getMonth()) return "This Month";
    return `${monthNames[mm]} ${yy}`;
  }
  if (period.type === "year") {
    const yy = period.year ?? now.getFullYear();
    if (yy === now.getFullYear()) return "This Year";
    return String(yy);
  }
  return "";
}

export function pastMonths(count = 24) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return out;
}

export function pastYears(count = 6) {
  const out = [];
  const y = new Date().getFullYear();
  for (let i = 0; i < count; i++) out.push(y - i);
  return out;
}
