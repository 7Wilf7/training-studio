import { useState } from "react";
import { s } from "../styles";
import {
  DEFAULT_DAILY_TEMPLATE,
  COACH_STYLES, OUTPUT_LENGTHS, INTERVENTION_LEVELS,
} from "../constants";
import { formatDuration, formatPaceFromSec } from "../utils/format";
import { buildSystemPrompt } from "../utils/profile";

export function AICoachTab({
  logs, races, profile, coachConfig, setCoachConfig,
  chatMessages, setChatMessages, now, setConfirmDelete,
  apiKey, apiEndpoint, apiModel, onEditProfile,
}) {
  const [showCoachConfig, setShowCoachConfig] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [chatInput, setChatInput] = useState(DEFAULT_DAILY_TEMPLATE);
  const [chatLoading, setChatLoading] = useState(false);

  function clearChat() {
    setConfirmDelete({ type: "chat", id: null });
  }

  function setStyle(id)        { setCoachConfig({ ...coachConfig, style: id }); }
  function setOutputLength(id) { setCoachConfig({ ...coachConfig, outputLength: id }); }
  function setIntervention(id) { setCoachConfig({ ...coachConfig, intervention: id }); }

  // Dynamic data block injected into the system prompt for every message
  function buildDataBlock() {
    const recentLogs = logs.slice(0, 10).map(l =>
      `${l.date} ${l.type}${l.subTypes.length ? "(" + l.subTypes.join(",") + ")" : ""} ${l.distance > 0 ? l.distance + "km" : ""} ${formatDuration(l.duration)}${l.pace ? " " + formatPaceFromSec(l.pace) + "/km" : ""}${l.hr ? " HR" + l.hr : ""}${l.ascent ? " +" + l.ascent + "m" : ""}`
    ).join("\n");
    const targetRaces = races.filter(r => r.isTarget).map(r => {
      const goal = [r.resultH, r.resultM, r.resultS].some(Boolean) ? `${r.resultH || "0"}h${r.resultM || "0"}m${r.resultS || "0"}s` : "—";
      return `[${r.priority}] ${r.name}${r.category ? ` (${r.category})` : ""} on ${r.date} (${r.distance}${r.ascent ? ", +" + r.ascent + "m" : ""}) - goal: ${goal}`;
    }).join("\n") || "None";
    const historyRaces = races.filter(r => !r.isTarget).map(r => {
      const result = [r.resultH, r.resultM, r.resultS].some(Boolean) ? `${r.resultH || "0"}:${r.resultM || "0"}:${r.resultS || "0"}` : "—";
      return `${r.date} ${r.name}${r.category ? ` [${r.category}]` : ""} ${r.distance} → ${result}${r.itraScore ? " ITRA " + r.itraScore : ""}`;
    }).join("\n") || "None";

    return `[Current Date] ${now.toISOString().slice(0, 16).replace("T", " ")} GMT+8

[Target Races]
${targetRaces}

[Race History]
${historyRaces}

[Recent Activities (last 10)]
${recentLogs}`;
  }

  const previewPrompt = buildSystemPrompt({ profile, coachConfig, dataBlock: buildDataBlock() });

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    if (!apiKey) {
      setChatMessages([...chatMessages, { role: "assistant", content: "⚠ No Anthropic API key configured. Click the 🔑 API button in the top-right and set one." }]);
      return;
    }
    const userMsg = chatInput.trim();
    setChatLoading(true);

    const systemPrompt = buildSystemPrompt({ profile, coachConfig, dataBlock: buildDataBlock() });
    const newMessages = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(newMessages);
    setChatInput("");

    console.log("[AI Coach] POST to:", apiEndpoint, "key length:", apiKey.length, "prompt length:", systemPrompt.length);
    try {
      const resp = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: apiModel,
          max_tokens: 1200,
          system: systemPrompt,
          messages: newMessages,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        const msg = data.error?.message || `HTTP ${resp.status}`;
        console.error("[AI Coach] API error:", data);
        setChatMessages([...newMessages, { role: "assistant", content: `API error: ${msg}` }]);
      } else {
        const reply = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "No response.";
        setChatMessages([...newMessages, { role: "assistant", content: reply }]);
      }
    } catch (err) {
      console.error("[AI Coach] Network error fetching", apiEndpoint, err);
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: `Network error: ${err.message}\nURL used: ${apiEndpoint}\n\nOpen DevTools (F12) → Network tab → try Send again to see the failing request.` },
      ]);
    }
    setChatLoading(false);
  }

  return (
    <div>
      {/* Top toolbar — left→right: Edit Profile, Coach Config, Preview Prompt, Clear Chat */}
      <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onEditProfile} style={s.btnGhost}>⚙ Edit Profile</button>
        <button onClick={() => setShowCoachConfig(!showCoachConfig)} style={s.btnGhost}>
          {showCoachConfig ? "Hide" : "Coach"} Config
        </button>
        <button onClick={() => setShowPromptPreview(!showPromptPreview)} style={s.btnGhost}>
          {showPromptPreview ? "Hide" : "Preview"} Prompt
        </button>
        {chatMessages.length > 0 && (
          <button onClick={clearChat} style={s.btnGhost}>Clear Chat</button>
        )}
      </div>

      {/* Coach Config */}
      {showCoachConfig && (
        <div style={{ ...s.cardDark, marginBottom: 14 }}>
          <div style={s.section}>Coach Behavior</div>
          <div style={{ ...s.muted, marginBottom: 12, lineHeight: 1.5 }}>
            Each axis has 3 levels — pick what fits today, change anytime.
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>Coaching Style</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {COACH_STYLES.map(o => (
                <button key={o.id} onClick={() => setStyle(o.id)}
                  style={s.chip(coachConfig.style === o.id)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>Output Length</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {OUTPUT_LENGTHS.map(o => (
                <button key={o.id} onClick={() => setOutputLength(o.id)}
                  style={s.chip(coachConfig.outputLength === o.id)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 4 }}>
            <div style={{ ...s.label, marginBottom: 6 }}>Risk Reminder Intensity</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {INTERVENTION_LEVELS.map(o => (
                <button key={o.id} onClick={() => setIntervention(o.id)}
                  style={s.chip(coachConfig.intervention === o.id)}>{o.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prompt preview */}
      {showPromptPreview && (
        <div style={{ ...s.cardDark, marginBottom: 14 }}>
          <div style={s.section}>System Prompt Preview (auto-assembled, read-only)</div>
          <pre style={{
            ...s.input, fontFamily: "var(--font-mono)", fontSize: 11,
            whiteSpace: "pre-wrap", lineHeight: 1.5, maxHeight: 360, overflowY: "auto",
            color: "#444", background: "#fafafa",
          }}>{previewPrompt}</pre>
          <div style={{ ...s.muted, marginTop: 6 }}>
            This is sent as the system prompt with every message. Change it via Edit Profile or Coach Config.
          </div>
        </div>
      )}

      {/* Chat history */}
      <div style={{ ...s.card, marginBottom: 12, minHeight: 200, maxHeight: 500, overflowY: "auto" }}>
        {chatMessages.length === 0 ? (
          <div style={{ color: "#888", textAlign: "center", padding: 30, fontSize: 13 }}>
            Daily check-in with your AI coach.<br />
            Your profile, coach config, target races, and recent activities are sent automatically with each message.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.role === "user" ? "#222" : "#f5f5f5",
                color: m.role === "user" ? "#fff" : "#222",
                borderRadius: 10, padding: "10px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap",
              }}>{m.content}</div>
            ))}
            {chatLoading && <div style={{ alignSelf: "flex-start", color: "#888", fontSize: 13 }}>Coach is thinking...</div>}
          </div>
        )}
      </div>

      {/* Input — tall enough to show the full default template at once */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea rows={9} placeholder="Today's check-in..." value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendChat(); }}
          style={{ ...s.input, resize: "vertical", fontFamily: "var(--font-sans)", flex: 1, lineHeight: 1.5 }} />
        <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ ...s.btn, padding: "10px 20px", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>Send</button>
      </div>
      <div style={{ ...s.muted, marginTop: 6, fontSize: 11 }}>Tip: Ctrl/⌘+Enter to send · Chat history saved locally</div>
    </div>
  );
}
