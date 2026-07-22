import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { submitTask, getMyTasks } from "../api/dailyWork";
import { getMyProjects } from "../api/projects";
import "./DailyWork.css";

function DailyWork() {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);  // ← array now
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setFetching(true);
    setError("");
    const [projectsRes, tasksRes] = await Promise.allSettled([
      getMyProjects(),
      getMyTasks(),
    ]);
    if (projectsRes.status === "fulfilled") setProjects(projectsRes.value);
    if (tasksRes.status === "fulfilled") setTasks(tasksRes.value);
    setFetching(false);
  };

  // Toggle project selection
  const toggleProject = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError("Please select at least one project.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const newTasks = await submitTask(description, selectedIds);
      // newTasks is an array — add all to top of list
      setTasks([...newTasks, ...tasks]);
      setDescription("");
      setSelectedIds([]);
      setSuccess(
        `✅ Task submitted for ${newTasks.length} project${newTasks.length > 1 ? "s" : ""}!`
      );
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getProjectName = (id) => {
    const p = projects.find((p) => p.id === id);
    return p ? p.name : "Unknown";
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // ── local date helper ──────────────────────────────────────
  const toLocalDateStr = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const buildDayWiseHistory = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];

    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = toLocalDateStr(date);
      const dayTasks = tasks.filter((t) => t.date?.slice(0, 10) === dateStr);
      const isToday = i === 0;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      days.push({ date, dateStr, tasks: dayTasks, isToday, isWeekend });
    }
    return days;
  };

  const formatDayLabel = (date, isToday) => {
    if (isToday) return "Today";
    return date.toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
    });
  };

  const days = buildDayWiseHistory();

  if (fetching) {
    return (
      <div className="dailywork-container">
        <div className="dw-card">
          <p className="loading-text">⏳ Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dailywork-container">

      {/* ── Submit Form ── */}
      <div className="dw-card">
        <h2>📝 Submit Today's Work</h2>
        <p className="dw-subtitle">Select projects and describe what you worked on</p>

        <form onSubmit={handleSubmit} className="dw-form">

          {/* Step 1 — Project multi-select */}
          <div className="form-group">
            <label>
              <span className="step-badge">1</span>
              Select Projects
              <span className="label-hint"> — choose one or more</span>
            </label>

            {projects.length === 0 ? (
              <div className="no-projects-warning">
                ⚠️ No projects found.
                {user?.role === "supervisor"
                  ? " You have no projects to supervise yet."
                  : " Ask your Supervisor to assign you to a project."}
              </div>
            ) : (
              <div className="project-checkboxes">
                {projects.map((project) => {
                  const isSelected = selectedIds.includes(project.id);
                  return (
                    <div
                      key={project.id}
                      className={`project-checkbox-row ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleProject(project.id)}
                    >
                      <div className={`custom-checkbox ${isSelected ? "checked" : ""}`}>
                        {isSelected && "✓"}
                      </div>
                      <div className="project-checkbox-info">
                        <p className="project-name">{project.name}</p>
                        {project.tech_stack && (
                          <div className="tech-stack">
                            {project.tech_stack.split(",")
                              .map((t) => t.trim()).filter(Boolean)
                              .map((tech) => (
                                <span key={tech} className="tech-tag">{tech}</span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected count */}
            {selectedIds.length > 0 && (
              <p className="selected-count">
                ✅ {selectedIds.length} project{selectedIds.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Step 2 — Description */}
          <div className="form-group">
            <label>
              <span className="step-badge">2</span>
              What did you work on?
            </label>
            <textarea
              placeholder="e.g. Implemented login API, fixed navbar bug..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              disabled={selectedIds.length === 0}
            />
            {selectedIds.length === 0 && (
              <p className="field-hint">👆 Select at least one project first</p>
            )}
          </div>

          {error && <p className="msg error">⚠️ {error}</p>}
          {success && <p className="msg success">{success}</p>}

          <button
            type="submit"
            disabled={loading || selectedIds.length === 0}
            className="submit-btn"
          >
            {loading ? "Submitting..." : `Submit Work${selectedIds.length > 1 ? ` (${selectedIds.length} projects)` : ""}`}
          </button>

        </form>
      </div>

      {/* ── Day-wise History ── */}
      <div className="dw-card">
        <div className="history-header">
          <h2>📅 Last 10 Days</h2>
          <div className="history-legend">
            <span className="legend-item submitted">✅ Submitted</span>
            <span className="legend-item missed">❌ Missed</span>
            <span className="legend-item weekend">🌙 Weekend</span>
          </div>
        </div>

        <div className="day-list">
          {days.map(({ date, dateStr, tasks: dayTasks, isToday, isWeekend }) => (
            <div
              key={dateStr}
              className={`day-row ${isToday ? "today" :
                  isWeekend ? "weekend" :
                    dayTasks.length > 0 ? "submitted" : "missed"
                }`}
            >
              <div className="day-label">
                <span className="day-name">{formatDayLabel(date, isToday)}</span>
                <span className="day-date">{dateStr}</span>
              </div>

              <div className="day-content">
                {isWeekend ? (
                  <span className="day-status weekend-text">Weekend</span>
                ) : dayTasks.length === 0 ? (
                  <span className="day-status missed-text">
                    {isToday ? "Not submitted yet" : "No task submitted"}
                  </span>
                ) : (
                  <div className="day-tasks">
                    {dayTasks.map((task) => (
                      <div key={task.id} className="day-task-item">
                        <div className="day-task-top">
                          <span className="project-tag">
                            🗂️ {getProjectName(task.project_id)}
                          </span>
                          <span className="task-time">
                            🕐 {formatTime(task.submision_time)}
                          </span>
                        </div>
                        <p className="task-description">{task.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="day-badge">
                {isWeekend ? <span className="badge-icon">🌙</span>
                  : dayTasks.length > 0 ? <span className="badge-icon">✅</span>
                    : isToday ? <span className="badge-icon">⏳</span>
                      : <span className="badge-icon">❌</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default DailyWork;
