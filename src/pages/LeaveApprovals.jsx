import { useState, useEffect } from "react";
import { getPendingApprovals, decideLeaveRequest } from "../api/leave";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import "./LeaveApprovals.css";

// ── Leave type icons — same set used in LeaveRequest.jsx ────────
const LEAVE_TYPE_ICON = {
  "Sick Leave":      "🤒",
  "Emergency Leave": "🚨",
  "Personal Leave":  "🧳",
  "Half Day Leave":  "🕐",
};

function LeaveApprovals() {
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // ── Decision modal state ──────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState("");   // "Approved" | "Rejected"
  const [comment, setComment]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setFetching(true);
    setPageError("");
    try {
      const data = await getPendingApprovals();
      setRequests(data);
    } catch {
      setPageError("Could not load pending leave requests.");
    } finally {
      setFetching(false);
    }
  };

  const showFeedback = (message, type = "success") => {
    setFeedback({ message, type });
    setToast({ message, type });
  };

  // ── Formatting helpers ──────────────────────────────────────────
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

  // ── Open decision modal ──────────────────────────────────────────
  const openDecisionModal = (request, initialDecision) => {
    setSelectedRequest(request);
    setDecision(initialDecision);
    setComment("");
    setModalError("");
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setDecision("");
    setComment("");
    setModalError("");
  };

  const handleConfirmDecision = async (e) => {
    e.preventDefault();
    setModalError("");

    if (decision === "Rejected" && comment.trim().length === 0) {
      setModalError("Please provide a reason for rejection.");
      return;
    }

    setSubmitting(true);
    try {
      await decideLeaveRequest(selectedRequest.id, decision, comment.trim());
      setRequests((currentRequests) => currentRequests.filter((r) => r.id !== selectedRequest.id));
      showFeedback(
        decision === "Approved"
          ? `${selectedRequest.user_name}'s leave request was approved successfully.`
          : `${selectedRequest.user_name}'s leave request was rejected.`,
        decision === "Approved" ? "success" : "warning"
      );
      closeModal();
    } catch (err) {
      setModalError(err?.message || "Failed to record decision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="leave-approvals-container">
      <div className="page-header">
        <div>
          <h1>📋 Leave Approvals</h1>
          <p>{requests.length} request{requests.length !== 1 ? "s" : ""} awaiting your decision</p>
        </div>
      </div>

      {pageError && <p className="msg error">⚠️ {pageError}</p>}

      {feedback && (
        <div className={`approval-feedback approval-feedback-${feedback.type}`} role="status">
          <span>{feedback.message}</span>
          <button
            type="button"
            className="approval-feedback-close"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {fetching ? (
        <p className="loading-text">Loading pending requests...</p>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <p>✅</p>
          <p>No pending leave requests. You're all caught up!</p>
        </div>
      ) : (
        <div className="approval-list">
          {requests.map((req) => (
            <div key={req.id} className="approval-card">

              <div className="approval-card-top">
                <div className="approval-employee">
                  <div className="approval-avatar">
                    {(req.user_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="approval-employee-name">{req.user_name}</p>
                    <p className="approval-employee-email">{req.user_email}</p>
                  </div>
                </div>
                <span className="approval-type-badge">
                  {LEAVE_TYPE_ICON[req.leave_type] || "📄"} {req.leave_type}
                </span>
              </div>

              <div className="approval-card-body">
                <div className="approval-detail-row">
                  <span className="approval-detail-label">📅 Date(s)</span>
                  <span className="approval-detail-value">{getDateRangeLabel(req)}</span>
                </div>
                <div className="approval-detail-row">
                  <span className="approval-detail-label">🔖 Reference</span>
                  <span className="approval-detail-value approval-ref">{req.reference_number}</span>
                </div>
                <div className="approval-detail-row">
                  <span className="approval-detail-label">💬 Reason</span>
                  <span className="approval-detail-value">{req.reason}</span>
                </div>
              </div>

              <div className="approval-card-actions">
                <button
                  className="approve-btn"
                  onClick={() => openDecisionModal(req, "Approved")}
                >
                  ✅ Approve
                </button>
                <button
                  className="reject-btn"
                  onClick={() => openDecisionModal(req, "Rejected")}
                >
                  ❌ Reject
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── Decision Modal ── */}
      {selectedRequest && (
        <Modal
          title={`${decision === "Approved" ? "✅ Approve" : "❌ Reject"} — ${selectedRequest.user_name}`}
          onClose={closeModal}
        >
          <form onSubmit={handleConfirmDecision} className="modal-form">

            <div className="approval-summary-strip">
              <p><strong>{selectedRequest.leave_type}</strong> · {getDateRangeLabel(selectedRequest)}</p>
              <p className="approval-summary-ref">{selectedRequest.reference_number}</p>
            </div>

            <div className="form-group">
              <label>
                Comment
                {decision === "Rejected" && <span className="label-hint"> (required)</span>}
                {decision === "Approved" && <span className="label-hint"> (optional)</span>}
              </label>
              <textarea
                placeholder={
                  decision === "Approved"
                    ? "e.g. Approved. Please plan your handover before leave starts."
                    : "Please explain why this request is being rejected..."
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>

            {modalError && <p className="msg error">⚠️ {modalError}</p>}

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="submit"
                className={decision === "Approved" ? "primary-btn" : "reject-confirm-btn"}
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : decision === "Approved" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>

          </form>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default LeaveApprovals;
