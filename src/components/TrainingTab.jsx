import { useMemo } from "react";
import { s } from "../styles";
import { getPeriodRange } from "../utils/period";
import { GlobalFilter, logMatchesFilter } from "./GlobalFilter";
import { PeriodSelector } from "./PeriodSelector";
import { ActivitiesTab } from "./ActivitiesTab";
import { ChartsTab } from "./ChartsTab";

/**
 * Training tab — Wilf's daily work area.
 * Contains: type filter + period + stats overview + charts + activity list.
 * All in one scrollable tab so the user sees a complete view of training state.
 */
export function TrainingTab({
  logs, setLogs,
  filter, setFilter, filterDropdown, setFilterDropdown,
  period, setPeriod, periodDropdown, setPeriodDropdown,
  setConfirmDelete,
}) {
  const filteredAllLogs = useMemo(
    () => logs.filter(l => logMatchesFilter(l, filter)),
    [logs, filter]
  );

  const periodLogs = useMemo(() => {
    const [from, to] = getPeriodRange(period);
    return filteredAllLogs.filter(l => {
      const d = new Date(l.date);
      return d >= from && d < to;
    });
  }, [filteredAllLogs, period]);

  const periodSessions = periodLogs.length;
  const periodKm = periodLogs.filter(l => l.type === "Running" || l.type === "Trail Running")
    .reduce((sum, l) => sum + (l.distance || 0), 0);
  const periodAscent = periodLogs.reduce((sum, l) => sum + (l.ascent || 0), 0);
  const hrLogs = periodLogs.filter(l => l.hr);
  const periodAvgHR = hrLogs.length > 0
    ? Math.round(hrLogs.reduce((sum, l) => sum + l.hr, 0) / hrLogs.length)
    : 0;

  return (
    <div>
      <GlobalFilter
        filter={filter}
        setFilter={setFilter}
        openDropdown={filterDropdown}
        setOpenDropdown={setFilterDropdown}
      />

      <PeriodSelector
        period={period}
        setPeriod={setPeriod}
        periodDropdown={periodDropdown}
        setPeriodDropdown={setPeriodDropdown}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Sessions", val: periodSessions, unit: "" },
          { label: "Total Distance", val: periodKm.toFixed(1), unit: "km" },
          { label: "Total Ascent", val: periodAscent.toLocaleString(), unit: "m" },
          { label: "Avg HR", val: periodAvgHR || "—", unit: periodAvgHR ? "bpm" : "" },
        ].map(c => (
          <div key={c.label} style={s.cardDark}>
            <div style={s.label}>{c.label}</div>
            <div style={s.metricVal}>
              {c.val}
              {c.unit && <span style={{ fontSize: 14, color: "#888", fontWeight: 400, marginLeft: 4 }}>{c.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div style={{ marginBottom: 28 }}>
        <ChartsTab filteredAllLogs={filteredAllLogs} />
      </div>

      {/* Activities section */}
      <ActivitiesTab
        logs={logs}
        setLogs={setLogs}
        periodLogs={periodLogs}
        setConfirmDelete={setConfirmDelete}
      />
    </div>
  );
}
