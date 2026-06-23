import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { submitLeaveRequest } from "../api/leave";
import { getSupervisors } from "../api/projects";
import "./LeaveRequest.css";

// ── Leave type configuration ──────────────────────────────────
// Drives which date fields render for each type.
const LEAVE_TYPES = [
  { value: "Sick Leave",      label: "🤒 Sick Leave",      dateMode: "range" },
  { value: "Emergency Leave", label: "🚨 Emergency Leave", dateMode: "single" },
  { value: "Personal Leave",  label: "🧳 Personal Leave",  dateMode: "range" },
  { value: "Half Day Leave",  label: "🕐 Half Day Leave",  dateMode: "halfday" },
];

const getDateMode = (leaveType) =>
  LEAVE_TYPES.find((t) => t.value === leaveType)?.dateMode || null;

function LeaveRequest() {
  const { user } = useAuth();

  // ── Form fields ──────────────────────────────────────────────
  const [leaveType, setLeaveType]               = useState("");
  const [supervisorId, setSupervisorId]         = useState("");
  const [reason, setReason]                     = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [startDate, setStartDate]               = useState("");
  const [endDate, setEndDate]                   = useState("");
  const [leaveDate, setLeaveDate]               = useState("");
  const [session, setSession]                   = useState("Morning");

  // ── Data + UI state ─────────────────────────────────────────
  const [supervisors, setSupervisors] = useState([]);
  const [fetching, setFetching]       = useState(true);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  useEffect(() => { fetchSupervisors(); }, []);
  console.log("Supervisors list:", user);
  const fetchSupervisors = async () => {
    setFetching(true);
    try {
      const data = await getSupervisors();
      setSupervisors(data);
    } catch {
      setError("Could not load supervisors list.");
    } finally {
      setFetching(false);
    }
  };

  const dateMode = getDateMode(leaveType);

  // ── Reset date fields whenever leave type changes ───────────
  const handleLeaveTypeChange = (value) => {
    setLeaveType(value);
    setStartDate("");
    setEndDate("");
    setLeaveDate("");
    setSession("Morning");
  };

  const resetForm = () => {
    setLeaveType("");
    setSupervisorId("");
    setReason("");
    setEmergencyContact("");
    setStartDate("");
    setEndDate("");
    setLeaveDate("");
    setSession("Morning");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // ── Client-side validation matching backend rules ──────────
    if (!leaveType) {
      setError("Please select a leave type.");
      return;
    }
    if (!supervisorId) {
      setError("Please select a supervisor.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters.");
      return;
    }
    if (emergencyContact.trim().length < 10) {
      setError("Please provide a valid emergency contact number.");
      return;
    }
    if (dateMode === "range" && (!startDate || !endDate)) {
      setError("Please select both start and end dates.");
      return;
    }
    if (dateMode === "range" && endDate < startDate) {
      setError("End date must be on or after start date.");
      return;
    }
    if ((dateMode === "single" || dateMode === "halfday") && !leaveDate) {
      setError("Please select a date.");
      return;
    }

    const payload = {
      leave_type:         leaveType,
      supervisor_id:       Number(supervisorId),
      reason:              reason.trim(),
      emergency_contact:   emergencyContact.trim(),
      ...(dateMode === "range"   && { start_date: startDate, end_date: endDate }),
      ...(dateMode === "single"  && { leave_date: leaveDate }),
      ...(dateMode === "halfday" && { leave_date: leaveDate, session }),
    };

    setLoading(true);
    try {
      const result = await submitLeaveRequest(payload);
      setSuccess(`✅ Leave request submitted! Reference: ${result.reference_number}`);
      resetForm();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err?.message || "Failed to submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="leave-request-container">
        <div className="lr-card">
          <p className="loading-text">⏳ Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leave-request-container">
      <div className="lr-card">
        <h2>📋 Apply for Leave</h2>
        <p className="lr-subtitle">Fill in the details below to submit your leave request</p>

        <form onSubmit={handleSubmit} className="lr-form">

          {/* ── Auto-filled employee info ── */}
          <div className="lr-readonly-section">
            <p className="lr-section-title">Your Information</p>
            <div className="lr-readonly-grid">
              <div className="lr-readonly-field">
                <span className="lr-readonly-label">Name</span>
                <span className="lr-readonly-value">{user?.name}</span>
              </div>
              <div className="lr-readonly-field">
                <span className="lr-readonly-label">Email</span>
                <span className="lr-readonly-value">{user?.email}</span>
              </div>
              <div className="lr-readonly-field">
                <span className="lr-readonly-label">Phone</span>
                <span className="lr-readonly-value">{user?.phone || "—"}</span>
              </div>
            </div>
          </div>

          {/* ── Supervisor ── */}
          <div className="form-group">
            <label>Supervisor</label>
            <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} required>
              <option value="">— Select your supervisor —</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
              ))}
            </select>
          </div>

          {/* ── Leave Type ── */}
          <div className="form-group">
            <label>Leave Type</label>
            <select value={leaveType} onChange={(e) => handleLeaveTypeChange(e.target.value)} required>
              <option value="">— Select leave type —</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* ── Dynamic date fields based on leave type ── */}
          {dateMode === "range" && (
            <div className="lr-date-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {dateMode === "single" && (
            <div className="form-group">
              <label>Leave Date</label>
              <input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                required
              />
            </div>
          )}

          {dateMode === "halfday" && (
            <div className="lr-date-row">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Session</label>
                <select value={session} onChange={(e) => setSession(e.target.value)}>
                  <option value="Morning">🌅 Morning</option>
                  <option value="Afternoon">🌇 Afternoon</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Reason ── */}
          <div className="form-group">
            <label>Reason</label>
            <textarea
              placeholder="Briefly explain the reason for your leave (min 10 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* ── Emergency Contact ── */}
          <div className="form-group">
            <label>Emergency Contact Number</label>
            <input
              type="tel"
              placeholder="e.g. +94771234567"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              required
            />
          </div>

          {error   && <p className="msg error">⚠️ {error}</p>}
          {success && <p className="msg success">{success}</p>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "Submitting..." : "Submit Leave Request"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default LeaveRequest;