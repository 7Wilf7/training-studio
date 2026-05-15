import { TYPE_COLOR } from "./constants";

export const s = {
  card: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 16px" },
  cardDark: { background: "#f7f7f7", border: "1px solid #ececec", borderRadius: 10, padding: "14px 16px" },
  tag: (t) => ({ fontSize: 11, background: TYPE_COLOR[t] || "#888", color: "#fff", borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap", fontWeight: 500 }),
  subTag: { fontSize: 11, background: "#fff", color: "#555", border: "1px solid #ddd", borderRadius: 4, padding: "1px 7px", whiteSpace: "nowrap" },
  label: { fontSize: 12, color: "#888", marginBottom: 4 },
  metricVal: { fontSize: 22, fontWeight: 500, color: "#111", marginTop: 2 },
  section: { fontSize: 13, fontWeight: 500, color: "#111", marginBottom: 10 },
  muted: { fontSize: 12, color: "#888" },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 6, padding: "9px 10px", fontSize: 14, background: "#fff", color: "#111", outline: "none" },
  btn: { border: "1px solid #222", borderRadius: 6, padding: "9px 16px", fontSize: 14, background: "#222", color: "#fff", cursor: "pointer", fontWeight: 500 },
  btnGhost: { border: "1px solid #ddd", borderRadius: 6, padding: "9px 14px", fontSize: 14, background: "#fff", color: "#444", cursor: "pointer" },
  chip: (active) => ({
    border: "1px solid " + (active ? "#222" : "#ddd"),
    background: active ? "#222" : "#fff", color: active ? "#fff" : "#444",
    borderRadius: 16, padding: "5px 12px", fontSize: 12, cursor: "pointer",
    whiteSpace: "nowrap", flexShrink: 0
  }),
};
