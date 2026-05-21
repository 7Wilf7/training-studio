import { useMemo, useState } from "react";
import { s } from "../styles";
import { RUN_GROUP_TYPES, TYPE_COLOR } from "../constants";
import { useT, useLanguage } from "../i18n/LanguageContext";
import { CalendarDayModal } from "./CalendarDayModal";

// YYYY-MM-DD in LOCAL time. workouts.date is stored as 'YYYY-MM-DD' (no time
// component). Using toISOString() would shift the date by the timezone offset
// (e.g. May 21 GMT+8 → May 20 UTC) and cause off-by-one buckets — same trap
// noted in ChartsTab.weekRangeLabel.
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Mon-Sun ordering. JavaScript's getDay() returns 0=Sun..6=Sat — we shift so
// 0=Mon..6=Sun, matching the calendar layout (and ChartsTab week-buckets).
function monIdx(d) { return (d.getDay() + 6) % 7; }

// Build the grid for a given (year, month). Returns 6 rows × 7 days = 42 cells,
// padded with neighboring-month days so the layout stays rectangular regardless
// of how the month starts/ends.
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = monIdx(first);
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

const MONTH_KEYS = [
  "period.month_short.0",  "period.month_short.1",  "period.month_short.2",
  "period.month_short.3",  "period.month_short.4",  "period.month_short.5",
  "period.month_short.6",  "period.month_short.7",  "period.month_short.8",
  "period.month_short.9",  "period.month_short.10", "period.month_short.11",
];

export function CalendarTab({ logs, addLog, updateLog, setConfirmDelete, dailyNotes, setDailyTags }) {
  const t = useT();
  const { lang } = useLanguage();
  const today = new Date();
  const todayKey = dateKey(today);

  // Default view = current month. < > buttons step by ±1 month; "Today" resets.
  const [view, setViewMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view]);

  // Index workouts AND dailyNotes by date for O(1) lookup per cell. Multiple
  // workouts can share a date (morning run + evening strength); daily_notes
  // is UNIQUE per (user_id, date) so there's at most one note entry per day.
  const byDate = useMemo(() => {
    const m = new Map();
    for (const l of logs) {
      if (!l.date) continue;
      const arr = m.get(l.date) || [];
      arr.push(l);
      m.set(l.date, arr);
    }
    return m;
  }, [logs]);

  const notesByDate = useMemo(() => {
    const m = new Map();
    for (const n of dailyNotes) {
      if (n.date) m.set(n.date, n);
    }
    return m;
  }, [dailyNotes]);

  const [openDay, setOpenDay] = useState(null);

  function gotoPrev() {
    setViewMonth(v => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }
  function gotoNext() {
    setViewMonth(v => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }
  function gotoToday() {
    setViewMonth({ year: today.getFullYear(), month: today.getMonth() });
  }

  const monthLabel = t("period.month_year", {
    year: view.year,
    month: t(MONTH_KEYS[view.month]),
  });

  const WEEKDAYS = lang === "zh"
    ? ["一", "二", "三", "四", "五", "六", "日"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      {/* Month navigation bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 16, flexWrap: "wrap",
      }}>
        <button onClick={gotoPrev} style={{ ...s.btnGhost, padding: "6px 12px", fontSize: 14 }} aria-label="Previous month">‹</button>
        <div style={{
          fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 500,
          color: "var(--ink-1)", minWidth: 160, textAlign: "center",
          letterSpacing: "-0.01em",
        }}>{monthLabel}</div>
        <button onClick={gotoNext} style={{ ...s.btnGhost, padding: "6px 12px", fontSize: 14 }} aria-label="Next month">›</button>
        <button onClick={gotoToday} style={{ ...s.btnGhost, padding: "6px 12px", fontSize: 12, marginLeft: 4 }}>
          {t("calendar.today")}
        </button>
        <div style={{ marginLeft: "auto", ...s.muted, fontSize: 12 }}>
          {t("calendar.legend_hint")}
        </div>
      </div>

      {/* Weekday header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 0,
        marginBottom: 0,
        borderBottom: "1px solid var(--rule)",
      }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            fontFamily: "var(--font-mono)", fontSize: 12,
            color: i >= 5 ? "var(--ink-3)" : "var(--ink-2)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            padding: "10px 12px", textAlign: "left",
            borderRight: i < 6 ? "1px solid var(--rule)" : "none",
          }}>{w}</div>
        ))}
      </div>

      {/* The 6 × 7 grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 0,
        border: "1px solid var(--rule)",
        borderTop: "none",
        background: "var(--bg)",
      }}>
        {cells.map((d, i) => {
          const key = dateKey(d);
          const inMonth = d.getMonth() === view.month;
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const isWeekend = monIdx(d) >= 5;
          const dayLogs = byDate.get(key) || [];
          const dayNote = notesByDate.get(key) || null;

          return (
            <DayCell
              key={key + "-" + i}
              date={d}
              inMonth={inMonth}
              isToday={isToday}
              isFuture={isFuture}
              isWeekend={isWeekend}
              logs={dayLogs}
              note={dayNote}
              colIdx={i % 7}
              rowIdx={Math.floor(i / 7)}
              onClick={() => setOpenDay({ dateKey: key, isFuture })}
              t={t}
            />
          );
        })}
      </div>

      {openDay && (
        <CalendarDayModal
          dateKey={openDay.dateKey}
          isFuture={openDay.isFuture}
          logs={byDate.get(openDay.dateKey) || []}
          note={notesByDate.get(openDay.dateKey) || null}
          onClose={() => setOpenDay(null)}
          addLog={addLog}
          updateLog={updateLog}
          setConfirmDelete={setConfirmDelete}
          setDailyTags={setDailyTags}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Single day cell.
//   - Workouts render as multi-line pills: "Road Run" on top, then "12.5km
//     · +320m" beneath (when distance / ascent exist).
//   - Strength / HIIT just show the type label (no metrics line).
//   - Planned rows (is_planned=true) use a dashed left border, muted text.
//   - dailyNotes.tags (currently just 'massage') render as a chip in the
//     bottom-right corner — independent from workouts.
//   - Empty + past/today → "Rest" placeholder; empty + future → "+ plan" hint
// ─────────────────────────────────────────────────────────────────────────
function DayCell({ date, inMonth, isToday, isFuture, isWeekend, logs, note, colIdx, rowIdx, onClick, t }) {
  const dayTags = note ? (note.tags || []) : [];
  const hasContent = logs.length > 0;

  const cellBg = isToday
    ? "var(--moss-bg)"
    : !inMonth
      ? "var(--bg-elevated)"
      : "var(--bg)";

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        minHeight: 132,
        padding: "10px 12px 12px",
        borderRight: colIdx < 6 ? "1px solid var(--rule)" : "none",
        borderBottom: rowIdx < 5 ? "1px solid var(--rule)" : "none",
        background: cellBg,
        cursor: "pointer",
        opacity: inMonth ? 1 : 0.45,
        transition: "background 120ms",
        overflow: "hidden",
      }}
    >
      {/* Day number */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: isToday ? 16 : 15,
          fontWeight: isToday ? 600 : 500,
          color: isToday ? "var(--ink-1)"
                : isWeekend ? "var(--ink-3)"
                : "var(--ink-2)",
          fontVariantNumeric: "tabular-nums",
          padding: isToday ? "1px 7px" : "0",
          border: isToday ? "1px solid var(--ink-1)" : "none",
          borderRadius: isToday ? 3 : 0,
          lineHeight: 1,
        }}>{date.getDate()}</span>
      </div>

      {/* Workouts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {logs.map(l => <LogPill key={l.id} log={l} t={t} />)}
      </div>

      {/* Rest placeholder — past/today + no activity at all */}
      {!hasContent && !isFuture && inMonth && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 12,
          color: "var(--ink-3)", marginTop: 4, letterSpacing: "0.04em",
        }}>{t("calendar.rest")}</div>
      )}

      {!hasContent && isFuture && inMonth && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 12,
          color: "var(--ink-3)", marginTop: 4, letterSpacing: "0.04em",
          opacity: 0.55,
        }}>{t("calendar.add_plan_hint")}</div>
      )}

      {/* Day-level tags (massage). Pinned to the bottom-right corner so
          they read as metadata on the day, not as an additional workout. */}
      {dayTags.length > 0 && (
        <div style={{
          position: "absolute", bottom: 7, right: 9,
          display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end",
          maxWidth: "75%",
        }}>
          {dayTags.map(tag => (
            <span key={tag} style={{
              fontSize: 11, fontFamily: "var(--font-mono)",
              padding: "2px 7px", borderRadius: 9,
              background: "var(--moss-bg)", color: "var(--moss-deep)",
              border: "1px solid var(--moss)", lineHeight: 1.3,
            }} title={t(`calendar.tag.${tag}`)}>
              {t(`calendar.tag.${tag}`)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// One activity row inside a day cell. Two-line layout: type label on top,
// metrics line beneath (only rendered when there's something useful to show).
function LogPill({ log, t }) {
  const isRun = RUN_GROUP_TYPES.includes(log.type);
  const isPlanned = log.isPlanned;
  const color = TYPE_COLOR[log.type] || "#57564f";

  // Metrics line: distance + ascent for runs; nothing for Strength/HIIT (the
  // type label alone is the headline since they don't carry km).
  const metrics = [];
  if (isRun && log.distance > 0) metrics.push(`${log.distance} km`);
  if (isRun && log.ascent > 0)   metrics.push(`+${log.ascent} m`);

  return (
    <div style={{
      fontSize: 11.5, lineHeight: 1.3,
      padding: "3px 6px 4px 7px",
      borderLeft: `2px ${isPlanned ? "dashed" : "solid"} ${color}`,
      background: isPlanned ? "transparent" : "rgba(0,0,0,0.02)",
      borderRadius: 2,
      overflow: "hidden",
    }}>
      {/* Line 1: type name (full label, color-coded) */}
      <div style={{
        fontWeight: 600,
        color: color,
        fontSize: 12,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        opacity: isPlanned ? 0.75 : 1,
      }}>
        {t(`enum.activity.${log.type}`)}
      </div>
      {/* Line 2: metrics (only when present) */}
      {metrics.length > 0 && (
        <div style={{
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          color: isPlanned ? "var(--ink-3)" : "var(--ink-1)",
          fontSize: 11,
          marginTop: 1,
        }}>
          {metrics.join(" · ")}
        </div>
      )}
    </div>
  );
}
