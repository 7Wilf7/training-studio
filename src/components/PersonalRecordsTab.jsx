import { useMemo, useState } from "react";
import { s } from "../styles";
import { RACE_CATEGORIES, RACE_CATEGORY_COLOR } from "../constants";
import { useT } from "../i18n/LanguageContext";

function resultSeconds(r) {
  const h = parseInt(r.resultH) || 0;
  const m = parseInt(r.resultM) || 0;
  const sec = parseInt(r.resultS) || 0;
  const total = h * 3600 + m * 60 + sec;
  return total > 0 ? total : Infinity;
}

function formatHMS(sec) {
  if (!isFinite(sec)) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = Math.round(sec % 60);
  return `${String(h).padStart(1, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function PersonalRecordsTab({ races, itraPI, setItraPI }) {
  const t = useT();
  const [itraDraft, setItraDraft] = useState(itraPI ?? "");

  const records = useMemo(() => {
    const history = races.filter(r => !r.isTarget);
    const byCategory = {};
    for (const r of history) {
      const cat = r.category || "Uncategorized";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(r);
    }
    const out = [];
    const allCats = [...RACE_CATEGORIES, "Uncategorized"];
    for (const cat of allCats) {
      const group = byCategory[cat];
      if (!group || group.length === 0) continue;
      const sorted = [...group].sort((a, b) => resultSeconds(a) - resultSeconds(b));
      const best = sorted[0];
      const bestSec = resultSeconds(best);
      out.push({
        category: cat,
        best: isFinite(bestSec) ? best : null,
        bestSeconds: bestSec,
        all: sorted,
      });
    }
    return out;
  }, [races]);

  function saveItra() {
    setItraPI(itraDraft.trim());
  }

  return (
    <div>
      <div style={s.section}>{t("pr.title")}</div>

      {records.length === 0 ? (
        <div style={{ ...s.cardDark, textAlign: "center", color: "#888", padding: "30px 16px", fontSize: 13 }}>
          {t("pr.empty")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 22 }}>
          {records.map(rec => (
            <div key={rec.category} style={{
              ...s.card,
              borderLeft: `4px solid ${RACE_CATEGORY_COLOR[rec.category] || "#ccc"}`,
            }}>
              <div style={{ ...s.label, marginBottom: 2 }}>{t(`enum.race_cat.${rec.category}`)}</div>
              {rec.best ? (
                <>
                  <div style={{ ...s.metricVal, fontSize: 24 }}>
                    {formatHMS(rec.bestSeconds)}
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 6, lineHeight: 1.4 }}>
                    {rec.best.name}<br />
                    <span style={{ ...s.muted }}>{rec.best.date}</span>
                  </div>
                </>
              ) : (
                <div style={{ ...s.muted, marginTop: 2 }}>{t("pr.no_times", { n: rec.all.length })}</div>
              )}
              {rec.all.length > 1 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ ...s.muted, cursor: "pointer", fontSize: 11 }}>
                    {t("pr.other_finishes", { n: rec.all.length - 1, plural: rec.all.length > 2 ? "es" : "" })}
                  </summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                    {rec.all.slice(1).map(r => (
                      <div key={r.id} style={{ fontSize: 11, color: "#666" }}>
                        {formatHMS(resultSeconds(r))} · {r.name} · <span style={s.muted}>{r.date}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ ...s.cardDark, marginBottom: 14 }}>
        <div style={s.section}>{t("pr.itra_title")}</div>
        <div style={{ ...s.muted, marginBottom: 8, lineHeight: 1.6 }}>{t("pr.itra_desc")}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            placeholder={t("pr.itra_placeholder")}
            value={itraDraft}
            onChange={e => setItraDraft(e.target.value)}
            style={{ ...s.input, maxWidth: 120 }}
          />
          <button onClick={saveItra}
            disabled={itraDraft === (itraPI ?? "")}
            style={{ ...s.btn, opacity: itraDraft === (itraPI ?? "") ? 0.5 : 1 }}>{t("common.save")}</button>
          {itraPI && (
            <span style={{ ...s.muted, fontFamily: "var(--font-mono)" }}>{t("pr.itra_saved", { v: itraPI })}</span>
          )}
        </div>
      </div>
    </div>
  );
}
