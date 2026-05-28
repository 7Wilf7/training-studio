import { useState } from "react";
import { s } from "../styles";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import { getCurrentLocation } from "../lib/weather";
import { ModalRoot } from "./ModalRoot";

// Default location for weather lookups when the device can't (or won't)
// hand us GPS coordinates — APK without location permission, browser with
// permission denied, or a desktop on a fixed network. The values feed
// src/lib/weather.js → getCurrentLocation({ defaultLng, defaultLat })
// as the final fallback after the native/browser geolocation paths.
//
// We don't reverse-geocode the coords into a city name (that would need
// another API key); the user types whatever label is meaningful to them.
export function LocationSettingsModal({
  defaultLocation,
  setDefaultLocation,
  onClose,
}) {
  const t = useT();
  const isMobile = useIsMobile();
  const [lngDraft, setLngDraft] = useState(
    defaultLocation?.lng != null ? String(defaultLocation.lng) : ""
  );
  const [latDraft, setLatDraft] = useState(
    defaultLocation?.lat != null ? String(defaultLocation.lat) : ""
  );
  const [nameDraft, setNameDraft] = useState(defaultLocation?.name || "");
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function detectFromDevice() {
    setDetecting(true);
    setError("");
    try {
      const loc = await getCurrentLocation({}); // no defaults — force device path
      setLngDraft(String(loc.lng));
      setLatDraft(String(loc.lat));
    } catch (e) {
      setError(e.message === "no_location_available"
        ? t("location.error_no_permission")
        : t("location.error_generic", { msg: e.message }));
    }
    setDetecting(false);
  }

  async function handleSave() {
    setError("");
    const lng = lngDraft === "" ? null : Number(lngDraft);
    const lat = latDraft === "" ? null : Number(latDraft);
    // Validate only when at least one field is filled; allow clearing both
    // by leaving them empty (resets to "device-only, no fallback").
    if (lngDraft || latDraft) {
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        setError(t("location.error_bad_lng"));
        return;
      }
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        setError(t("location.error_bad_lat"));
        return;
      }
    }
    setSaving(true);
    try {
      await setDefaultLocation({
        lng: Number.isFinite(lng) ? lng : null,
        lat: Number.isFinite(lat) ? lat : null,
        name: nameDraft.trim(),
      });
      onClose();
    } catch (e) {
      setError(t("location.error_save", { msg: e.message }));
    }
    setSaving(false);
  }

  return (
    <ModalRoot onClose={onClose}>
      <div onClick={onClose} style={s.modalOverlay(isMobile)}>
        <div onClick={(e) => e.stopPropagation()} style={s.modalCard(isMobile, { maxWidth: 520 })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{t("location.title")}</h2>
            <button onClick={onClose} style={s.modalCloseBtn} aria-label="Close">×</button>
          </div>
          <div style={{ ...s.muted, marginBottom: 16, lineHeight: 1.55 }}>{t("location.hint")}</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>{t("location.name")}</div>
            <input type="text" value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t("location.name_placeholder")}
              style={s.input} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ ...s.label, marginBottom: 6 }}>{t("location.lng")}</div>
              <input type="number" step="0.0001" value={lngDraft}
                onChange={(e) => setLngDraft(e.target.value)}
                placeholder="121.4737"
                style={s.input} />
            </div>
            <div>
              <div style={{ ...s.label, marginBottom: 6 }}>{t("location.lat")}</div>
              <input type="number" step="0.0001" value={latDraft}
                onChange={(e) => setLatDraft(e.target.value)}
                placeholder="31.2304"
                style={s.input} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <button onClick={detectFromDevice} disabled={detecting}
              style={{ ...s.btnGhost, fontSize: 12, padding: "6px 12px", opacity: detecting ? 0.5 : 1 }}>
              {detecting ? t("location.detecting") : t("location.detect_button")}
            </button>
          </div>

          {error && (
            <div style={{
              padding: "8px 12px", marginBottom: 12,
              background: "rgba(192,57,43,0.08)",
              border: "1px solid rgba(192,57,43,0.3)",
              color: "var(--danger)",
              fontSize: 12, lineHeight: 1.5,
            }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={{ ...s.btn, opacity: saving ? 0.5 : 1 }}>
              {saving ? t("common.saving") : t("common.save")}
            </button>
            <button onClick={onClose} style={s.btnGhost}>{t("common.cancel")}</button>
          </div>
        </div>
      </div>
    </ModalRoot>
  );
}
