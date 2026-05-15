import { useState, useEffect } from "react";
import { s } from "../styles";
import { RACE_PRIORITY, RACE_CATEGORIES, RACE_CATEGORY_COLOR } from "../constants";
import { inferRaceCategory } from "../utils/migrate";

const EMPTY_RACE = (isTarget) => ({
  isTarget, priority: "A", name: "", date: "",
  distance: "", category: "", ascent: "", resultH: "", resultM: "", resultS: "",
  itraScore: "", isTrailDetected: null,
});

export function RacesTab({ races, setRaces, now, setConfirmDelete, apiKey, apiEndpoint, apiModel }) {
  const [showRaceAdd, setShowRaceAdd] = useState(false);
  const [raceMode, setRaceMode] = useState("target");
  const [newRace, setNewRace] = useState(EMPTY_RACE(true));
  const [raceLookupMsg, setRaceLookupMsg] = useState("");
  const [raceLookupLoading, setRaceLookupLoading] = useState(false);
  const [raceCategoryModal, setRaceCategoryModal] = useState(null);
  const [pastRaceWarning, setPastRaceWarning] = useState(null);

  useEffect(() => {
    setShowRaceAdd(false);
    setRaceLookupMsg("");
    setRaceCategoryModal(null);
    setPastRaceWarning(null);
    setNewRace(EMPTY_RACE(raceMode === "target"));
  }, [raceMode]);

  function deleteRace(id) {
    setConfirmDelete({ type: "race", id });
  }

  function updateRaceCategory(id, category) {
    setRaces(races.map(r => r.id === id ? { ...r, category } : r));
  }

  // True when we're hitting Anthropic's official API and can safely use
  // the server-side web_search tool. Third-party relays (DeepSeek etc.)
  // don't support that tool, so we fall back to AI-knowledge-only mode.
  const canUseWebSearch = apiEndpoint && apiEndpoint.startsWith("https://api.anthropic.com");

  async function lookupRaceWithCategories(input) {
    if (!apiKey) {
      setRaceLookupMsg("No API key set. Click the 🔑 API button (top-right) first.");
      setTimeout(() => setRaceLookupMsg(""), 6000);
      return;
    }
    setRaceLookupLoading(true);
    setRaceLookupMsg(canUseWebSearch ? "Searching the web…" : "Looking up from AI knowledge…");
    try {
      const currentDate = now.toISOString().slice(0, 10);
      const searchHint = raceMode === "target"
        ? `The user is adding a FUTURE target race. Today is ${currentDate}. Prefer the NEXT upcoming edition if you know its date; otherwise omit the date and let the user fill it in.`
        : `The user is adding a HISTORICAL race result. Today is ${currentDate}. The edition is in the past.`;

      // Build prompt based on whether we have live web search or rely on the model's knowledge
      const promptInstructions = canUseWebSearch
        ? `Search the web and return ONE LINE of JSON:`
        : `IMPORTANT: You do NOT have web access. Answer based ONLY on your training knowledge. NEVER invent specific dates — if you don't know the exact date for the requested edition, return an empty "date" field. It's fine to return category structure (distances, typical ascent) based on past editions you know.`;

      const requestBody = {
        model: apiModel,
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Today's date is ${currentDate}. The user entered race name: "${input}".

${searchHint}

${promptInstructions}

Return one JSON object:
{"baseName": "Official base name without year", "year": "YYYY", "isTrail": true/false, "raceFamily": "<one of: Half Marathon | Marathon | 10K | Trail | Spartan | Hyrox | Other>", "categories": [{"name": "Category", "distance": "Distance with km/miles", "category": "<one of the raceFamily values>", "ascent": "Number only or empty", "date": "YYYY-MM-DD or empty"}]}

- raceFamily = overall classification of the race event.
- For each category, same raceFamily applies (e.g. UTMB has Trail family, CCC/OCC/UTMB-main are all Trail).
- isTrail: true if it's off-road/mountain.
- For trail races: list all distance categories with typical ascent.
- For road races: list distance options, ascent empty.
- If you don't recognize this race at all: {"baseName": "${input}", "year": "", "isTrail": false, "raceFamily": "Other", "categories": []}
JSON ONLY, no explanation around it.`,
        }],
      };

      // Only attach the server-side web_search tool when hitting Anthropic-official —
      // third-party relays will 400 if they receive an unknown tool block
      if (canUseWebSearch) {
        requestBody.tools = [{ type: "web_search_20250305", name: "web_search" }];
      }

      const resp = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(requestBody),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        const msg = data.error?.message || `HTTP ${resp.status}`;
        setRaceLookupMsg(`API error: ${msg}`);
        setTimeout(() => setRaceLookupMsg(""), 6000);
        setRaceLookupLoading(false);
        return;
      }
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const family = RACE_CATEGORIES.includes(parsed.raceFamily) ? parsed.raceFamily : "";
        setNewRace(prev => ({ ...prev, isTrailDetected: parsed.isTrail, category: family || prev.category }));
        if (parsed.categories && parsed.categories.length > 0) {
          setRaceCategoryModal(parsed);
          setRaceLookupMsg(canUseWebSearch
            ? `✓ Found ${parsed.categories.length} category(s) via web search.`
            : `✓ ${parsed.categories.length} category(s) from AI knowledge — verify date manually.`);
        } else {
          setNewRace(prev => ({
            ...prev,
            name: parsed.baseName ? `${parsed.year} ${parsed.baseName}`.trim() : input,
            isTrailDetected: parsed.isTrail,
            category: family || prev.category,
          }));
          setRaceLookupMsg(canUseWebSearch
            ? "✓ Name updated (no categories found)."
            : "✓ Name updated from AI knowledge. Verify details manually.");
          setTimeout(() => setRaceLookupMsg(""), 5000);
        }
      } else {
        setRaceLookupMsg("Could not parse response. Fill the form manually.");
        setTimeout(() => setRaceLookupMsg(""), 4000);
      }
    } catch (err) {
      console.error("[Race Lookup] Network error fetching", apiEndpoint, err);
      setRaceLookupMsg(`Search failed: ${err.message}`);
      setTimeout(() => setRaceLookupMsg(""), 5000);
    }
    setRaceLookupLoading(false);
  }

  function selectRaceCategory(cat) {
    const category = RACE_CATEGORIES.includes(cat.category)
      ? cat.category
      : (RACE_CATEGORIES.includes(raceCategoryModal.raceFamily) ? raceCategoryModal.raceFamily : "");
    setNewRace(prev => ({
      ...prev,
      name: `${raceCategoryModal.year} ${raceCategoryModal.baseName} - ${cat.name}`,
      distance: cat.distance,
      ascent: cat.ascent || "",
      date: cat.date || prev.date,
      category: category || prev.category,
      isTrailDetected: raceCategoryModal.isTrail,
    }));
    setRaceCategoryModal(null);
    setRaceLookupMsg("✓ Filled from official source.");
    setTimeout(() => setRaceLookupMsg(""), 4000);
  }

  function tryAddRace() {
    if (!newRace.name || !newRace.date) return;
    if (newRace.isTarget && new Date(newRace.date) < new Date(now.toISOString().slice(0, 10))) {
      setPastRaceWarning(true);
      return;
    }
    commitRace(newRace.isTarget);
  }

  function commitRace(asTarget) {
    // If user hasn't picked a category, try inferring one last time from name+distance
    const finalCategory = newRace.category || inferRaceCategory(newRace) || "";
    setRaces([
      { id: Date.now(), ...newRace, category: finalCategory, isTarget: asTarget, priority: asTarget ? newRace.priority : null },
      ...races,
    ]);
    setNewRace(EMPTY_RACE(raceMode === "target"));
    setShowRaceAdd(false);
    setRaceLookupMsg("");
    setPastRaceWarning(null);
  }

  const targetRacesList = races.filter(r => r.isTarget);
  const historyRacesList = races.filter(r => !r.isTarget);

  function renderCategoryTag(cat) {
    if (!cat) return null;
    return (
      <span style={{
        fontSize: 11, padding: "2px 8px", borderRadius: 10,
        background: RACE_CATEGORY_COLOR[cat] || "#f0f0f0",
        color: "#333", fontWeight: 500, whiteSpace: "nowrap",
      }}>{cat}</span>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button onClick={() => setRaceMode("target")} style={s.chip(raceMode === "target")}>Target Races ({targetRacesList.length})</button>
        <button onClick={() => setRaceMode("history")} style={s.chip(raceMode === "history")}>History ({historyRacesList.length})</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <button onClick={() => {
          setNewRace(EMPTY_RACE(raceMode === "target"));
          setShowRaceAdd(!showRaceAdd);
        }} style={s.btn}>+ Add {raceMode === "target" ? "Target Race" : "Race Result"}</button>
      </div>

      {pastRaceWarning && (
        <div style={{ ...s.cardDark, marginBottom: 14, border: "1px solid #d4a017", background: "#fffbea" }}>
          <div style={{ ...s.section, color: "#7a5a00" }}>⚠ Race Date Already Passed</div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
            This date is in the past. Move it to Race History instead?
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => { setRaceMode("history"); commitRace(false); }} style={s.btn}>Move to History</button>
            <button onClick={() => setPastRaceWarning(null)} style={s.btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      {raceCategoryModal && (
        <div style={{ ...s.cardDark, marginBottom: 14, border: "1px solid #888" }}>
          <div style={s.section}>Select a category for "{raceCategoryModal.baseName}"</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {raceCategoryModal.categories.map((cat, i) => (
              <button key={i} onClick={() => selectRaceCategory(cat)}
                style={{ ...s.btnGhost, justifyContent: "flex-start", textAlign: "left", padding: "10px 14px" }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  {cat.distance}{cat.ascent ? ` · +${cat.ascent}m` : ""}{cat.date ? ` · ${cat.date}` : ""}
                </div>
              </button>
            ))}
            <button onClick={() => setRaceCategoryModal(null)} style={{ ...s.btnGhost, fontSize: 12, marginTop: 6 }}>Cancel</button>
          </div>
        </div>
      )}

      {showRaceAdd && (
        <div style={{ ...s.cardDark, marginBottom: 14 }}>
          <div style={s.section}>{raceMode === "target" ? "New Target Race" : "New Race Result"}</div>

          {raceMode === "target" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ ...s.label, marginBottom: 6 }}>Priority</div>
              <div style={{ display: "flex", gap: 6 }}>
                {RACE_PRIORITY.map(p => (
                  <button key={p} onClick={() => setNewRace({ ...newRace, priority: p })}
                    style={s.chip(newRace.priority === p)}>{p} Race</button>
                ))}
              </div>
              <div style={{ ...s.muted, marginTop: 4, fontSize: 11 }}>
                A = top priority · B = important tune-up · C = training race
              </div>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Race name (e.g. UTMB, 柴古唐斯)" value={newRace.name}
                onChange={e => setNewRace({ ...newRace, name: e.target.value })}
                style={{ ...s.input, flex: 1 }} />
              <button onClick={() => lookupRaceWithCategories(newRace.name)}
                disabled={raceLookupLoading || !newRace.name.trim()}
                title={canUseWebSearch ? "Look up via Anthropic web search" : "Look up from AI knowledge (DeepSeek / third-party — dates may be inaccurate)"}
                style={{ ...s.btnGhost, padding: "9px 14px", opacity: raceLookupLoading ? 0.5 : 1 }}>
                {raceLookupLoading ? "..." : (canUseWebSearch ? "🔍" : "🤖")}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 6, lineHeight: 1.5 }}>
              {canUseWebSearch
                ? "🔍 Live web search via Anthropic — full accuracy."
                : "🤖 AI-knowledge lookup (no web access). Category structure is reliable; dates may be off — verify manually."}
            </div>
            {raceLookupMsg && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{raceLookupMsg}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input type="date" value={newRace.date}
              onChange={e => setNewRace({ ...newRace, date: e.target.value })}
              onClick={e => e.currentTarget.showPicker?.()}
              style={{ ...s.input, cursor: "pointer" }} />
            <input placeholder="Distance" value={newRace.distance} onChange={e => setNewRace({ ...newRace, distance: e.target.value })} style={s.input} />
            <select value={newRace.category}
              onChange={e => setNewRace({ ...newRace, category: e.target.value })}
              style={s.input}>
              <option value="">Category…</option>
              {RACE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {newRace.isTrailDetected !== false && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input placeholder="Ascent (m)" value={newRace.ascent} onChange={e => setNewRace({ ...newRace, ascent: e.target.value })} style={s.input} />
              <input placeholder="ITRA Score (trail only)" value={newRace.itraScore} onChange={e => setNewRace({ ...newRace, itraScore: e.target.value })} style={s.input} />
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>{raceMode === "target" ? "Goal Time" : "Result Time"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <input type="number" placeholder="h" value={newRace.resultH} onChange={e => setNewRace({ ...newRace, resultH: e.target.value })} style={s.input} />
              <input type="number" placeholder="m" value={newRace.resultM} onChange={e => setNewRace({ ...newRace, resultM: e.target.value })} style={s.input} />
              <input type="number" placeholder="s" value={newRace.resultS} onChange={e => setNewRace({ ...newRace, resultS: e.target.value })} style={s.input} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={tryAddRace} style={s.btn}>Save</button>
            <button onClick={() => { setShowRaceAdd(false); setRaceLookupMsg(""); }} style={s.btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      {(raceMode === "target" ? targetRacesList : historyRacesList).length === 0 ? (
        <div style={{ ...s.cardDark, textAlign: "center", color: "#888", padding: "30px 16px" }}>
          No {raceMode === "target" ? "target races" : "race history"} yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(raceMode === "target" ? targetRacesList : historyRacesList).map(r => {
            const timeStr = [r.resultH, r.resultM, r.resultS].some(Boolean)
              ? `${r.resultH || "0"}:${String(r.resultM || "0").padStart(2, "0")}:${String(r.resultS || "0").padStart(2, "0")}`
              : "";
            return (
              <div key={r.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    {r.isTarget && r.priority && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: r.priority === "A" ? "#222" : r.priority === "B" ? "#666" : "#aaa", borderRadius: 3, padding: "1px 6px" }}>{r.priority}</span>
                    )}
                    <div style={{ fontWeight: 500, fontSize: 15 }}>{r.name}</div>
                    {renderCategoryTag(r.category)}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <div style={s.muted}>{r.date}</div>
                    <button onClick={() => deleteRace(r.id)} style={{ border: "none", background: "none", color: "#bbb", cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                  {r.distance && <span style={{ fontSize: 13, color: "#555" }}>{r.distance}</span>}
                  {r.ascent && <span style={{ fontSize: 13, color: "#555" }}>+{r.ascent}m</span>}
                  {timeStr && <span style={{ fontSize: 16, fontWeight: 500, color: "#111" }}>{timeStr}</span>}
                  {r.itraScore && <span style={s.subTag}>ITRA {r.itraScore}</span>}
                  {!r.category && (
                    <select value=""
                      onChange={e => updateRaceCategory(r.id, e.target.value)}
                      style={{ ...s.input, width: "auto", padding: "3px 6px", fontSize: 11, color: "#888" }}>
                      <option value="">Set category…</option>
                      {RACE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
