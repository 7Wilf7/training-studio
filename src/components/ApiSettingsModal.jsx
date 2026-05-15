import { useState } from "react";
import { s } from "../styles";
import { DEFAULT_API_ENDPOINT, MODEL_PRESETS, API_PRESETS } from "../constants";

function maskedKey(k) {
  if (!k) return "";
  if (k.length <= 12) return "•".repeat(k.length);
  return k.slice(0, 7) + "…" + k.slice(-4);
}

/**
 * Global API settings modal — used by both AI Coach chat and race lookup.
 * Triggered from the top-right header button.
 */
export function ApiSettingsModal({
  apiKey, setApiKey,
  apiEndpoint, setApiEndpoint,
  apiModel, setApiModel,
  onClose,
}) {
  const [keyDraft, setKeyDraft] = useState("");
  const [endpointDraft, setEndpointDraft] = useState(apiEndpoint);
  const [modelDraft, setModelDraft] = useState(apiModel);

  const isCustomEndpoint = apiEndpoint && apiEndpoint !== DEFAULT_API_ENDPOINT;

  function saveKey() {
    if (!keyDraft.trim()) return;
    setApiKey(keyDraft.trim());
    setKeyDraft("");
  }
  function clearKey() {
    setApiKey("");
  }
  function saveEndpoint() {
    const v = endpointDraft.trim();
    setApiEndpoint(v || DEFAULT_API_ENDPOINT);
  }
  function resetEndpoint() {
    setApiEndpoint(DEFAULT_API_ENDPOINT);
    setEndpointDraft(DEFAULT_API_ENDPOINT);
  }
  function saveModel() {
    const v = modelDraft.trim();
    if (v) setApiModel(v);
  }
  function pickModelPreset(m) {
    setModelDraft(m);
    setApiModel(m);
  }

  function applyApiPreset(preset) {
    setApiEndpoint(preset.endpoint);
    setEndpointDraft(preset.endpoint);
    setApiModel(preset.model);
    setModelDraft(preset.model);
  }

  // Match current endpoint+model against a preset so the chip can highlight
  function isActivePreset(preset) {
    return apiEndpoint === preset.endpoint && apiModel === preset.model;
  }

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 680, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", margin: "20px auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>API Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" }}>×</button>
        </div>
        <p style={{ ...s.muted, marginBottom: 14, lineHeight: 1.5 }}>
          Used by AI Coach chat and race lookup. Pick a preset below to fill URL+model in one click, then paste your API key. Stored only in this browser's localStorage.
        </p>

        {/* Quick presets — most common pairings */}
        <div style={{ ...s.cardDark, marginBottom: 20, padding: "12px 14px" }}>
          <div style={{ ...s.label, marginBottom: 8 }}>Quick Preset (fills URL + Model)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {API_PRESETS.map(p => (
              <button key={p.id} onClick={() => applyApiPreset(p)}
                style={{ ...s.chip(isActivePreset(p)), padding: "6px 12px" }}
                title={p.note}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ ...s.muted, marginTop: 8, fontSize: 11, lineHeight: 1.5 }}>
            Picking a preset overwrites URL and Model only. Your API key is never touched — paste a matching one below.
          </div>
        </div>

        {/* API Key */}
        <div style={{ ...s.label, marginBottom: 6 }}>API Key</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            type="password"
            placeholder={apiKey ? "Paste a new key to replace…" : "sk-ant-…"}
            value={keyDraft}
            onChange={e => setKeyDraft(e.target.value)}
            style={{ ...s.input, flex: 1, fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
          <button onClick={saveKey} disabled={!keyDraft.trim()}
            style={{ ...s.btn, opacity: keyDraft.trim() ? 1 : 0.5 }}>Save Key</button>
        </div>
        {apiKey && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18 }}>
            <span style={{ ...s.muted, fontFamily: "var(--font-mono)" }}>Current: {maskedKey(apiKey)}</span>
            <button onClick={clearKey} style={{ ...s.btnGhost, fontSize: 12, padding: "5px 10px", color: "#c0392b", borderColor: "#e8a89f" }}>
              Clear Key
            </button>
          </div>
        )}

        {/* Endpoint URL */}
        <div style={{ ...s.label, marginBottom: 6 }}>API Endpoint URL</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input
            type="text"
            placeholder={DEFAULT_API_ENDPOINT}
            value={endpointDraft}
            onChange={e => setEndpointDraft(e.target.value)}
            style={{ ...s.input, flex: 1, fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
          <button onClick={saveEndpoint}
            disabled={endpointDraft.trim() === apiEndpoint}
            style={{ ...s.btn, opacity: endpointDraft.trim() === apiEndpoint ? 0.5 : 1 }}>Save URL</button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "#666", marginBottom: 18 }}>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {isCustomEndpoint ? "⚠ Custom (third-party): " : "✓ Official: "}{apiEndpoint}
          </span>
          {isCustomEndpoint && (
            <button onClick={resetEndpoint} style={{ ...s.btnGhost, fontSize: 11, padding: "3px 8px" }}>
              Reset to Anthropic
            </button>
          )}
        </div>

        {/* Model */}
        <div style={{ ...s.label, marginBottom: 6 }}>
          Model
          <span style={{ ...s.muted, marginLeft: 6, fontWeight: 400 }}>
            (third-party relays often use custom aliases like <code style={{ background: "#eee", padding: "1px 4px", borderRadius: 3, fontFamily: "var(--font-mono)" }}>claude-opus-4-7</code>)
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input
            type="text"
            placeholder="model name…"
            value={modelDraft}
            onChange={e => setModelDraft(e.target.value)}
            style={{ ...s.input, flex: 1, fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
          <button onClick={saveModel}
            disabled={!modelDraft.trim() || modelDraft.trim() === apiModel}
            style={{ ...s.btn, opacity: (!modelDraft.trim() || modelDraft.trim() === apiModel) ? 0.5 : 1 }}>
            Save Model
          </button>
        </div>
        <div style={{ marginBottom: 6, fontSize: 11, color: "#666", fontFamily: "var(--font-mono)" }}>
          Active: {apiModel}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {MODEL_PRESETS.map(m => (
            <button key={m} onClick={() => pickModelPreset(m)}
              style={{ ...s.chip(apiModel === m), fontSize: 10, fontFamily: "var(--font-mono)", padding: "3px 8px" }}>
              {m}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={s.btn}>Done</button>
        </div>
      </div>
    </div>
  );
}
