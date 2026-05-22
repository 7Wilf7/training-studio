import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n/LanguageContext";

/**
 * Mobile chrome — compact top header + content slot + fixed bottom tab bar.
 *
 * Phase 1 skeleton: the same 4 tabs as desktop (Training / Calendar / Races /
 * AI Coach). Final 4-tab pick happens in a later step; reordering / hiding
 * secondary tabs into the "more" menu is also TBD.
 *
 * Layout uses 100dvh so the bottom bar sits above mobile browser chrome
 * (Safari URL bar collapse, Android nav bar). safe-area-inset-* covers
 * iPhone notch / home indicator when launched as a PWA in standalone mode.
 */
export function MobileShell({
  children,
  tab, setTab,
  apiKey,
  lang, onToggleLang,
  onOpenApiSettings,
  onOpenProfile,
  signOut,
}) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  // Close the ⋯ menu on outside click. Keeps the menu lightweight (no portal,
  // no backdrop) — feels native enough for a phone-top dropdown.
  useEffect(() => {
    if (!moreOpen) return;
    function onClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [moreOpen]);

  const TABS = [
    { key: "tabs.training", idx: 0 },
    { key: "tabs.calendar", idx: 1 },
    { key: "tabs.races",    idx: 2 },
    { key: "tabs.ai_coach", idx: 3 },
  ];

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg)",
    }}>
      {/* ── Top header ─────────────────────────────────────────────────────
          Compact bar: brand left, ⋯ menu right. Sticky so it survives the
          tab content's scroll. paddingTop respects iOS notch on PWA. */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--bg)",
        borderBottom: "1px solid var(--rule)",
        paddingTop: "max(env(safe-area-inset-top), 0px)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px",
          minHeight: 48,
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 13,
            color: "var(--moss)", fontWeight: 600,
          }}>
            ▲ Training Studio
          </div>

          <div ref={moreRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMoreOpen(o => !o)}
              aria-label="More"
              style={{
                border: "1px solid var(--rule)",
                background: apiKey ? "var(--bg-elevated)" : "rgba(181,78,26,0.08)",
                color: apiKey ? "var(--ink-2)" : "var(--warn)",
                width: 44, height: 36,
                fontSize: 18, lineHeight: 1,
                borderRadius: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ⋯{!apiKey && <span style={{ fontSize: 11, marginLeft: 2 }}>⚠</span>}
            </button>

            {moreOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                minWidth: 200,
                background: "var(--bg-elevated)",
                border: "1px solid var(--rule)",
                borderRadius: 2,
                boxShadow: "0 8px 24px rgba(20,20,19,0.08)",
                display: "flex", flexDirection: "column",
                zIndex: 30,
              }}>
                <MenuLink
                  href="https://training-studio.gitbook.io/training-studio-docs"
                  label={t("header.guide")}
                />
                <MenuItem
                  onClick={() => { setMoreOpen(false); onToggleLang(); }}
                  label={lang === "en" ? "中文" : "English"}
                />
                <MenuItem
                  onClick={() => { setMoreOpen(false); onOpenApiSettings(); }}
                  label={`${t("header.api")}${!apiKey ? " ⚠" : ""}`}
                  warn={!apiKey}
                />
                <MenuItem
                  onClick={() => { setMoreOpen(false); onOpenProfile(); }}
                  label={t("header.profile")}
                />
                <MenuItem
                  onClick={() => { setMoreOpen(false); signOut(); }}
                  label="Sign out"
                  danger
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Content slot ───────────────────────────────────────────────────
          Owns its own scroll. Bottom padding reserves room for the fixed
          tab bar (56px) + iOS home indicator (safe-area-inset-bottom). */}
      <main style={{
        flex: 1,
        padding: "14px 14px 0",
        paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
      }}>
        {children}
      </main>

      {/* ── Bottom tab bar ─────────────────────────────────────────────────
          Fixed at viewport bottom. 4 equal cells. Active cell gets a top
          accent rule + ink-1 weight. Safe-area padding keeps labels above
          iPhone's home indicator. */}
      <nav style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        zIndex: 20,
        background: "var(--bg-elevated)",
        borderTop: "1px solid var(--rule)",
        paddingBottom: "env(safe-area-inset-bottom)",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
      }}>
        {TABS.map(({ key, idx }) => {
          const active = tab === idx;
          return (
            <button
              key={key}
              onClick={() => setTab(idx)}
              style={{
                background: "transparent",
                border: "none",
                borderTop: active ? "2px solid var(--ink-1)" : "2px solid transparent",
                marginTop: -1,  // bleed into nav top border so the 2px rule sits flush
                padding: "10px 4px 12px",
                minHeight: 56,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? "var(--ink-1)" : "var(--ink-3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 0,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {t(key)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function MenuItem({ onClick, label, warn, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid var(--rule-soft)",
        padding: "12px 14px",
        fontSize: 14,
        color: danger ? "var(--danger)" : warn ? "var(--warn)" : "var(--ink-1)",
        fontFamily: "var(--font-sans)",
        borderRadius: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </button>
  );
}

function MenuLink({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "block",
        textDecoration: "none",
        borderBottom: "1px solid var(--rule-soft)",
        padding: "12px 14px",
        fontSize: 14,
        color: "var(--ink-1)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {label}
    </a>
  );
}
