import { useState } from "react";
import { s } from "../styles";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import { ModalRoot } from "./ModalRoot";

// Change-password modal. Reuses the same Supabase session token to update the
// password — no current-password verification (the API doesn't expose one).
// Caller passes changePassword(newPw) which throws on failure.
export function ChangePasswordModal({ changePassword, onClose }) {
  const t = useT();
  const isMobile = useIsMobile();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  async function submit() {
    setErrMsg("");
    setOkMsg("");
    if (pw.length < 6) {
      setErrMsg(t("pwd.too_short"));
      return;
    }
    if (pw !== pw2) {
      setErrMsg(t("pwd.mismatch"));
      return;
    }
    setBusy(true);
    try {
      await changePassword(pw);
      setOkMsg(t("pwd.success"));
      setPw("");
      setPw2("");
      // Auto-close shortly after success so the user sees the confirmation
      // without having to hunt for the X.
      setTimeout(() => { onClose(); }, 1200);
    } catch (err) {
      setErrMsg(t("pwd.error") + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalRoot>
      <div onClick={onClose} style={s.modalOverlay(isMobile)}>
        <div onClick={e => e.stopPropagation()}
          style={s.modalCard(isMobile, { maxWidth: 460 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{t("pwd.title")}</h2>
            <button onClick={onClose} style={s.modalCloseBtn} aria-label="Close">×</button>
          </div>
          <p style={{ ...s.muted, marginBottom: 18, lineHeight: 1.6 }}>{t("pwd.hint")}</p>

          <div style={{ ...s.label, marginBottom: 6 }}>{t("pwd.new")}</div>
          <input type="password" value={pw}
            onChange={e => setPw(e.target.value)}
            style={{ ...s.input, marginBottom: 12, fontFamily: "var(--font-mono)" }} />

          <div style={{ ...s.label, marginBottom: 6 }}>{t("pwd.confirm")}</div>
          <input type="password" value={pw2}
            onChange={e => setPw2(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !busy) submit(); }}
            style={{ ...s.input, marginBottom: 12, fontFamily: "var(--font-mono)" }} />

          {errMsg && (
            <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
              {errMsg}
            </div>
          )}
          {okMsg && (
            <div style={{ color: "var(--moss-deep)", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
              {okMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={onClose} style={s.btnGhost}>{t("common.cancel")}</button>
            <button onClick={submit} disabled={busy || !pw || !pw2}
              style={{ ...s.btn, opacity: busy || !pw || !pw2 ? 0.5 : 1 }}>
              {busy ? "…" : t("pwd.save")}
            </button>
          </div>
        </div>
      </div>
    </ModalRoot>
  );
}
