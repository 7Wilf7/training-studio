import { useState } from "react";
import { s } from "../styles";
import { ACTIVITY_TYPES, DAILY_TAGS, RUN_GROUP_TYPES, TYPE_COLOR } from "../constants";
import { useT, useLanguage } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import { formatDuration } from "../utils/format";

// Pretty header date: "Thu, May 21 2026" / "5月21日 周四 2026"
function formatHeaderDate(yyyy_mm_dd, lang) {
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (lang === "zh") {
    const wk = ["日", "一", "二", "三", "四", "五", "六"][dt.getDay()];
    return `${y} 年 ${m} 月 ${d} 日 · 周${wk}`;
  }
  const wkEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()];
  const monEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${wkEn}, ${monEn} ${d} ${y}`;
}

function logHeadline(log) {
  if (RUN_GROUP_TYPES.includes(log.type) && log.distance > 0) {
    return `${log.distance} km${log.duration > 0 ? " · " + formatDuration(log.duration) : ""}`;
  }
  if (log.duration > 0) return formatDuration(log.duration);
  return "—";
}

export function CalendarDayModal({
  dateKey, isFuture, logs, note, onClose,
  addLog, setConfirmDelete, setDailyTags,
}) {
  const t = useT();
  const { lang } = useLanguage();
  const isMobile = useIsMobile();

  // Single open panel — keeps the modal short.
  // null | 'plan'
  const [panel, setPanel] = useState(null);

  // ── "Add planned workout" form state (future days only) ──
  const [planType, setPlanType] = useState("Road Run");
  const [planDistance, setPlanDistance] = useState("");
  const [planDurationMin, setPlanDurationMin] = useState("");

  // Day-level tags live in dailyNotes — we toggle in-place. The Save is implicit:
  // each click calls setDailyTags() which upserts immediately. UI reflects the
  // latest state via the `note` prop the parent reloads after every mutation.
  const currentTags = note ? (note.tags || []) : [];
  function toggleDayTag(tag) {
    const next = currentTags.includes(tag)
      ? currentTags.filter(x => x !== tag)
      : [...currentTags, tag];
    setDailyTags(dateKey, next).catch(() => { /* alerted by wrapper */ });
  }

  async function savePlan() {
    const distNum = parseFloat(planDistance) || 0;
    const durSec = (parseFloat(planDurationMin) || 0) * 60;
    if (distNum === 0 && durSec === 0) {
      alert(t("calendar.plan_empty_warning"));
      return;
    }
    try {
      await addLog({
        date: dateKey,
        type: planType,
        subTypes: [],
        distance: distNum,
        duration: Math.round(durSec),
        pace: 0, hr: 0, maxHR: 0,
        ascent: 0, cadence: 0, aerobicTE: 0, gap: 0,
        isPlanned: true,
        tags: [],
      }, { source: "calendar_plan" });
      setPlanType("Road Run");
      setPlanDistance("");
      setPlanDurationMin("");
      setPanel(null);
    } catch { /* alert shown by wrapper */ }
  }

  function deleteLog(logId) {
    setConfirmDelete({ type: "log", id: logId });
    onClose();
  }

  const headerDate = formatHeaderDate(dateKey, lang);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(20,20,19,0.55)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 100,
        padding: isMobile ? 0 : 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          border: "1px solid var(--rule)",
          borderRadius: isMobile ? "8px 8px 0 0" : 4,
          width: "100%", maxWidth: 520,
          maxHeight: isMobile ? "85vh" : "90vh",
          overflowY: "auto",
          padding: isMobile ? "18px 18px 22px" : "22px 26px 24px",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 6,
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: 2,
            }}>
              {isFuture ? t("calendar.day_future") : t("calendar.day_past")}
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, color: "var(--ink-1)" }}>
              {headerDate}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20,
            color: "var(--ink-3)", cursor: "pointer", padding: "4px 8px",
          }} aria-label="Close">×</button>
        </div>

        <div style={{ height: 1, background: "var(--rule)", margin: "14px 0 16px" }} />

        {/* Existing workouts on this day */}
        {logs.length > 0 ? (
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...s.label, marginBottom: 8 }}>
              {t("calendar.day_logs_title")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {logs.map(l => {
                const color = TYPE_COLOR[l.type] || "var(--ink-2)";
                return (
                  <div key={l.id} style={{
                    border: "1px solid var(--rule)",
                    borderLeft: `3px ${l.isPlanned ? "dashed" : "solid"} ${color}`,
                    padding: "10px 12px",
                    background: l.isPlanned ? "var(--bg-elevated)" : "var(--bg)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ ...s.tag(l.type), fontSize: 11 }}>
                        {t(`enum.activity.${l.type}`)}
                      </div>
                      {l.isPlanned && (
                        <div style={{
                          fontSize: 10, fontFamily: "var(--font-mono)",
                          color: "var(--ink-3)", textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}>
                          {t("calendar.planned_badge")}
                        </div>
                      )}
                      <div style={{
                        fontFamily: "var(--font-mono)", fontSize: 13,
                        color: "var(--ink-2)", fontVariantNumeric: "tabular-nums",
                      }}>
                        {logHeadline(l)}
                      </div>
                      <button onClick={() => deleteLog(l.id)}
                        style={{ ...s.btnGhost, fontSize: 11, padding: "4px 9px",
                          marginLeft: "auto", color: "var(--danger)" }}>
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{
            padding: "16px 0 18px",
            color: "var(--ink-3)", fontSize: 13, textAlign: "center",
            fontFamily: "var(--font-mono)",
          }}>
            {isFuture ? t("calendar.empty_future") : t("calendar.empty_past")}
          </div>
        )}

        {/* Day-level tags — past/today only. Toggle chips; each click upserts
            the daily_notes row immediately (no separate save step). */}
        {!isFuture && (
          <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 14, marginBottom: 14 }}>
            <div style={{ ...s.label, marginBottom: 8 }}>
              {t("calendar.day_tags_title")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAILY_TAGS.map(tag => (
                <button key={tag}
                  onClick={() => toggleDayTag(tag)}
                  style={s.chip(currentTags.includes(tag))}>
                  {t(`calendar.tag.${tag}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Future days only: add planned workout */}
        {isFuture && (
          <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}>
            {panel === "plan" ? (
              <>
                <div style={{ ...s.label, marginBottom: 8 }}>
                  {t("calendar.add_plan_title")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ ...s.muted, fontSize: 11, marginBottom: 4 }}>{t("form.type")}</div>
                    <select value={planType} onChange={e => setPlanType(e.target.value)}
                      style={{ ...s.input, padding: "6px 8px", fontSize: 13 }}>
                      {ACTIVITY_TYPES.map(at => (
                        <option key={at} value={at}>{t(`enum.activity.${at}`)}</option>
                      ))}
                    </select>
                  </div>
                  {RUN_GROUP_TYPES.includes(planType) && (
                    <div>
                      <div style={{ ...s.muted, fontSize: 11, marginBottom: 4 }}>{t("form.distance")} (km)</div>
                      <input type="number" step="0.1" min="0" value={planDistance}
                        onChange={e => setPlanDistance(e.target.value)}
                        placeholder="e.g. 8"
                        style={{ ...s.input, padding: "6px 8px", fontSize: 13 }} />
                    </div>
                  )}
                  <div>
                    <div style={{ ...s.muted, fontSize: 11, marginBottom: 4 }}>{t("form.duration")} ({t("form.minutes")})</div>
                    <input type="number" step="1" min="0" value={planDurationMin}
                      onChange={e => setPlanDurationMin(e.target.value)}
                      placeholder="e.g. 45"
                      style={{ ...s.input, padding: "6px 8px", fontSize: 13 }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={savePlan} style={{ ...s.btn, fontSize: 12, padding: "6px 14px" }}>
                    {t("calendar.save_plan")}
                  </button>
                  <button onClick={() => { setPanel(null); setPlanDistance(""); setPlanDurationMin(""); }} style={{ ...s.btnGhost, fontSize: 12, padding: "6px 14px" }}>
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => setPanel("plan")} style={s.btn}>
                {t("calendar.add_plan_button")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
