import { useState } from "react";
import { s } from "../styles";
import {
  GENDERS, OCCUPATIONS, RUN_EXPERIENCE, RACE_TYPES_DONE,
  INJURY_HISTORY, EQUIPMENT_AVAILABLE, DEFAULT_PROFILE,
} from "../constants";
import { calculateAge, isProfileComplete } from "../utils/profile";

function toggleArr(arr, id) {
  const a = Array.isArray(arr) ? arr : [];
  return a.includes(id) ? a.filter(x => x !== id) : [...a, id];
}

export function ProfileEditor({ profile, setProfile, onClose, mode = "edit" }) {
  // Backfill any missing fields with defaults so the form is robust against older saved data
  const [draft, setDraft] = useState({ ...DEFAULT_PROFILE, ...(profile || {}) });
  const age = calculateAge(draft.birthDate);
  const complete = isProfileComplete(draft);

  function save() {
    setProfile(draft);
    onClose();
  }

  return (
    <div onClick={mode === "setup" ? undefined : onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 680, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", margin: "20px auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>
            {mode === "setup" ? "Welcome! Set up your profile" : "Personal Profile"}
          </h2>
          {mode === "edit" && (
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" }}>×</button>
          )}
        </div>
        <p style={{ ...s.muted, marginBottom: 18, lineHeight: 1.5 }}>
          {mode === "setup"
            ? "This data shapes how AI Coach gives advice. Filled once, edit anytime via the ⚙ icon."
            : "Updated values are used in the next AI Coach message."}
        </p>

        {/* Birth date */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 4 }}>
            Birth Date <span style={{ color: "#c0392b" }}>*</span>
            {age != null && <span style={{ color: "#888", marginLeft: 8 }}>→ Age {age}</span>}
          </div>
          <input type="date" value={draft.birthDate}
            onChange={e => setDraft({ ...draft, birthDate: e.target.value })}
            onClick={e => e.currentTarget.showPicker?.()}
            style={{ ...s.input, maxWidth: 200, cursor: "pointer" }} />
        </div>

        {/* Gender */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>
            Gender <span style={{ color: "#c0392b" }}>*</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GENDERS.map(g => (
              <button key={g.id} type="button"
                onClick={() => setDraft({ ...draft, gender: g.id })}
                style={s.chip(draft.gender === g.id)}>{g.label}</button>
            ))}
          </div>
        </div>

        {/* City */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 4 }}>
            City <span style={{ color: "#c0392b" }}>*</span>
            <span style={{ ...s.muted, marginLeft: 6 }}>(e.g. 广州 — used for terrain/venue suggestions)</span>
          </div>
          <input type="text" value={draft.city} placeholder="City"
            onChange={e => setDraft({ ...draft, city: e.target.value })}
            style={{ ...s.input, maxWidth: 280 }} />
        </div>

        {/* Occupation (with Other free-text) */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>Day Job</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {OCCUPATIONS.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, occupation: o.id })}
                style={s.chip(draft.occupation === o.id)}>{o.label}</button>
            ))}
          </div>
          {draft.occupation === "other" && (
            <input type="text"
              placeholder="Describe your job…"
              value={draft.occupationOther}
              onChange={e => setDraft({ ...draft, occupationOther: e.target.value })}
              style={{ ...s.input, marginTop: 8, maxWidth: 360 }} />
          )}
        </div>

        {/* Years of training (renamed from "experience") */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>
            Years of Running Training <span style={{ color: "#c0392b" }}>*</span>
            <span style={{ ...s.muted, marginLeft: 6 }}>(how long you've been training)</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RUN_EXPERIENCE.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, experience: o.id })}
                style={s.chip(draft.experience === o.id)}>{o.label}</button>
            ))}
          </div>
        </div>

        {/* Race types done (multi) */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>Race Types You've Done (multi-select)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RACE_TYPES_DONE.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, raceTypes: toggleArr(draft.raceTypes, o.id) })}
                style={s.chip(draft.raceTypes?.includes(o.id))}>{o.label}</button>
            ))}
          </div>
        </div>

        {/* Recent injuries (last 6 months) — only inform AI of current/recent issues */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>
            Recent Injuries (last 6 months)
            <span style={{ ...s.muted, marginLeft: 6 }}>— AI will treat these as active</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {INJURY_HISTORY.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, recentInjuries: toggleArr(draft.recentInjuries, o.id) })}
                style={s.chip(draft.recentInjuries?.includes(o.id))}>{o.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.muted, marginBottom: 4 }}>
            Older injuries / context (optional — AI won't over-weight this):
          </div>
          <textarea rows={2}
            placeholder="e.g. 'knee surgery 3 years ago, fully recovered' or '左脚跟腱半年前小问题，目前正常'"
            value={draft.injuriesNote}
            onChange={e => setDraft({ ...draft, injuriesNote: e.target.value })}
            style={{ ...s.input, resize: "vertical" }} />
        </div>

        {/* Equipment (multi + Other) */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>Available Equipment (multi-select)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EQUIPMENT_AVAILABLE.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, equipment: toggleArr(draft.equipment, o.id) })}
                style={s.chip(draft.equipment?.includes(o.id))}>{o.label}</button>
            ))}
          </div>
          <input type="text"
            placeholder="Other equipment (free-text, e.g. TRX、瑜伽垫、battle rope)"
            value={draft.equipmentOther}
            onChange={e => setDraft({ ...draft, equipmentOther: e.target.value })}
            style={{ ...s.input, marginTop: 8 }} />
        </div>

        {/* Free-form notes */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...s.label, marginBottom: 4 }}>Anything Else (optional)</div>
          <textarea rows={3} value={draft.notes}
            placeholder="e.g. preferred training time, dietary preferences, recent goals…"
            onChange={e => setDraft({ ...draft, notes: e.target.value })}
            style={{ ...s.input, resize: "vertical" }} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          {!complete && (
            <span style={{ ...s.muted, color: "#c0392b", marginRight: "auto", fontSize: 12 }}>
              ⚠ Required fields missing
            </span>
          )}
          {mode === "edit" && (
            <button onClick={onClose} style={s.btnGhost}>Cancel</button>
          )}
          <button onClick={save} disabled={!complete}
            style={{ ...s.btn, opacity: complete ? 1 : 0.5 }}>
            {mode === "setup" ? "Get Started" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
