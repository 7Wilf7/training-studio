import { s } from "../styles";
import { useT } from "../i18n/LanguageContext";

export function ConfirmDeleteModal({ confirmDelete, setConfirmDelete, onConfirm }) {
  const t = useT();
  if (!confirmDelete) return null;

  let title = "";
  if (confirmDelete.type === "log")  title = t("confirm.title.log");
  if (confirmDelete.type === "logs") title = t("confirm.title.logs", { n: confirmDelete.ids.length });
  if (confirmDelete.type === "race") title = t("confirm.title.race");
  if (confirmDelete.type === "chat") title = t("confirm.title.chat");

  return (
    <div onClick={() => setConfirmDelete(null)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", maxWidth: 360, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.5 }}>{t("common.undo_warning")}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setConfirmDelete(null)}
            style={{ ...s.btnGhost, minHeight: 44, padding: "10px 18px" }}>
            {t("common.cancel")}
          </button>
          <button onClick={onConfirm}
            style={{ ...s.btn, background: "#c0392b", borderColor: "#c0392b", minHeight: 44, padding: "10px 18px" }}>
            {t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
