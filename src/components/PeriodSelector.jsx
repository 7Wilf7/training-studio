import { s } from "../styles";
import { getPeriodLabel, pastMonths, pastYears } from "../utils/period";
import { useT } from "../i18n/LanguageContext";

export function PeriodSelector({ period, setPeriod, periodDropdown, setPeriodDropdown }) {
  const t = useT();

  return (
    <div data-period-control style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", position: "relative" }}>
      <button onClick={() => { setPeriod({ type: "all" }); setPeriodDropdown(null); }}
        style={s.chip(period.type === "all")}>{t("period.all_time")}</button>

      <div style={{ position: "relative" }}>
        <button onClick={(e) => {
          e.stopPropagation();
          if (period.type === "week" && period.offset !== 0) { setPeriod({ type: "week", offset: 0 }); }
          else if (period.type !== "week") { setPeriod({ type: "week", offset: 0 }); }
          setPeriodDropdown(periodDropdown === "week" ? null : "week");
        }} style={{ ...s.chip(period.type === "week"), paddingRight: 8 }}>
          {period.type === "week" ? getPeriodLabel(period, t) : t("period.this_week")} <span style={{ marginLeft: 4, fontSize: 9 }}>▾</span>
        </button>
        {periodDropdown === "week" && (
          <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 6, zIndex: 100, minWidth: 140, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            {[0, -1, -2, -3, -4].map(off => (
              <button key={off} onClick={() => { setPeriod({ type: "week", offset: off }); setPeriodDropdown(null); }}
                style={{ display: "block", width: "100%", border: "none", background: period.type === "week" && period.offset === off ? "#f0f0f0" : "transparent", padding: "6px 10px", textAlign: "left", fontSize: 12, color: "#333", cursor: "pointer", borderRadius: 4 }}>
                {off === 0 ? t("period.this_week") : off === -1 ? t("period.last_week") : t("period.weeks_ago", { n: Math.abs(off) })}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button onClick={(e) => {
          e.stopPropagation();
          if (period.type !== "month" || (period.year != null)) { setPeriod({ type: "month" }); }
          setPeriodDropdown(periodDropdown === "month" ? null : "month");
        }} style={{ ...s.chip(period.type === "month"), paddingRight: 8 }}>
          {period.type === "month" ? getPeriodLabel(period, t) : t("period.this_month")} <span style={{ marginLeft: 4, fontSize: 9 }}>▾</span>
        </button>
        {periodDropdown === "month" && (
          <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 6, zIndex: 100, minWidth: 140, maxHeight: 300, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            {pastMonths(24).map((m, i) => {
              const isCurrent = i === 0;
              const isSelected = period.type === "month"
                && ((period.year == null && isCurrent) || (period.year === m.year && period.month === m.month));
              return (
                <button key={i} onClick={() => { setPeriod(isCurrent ? { type: "month" } : { type: "month", year: m.year, month: m.month }); setPeriodDropdown(null); }}
                  style={{ display: "block", width: "100%", border: "none", background: isSelected ? "#f0f0f0" : "transparent", padding: "6px 10px", textAlign: "left", fontSize: 12, color: "#333", cursor: "pointer", borderRadius: 4 }}>
                  {isCurrent ? t("period.this_month") : getPeriodLabel({ type: "month", year: m.year, month: m.month }, t)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button onClick={(e) => {
          e.stopPropagation();
          if (period.type !== "year" || (period.year != null)) { setPeriod({ type: "year" }); }
          setPeriodDropdown(periodDropdown === "year" ? null : "year");
        }} style={{ ...s.chip(period.type === "year"), paddingRight: 8 }}>
          {period.type === "year" ? getPeriodLabel(period, t) : t("period.this_year")} <span style={{ marginLeft: 4, fontSize: 9 }}>▾</span>
        </button>
        {periodDropdown === "year" && (
          <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 6, zIndex: 100, minWidth: 120, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            {pastYears(6).map((yy, i) => {
              const isCurrent = i === 0;
              const isSelected = period.type === "year"
                && ((period.year == null && isCurrent) || (period.year === yy));
              return (
                <button key={yy} onClick={() => { setPeriod(isCurrent ? { type: "year" } : { type: "year", year: yy }); setPeriodDropdown(null); }}
                  style={{ display: "block", width: "100%", border: "none", background: isSelected ? "#f0f0f0" : "transparent", padding: "6px 10px", textAlign: "left", fontSize: 12, color: "#333", cursor: "pointer", borderRadius: 4 }}>
                  {isCurrent ? t("period.this_year") : String(yy)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
