import { useMemo, useState } from "react";
import { s } from "../styles";
import { RACE_CATEGORIES, RACE_CATEGORY_COLOR } from "../constants";

// Sum H:M:S into seconds for comparison; treat all-empty as Infinity (no result)
function resultSeconds(r) {
  const h = parseInt(r.resultH) || 0;
  const m = parseInt(r.resultM) || 0;
  const s = parseInt(r.resultS) || 0;
  const total = h * 3600 + m * 60 + s;
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
  const [itraDraft, setItraDraft] = useState(itraPI ?? "");

  // Group history races by category, find best result per category
  const records = useMemo(() => {
    const history = races.filter(r => !r.isTarget);
    const byCategory = {};
    for (const r of history) {
      const cat = r.category || "Uncategorized";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(r);
    }
    // For each category, sort by result asc and keep the best
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
      <div style={s.section}>Personal Records</div>

      {/* PR cards by category */}
      {records.length === 0 ? (
        <div style={{ ...s.cardDark, textAlign: "center", color: "#888", padding: "30px 16px", fontSize: 13 }}>
          No race history yet. Add finished races on the <strong>Races</strong> tab to see your PBs here.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 22 }}>
          {records.map(rec => (
            <div key={rec.category} style={{
              ...s.card,
              borderLeft: `4px solid ${RACE_CATEGORY_COLOR[rec.category] || "#ccc"}`,
            }}>
              <div style={{ ...s.label, marginBottom: 2 }}>{rec.category}</div>
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
                <div style={{ ...s.muted, marginTop: 2 }}>{rec.all.length} race(s), no times recorded</div>
              )}
              {rec.all.length > 1 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ ...s.muted, cursor: "pointer", fontSize: 11 }}>
                    {rec.all.length - 1} other finish{rec.all.length > 2 ? "es" : ""}
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

      {/* ITRA Performance Index */}
      <div style={{ ...s.cardDark, marginBottom: 14 }}>
        <div style={s.section}>ITRA Performance Index</div>
        <div style={{ ...s.muted, marginBottom: 8, lineHeight: 1.6 }}>
          Your global ITRA Performance Index (跑步指数). Enter manually for now. Future: pull from itra.run automatically.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            placeholder="e.g. 580"
            value={itraDraft}
            onChange={e => setItraDraft(e.target.value)}
            style={{ ...s.input, maxWidth: 120 }}
          />
          <button onClick={saveItra}
            disabled={itraDraft === (itraPI ?? "")}
            style={{ ...s.btn, opacity: itraDraft === (itraPI ?? "") ? 0.5 : 1 }}>Save</button>
          {itraPI && (
            <span style={{ ...s.muted, fontFamily: "var(--font-mono)" }}>Saved: {itraPI}</span>
          )}
        </div>
      </div>
    </div>
  );
}
