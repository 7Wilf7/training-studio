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

// Takes the i18n `t` function so labels respect the current language.
// Passing the function (not a lang code) keeps this module ignorant of the dict layout.
export function getPeriodLabel(period, t) {
  const now = new Date();
  if (period.type === "all") return t("period.all_time");
  if (period.type === "week") {
    if (period.offset === 0) return t("period.this_week");
    if (period.offset === -1) return t("period.last_week");
    return t("period.weeks_ago", { n: Math.abs(period.offset) });
  }
  if (period.type === "month") {
    const yy = period.year ?? now.getFullYear();
    const mm = period.month ?? now.getMonth();
    if (yy === now.getFullYear() && mm === now.getMonth()) return t("period.this_month");
    return t("period.month_year", { month: t(`period.month_short.${mm}`), year: yy });
  }
  if (period.type === "year") {
    const yy = period.year ?? now.getFullYear();
    if (yy === now.getFullYear()) return t("period.this_year");
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
