import { useState, useEffect, useRef } from "react";
import { getMyLeaveRequests, cancelLeaveRequest, downloadApprovalLetter, uploadMedicalCertificate } from "../api/leave";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import Toast from "../components/Toast";
import "./MyLeaves.css";

const LEAVE_TYPE_ICON = {
  "Sick Leave":      "🤒",
  "Emergency Leave": "🚨",
  "Personal Leave":  "🧳",
  "Half-Day Leave":  "🕐",
};

const STATUS_STYLE = {
  Pending:   { bg: "var(--warning-bg)", color: "var(--warning)" },
  Approved:  { bg: "var(--success-bg)", color: "var(--success)" },
  Rejected:  { bg: "var(--danger-bg)",  color: "var(--danger)" },
  Cancelled: { bg: "var(--surface-2)",  color: "var(--muted)" },
};

const MEDICAL_STATUS_STYLE = {
  Pending:   { color: "var(--warning)" },
  Submitted: { color: "var(--success)" },
  Overdue:   { color: "var(--danger)" },
};

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE_MB = 5;

function MyLeaves() {
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");
  const { confirm, dialog } = useConfirm();

  // ── Medical certificate upload state ─────────────────────────
  // Tracks which leave request's file input is currently uploading,
  // so we can disable just that one button (not all of them at once).
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRefs = useRef({});   // one ref per leave request id

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
    if (req.leave_type === "Half-Day Leave") {
      return `${formatDate(req.leave_date)} (${req.session})`;
    }
    return formatDate(req.leave_date);
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredRequests = requests.filter((req) => {
    const matchesLeaveType = !leaveTypeFilter || req.leave_type === leaveTypeFilter;
    const searchableText = [
      req.reference,
      req.leave_type,
      req.status,
      req.reason,
      req.start_date,
      req.end_date,
      req.leave_date,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesLeaveType && (!normalizedSearch || searchableText.includes(normalizedSearch));
  });

  const hasActiveFilters = Boolean(searchQuery || leaveTypeFilter);

  const clearFilters = () => {
    setSearchQuery("");
    setLeaveTypeFilter("");
  };

  const handleCancel = async (req) => {
    const ok = await confirm({
      title: "Cancel Leave Request",
      message: `Are you sure you want to cancel your ${req.leave_type} request (${req.reference})?`,
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
      await downloadApprovalLetter(req.id, req.reference);
    } catch (err) {
      showToast(err?.message || "Failed to download letter.", "error");
    }
  };

  // ── Triggered when the hidden <input type="file"> changes ────
  const handleFileSelected = async (req, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── Client-side validation mirrors backend rules exactly ────
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      showToast("Invalid file type. Only PDF, JPEG, or PNG allowed.", "error");
      e.target.value = "";   // reset so the same bad file can be re-selected after fixing
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showToast(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`, "error");
      e.target.value = "";
      return;
    }

    setUploadingId(req.id);
    try {
      await uploadMedicalCertificate(req.id, file);
      // Update just this one request's medical_status locally —
      // avoids a full re-fetch for a single field change.
      setRequests(requests.map((r) =>
        r.id === req.id ? { ...r, medical_status: "Submitted" } : r
      ));
      showToast("Medical certificate uploaded successfully.", "success");
    } catch (err) {
      showToast(err?.message || "Failed to upload medical certificate.", "error");
    } finally {
      setUploadingId(null);
      e.target.value = "";   // allow re-selecting the same filename later if needed
    }
  };

  // Clicking our styled button just forwards the click to the
  // hidden native file input — this is the standard way to
  // style file inputs since the native one can't be styled directly.
  const triggerFilePicker = (reqId) => {
    fileInputRefs.current[reqId]?.click();
  };

  return (
    <div className="my-leaves-container">
      <div className="page-header">
        <div>
          <h1>📅 My Leave History</h1>
          <p>
            {hasActiveFilters
              ? `${filteredRequests.length} of ${requests.length}`
              : requests.length} request{requests.length !== 1 ? "s" : ""} submitted
          </p>
        </div>
      </div>

      {pageError && <p className="msg error">⚠️ {pageError}</p>}

      {!fetching && requests.length > 0 && (
        <div className="ml-toolbar" role="search" aria-label="Filter leave requests">
          <div className="ml-search-box">
            <span className="ml-search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              placeholder="Search by reference, status, or reason..."
              aria-label="Search leave requests"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="ml-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="ml-type-filter"
            aria-label="Filter by leave type"
            value={leaveTypeFilter}
            onChange={(e) => setLeaveTypeFilter(e.target.value)}
          >
            <option value="">All Leave Types</option>
            {Object.keys(LEAVE_TYPE_ICON).map((leaveType) => (
              <option key={leaveType} value={leaveType}>{leaveType}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button type="button" className="ml-clear-filters" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {fetching ? (
        <p className="loading-text">Loading your leave history...</p>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <p>📭</p>
          <p>You haven't submitted any leave requests yet.</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <p>🔎</p>
          <p>No leave requests match your search or selected leave type.</p>
          <button type="button" className="ml-empty-clear" onClick={clearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="my-leaves-list">
          {filteredRequests.map((req) => (
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
              <p className="my-leave-ref">{req.reference}</p>

              {req.medical_status && (
                <div className="my-leave-medical-section">
                  <p className="my-leave-medical">
                    🩺 Medical Certificate:{" "}
                    <strong style={{ color: MEDICAL_STATUS_STYLE[req.medical_status]?.color }}>
                      {req.medical_status}
                    </strong>
                  </p>

                  {/* Only show upload UI while it's still needed */}
                  {/* Upload only allowed once the leave itself is Approved —
                      checking medical_status alone isn't enough on its own,
                      since the frontend shouldn't rely on backend invariants
                      it can't see directly. */}
                  {req.status === "Approved" &&
                    (req.medical_status === "Pending" || req.medical_status === "Overdue") && (
                    <div className="my-leave-upload-row">
                      {/* Hidden native file input — triggered via the styled button below */}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        ref={(el) => (fileInputRefs.current[req.id] = el)}
                        onChange={(e) => handleFileSelected(req, e)}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        className={`ml-upload-btn ${req.medical_status === "Overdue" ? "overdue" : ""}`}
                        onClick={() => triggerFilePicker(req.id)}
                        disabled={uploadingId === req.id}
                      >
                        {uploadingId === req.id
                          ? "Uploading..."
                          : "📎 Upload Medical Certificate"}
                      </button>
                      <span className="my-leave-upload-hint">PDF, JPEG, or PNG · Max 5MB</span>
                    </div>
                  )}
                </div>
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
