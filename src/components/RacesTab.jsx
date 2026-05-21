import { useState } from "react";
import { s } from "../styles";
import { RACE_PRIORITY, RACE_CATEGORIES, RACE_CATEGORY_COLOR, SPARTAN_SUBTYPES } from "../constants";
import { useT } from "../i18n/LanguageContext";
import { parseDistanceKm, inferRaceCategory } from "../utils/format";
import { useClickOutside } from "../utils/useClickOutside";
import { useIsNarrow } from "../hooks/useMediaQuery";
import { ClockIcon } from "./Icons";
import { PersonalRecordsBar } from "./PersonalRecordsBar";

const EMPTY_RACE = (isTarget) => ({
  isTarget, priority: "A", name: "", date: "",
  distance: "", category: "", subtype: "", ascent: "", resultH: "", resultM: "", resultS: "",
  itraScore: "",
});

// Decompose a stored race into the editable form shape. Inverse of how `commitRace` builds the race object.
// Distance is normalized to a plain number string so the input shows just digits,
// even for legacy data stored as "Marathon (42.195 km)" or similar.
function raceToForm(race) {
  const distNum = parseDistanceKm(race.distance);
  return {
    isTarget: !!race.isTarget,
    priority: race.priority || "A",
    name: race.name || "",
    date: race.date || "",
    distance: distNum > 0 ? String(distNum) : "",
    category: race.category || "",
    subtype: race.subtype || "",
    ascent: race.ascent || "",
    resultH: race.resultH || "",
    resultM: race.resultM || "",
    resultS: race.resultS || "",
    itraScore: race.itraScore || "",
  };
}

export function RacesTab({ races, addRace, updateRace, now, setConfirmDelete, itraPI, setItraPI }) {
  const t = useT();
  const isNarrow = useIsNarrow();
  // addingMode: null = no add form; "target" or "history" = the new race kind being added.
  // No more target/history TAB switching — both lists render on the same page.
  const [addingMode, setAddingMode] = useState(null);
  const [editingRaceId, setEditingRaceId] = useState(null);
  const [newRace, setNewRace] = useState(EMPTY_RACE(true));
  const [pastRaceWarning, setPastRaceWarning] = useState(null);

  function startAdd(mode) {
    if (editingRaceId) cancelEdit();
    // Toggle off if clicking the same Add button while it's already showing
    if (addingMode === mode) {
      setAddingMode(null);
      return;
    }
    setAddingMode(mode);
    setNewRace(EMPTY_RACE(mode === "target"));
    setPastRaceWarning(null);
  }

  function cancelAdd() {
    setAddingMode(null);
    setNewRace(EMPTY_RACE(true));
    setPastRaceWarning(null);
  }

  function startEdit(race) {
    setEditingRaceId(race.id);
    setAddingMode(null);
    setNewRace(raceToForm(race));
  }

  function cancelEdit() {
    setEditingRaceId(null);
    setNewRace(EMPTY_RACE(true));
    setPastRaceWarning(null);
  }

  // Click-outside auto-collapses the inline edit form (race cards). Warn first
  // if the form has unsaved changes; the dirty check compares the current draft
  // to a snapshot of the race being edited.
  function isEditFormDirty() {
    if (!editingRaceId) return false;
    const original = races.find(r => r.id === editingRaceId);
    if (!original) return false;
    return JSON.stringify(newRace) !== JSON.stringify(raceToForm(original));
  }
  const editFormRef = useClickOutside(() => {
    if (!isEditFormDirty() || window.confirm(t("form.discard_confirm"))) cancelEdit();
  }, !!editingRaceId);

  function deleteRace(id) {
    setConfirmDelete({ type: "race", id });
  }

  function updateRaceCategory(id, category) {
    updateRace(id, { category }).catch(() => {});
  }

  function tryAddRace() {
    if (!newRace.name || !newRace.date) return;
    // Only warn-and-move when ADDING a new target whose date slipped past.
    // For edits, trust the user's input — they may be backdating intentionally.
    if (newRace.isTarget && !editingRaceId && new Date(newRace.date) < new Date(now.toISOString().slice(0, 10))) {
      setPastRaceWarning(true);
      return;
    }
    commitRace(newRace.isTarget);
  }

  async function commitRace(asTarget) {
    const finalCategory = newRace.category || inferRaceCategory(newRace) || "";
    // Distance normalized to a plain number (km). UI always re-appends "km" on display.
    const distanceNum = parseDistanceKm(newRace.distance);
    const built = {
      ...newRace,
      distance: distanceNum,
      category: finalCategory,
      isTarget: asTarget,
      priority: asTarget ? newRace.priority : null,
    };
    try {
      if (editingRaceId) {
        await updateRace(editingRaceId, built);
      } else {
        await addRace(built);
      }
      setNewRace(EMPTY_RACE(true));
      setAddingMode(null);
      setEditingRaceId(null);
      setPastRaceWarning(null);
    } catch {
      // alert already shown by the wrapper; keep the form open so the user can retry
    }
  }

  // Sort: target races by date ASC (next race coming up first); history by date DESC (most recent first).
  // Missing date sorts last for targets and first for history (treated as "unknown future" / "recent unknown").
  const targetRacesList = races.filter(r => r.isTarget).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });
  const historyRacesList = races.filter(r => !r.isTarget).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  function renderCategoryTag(cat) {
    if (!cat) return null;
    return (
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11, padding: "2px 8px", borderRadius: 2,
        background: RACE_CATEGORY_COLOR[cat] || "var(--rule-soft)",
        color: "var(--ink-1)", fontWeight: 500, whiteSpace: "nowrap",
        textTransform: "uppercase", letterSpacing: "0.05em",
        flexShrink: 0,
      }}>{t(`enum.race_cat.${cat}`)}</span>
    );
  }

  // Render a single race card OR its inline edit form. Used twice below (target + history sections).
  function renderRaceCard(r) {
    const timeStr = [r.resultH, r.resultM, r.resultS].some(Boolean)
      ? `${r.resultH || "0"}:${String(r.resultM || "0").padStart(2, "0")}:${String(r.resultS || "0").padStart(2, "0")}`
      : "";
    if (editingRaceId === r.id) {
      return <div key={r.id} ref={editFormRef}>{renderRaceForm("edit")}</div>;
    }
    return renderRaceCardInner(r, timeStr);
  }

  return (
    <div>
      {/* PR bar — absorbs the former PR tab. ITRA editor lives as a small badge
          on the Trail card here, not a separate large card. */}
      <PersonalRecordsBar races={races} itraPI={itraPI} setItraPI={setItraPI} />

      {/* Two add buttons at the top. Click one to open the corresponding add form below. */}
      <div style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => startAdd("target")} style={addingMode === "target" ? s.btn : s.btnGhost}>{t("races.add_target")}</button>
        <button onClick={() => startAdd("history")} style={addingMode === "history" ? s.btn : s.btnGhost}>{t("races.add_history")}</button>
        <span style={{ ...s.muted, fontSize: 11 }}>{t("races.edit_hint")}</span>
      </div>

      {pastRaceWarning && (
        <div style={{ ...s.cardDark, marginBottom: 14, border: "1px solid #d4a017", background: "#fffbea" }}>
          <div style={{ ...s.section, color: "#7a5a00" }}>{t("races.past_warn_title")}</div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>{t("races.past_warn_body")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => commitRace(false)} style={s.btn}>{t("races.past_warn_move")}</button>
            <button onClick={() => setPastRaceWarning(null)} style={s.btnGhost}>{t("common.cancel")}</button>
          </div>
        </div>
      )}

      {/* Add-mode form sits at the top (between the buttons and the lists).
          Edit-mode form replaces the card in-place inside the list. */}
      {addingMode && !editingRaceId && renderRaceForm("add")}

      {/* === Target Races section === */}
      <div style={{ ...s.section, marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span>{t("races.section_target")}</span>
        <span style={{ ...s.muted, fontWeight: 400 }}>{targetRacesList.length}</span>
      </div>
      {targetRacesList.length === 0 ? (
        <div style={{ ...s.cardDark, textAlign: "center", color: "var(--ink-3)", padding: "24px 16px", marginBottom: 22, fontSize: 13 }}>
          {t("races.empty_target")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {targetRacesList.map(renderRaceCard)}
        </div>
      )}

      {/* === History section === */}
      <div style={{ ...s.section, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span>{t("races.section_history")}</span>
        <span style={{ ...s.muted, fontWeight: 400 }}>{historyRacesList.length}</span>
      </div>
      {historyRacesList.length === 0 ? (
        <div style={{ ...s.cardDark, textAlign: "center", color: "var(--ink-3)", padding: "24px 16px", fontSize: 13 }}>
          {t("races.empty_history")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {historyRacesList.map(renderRaceCard)}
        </div>
      )}
    </div>
  );

  // Single-line card layout — mirrors the activity row pattern so all metric
  // columns line up vertically across many rows. Layout (left to right):
  //   date | priority? | category-tag | subtype? | name + (distance · +ascent)
  //   | spacer | time | ✕
  // For Trail we surface distance + ascent inline after the name; road
  // categories (HM/M/10K) get their distance from the category tag itself.
  function renderRaceCardInner(r, timeStr) {
    const showDistanceInline = r.category === "Trail" && r.distance > 0;
    const showAscentInline   = r.ascent && parseInt(r.ascent) > 0;
    const inlineSuffix = [];
    if (showDistanceInline) inlineSuffix.push(`${r.distance} km`);
    if (showAscentInline)   inlineSuffix.push(`+${r.ascent} m`);

    return (
      <div key={r.id} onClick={() => startEdit(r)}
        style={{
          ...s.card,
          cursor: "pointer",
          display: "flex",
          // Narrow: stack the metadata line over the name+suffix line so the
          // race name has room to breathe. Desktop: keep the single-row,
          // column-aligned layout that lets you scan a list quickly.
          flexDirection: isNarrow ? "column" : "row",
          alignItems: isNarrow ? "stretch" : "center",
          gap: isNarrow ? 6 : 12,
          flexWrap: isNarrow ? "wrap" : "nowrap",
          padding: "10px 14px",
        }}>
        {/* Date on the far left, mono, fixed width so columns align across rows */}
        <div style={{
          minWidth: isNarrow ? 0 : 80, flexShrink: 0,
          fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-3)",
          fontVariantNumeric: "tabular-nums",
          display: isNarrow ? "inline-flex" : "block",
          alignItems: "center", gap: 8,
        }}>
          <span>{r.date || "—"}</span>
        </div>

        {/* Priority chip (target races only) */}
        {r.isTarget && r.priority && (
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            color: r.priority === "A" ? "var(--ink-inv)" : "var(--ink-1)",
            background: r.priority === "A" ? "var(--ink-1)" : r.priority === "B" ? "var(--moss-bg)" : "transparent",
            border: "1px solid " + (r.priority === "A" ? "var(--ink-1)" : "var(--rule)"),
            padding: "2px 8px",
            flexShrink: 0,
          }}>▲ {r.priority}</span>
        )}

        {/* Category tag */}
        {renderCategoryTag(r.category)}
        {r.subtype && (
          <span style={{ ...s.subTag, flexShrink: 0 }}>{r.subtype}</span>
        )}

        {/* Name + inline distance/ascent suffix */}
        <div style={{
          flex: 1, minWidth: 0,
          display: "flex", alignItems: "baseline", gap: 10,
          overflow: "hidden",
        }}>
          <span style={{
            fontWeight: 500, fontSize: 14, color: "var(--ink-1)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            minWidth: 0,
          }}>{r.name}</span>
          {inlineSuffix.length > 0 && (
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12, color: "var(--ink-3)",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}>
              {inlineSuffix.join(" · ")}
            </span>
          )}
        </div>

        {/* Category-picker for uncategorized races — kept inline so it
            doesn't break the row layout */}
        {!r.category && (
          <select value=""
            onClick={(e) => e.stopPropagation()}
            onChange={e => updateRaceCategory(r.id, e.target.value)}
            style={{ ...s.input, width: "auto", padding: "3px 6px", fontSize: 11, color: "#888", flexShrink: 0 }}>
            <option value="">{t("races.set_category")}</option>
            {RACE_CATEGORIES.map(c => <option key={c} value={c}>{t(`enum.race_cat.${c}`)}</option>)}
          </select>
        )}

        {/* Right side: finish time (history races) + delete */}
        <div style={{
          display: "flex", gap: 14, alignItems: "center", flexShrink: 0,
          fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums",
        }}>
          {timeStr && (
            <span style={{
              fontSize: 14, fontWeight: 500, color: "var(--ink-1)",
              letterSpacing: "-0.01em",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ color: "var(--ink-3)" }}><ClockIcon size={13} /></span>
              {timeStr}
            </span>
          )}
          {r.itraScore && (
            <span style={{ ...s.subTag, fontSize: 10 }}>ITRA {r.itraScore}</span>
          )}
          <button onClick={(e) => { e.stopPropagation(); deleteRace(r.id); }}
            style={{ border: "none", background: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      </div>
    );
  }

  // Renders the add/edit form. Layout:
  //   Row 1: Category + Race name
  //   Row 2: Date + Distance + Ascent (each shown based on category)
  //   ITRA row: only for Trail HISTORY races
  //   Time row: only for HISTORY races
  function renderRaceForm(mode) {
    const isEdit = mode === "edit";
    // Field visibility by category. Road races (HM/M/10K) skip ascent;
    // Hyrox is fixed-format indoor so skips both distance and ascent.
    const isRoadOnly = ["Half Marathon", "Marathon", "10K"].includes(newRace.category);
    const isHyrox = newRace.category === "Hyrox";
    const isSpartan = newRace.category === "Spartan";
    const showAscent = !isRoadOnly && !isHyrox && !isSpartan;
    // Distance hidden when the category itself implies the distance (road
    // categories like Half Marathon / Marathon / 10K), when the format is
    // fixed-indoor (Hyrox), or when the user picks a Spartan tier (tier
    // already carries the size signal). Trail still shows it.
    const showDistance = !isHyrox && !isRoadOnly && !isSpartan;
    // ITRA fields removed from the form per user request (2026-05). The DB
    // column is retained for backward compat with already-imported data.
    const showItra = false;

    return (
      <div style={{ ...s.cardDark, marginBottom: 14 }}>
        <div style={s.section}>
          {isEdit
            ? t("races.edit_title")
            : (newRace.isTarget ? t("races.new_target") : t("races.new_history"))}
        </div>

        {newRace.isTarget && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>{t("races.priority")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {RACE_PRIORITY.map(p => (
                <button key={p} onClick={() => setNewRace({ ...newRace, priority: p })}
                  style={s.chip(newRace.priority === p)}>{p}{t("races.priority_suffix")}</button>
              ))}
            </div>
            <div style={{ ...s.muted, marginTop: 4, fontSize: 11 }}>{t("races.priority_hint")}</div>
          </div>
        )}

        {/* Row 1: Category (narrow) + Name (flex) */}
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ ...s.label, marginBottom: 6 }}>{t("races.category_label")}</div>
            <select value={newRace.category}
              onChange={e => setNewRace({ ...newRace, category: e.target.value })}
              style={s.input}>
              <option value="">{t("races.category_placeholder")}</option>
              {RACE_CATEGORIES.map(c => <option key={c} value={c}>{t(`enum.race_cat.${c}`)}</option>)}
            </select>
          </div>
          <div>
            <div style={{ ...s.label, marginBottom: 6 }}>{t("races.name_label")}</div>
            <input placeholder={t("races.name_placeholder")} value={newRace.name}
              onChange={e => setNewRace({ ...newRace, name: e.target.value })}
              style={s.input} />
          </div>
        </div>

        {/* Spartan-only: pick the event tier. Acts as the "size" signal in
            place of distance/ascent for this category. */}
        {isSpartan && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>{t("races.spartan_tier")}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SPARTAN_SUBTYPES.map(st => (
                <button key={st} type="button"
                  onClick={() => setNewRace({ ...newRace, subtype: st })}
                  style={s.chip(newRace.subtype === st)}>{t(`enum.spartan.${st}`)}</button>
              ))}
            </div>
          </div>
        )}

        {/* Row 2: Date + Distance + Ascent (each shown by category rules).
            Empty cells are NOT rendered so visible fields sit adjacent. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ ...s.label, marginBottom: 6 }}>{t("races.date_label")}</div>
            <input type="date" value={newRace.date}
              onChange={e => setNewRace({ ...newRace, date: e.target.value })}
              style={s.input} />
          </div>
          {showDistance && (
            <div>
              <div style={{ ...s.label, marginBottom: 6 }}>{t("races.distance_label")}</div>
              <input type="number" step="0.001" placeholder="0" value={newRace.distance}
                onChange={e => setNewRace({ ...newRace, distance: e.target.value })}
                style={s.input} />
            </div>
          )}
          {showAscent && (
            <div>
              <div style={{ ...s.label, marginBottom: 6 }}>{t("races.ascent_label")}</div>
              <input type="number" placeholder="0" value={newRace.ascent}
                onChange={e => setNewRace({ ...newRace, ascent: e.target.value })}
                style={s.input} />
            </div>
          )}
        </div>

        {/* ITRA — Trail history races only */}
        {showItra && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ ...s.label, marginBottom: 6 }}>{t("races.itra_label")}</div>
              <input type="number" placeholder="0" value={newRace.itraScore}
                onChange={e => setNewRace({ ...newRace, itraScore: e.target.value })}
                style={s.input} />
            </div>
          </div>
        )}

        {/* Time fields only for history races — target races don't have a finish time yet */}
        {!newRace.isTarget && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>{t("races.result_time")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <input type="number" placeholder={t("races.h")} value={newRace.resultH} onChange={e => setNewRace({ ...newRace, resultH: e.target.value })} style={s.input} />
              <input type="number" placeholder={t("races.m")} value={newRace.resultM} onChange={e => setNewRace({ ...newRace, resultM: e.target.value })} style={s.input} />
              <input type="number" placeholder={t("races.s")} value={newRace.resultS} onChange={e => setNewRace({ ...newRace, resultS: e.target.value })} style={s.input} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={tryAddRace} style={s.btn}>{isEdit ? t("common.save_changes") : t("common.save")}</button>
          <button onClick={() => {
            if (isEdit) cancelEdit();
            else { cancelAdd(); }
          }} style={s.btnGhost}>{t("common.cancel")}</button>
        </div>
      </div>
    );
  }
}
