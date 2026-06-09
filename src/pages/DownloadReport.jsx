import { useState, useEffect, useRef } from "react";
import { getAllUsers } from "../api/users";
import { getTasksByDateRange } from "../api/dailyWork";
import { getAllProjects } from "../api/projects";
import Toast from "../components/Toast";
import companyLogo from "../assets/logo.png";
import "./DownloadReport.css";

const PERIODS = [
  { label: "Last Week", days: 7 },
  { label: "Last 2 Weeks", days: 14 },
  { label: "Last 3 Weeks", days: 21 },
  { label: "Last Month", days: 30 },
  { label: "Last 2 Month", days: 60 },
  { label: "Last 3 Month", days: 90 },
  { label: "Last 4 Month", days: 120 },
  { label: "Last 5 Month", days: 150 },
  { label: "Last 6 Month", days: 180 }
];

// Local company logo from assets — loaded once and cached as base64 for offline/print use
const COMPANY_LOGO_URL = companyLogo;

const toLocalDateStr = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** Fetch any image URL and return a base64 data-URI so it works in print windows */
const toBase64DataUri = async (url) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null; // graceful fallback — logo simply won't appear
  }
};

function DownloadReport() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [tasks, setTasks] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searched, setSearched] = useState(false);

  // Cache the logo base64 so we don't re-fetch on every PDF download
  const logoBase64Ref = useRef(null);

  useEffect(() => {
    fetchData();
    // Pre-fetch the logo in the background
    toBase64DataUri(COMPANY_LOGO_URL).then(b64 => { logoBase64Ref.current = b64; });
  }, []);

  const fetchData = async () => {
    const [usersRes, projectsRes] = await Promise.allSettled([
      getAllUsers(),
      getAllProjects(),
    ]);
    if (usersRes.status === "fulfilled") setUsers(usersRes.value.filter(u => u.role === "intern"));
    if (projectsRes.status === "fulfilled") setProjects(projectsRes.value);
    setLoading(false);
  };

  const getDateRange = (days) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(today);
    from.setDate(today.getDate() - days);
    return { fromDate: toLocalDateStr(from), toDate: toLocalDateStr(today) };
  };

  const handleFetchTasks = async () => {
    if (!selectedUser || !selectedPeriod) {
      setToast({ message: "Please select an Employee and a time period.", type: "warning" });
      return;
    }
    setFetching(true);
    setSearched(true);
    try {
      const period = PERIODS.find(p => p.label === selectedPeriod);
      const { fromDate, toDate } = getDateRange(period.days);
      const data = await getTasksByDateRange(selectedUser, fromDate, toDate);
      setTasks(data);
      if (data.length === 0)
        setToast({ message: "No tasks found for this period.", type: "warning" });
    } catch {
      setToast({ message: "Failed to fetch tasks.", type: "error" });
    } finally {
      setFetching(false);
    }
  };

  const getProjectName = (id) => {
    const p = projects.find(p => p.id === id);
    return p ? p.name : "Unknown";
  };

  const getUserInfo = () => users.find(u => u.id === parseInt(selectedUser));

  const groupByDate = () => {
    const groups = {};
    tasks.forEach(task => {
      const d = task.date?.slice(0, 10);
      if (!groups[d]) groups[d] = [];
      groups[d].push(task);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  };

  // ── PDF generation ────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    const user = getUserInfo();
    const period = PERIODS.find(p => p.label === selectedPeriod);
    const { fromDate, toDate } = getDateRange(period.days);
    const grouped = groupByDate();

    // If the background fetch hasn't resolved yet, try now
    if (!logoBase64Ref.current) {
      logoBase64Ref.current = await toBase64DataUri(COMPANY_LOGO_URL);
    }
    const logoSrc = logoBase64Ref.current;

    const formatDateLong = (d) => new Date(d).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const formatDateShort = (d) => new Date(d).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    const formatTime = (d) => new Date(d).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit",
    });

    const taskRows = grouped.map(([date, dayTasks]) => `
      <div class="day-section">
        <div class="day-header">
          <span class="day-icon">📅</span>
          ${formatDateLong(date)}
          <span class="day-count">${dayTasks.length} task${dayTasks.length > 1 ? "s" : ""}</span>
        </div>
        <div class="task-list">
          ${dayTasks.map((task, i) => `
            <div class="task-row ${i % 2 === 0 ? "even" : "odd"}">
              <div class="task-top">
                <span class="project-pill">🗂 ${getProjectName(task.project_id)}</span>
                <span class="task-time">🕐 ${formatTime(task.submision_time)}</span>
              </div>
              <div class="task-desc">${task.description}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");

    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" alt="SLT Logo" class="company-logo" />`
      : `<div class="logo-fallback">SLT</div>`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>Task Report — ${user?.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

          *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'DM Sans', 'Segoe UI', sans-serif;
            color: #1a1f36;
            background: #fff;
            padding: 2.5rem 2.8rem;
            font-size: 13px;
            line-height: 1.5;
          }

          /* ── TOP HEADER BAR ── */
          .page-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 1.4rem;
            border-bottom: 2px solid #0072bc;
            margin-bottom: 1.6rem;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .company-logo {
            height: 52px;
            width: 52px;
            object-fit: contain;
            border-radius: 10px;
            background: #f0f8ff;
            padding: 4px;
            border: 1px solid #d0e8f8;
          }

          .logo-fallback {
            height: 52px;
            width: 52px;
            border-radius: 10px;
            background: linear-gradient(135deg, #0072bc, #00a651);
            color: white;
            font-size: 1rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .company-name {
            font-size: 0.72rem;
            font-weight: 600;
            color: #0072bc;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .report-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1a1f36;
            margin-top: 0.15rem;
          }

          .header-right {
            text-align: right;
          }

          .generated-label {
            font-size: 0.72rem;
            color: #8a94a6;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 0.2rem;
          }

          .generated-date {
            font-size: 0.85rem;
            font-weight: 600;
            color: #1a1f36;
          }

          /* ── INTERN + STATS ROW ── */
          .summary-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 1.2rem;
            margin-bottom: 1.5rem;
          }

          .intern-card {
            background: #f4f8ff;
            border: 1px solid #d8e8ff;
            border-radius: 12px;
            padding: 1.1rem 1.4rem;
          }

          .intern-card-title {
            font-size: 0.7rem;
            font-weight: 700;
            color: #0072bc;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 0.8rem;
          }

          .intern-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.7rem 1.5rem;
          }

          .info-label {
            font-size: 0.68rem;
            color: #8a94a6;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.15rem;
          }

          .info-value {
            font-size: 0.88rem;
            font-weight: 600;
            color: #1a1f36;
          }

          .stats-col {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
          }

          .stat-chip {
            background: white;
            border: 1px solid #e0e7ef;
            border-radius: 10px;
            padding: 0.8rem 1.2rem;
            text-align: center;
            min-width: 100px;
          }

          .stat-number {
            font-size: 1.5rem;
            font-weight: 700;
            color: #0072bc;
            display: block;
          }

          .stat-label {
            font-size: 0.68rem;
            color: #8a94a6;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          /* ── PERIOD BANNER ── */
          .period-banner {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            background: linear-gradient(90deg, #0072bc 0%, #00a651 100%);
            color: white;
            border-radius: 8px;
            padding: 0.6rem 1.2rem;
            font-size: 0.82rem;
            font-weight: 600;
            margin-bottom: 1.4rem;
          }

          .period-sep { opacity: 0.5; margin: 0 0.3rem; }

          /* ── TASK SECTIONS ── */
          .day-section { margin-bottom: 1.2rem; }

          .day-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: #1a1f36;
            color: white;
            padding: 0.55rem 1rem;
            border-radius: 8px 8px 0 0;
            font-size: 0.82rem;
            font-weight: 600;
          }

          .day-icon { font-size: 0.9rem; }

          .day-count {
            margin-left: auto;
            background: rgba(255,255,255,0.18);
            padding: 0.1rem 0.6rem;
            border-radius: 20px;
            font-size: 0.72rem;
            font-weight: 500;
          }

          .task-list { border: 1px solid #e0e7ef; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden; }

          .task-row { padding: 0.75rem 1rem; }
          .task-row.even { background: #fff; }
          .task-row.odd  { background: #f8faff; }
          .task-row:not(:last-child) { border-bottom: 1px solid #eef2f8; }

          .task-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.3rem;
          }

          .project-pill {
            background: #e8f4ff;
            color: #0072bc;
            padding: 0.15rem 0.65rem;
            border-radius: 20px;
            font-size: 0.72rem;
            font-weight: 600;
          }

          .task-time {
            font-size: 0.72rem;
            color: #8a94a6;
            font-family: 'DM Mono', monospace;
          }

          .task-desc {
            font-size: 0.84rem;
            color: #333a4d;
            line-height: 1.5;
          }

          /* ── NO TASKS ── */
          .no-tasks {
            text-align: center;
            padding: 3rem;
            color: #c0c8d8;
            font-size: 1rem;
          }

          /* ── FOOTER ── */
          .page-footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #e0e7ef;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .footer-brand {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.72rem;
            font-weight: 600;
            color: #0072bc;
          }

          .footer-legal {
            font-size: 0.7rem;
            color: #aab4c4;
          }

          @media print {
            body { padding: 1.5rem 2rem; }
            .page-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .day-header  { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .period-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>

        <!-- Top header -->
        <div class="page-header">
          <div class="header-left">
            ${logoHtml}
            <div>
              <div class="company-name">Sri Lanka Telecom PLC</div>
              <div class="report-title">Employee Task Report</div>
            </div>
          </div>
          <div class="header-right">
            <div class="generated-label">Generated on</div>
            <div class="generated-date">${new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })}</div>
          </div>
        </div>

        <!-- Intern card + stats -->
        <div class="summary-row">
          <div class="intern-card">
            <div class="intern-card-title">👤 Employee Details</div>
            <div class="intern-info-grid">
              <div>
                <div class="info-label">Full Name</div>
                <div class="info-value">${user?.name ?? "—"}</div>
              </div>
              <div>
                <div class="info-label">Email Address</div>
                <div class="info-value">${user?.email ?? "—"}</div>
              </div>
              <div>
                <div class="info-label">Phone</div>
                <div class="info-value">${user?.phone ?? "Not provided"}</div>
              </div>
              <div>
                <div class="info-label">Role</div>
                <div class="info-value" style="text-transform:capitalize">${user?.role ?? "—"}</div>
              </div>
            </div>
          </div>

          <div class="stats-col">
            <div class="stat-chip">
              <span class="stat-number">${tasks.length}</span>
              <span class="stat-label">Total Tasks</span>
            </div>
            <div class="stat-chip">
              <span class="stat-number">${grouped.length}</span>
              <span class="stat-label">Active Days</span>
            </div>
            <div class="stat-chip">
              <span class="stat-number">${period?.days}</span>
              <span class="stat-label">Day Period</span>
            </div>
          </div>
        </div>

        <!-- Period banner -->
        <div class="period-banner">
          📅 ${fromDate}
          <span class="period-sep">→</span>
          ${toDate}
          <span class="period-sep">•</span>
          ${selectedPeriod}
        </div>

        <!-- Task list -->
        ${tasks.length === 0
        ? '<div class="no-tasks">📭 No tasks submitted in this period.</div>'
        : taskRows
      }

        <!-- Footer -->
        <div class="page-footer">
          <div class="footer-brand">
            ${logoSrc ? `<img src="${logoSrc}" alt="SLT" style="height:20px;border-radius:4px;" />` : ""}
            SLT EmpDiary Portal
          </div>
          <div class="footer-legal">Confidential — Generated automatically • Not for external distribution</div>
        </div>

      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);

    setToast({ message: "PDF ready! Use your browser's Save as PDF option.", type: "success" });
  };

  // ── Preview helpers ───────────────────────────────────────────────────────
  const grouped = groupByDate();
  const user = getUserInfo();

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  const formatTime = (d) => new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });

  if (loading) return <p className="loading-text">⏳ Loading...</p>;

  return (
    <div className="report-container">

      <div className="page-header">
        <div>
          <h1>📄 Download Report</h1>
          <p>Generate task reports for Employee as PDF</p>
        </div>
      </div>

      <div className="report-card">
        <h2>🔍 Select Report Options</h2>
        <p className="card-subtitle">Choose an Employee and time period to generate the report</p>

        <div className="filter-grid">
          <div className="form-group">
            <label>Select Employee</label>
            <select
              value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); setTasks([]); setSearched(false); }}
            >
              <option value="">— Choose an employee —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Time Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => { setSelectedPeriod(e.target.value); setTasks([]); setSearched(false); }}
            >
              <option value="">— Choose a period —</option>
              {PERIODS.map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <button className="primary-btn" onClick={handleFetchTasks} disabled={fetching}>
            {fetching ? "Loading..." : "🔍 Fetch Tasks"}
          </button>

          {tasks.length > 0 && (
            <button className="download-btn" onClick={handleDownloadPDF}>
              ⬇️ Download PDF
            </button>
          )}
        </div>
      </div>

      {selectedUser && user && (
        <div className="intern-preview-card">
          <div className="intern-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="intern-details">
            <p className="intern-name">{user.name}</p>
            <p className="intern-meta">{user.email}</p>
            {user.phone && <p className="intern-meta">📞 {user.phone}</p>}
          </div>
          <span className="badge intern">Employee</span>
        </div>
      )}

      {searched && (
        <div className="report-card">
          <div className="card-header">
            <h2>📋 Task Preview</h2>
            <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
              {selectedPeriod && <span className="period-tag">{selectedPeriod}</span>}
              <span className="badge purple">{tasks.length} tasks</span>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state">
              <p>📭</p>
              <p>No tasks submitted in this period.</p>
            </div>
          ) : (
            <div className="preview-task-list">
              {grouped.map(([date, dayTasks]) => (
                <div key={date} className="preview-day">
                  <div className="preview-day-header">
                    📅 {formatDate(date)}
                    <span className="day-count">{dayTasks.length} task{dayTasks.length > 1 ? "s" : ""}</span>
                  </div>
                  {dayTasks.map(task => (
                    <div key={task.id} className="preview-task-item">
                      <span className="project-tag">🗂️ {getProjectName(task.project_id)}</span>
                      <p className="task-description">{task.description}</p>
                      <span className="task-time">🕐 {formatTime(task.submision_time)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default DownloadReport;