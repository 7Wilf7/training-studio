import { useState } from "react";
import { s } from "../styles";
import { useT } from "../i18n/LanguageContext";
import { ModalRoot } from "./ModalRoot";

// Daily coach push settings. The toggle + hour are persisted to user_settings
// (push_enabled / push_hour / push_timezone); the server-side dispatch reads
// them to decide who to push and when. Timezone is auto-detected on save — the
// user picks a wall-clock hour, the server maps it to UTC via the IANA name.
//
// Push only fires on the Android APK (FCM). On web this screen still saves the
// preference, but no notification is delivered until the user is on the app.
export function PushSettingsModal({ pushEnabled, pushHour, pushTimezone, setPushSettings, onClose }) {
  const t = useT();
  const [enabled, setEnabled] = useState(pushEnabled === true);
  const [hour, setHour] = useState(Number.isFinite(pushHour) ? pushHour : 8);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Detected on save so the server always has a fresh IANA tz even if the user
  // travels; shown read-only so they understand what "8:00" is anchored to.
  const detectedTz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }
    catch { return ""; }
  })();

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await setPushSettings({
        pushEnabled: enabled,
        pushHour: hour,
        pushTimezone: detectedTz || pushTimezone || "",
      });
      setMsg(t("push.saved"));
      setTimeout(() => onClose(), 700);
    } catch (e) {
      setMsg(t("push.save_failed", { msg: e?.message || String(e) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalRoot onClose={onClose}>
      <div onClick={onClose} style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(20,20,19,0.45)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, padding: 16, overscrollBehavior: "contain",
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: "var(--bg-elevated)", border: "1px solid var(--rule)",
          borderRadius: 4, boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
          width: "100%", maxWidth: 480, maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto", padding: "22px 24px 20px", boxSizing: "border-box",
          fontFamily: "var(--font-sans)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <h2 style={{ fontSize: 19, fontWeight: 500, margin: 0 }}>{t("push.title")}</h2>
            <button onClick={onClose} style={s.modalCloseBtn} aria-label="Close">×</button>
          </div>
          <p style={{ ...s.muted, marginBottom: 18, lineHeight: 1.6, fontSize: 12 }}>
            {t("push.hint")}
          </p>

          {/* Enable toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => setEnabled(v => !v)}
              role="switch"
              aria-checked={enabled}
              style={{
                width: 46, height: 28, flexShrink: 0, borderRadius: 14,
                border: "1px solid var(--rule)",
                background: enabled ? "var(--moss)" : "var(--bg-sunken)",
                position: "relative", cursor: "pointer", transition: "background 0.15s",
                padding: 0,
              }}>
              <span style={{
                position: "absolute", top: 2, left: enabled ? 20 : 2,
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--bg-elevated)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                transition: "left 0.15s",
              }} />
            </button>
            <span style={{ fontSize: 15, color: "var(--ink-1)" }}>
              {enabled ? t("push.enabled_on") : t("push.enabled_off")}
            </span>
          </div>

          {/* Hour picker — only meaningful when enabled */}
          <div style={{ opacity: enabled ? 1 : 0.45, pointerEvents: enabled ? "auto" : "none", marginBottom: 14 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>{t("push.time_label")}</div>
            <select value={hour} onChange={e => setHour(parseInt(e.target.value, 10))}
              style={{ ...s.input, maxWidth: 140 }}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
            <div style={{ ...s.muted, fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
              {t("push.tz_note", { tz: detectedTz || pushTimezone || "—" })}
            </div>
          </div>

          <div style={{ ...s.muted, fontSize: 11, marginBottom: 14, lineHeight: 1.5 }}>
            {t("push.apk_note")}
          </div>

          {msg && (
            <div style={{
              color: msg.startsWith("✕") ? "var(--danger)" : "var(--moss-deep)",
              fontSize: 12, marginBottom: 12, lineHeight: 1.5,
            }}>{msg}</div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={onClose} style={s.btnGhost}>{t("common.cancel")}</button>
            <button onClick={save} disabled={busy}
              style={{ ...s.btn, opacity: busy ? 0.5 : 1 }}>
              {busy ? "…" : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </ModalRoot>
  );
}
