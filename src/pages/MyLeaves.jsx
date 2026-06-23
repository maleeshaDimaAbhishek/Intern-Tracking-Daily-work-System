import { useState, useEffect } from "react";
import { getMyLeaveRequests, cancelLeaveRequest, downloadApprovalLetter } from "../api/leave";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import Toast from "../components/Toast";
import "./MyLeaves.css";

const LEAVE_TYPE_ICON = {
  "Sick Leave":      "🤒",
  "Emergency Leave": "🚨",
  "Personal Leave":  "🧳",
  "Half Day Leave":  "🕐",
};

const STATUS_STYLE = {
  Pending:   { bg: "var(--warning-bg)", color: "var(--warning)" },
  Approved:  { bg: "var(--success-bg)", color: "var(--success)" },
  Rejected:  { bg: "var(--danger-bg)",  color: "var(--danger)" },
  Cancelled: { bg: "var(--surface-2)",  color: "var(--muted)" },
};

function MyLeaves() {
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => { fetchMyLeaves(); }, []);

  const fetchMyLeaves = async () => {
    setFetching(true);
    setPageError("");
    try {
      const data = await getMyLeaveRequests();
      setRequests(data);
    } catch {
      setPageError("Could not load your leave requests.");
    } finally {
      setFetching(false);
    }
  };

  const showToast = (message, type = "success") => setToast({ message, type });

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const getDateRangeLabel = (req) => {
    if (req.leave_type === "Sick Leave" || req.leave_type === "Personal Leave") {
      return `${formatDate(req.start_date)} → ${formatDate(req.end_date)}`;
    }
    if (req.leave_type === "Half Day Leave") {
      return `${formatDate(req.leave_date)} (${req.session})`;
    }
    return formatDate(req.leave_date);
  };

  const handleCancel = async (req) => {
    const ok = await confirm({
      title: "Cancel Leave Request",
      message: `Are you sure you want to cancel your ${req.leave_type} request (${req.reference_number})?`,
      confirmText: "Yes, Cancel",
      confirmType: "danger",
    });
    if (!ok) return;

    try {
      await cancelLeaveRequest(req.id);
      setRequests(requests.map((r) => r.id === req.id ? { ...r, status: "Cancelled" } : r));
      showToast("Leave request cancelled.", "warning");
    } catch (err) {
      showToast(err?.message || "Failed to cancel request.", "error");
    }
  };

  const handleDownload = async (req) => {
    try {
      await downloadApprovalLetter(req.id, req.reference_number);
    } catch (err) {
      showToast(err?.message || "Failed to download letter.", "error");
    }
  };

  return (
    <div className="my-leaves-container">
      <div className="page-header">
        <div>
          <h1>📅 My Leave History</h1>
          <p>{requests.length} request{requests.length !== 1 ? "s" : ""} submitted</p>
        </div>
      </div>

      {pageError && <p className="msg error">⚠️ {pageError}</p>}

      {fetching ? (
        <p className="loading-text">Loading your leave history...</p>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <p>📭</p>
          <p>You haven't submitted any leave requests yet.</p>
        </div>
      ) : (
        <div className="my-leaves-list">
          {requests.map((req) => (
            <div key={req.id} className="my-leave-card">
              <div className="my-leave-top">
                <span className="my-leave-type">
                  {LEAVE_TYPE_ICON[req.leave_type] || "📄"} {req.leave_type}
                </span>
                <span
                  className="al-status-badge"
                  style={{
                    background: STATUS_STYLE[req.status]?.bg,
                    color: STATUS_STYLE[req.status]?.color,
                  }}
                >
                  {req.status}
                </span>
              </div>

              <p className="my-leave-dates">📅 {getDateRangeLabel(req)}</p>
              <p className="my-leave-reason">{req.reason}</p>
              <p className="my-leave-ref">{req.reference_number}</p>

              {req.medical_status && (
                <p className="my-leave-medical">
                  🩺 Medical Certificate:{" "}
                  <strong style={{
                    color:
                      req.medical_status === "Submitted" ? "var(--success)" :
                      req.medical_status === "Overdue"   ? "var(--danger)"  : "var(--warning)",
                  }}>
                    {req.medical_status}
                  </strong>
                </p>
              )}

              <div className="my-leave-actions">
                {req.status === "Pending" && (
                  <button className="ml-cancel-btn" onClick={() => handleCancel(req)}>
                    Cancel Request
                  </button>
                )}
                {req.status === "Approved" && (
                  <button className="ml-download-btn" onClick={() => handleDownload(req)}>
                    📄 Download Approval Letter
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {dialog && <ConfirmDialog {...dialog} />}
    </div>
  );
}

export default MyLeaves;