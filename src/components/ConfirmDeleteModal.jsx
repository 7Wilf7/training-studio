import { s } from "../styles";

export function ConfirmDeleteModal({ confirmDelete, setConfirmDelete, onConfirm }) {
  if (!confirmDelete) return null;

  let title = "Confirm";
  if (confirmDelete.type === "log") title = "Delete this activity?";
  if (confirmDelete.type === "logs") title = `Delete ${confirmDelete.ids.length} selected activities?`;
  if (confirmDelete.type === "race") title = "Delete this race?";
  if (confirmDelete.type === "chat") title = "Clear all chat messages?";

  return (
    <div onClick={() => setConfirmDelete(null)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", maxWidth: 360, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.5 }}>
          This action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => setConfirmDelete(null)} style={s.btnGhost}>Cancel</button>
          <button onClick={onConfirm} style={{ ...s.btn, background: "#c0392b", borderColor: "#c0392b" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
