import { useState } from "react";
import { s } from "../styles";
import { API_PROVIDERS } from "../constants";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import { ModalRoot } from "./ModalRoot";

function maskedKey(k) {
  if (!k) return "";
  if (k.length <= 12) return "•".repeat(k.length);
  return k.slice(0, 7) + "…" + k.slice(-4);
}

/**
 * API settings — two Anthropic-compatible providers (DeepSeek + Claude). The
 * user can paste keys for BOTH and toggle which provider drives the chat;
 * model presets come from whichever provider is active. Endpoint URLs stay
 * hidden — users only pick a provider + paste a key.
 */
export function ApiSettingsModal({
  apiProvider, setApiProvider,
  apiKey, setApiKey,
  claudeApiKey, setClaudeApiKey,
  apiModel, setApiModel,
  onClose,
}) {
  const t = useT();
  const isMobile = useIsMobile();
  const [deepseekDraft, setDeepseekDraft] = useState("");
  const [claudeDraft, setClaudeDraft] = useState("");

  const provider = API_PROVIDERS[apiProvider] || API_PROVIDERS.deepseek;

  function saveDeepseekKey() {
    if (!deepseekDraft.trim()) return;
    setApiKey(deepseekDraft.trim());
    setDeepseekDraft("");
  }
  function saveClaudeKey() {
    if (!claudeDraft.trim()) return;
    setClaudeApiKey(claudeDraft.trim());
    setClaudeDraft("");
  }

  // Provider switch also resets the model preset to that provider's default
  // (avoids leaving e.g. a Claude model selected after switching back to DeepSeek).
  function switchProvider(next) {
    if (next === apiProvider) return;
    setApiProvider(next);
    setApiModel(API_PROVIDERS[next].defaultModel);
  }

  const sectionH = { fontSize: 16, fontWeight: 600, color: "var(--ink-1)", margin: "0 0 4px" };

  return (
    <ModalRoot>
    <div onClick={onClose} style={s.modalOverlay(isMobile)}>
      <div onClick={e => e.stopPropagation()}
        style={s.modalCard(isMobile, { maxWidth: 600 })}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{t("api.title")}</h2>
          <button onClick={onClose} style={s.modalCloseBtn} aria-label="Close">×</button>
        </div>
        <p style={{ ...s.muted, marginBottom: 22, lineHeight: 1.6 }}>{t("api.desc_multi")}</p>

        {/* Provider switch */}
        <div style={{ ...s.label, marginBottom: 6 }}>{t("api.provider_label")}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {Object.values(API_PROVIDERS).map(p => (
            <button key={p.id} onClick={() => switchProvider(p.id)}
              style={s.chip(apiProvider === p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        {/* DeepSeek key */}
        <h3 style={sectionH}>DeepSeek</h3>
        <p style={{ ...s.muted, marginBottom: 10, lineHeight: 1.6 }}>
          <a href={API_PROVIDERS.deepseek.signupUrl} target="_blank" rel="noreferrer"
            style={{ color: "var(--moss-deep)", textDecoration: "underline" }}>
            {t("api.signup_link")}
          </a>
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            type="password"
            placeholder={apiKey ? t("api.key_placeholder_set") : t("api.ds_key_placeholder")}
            value={deepseekDraft}
            onChange={e => setDeepseekDraft(e.target.value)}
            style={{ ...s.input, flex: 1, fontFamily: "var(--font-mono)", fontSize: 13 }}
          />
          <button onClick={saveDeepseekKey} disabled={!deepseekDraft.trim()}
            style={{ ...s.btn, opacity: deepseekDraft.trim() ? 1 : 0.5 }}>{t("api.save_key")}</button>
        </div>
        {apiKey && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18 }}>
            <span style={{ ...s.muted, fontFamily: "var(--font-mono)" }}>{t("api.current", { key: maskedKey(apiKey) })}</span>
            <button onClick={() => setApiKey("")}
              style={{ ...s.btnGhost, fontSize: 12, padding: "5px 10px", color: "var(--danger)", borderColor: "var(--danger)" }}>
              {t("api.clear_key")}
            </button>
          </div>
        )}

        {/* Claude key */}
        <h3 style={{ ...sectionH, marginTop: 18 }}>Claude (Anthropic)</h3>
        <p style={{ ...s.muted, marginBottom: 10, lineHeight: 1.6 }}>
          <a href={API_PROVIDERS.claude.signupUrl} target="_blank" rel="noreferrer"
            style={{ color: "var(--moss-deep)", textDecoration: "underline" }}>
            {t("api.signup_link")}
          </a>
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            type="password"
            placeholder={claudeApiKey ? t("api.key_placeholder_set") : t("api.claude_key_placeholder")}
            value={claudeDraft}
            onChange={e => setClaudeDraft(e.target.value)}
            style={{ ...s.input, flex: 1, fontFamily: "var(--font-mono)", fontSize: 13 }}
          />
          <button onClick={saveClaudeKey} disabled={!claudeDraft.trim()}
            style={{ ...s.btn, opacity: claudeDraft.trim() ? 1 : 0.5 }}>{t("api.save_key")}</button>
        </div>
        {claudeApiKey && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
            <span style={{ ...s.muted, fontFamily: "var(--font-mono)" }}>{t("api.current", { key: maskedKey(claudeApiKey) })}</span>
            <button onClick={() => setClaudeApiKey("")}
              style={{ ...s.btnGhost, fontSize: 12, padding: "5px 10px", color: "var(--danger)", borderColor: "var(--danger)" }}>
              {t("api.clear_key")}
            </button>
          </div>
        )}

        {/* Model picker — driven by the active provider's catalog */}
        <div style={{ ...s.label, marginBottom: 6, marginTop: 12 }}>{t("api.model_label")} · {provider.label}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {provider.models.map(m => (
            <button key={m} onClick={() => setApiModel(m)}
              style={{ ...s.chip(apiModel === m), fontFamily: "var(--font-mono)" }}>
              {m}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={onClose} style={s.btn}>{t("common.done")}</button>
        </div>
      </div>
    </div>
    </ModalRoot>
  );
}
