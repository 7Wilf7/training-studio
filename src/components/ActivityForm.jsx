import { useState, useEffect } from "react";
import { s } from "../styles";
import { ACTIVITY_TYPES, RUN_PACE_TYPES, RUN_FLAGS, STRENGTH_SUBS } from "../constants";

// Decompose seconds into {h,m,s} strings for the duration inputs
function splitDuration(totalSec) {
  if (!totalSec) return { h: "", m: "", s: "" };
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return { h: h ? String(h) : "", m: m ? String(m) : "", s: sec ? String(sec) : "" };
}

// Defensive normalization of log.date into YYYY-MM-DD (input type="date" only accepts this)
function normalizeDate(d) {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function buildEmpty() {
  return {
    date: "",
    type: "Running",
    subTypes: ["Easy Run"],
    distance: "",
    durationH: "", durationM: "", durationS: "",
    hr: "",
    ascent: "",
  };
}

function fromLog(log) {
  const d = splitDuration(log.duration || 0);
  return {
    date: normalizeDate(log.date),
    type: log.type || "Running",
    subTypes: Array.isArray(log.subTypes) ? log.subTypes : [],
    distance: log.distance ? String(log.distance) : "",
    durationH: d.h, durationM: d.m, durationS: d.s,
    hr: log.hr ? String(log.hr) : "",
    ascent: log.ascent ? String(log.ascent) : "",
  };
}

// Small labeled input for grid layouts — keeps unit visible after the user types
function LabeledInput({ label, unit, value, onChange, placeholder, type = "number" }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>
        {label}{unit && <span style={{ color: "#aaa", fontWeight: 400 }}> ({unit})</span>}
      </span>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} style={s.input} />
    </label>
  );
}

/**
 * Reusable form for adding/editing an activity.
 *   mode: "add" | "edit"
 *   initial: log object (for edit) or null (for add)
 *   onSave(logData): called with normalized log fields (no id) on save
 *   onCancel(): called on cancel
 */
export function ActivityForm({ mode, initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? fromLog(initial) : buildEmpty());

  useEffect(() => {
    if (initial) setForm(fromLog(initial));
  }, [initial]);

  const isRun = form.type === "Running" || form.type === "Trail Running";
  const isStrength = form.type === "Strength";

  const pickedPace = isRun ? (form.subTypes.find(t => RUN_PACE_TYPES.includes(t)) || "") : "";
  const pickedFlags = isRun ? form.subTypes.filter(t => RUN_FLAGS.includes(t)) : [];

  function setPace(p) {
    const flags = pickedFlags;
    const next = p ? [p, ...flags] : [...flags];
    setForm({ ...form, subTypes: next });
  }

  function toggleFlag(flag) {
    const hasIt = pickedFlags.includes(flag);
    const newFlags = hasIt ? pickedFlags.filter(f => f !== flag) : [...pickedFlags, flag];
    const next = pickedPace ? [pickedPace, ...newFlags] : newFlags;
    setForm({ ...form, subTypes: next });
  }

  function toggleStrengthSub(sub) {
    const has = form.subTypes.includes(sub);
    setForm({
      ...form,
      subTypes: has ? form.subTypes.filter(x => x !== sub) : [...form.subTypes, sub],
    });
  }

  function changeType(t) {
    let nextSubTypes;
    if (t === "Running") nextSubTypes = ["Easy Run"];
    else if (t === "Trail Running") nextSubTypes = [];
    else if (t === "Strength") nextSubTypes = [];
    else nextSubTypes = []; // HIIT
    setForm({ ...form, type: t, subTypes: nextSubTypes });
  }

  function handleSave() {
    if (!form.date) { alert("Please pick a date."); return; }
    const dur = (parseInt(form.durationH) || 0) * 3600
      + (parseInt(form.durationM) || 0) * 60
      + (parseInt(form.durationS) || 0);
    if (!dur) { alert("Please enter duration."); return; }
    if (form.type === "Strength" && form.subTypes.length === 0) {
      alert("Select at least one body part for Strength.");
      return;
    }
    if (form.type === "Running" && !pickedPace) {
      alert("Pick a run type (Easy / Aerobic / Tempo / Interval).");
      return;
    }
    const dist = parseFloat(form.distance) || 0;
    const isAerobicLike = form.type === "Strength" || form.type === "HIIT";
    const pace = (dist > 0 && !isAerobicLike) ? Math.round(dur / dist) : 0;

    onSave({
      date: form.date,
      type: form.type,
      subTypes: form.subTypes,
      distance: dist,
      duration: dur,
      pace,
      hr: parseInt(form.hr) || 0,
      ascent: parseInt(form.ascent) || 0,
    });
  }

  return (
    <div style={{ ...s.cardDark, marginBottom: 14 }}>
      <div style={s.section}>{mode === "edit" ? "Edit Activity" : "Add Activity"}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>Date</span>
          <input type="date" value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            onClick={e => e.currentTarget.showPicker?.()}
            style={{ ...s.input, cursor: "pointer" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>Type</span>
          <select value={form.type} onChange={e => changeType(e.target.value)} style={s.input}>
            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      {isRun && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>
              Run Type {form.type === "Running" ? "(required)" : "(optional)"}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RUN_PACE_TYPES.map(sub => (
                <button key={sub} type="button"
                  onClick={() => setPace(pickedPace === sub ? "" : sub)}
                  style={s.chip(pickedPace === sub)}>{sub}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>Flags</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RUN_FLAGS.map(flag => (
                <button key={flag} type="button"
                  onClick={() => toggleFlag(flag)}
                  style={s.chip(pickedFlags.includes(flag))}>🏆 {flag}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {isStrength && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>Body Parts (multi-select)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STRENGTH_SUBS.map(sub => (
              <button key={sub} type="button"
                onClick={() => toggleStrengthSub(sub)}
                style={s.chip(form.subTypes.includes(sub))}>{sub}</button>
            ))}
          </div>
        </div>
      )}

      {/* Duration — three labeled inputs */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ ...s.label, marginBottom: 6 }}>Duration</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <LabeledInput label="Hours" unit="h" placeholder="0"
            value={form.durationH} onChange={e => setForm({ ...form, durationH: e.target.value })} />
          <LabeledInput label="Minutes" unit="m" placeholder="0"
            value={form.durationM} onChange={e => setForm({ ...form, durationM: e.target.value })} />
          <LabeledInput label="Seconds" unit="s" placeholder="0"
            value={form.durationS} onChange={e => setForm({ ...form, durationS: e.target.value })} />
        </div>
      </div>

      {/* Distance / HR / Ascent — each with its own label + unit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <LabeledInput label="Distance" unit="km" placeholder="0"
          value={form.distance} onChange={e => setForm({ ...form, distance: e.target.value })} />
        <LabeledInput label="Avg HR" unit="bpm" placeholder="0"
          value={form.hr} onChange={e => setForm({ ...form, hr: e.target.value })} />
        <LabeledInput label="Ascent" unit="m" placeholder="0"
          value={form.ascent} onChange={e => setForm({ ...form, ascent: e.target.value })} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} style={s.btn}>{mode === "edit" ? "Save Changes" : "Save"}</button>
        <button onClick={onCancel} style={s.btnGhost}>Cancel</button>
      </div>
    </div>
  );
}
