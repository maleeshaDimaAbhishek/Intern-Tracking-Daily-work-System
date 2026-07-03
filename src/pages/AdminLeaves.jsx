import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyLeaveRequests, getLeaveRequestById, getAuditLogsByLeave, downloadApprovalLetter, getMedicalCertificateStatus } from "../api/leave";
import Modal from "../components/Modal";
import "./AdminLeaves.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

// Human-readable labels for raw audit action strings
const ACTION_LABEL = {
  leave_submitted:   "📝 Leave Submitted",
  leave_approved:    "✅ Leave Approved",
  leave_rejected:    "❌ Leave Rejected",
  leave_cancelled:   "🚫 Leave Cancelled",
  leave_updated:     "✏️ Leave Updated",
  medical_uploaded:  "📎 Medical Certificate Uploaded",
  medical_overdue:   "⚠️ Medical Certificate Overdue",
};

function AdminLeaves() {
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";

  const [requests, setRequests]   = useState([]);
  const [fetching, setFetching]   = useState(true);
  const [pageError, setPageError] = useState("");

  // ── Filters ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter]     = useState("");

  // ── Detail modal ─────────────────────────────────────────────
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [auditLogs, setAuditLogs]         = useState([]);
  const [auditLoading, setAuditLoading]   = useState(false);
  const [medicalCert, setMedicalCert]     = useState(null);   // holds file_path once fetched

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setFetching(true);
    setPageError("");
    try {
      const data = await getMyLeaveRequests();   // role-aware — admin gets ALL
      setRequests(data);
    } catch {
      setPageError("Could not load leave requests.");
    } finally {
      setFetching(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const getDateRangeLabel = (req) => {
    if (req.leave_type === "Sick Leave" || req.leave_type === "Personal Leave") {
      return `${formatDate(req.start_date)} → ${formatDate(req.end_date)}`;
    }
    if (req.leave_type === "Half-Day Leave") {
      return `${formatDate(req.leave_date)} (${req.session})`;
    }
    return formatDate(req.leave_date);
  };

  // ── Filtering logic ──────────────────────────────────────────
  const filteredRequests = requests.filter((req) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (req.user_name || "").toLowerCase().includes(q) ||
      (req.user_email || "").toLowerCase().includes(q) ||
      (req.reference || "").toLowerCase().includes(q);

    const matchesStatus = !statusFilter || req.status === statusFilter;
    const matchesType   = !typeFilter   || req.leave_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // ── Open detail modal — fetch full record + audit trail ──────
  const openDetail = async (leaveId) => {
    setDetailLoading(true);
    setAuditLoading(true);
    setSelectedLeave(null);
    setAuditLogs([]);
    setMedicalCert(null);

    let detail = null;
    try {
      detail = await getLeaveRequestById(leaveId);
      setSelectedLeave(detail);
    } catch {
      setSelectedLeave({ error: true });
    } finally {
      setDetailLoading(false);
    }

    try {
      const logs = await getAuditLogsByLeave(leaveId);
      setAuditLogs(logs);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }

    // Only Sick Leave can ever have a certificate — skip the call
    // entirely otherwise (it would 404 on the backend anyway).
    if (detail && detail.leave_type === "Sick Leave" && detail.medical_status) {
      try {
        const cert = await getMedicalCertificateStatus(leaveId);
        setMedicalCert(cert);
      } catch {
        setMedicalCert(null);
      }
    }
  };

  const closeDetail = () => {
    setSelectedLeave(null);
    setAuditLogs([]);
    setMedicalCert(null);
  };

  return (
    <div className="admin-leaves-container">
      <div className="page-header">
        <div>
          <h1>🗂️ {isAdmin ? "All Leave Requests" : "Team Leave Requests"}</h1>
          <p>{filteredRequests.length} of {requests.length} request{requests.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {pageError && <p className="msg error">⚠️ {pageError}</p>}

      {/* ── Toolbar ── */}
      <div className="al-toolbar">
        <div className="al-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by employee, email, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery("")}>✕</button>
          )}
        </div>

        <select className="al-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select className="al-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {Object.keys(LEAVE_TYPE_ICON).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {(searchQuery || statusFilter || typeFilter) && (
          <button
            className="clear-filters-btn"
            onClick={() => { setSearchQuery(""); setStatusFilter(""); setTypeFilter(""); }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {fetching ? (
        <p className="loading-text">Loading leave requests...</p>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <p>📭</p>
          <p>No leave requests have been submitted yet.</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <p>🔍</p>
          <p>No requests match your filters.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="al-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Date(s)</th>
                <th>Status</th>
                <th>Reference</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id} className="al-row" onClick={() => openDetail(req.id)}>
                  <td>
                    <p className="al-emp-name">{req.user_name}</p>
                    <p className="al-emp-email">{req.user_email}</p>
                  </td>
                  <td>{LEAVE_TYPE_ICON[req.leave_type] || "📄"} {req.leave_type}</td>
                  <td className="al-date-cell">{getDateRangeLabel(req)}</td>
                  <td>
                    <span
                      className="al-status-badge"
                      style={{
                        background: STATUS_STYLE[req.status]?.bg,
                        color: STATUS_STYLE[req.status]?.color,
                      }}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="al-ref">{req.reference}</td>
                  <td className="al-date-cell">{formatDate(req.created_at)}</td>
                  <td className="al-view-hint">View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {(selectedLeave || detailLoading) && (
        <Modal title="📄 Leave Request Details" onClose={closeDetail}>
          {detailLoading ? (
            <p className="loading-text">Loading details...</p>
          ) : selectedLeave?.error ? (
            <p className="msg error">⚠️ Failed to load this request.</p>
          ) : (
            <div className="al-detail-modal">

              <div className="al-detail-section">
                <p className="al-detail-section-title">Employee</p>
                <p className="al-detail-main">{selectedLeave.user_name}</p>
                <p className="al-detail-sub">{selectedLeave.user_email} · {selectedLeave.user_phone || "—"}</p>
              </div>

              <div className="al-detail-grid">
                <div>
                  <p className="al-detail-section-title">Leave Type</p>
                  <p className="al-detail-main">{LEAVE_TYPE_ICON[selectedLeave.leave_type]} {selectedLeave.leave_type}</p>
                </div>
                <div>
                  <p className="al-detail-section-title">Status</p>
                  <span
                    className="al-status-badge"
                    style={{
                      background: STATUS_STYLE[selectedLeave.status]?.bg,
                      color: STATUS_STYLE[selectedLeave.status]?.color,
                    }}
                  >
                    {selectedLeave.status}
                  </span>
                </div>
                <div>
                  <p className="al-detail-section-title">Date(s)</p>
                  <p className="al-detail-main">{getDateRangeLabel(selectedLeave)}</p>
                </div>
                <div>
                  <p className="al-detail-section-title">Reference</p>
                  <p className="al-detail-main al-ref">{selectedLeave.reference}</p>
                </div>
              </div>

              <div className="al-detail-section">
                <p className="al-detail-section-title">Reason</p>
                <p className="al-detail-body">{selectedLeave.reason}</p>
              </div>

              <div className="al-detail-section">
                <p className="al-detail-section-title">Emergency Contact</p>
                <p className="al-detail-body">{selectedLeave.emergency_contact}</p>
              </div>

              {selectedLeave.medical_status && (
                <div className="al-detail-section">
                  <p className="al-detail-section-title">Medical Certificate</p>
                  <span
                    className="al-status-badge"
                    style={{
                      background:
                        selectedLeave.medical_status === "Submitted" ? "var(--success-bg)" :
                        selectedLeave.medical_status === "Overdue"   ? "var(--danger-bg)"  :
                                                                        "var(--warning-bg)",
                      color:
                        selectedLeave.medical_status === "Submitted" ? "var(--success)" :
                        selectedLeave.medical_status === "Overdue"   ? "var(--danger)"  :
                                                                        "var(--warning)",
                    }}
                  >
                    {selectedLeave.medical_status}
                  </span>

                  {/* Only show a file link once it's actually been uploaded.
                      file_path comes from a SEPARATE call (getMedicalCertificateStatus)
                      since the main leave detail response never includes the raw path. */}
                  {selectedLeave.medical_status === "Submitted" && (
                    medicalCert?.file_path ? (
                      <a
                        href={`${BASE_URL}/${medicalCert.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="al-medical-file-link"
                      >
                        📎 View Uploaded Certificate
                      </a>
                    ) : (
                      <p className="al-detail-body" style={{ marginTop: "0.4rem" }}>
                        Loading file link...
                      </p>
                    )
                  )}
                </div>
              )}

              {selectedLeave.approvals?.length > 0 && (
                <div className="al-detail-section">
                  <p className="al-detail-section-title">Supervisor Decision</p>
                  {selectedLeave.approvals.map((a) => (
                    <div key={a.id} className="al-approval-block">
                      <p className="al-detail-main">
                        {a.decision === "Approved" ? "✅" : "❌"} {a.decision} by {a.supervisor?.name}
                      </p>
                      {a.comment && <p className="al-detail-body">"{a.comment}"</p>}
                      <p className="al-detail-timestamp">{formatDateTime(a.decided_at)}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedLeave.status === "Approved" && (
                <button
                  className="al-download-btn"
                  onClick={() => downloadApprovalLetter(selectedLeave.id, selectedLeave.reference)}
                >
                  📄 Download Approval Letter (PDF)
                </button>
              )}

              {/* ── Audit Trail ── */}
              <div className="al-detail-section">
                <p className="al-detail-section-title">🕓 Audit Trail</p>
                {auditLoading ? (
                  <p className="al-detail-body">Loading history...</p>
                ) : auditLogs.length === 0 ? (
                  <p className="al-detail-body">No audit history available.</p>
                ) : (
                  <div className="al-audit-timeline">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="al-audit-entry">
                        <span className="al-audit-dot" />
                        <div className="al-audit-content">
                          <p className="al-audit-action">
                            {ACTION_LABEL[log.action] || log.action}
                          </p>
                          <p className="al-audit-meta">
                            by {log.user_name || `User #${log.user_id}`} · {formatDateTime(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export default AdminLeaves;