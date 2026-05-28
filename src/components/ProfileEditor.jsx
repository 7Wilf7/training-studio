import { useState } from "react";
import { s } from "../styles";
import {
  GENDERS, OCCUPATIONS, RUN_EXPERIENCE, RACE_TYPES_DONE,
  INJURY_HISTORY, EQUIPMENT_AVAILABLE, DEFAULT_PROFILE, HR_ZONE_METHODS,
} from "../constants";
import { calculateAge, isProfileComplete, computeHRZones } from "../utils/profile";
import { useT, useLanguage } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import { getCurrentLocation, reverseGeocode } from "../lib/weather";
import { ModalRoot } from "./ModalRoot";

function toggleArr(arr, id) {
  const a = Array.isArray(arr) ? arr : [];
  return a.includes(id) ? a.filter(x => x !== id) : [...a, id];
}

// `defaultLocation` / `setDefaultLocation` are the weather coordinates (stored
// in user_settings). Location now lives ONLY here in the profile: the address
// text is profile.city (feeds the AI prompt) and the coords feed weather. The
// old standalone Settings → Default location entry was removed.
export function ProfileEditor({ profile, setProfile, onClose, mode = "edit", defaultLocation, setDefaultLocation }) {
  const t = useT();
  const { lang } = useLanguage();
  const isMobile = useIsMobile();
  // Backfill any missing fields with defaults so the form is robust against older saved data
  const [draft, setDraft] = useState({ ...DEFAULT_PROFILE, ...(profile || {}) });
  // Local coordinate draft (weather fallback). Saved alongside the profile.
  const [locDraft, setLocDraft] = useState({
    lng: defaultLocation?.lng != null ? String(defaultLocation.lng) : "",
    lat: defaultLocation?.lat != null ? String(defaultLocation.lat) : "",
  });
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const age = calculateAge(draft.birthDate);
  const complete = isProfileComplete(draft);

  // GPS → coords → reverse-geocode → fill the address text. One tap, no typing.
  async function detectLocation() {
    setLocating(true);
    setLocError("");
    try {
      const loc = await getCurrentLocation({}); // force device path (no defaults)
      setLocDraft({ lng: String(loc.lng), lat: String(loc.lat) });
      const addr = await reverseGeocode({ lng: loc.lng, lat: loc.lat, lang });
      if (addr) setDraft(d => ({ ...d, city: addr }));
    } catch {
      setLocError(t("profile.loc_error"));
    }
    setLocating(false);
  }

  function save() {
    setProfile(draft);
    // Persist the weather coordinates too (best-effort; profile is the source
    // of truth for the address label). Empty coords clear the fallback.
    if (setDefaultLocation) {
      const lng = locDraft.lng === "" ? null : Number(locDraft.lng);
      const lat = locDraft.lat === "" ? null : Number(locDraft.lat);
      setDefaultLocation({
        lng: Number.isFinite(lng) ? lng : null,
        lat: Number.isFinite(lat) ? lat : null,
        name: (draft.city || "").trim(),
      });
    }
    onClose();
  }

  return (
    <ModalRoot onClose={mode === "setup" ? undefined : onClose}>
    <div onClick={mode === "setup" ? undefined : onClose}
      style={s.modalOverlay(isMobile)}>
      <div onClick={e => e.stopPropagation()}
        style={s.modalCard(isMobile, { maxWidth: 680, bg: "#fff" })}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>
            {mode === "setup" ? t("profile.title_setup") : t("profile.title_edit")}
          </h2>
          {mode === "edit" && (
            <button onClick={onClose} style={s.modalCloseBtn} aria-label="Close">×</button>
          )}
        </div>
        <p style={{ ...s.muted, marginBottom: 18, lineHeight: 1.5 }}>
          {mode === "setup" ? t("profile.desc_setup") : t("profile.desc_edit")}
        </p>

        {/* Display name — shown first, required */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 4 }}>
            {t("profile.display_name")} <span style={{ color: "#c0392b" }}>*</span>
            <span style={{ ...s.muted, marginLeft: 6 }}>{t("profile.display_name_hint")}</span>
          </div>
          <input type="text" value={draft.displayName}
            placeholder={t("profile.display_name_placeholder")}
            onChange={e => setDraft({ ...draft, displayName: e.target.value })}
            style={{ ...s.input, maxWidth: 320 }} />
        </div>

        {/* Birth date */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 4 }}>
            {t("profile.birth_date")} <span style={{ color: "#c0392b" }}>*</span>
            {age != null && <span style={{ color: "#888", marginLeft: 8 }}>{t("profile.age_suffix", { age })}</span>}
          </div>
          <input type="date" value={draft.birthDate}
            onChange={e => setDraft({ ...draft, birthDate: e.target.value })}
            style={{ ...s.input, maxWidth: 200 }} />
        </div>

        {/* Gender */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>
            {t("profile.gender")} <span style={{ color: "#c0392b" }}>*</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GENDERS.map(g => (
              <button key={g.id} type="button"
                onClick={() => setDraft({ ...draft, gender: g.id })}
                style={s.chip(draft.gender === g.id)}>{t(`enum.gender.${g.id}`)}</button>
            ))}
          </div>
        </div>

        {/* Location — address text (feeds the AI prompt) + GPS auto-fill +
            optional manual coordinates (weather fallback). The single source
            of location truth; the old Settings → Default location is gone. */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 4 }}>
            {t("profile.city")} <span style={{ color: "#c0392b" }}>*</span>
            <span style={{ ...s.muted, marginLeft: 6 }}>{t("profile.city_hint")}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input type="text" value={draft.city} placeholder={t("profile.city_placeholder")}
              onChange={e => setDraft({ ...draft, city: e.target.value })}
              style={{ ...s.input, maxWidth: 280, flex: "1 1 200px" }} />
            <button type="button" onClick={detectLocation} disabled={locating}
              style={{ ...s.btnGhost, fontSize: 12, padding: "8px 12px", whiteSpace: "nowrap", opacity: locating ? 0.5 : 1 }}>
              {locating ? t("profile.loc_detecting") : t("profile.loc_detect")}
            </button>
          </div>
          <div style={{ ...s.muted, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>{t("profile.loc_detect_hint")}</div>
          {locError && (
            <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>{locError}</div>
          )}

          {/* Manual coordinates — fallback for when GPS is denied/unavailable
              (e.g. a desktop). Optional; the address text above is what the
              coach sees. */}
          <div style={{ ...s.muted, fontSize: 11, marginTop: 12, marginBottom: 6 }}>{t("profile.loc_manual")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 280 }}>
            <input type="number" step="0.0001" value={locDraft.lng}
              onChange={e => setLocDraft({ ...locDraft, lng: e.target.value })}
              placeholder={t("profile.loc_lng")} style={s.input} />
            <input type="number" step="0.0001" value={locDraft.lat}
              onChange={e => setLocDraft({ ...locDraft, lat: e.target.value })}
              placeholder={t("profile.loc_lat")} style={s.input} />
          </div>
        </div>

        {/* Occupation (with Other free-text) */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>{t("profile.day_job")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {OCCUPATIONS.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, occupation: o.id })}
                style={s.chip(draft.occupation === o.id)}>{t(`enum.occ.${o.id}`)}</button>
            ))}
          </div>
          {draft.occupation === "other" && (
            <input type="text"
              placeholder={t("profile.occupation_other_placeholder")}
              value={draft.occupationOther}
              onChange={e => setDraft({ ...draft, occupationOther: e.target.value })}
              style={{ ...s.input, marginTop: 8, maxWidth: 360 }} />
          )}
        </div>

        {/* Years of training */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>
            {t("profile.years_training")} <span style={{ color: "#c0392b" }}>*</span>
            <span style={{ ...s.muted, marginLeft: 6 }}>{t("profile.years_training_hint")}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RUN_EXPERIENCE.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, experience: o.id })}
                style={s.chip(draft.experience === o.id)}>{t(`enum.exp.${o.id}`)}</button>
            ))}
          </div>
        </div>

        {/* Race types done */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>{t("profile.race_types_done")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RACE_TYPES_DONE.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, raceTypes: toggleArr(draft.raceTypes, o.id) })}
                style={s.chip(draft.raceTypes?.includes(o.id))}>{t(`enum.race_done.${o.id}`)}</button>
            ))}
          </div>
        </div>

        {/* Recent injuries */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>
            {t("profile.recent_injuries")}
            <span style={{ ...s.muted, marginLeft: 6 }}>{t("profile.recent_injuries_note")}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {INJURY_HISTORY.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, recentInjuries: toggleArr(draft.recentInjuries, o.id) })}
                style={s.chip(draft.recentInjuries?.includes(o.id))}>{t(`enum.injury.${o.id}`)}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.muted, marginBottom: 4 }}>{t("profile.injury_older_label")}</div>
          <textarea rows={2}
            placeholder={t("profile.injury_older_placeholder")}
            value={draft.injuriesNote}
            onChange={e => setDraft({ ...draft, injuriesNote: e.target.value })}
            style={{ ...s.input, resize: "vertical" }} />
        </div>

        {/* Equipment */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>{t("profile.equipment")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EQUIPMENT_AVAILABLE.map(o => (
              <button key={o.id} type="button"
                onClick={() => setDraft({ ...draft, equipment: toggleArr(draft.equipment, o.id) })}
                style={s.chip(draft.equipment?.includes(o.id))}>{t(`enum.equip.${o.id}`)}</button>
            ))}
          </div>
          <input type="text"
            placeholder={t("profile.equipment_other_placeholder")}
            value={draft.equipmentOther}
            onChange={e => setDraft({ ...draft, equipmentOther: e.target.value })}
            style={{ ...s.input, marginTop: 8 }} />
        </div>

        {/* Heart Rate (optional, but unlocks Karvonen-based zone advice from AI Coach) */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...s.label, marginBottom: 6 }}>{t("profile.heart_rate")}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "#666" }}>{t("profile.resting_hr")} <span style={{ color: "#aaa" }}>(bpm)</span></span>
              <input type="number" placeholder="55" value={draft.restingHR}
                onChange={e => setDraft({ ...draft, restingHR: e.target.value })}
                style={{ ...s.input, width: 100 }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "#666" }}>{t("profile.max_hr")} <span style={{ color: "#aaa" }}>(bpm)</span></span>
              <input type="number" placeholder="190" value={draft.maxHR}
                onChange={e => setDraft({ ...draft, maxHR: e.target.value })}
                style={{ ...s.input, width: 100 }} />
            </label>
          </div>
          <div style={{ ...s.label, marginBottom: 6, fontSize: 12 }}>{t("profile.hr_zone_method")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {HR_ZONE_METHODS.map(m => (
              <button key={m.id} type="button"
                onClick={() => setDraft({ ...draft, hrZoneMethod: m.id })}
                title={m.note}
                style={s.chip(draft.hrZoneMethod === m.id)}>{m.label}</button>
            ))}
          </div>
          {(() => {
            const zones = computeHRZones(draft.restingHR, draft.maxHR, draft.hrZoneMethod);
            if (!zones) {
              return (draft.restingHR || draft.maxHR)
                ? <div style={{ ...s.muted, fontSize: 11 }}>{t("profile.hr_zone_need_both")}</div>
                : null;
            }
            return (
              <div style={{ background: "#fafafa", borderRadius: 6, padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "#555", lineHeight: 1.8 }}>
                <div style={{ marginBottom: 4, fontFamily: "var(--font-sans)", color: "#444" }}>{t("profile.hr_zone_preview")}</div>
                {zones.map(z => (
                  <div key={z.id}>{z.id}: {z.low}–{z.high} bpm</div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...s.label, marginBottom: 4 }}>{t("profile.notes")}</div>
          <textarea rows={3} value={draft.notes}
            placeholder={t("profile.notes_placeholder")}
            onChange={e => setDraft({ ...draft, notes: e.target.value })}
            style={{ ...s.input, resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          {!complete && (
            <span style={{ ...s.muted, color: "#c0392b", marginRight: "auto", fontSize: 12 }}>
              {t("common.required")}
            </span>
          )}
          {mode === "edit" && (
            <button onClick={onClose} style={s.btnGhost}>{t("common.cancel")}</button>
          )}
          <button onClick={save} disabled={!complete}
            style={{ ...s.btn, opacity: complete ? 1 : 0.5 }}>
            {mode === "setup" ? t("profile.get_started") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
    </ModalRoot>
  );
}
