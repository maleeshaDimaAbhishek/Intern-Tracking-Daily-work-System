import "./ConfirmDialog.css";

function ConfirmDialog({ title, message, confirmText = "Confirm", confirmType = "danger", onConfirm, onCancel }) {
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>

        <div className={`confirm-icon-wrap ${confirmType}`}>
          <span className="confirm-icon">
            {confirmType === "danger"  ? "🗑️" :
             confirmType === "warning" ? "⚠️" : "❓"}
          </span>
        </div>

        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button className="confirm-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`confirm-ok-btn ${confirmType}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}

export default ConfirmDialog;