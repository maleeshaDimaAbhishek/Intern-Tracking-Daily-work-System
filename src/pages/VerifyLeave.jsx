import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import logo from "../assets/logo.png";
import "./VerifyLeave.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const LEAVE_TYPE_ICON = {
  "Sick Leave":      "🤒",
  "Emergency Leave": "🚨",
  "Personal Leave":  "🧳",
  "Half-Day Leave":  "🕐",
};

function VerifyLeave() {
  // ── useParams reads the dynamic part of the URL ──────────────
  // Route is /verify/:referenceNumber — this pulls out "LV-2025-A3F9B2"
  const { referenceNumber } = useParams();

  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    verifyReference();
  }, [referenceNumber]);

  const verifyReference = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      // ── Plain fetch, NOT apiFetch ─────────────────────────────
      // This page has no logged-in user, so there's no token to
      // attach. apiFetch would redirect to /login on a 401 we
      // don't even expect here — this endpoint needs no auth at all.
      const response = await fetch(`${BASE_URL}/verify/${referenceNumber}`);

      if (!response.ok) {
        setNotFound(true);
        setResult(null);
        return;
      }

      const data = await response.json();
      setResult(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";

  const getDateRangeLabel = (r) => {
    if (r.leave_type === "Sick Leave" || r.leave_type === "Personal Leave") {
      return `${formatDate(r.start_date)}  →  ${formatDate(r.end_date)}`;
    }
    if (r.leave_type === "Half-Day Leave") {
      return `${formatDate(r.leave_date)}  (${r.session} session)`;
    }
    return formatDate(r.leave_date);
  };

  return (
    <div className="verify-container">
      <div className="verify-card">

        <div className="verify-header">
          <img src={logo} alt="SLT Mobitel" className="verify-logo" />
          <p className="verify-system-name">EmpDiary Verification</p>
        </div>

        {loading ? (
          <p className="verify-loading">Verifying...</p>
        ) : notFound ? (
          <div className="verify-result invalid">
            <span className="verify-icon">⚠️</span>
            <h2>Not a Valid Approval Letter</h2>
            <p className="verify-sub">
              No approved leave record was found for reference number:
            </p>
            <p className="verify-ref-display">{referenceNumber}</p>
            <p className="verify-disclaimer">
              This may mean the letter was never approved, has been
              altered, or the reference number is incorrect.
            </p>
          </div>
        ) : (
          <div className="verify-result valid">
            <span className="verify-icon">✅</span>
            <h2>Verified Authentic</h2>
            <p className="verify-sub">This is a genuine, approved leave letter.</p>

            <div className="verify-details">
              <div className="verify-row">
                <span className="verify-label">Employee</span>
                <span className="verify-value">{result.employee_name}</span>
              </div>
              <div className="verify-row">
                <span className="verify-label">Leave Type</span>
                <span className="verify-value">
                  {LEAVE_TYPE_ICON[result.leave_type]} {result.leave_type}
                </span>
              </div>
              <div className="verify-row">
                <span className="verify-label">Period</span>
                <span className="verify-value">{getDateRangeLabel(result)}</span>
              </div>
              <div className="verify-row">
                <span className="verify-label">Approved By</span>
                <span className="verify-value">{result.approved_by}</span>
              </div>
              <div className="verify-row">
                <span className="verify-label">Approval Date</span>
                <span className="verify-value">{formatDate(result.approved_date)}</span>
              </div>
              <div className="verify-row">
                <span className="verify-label">Reference No.</span>
                <span className="verify-value verify-ref-mono">{result.reference}</span>
              </div>
            </div>
          </div>
        )}

        <p className="verify-footer">
          Verified against EmpDiary's live records — SLT Mobitel.
        </p>

      </div>
    </div>
  );
}

export default VerifyLeave;