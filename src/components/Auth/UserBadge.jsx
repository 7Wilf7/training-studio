import { useState, useEffect, useRef } from "react";
import { useT } from "../../i18n/LanguageContext";

const cellBase = {
  border: "1px solid var(--rule)",
  background: "var(--bg-elevated)",
  height: 32,
  padding: "0 12px",
  fontSize: 13,
  color: "var(--ink-2)",
  fontFamily: "var(--font-sans)",
  borderRadius: 0,
};

function emailPrefix(email) {
  if (!email) return "";
  const i = email.indexOf("@");
  return i > 0 ? email.slice(0, i) : email;
}

// Email cell is a dropdown trigger — opens a small menu with Change password
// + Sign out. Clicking outside or on a menu item closes it. The Sign out
// cell stays as a separate sibling on desktop so the most common action
// (sign out) is still one click — the menu only adds the less-common option.
export function UserBadge({ user, signOut, onChangePassword }) {
  const t = useT();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e) {
      if (!wrapRef.current?.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // Surfaced silently — Supabase only fails here on network errors, and
      // the user can retry. Keeping UI quiet matches the rest of this app.
    } finally {
      setSigningOut(false);
    }
  }

  const prefix = emailPrefix(user.email);

  return (
    <>
      <span ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          title={user.email}
          style={{
            ...cellBase,
            borderRight: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            maxWidth: 200,
            overflow: "hidden",
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          <span style={{ width: 6, height: 6, background: "var(--moss)", borderRadius: 0, flexShrink: 0 }} />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-1)",
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {prefix}
          </span>
          <span style={{ color: "var(--ink-3)", fontSize: 10, marginLeft: 2 }}>
            {menuOpen ? "▴" : "▾"}
          </span>
        </button>
        {menuOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--rule)",
            minWidth: 180,
            zIndex: 50,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onChangePassword?.(); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)",
                color: "var(--ink-1)",
                background: "transparent", border: "none",
                borderRadius: 0, cursor: "pointer",
              }}
            >
              {t("settings.change_password")}
            </button>
          </div>
        )}
      </span>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        title="Sign out"
        style={{
          ...cellBase,
          color: signingOut ? "var(--ink-3)" : "var(--ink-2)",
          cursor: signingOut ? "default" : "pointer",
        }}
      >
        {signingOut ? "…" : "Sign out"}
      </button>
    </>
  );
}
