import { useState, useEffect } from "react";
import { getAllProjects, createProject, updateProject, deleteProject, getProjectUsers, updateProjectStatus, getSupervisors } from "../api/projects";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import "./Projects.css";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

const emptyForm = { name: "", description: "", tech_stack: "", status: "Not Started", supervisor_id: "" };

function Projects() {
  const [projects, setProjects] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState(null); // ← NEW
  const { confirm, dialog } = useConfirm(); // ← NEW
  const [viewingProject, setViewingProject] = useState(null);
  const [projectUsers, setProjectUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");    // ← add this
  const [statusFilter, setStatusFilter] = useState("");
  const STATUSES = [
    { label: "Not Started", color: "var(--text-soft)", bg: "var(--surface-3)" },
    { label: "Planning", color: "var(--info)", bg: "var(--info-bg)" },
    { label: "In Progress", color: "var(--success)", bg: "var(--success-bg)" },
    { label: "On Hold", color: "var(--warning)", bg: "var(--warning-bg)" },
    { label: "Testing", color: "var(--badge-purple-text)", bg: "var(--badge-purple-bg)" },
    { label: "Completed", color: "var(--info)", bg: "var(--info-bg)" },
    { label: "Closed", color: "var(--text-soft)", bg: "var(--surface-3)" },
  ];
  const [viewingDescProject, setViewingDescProject] = useState(null); // ← ADD THIS
  useEffect(() => { fetchProjects(); }, []);
  const getStatusStyle = (status) => {
    const s = STATUSES.find((s) => s.label === status);
    return s
      ? { color: s.color, backgroundColor: s.bg }
      : { color: "var(--text-soft)", backgroundColor: "var(--surface-3)" };
  };
  useEffect(() => {
    const fetchSupervisors = async () => {
      try {
        const data = await getSupervisors();
        setSupervisors(data);
      } catch {
        console.error("Could not load supervisors");
      }
    };
    fetchSupervisors();
  }, []);
  const NEXT_STATUS = {
    "Not Started": "Planning",
    "Planning": "In Progress",
    "In Progress": "Testing",
    "On Hold": "In Progress",
    "Testing": "Completed",
    "Completed": "Closed",
    "Closed": null,
  };
  const showToast = (message, type = "success") => {    // ← NEW helper
    setToast({ message, type });
  };
  const handleViewUsers = async (project) => {
    setViewingProject(project);
    setProjectUsers([]);
    setUsersLoading(true);
    try {
      const users = await getProjectUsers(project.id);
      setProjectUsers(users);
    } catch {
      showToast("Failed to load assigned users.", "error");
    } finally {
      setUsersLoading(false);
    }
  };
  const ExpandableDescription = ({ text, maxLength = 140, onShowMore }) => {
    if (!text) return null;

    if (text.length <= maxLength) {
      return <p className="project-desc">{text}</p>;
    }

    // Handle click/tap and strictly stop it from bubbling up
    const handleTrigger = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onShowMore();
    };

    return (
      <p className="project-desc">
        {text.substring(0, maxLength)}...
        <button
          type="button"
          className="show-more-btn"
          onClick={handleTrigger}
          onTouchStart={(e) => e.stopPropagation()} /* Prevents touch bubbling on iOS/Android */
          onPointerDown={(e) => e.stopPropagation()} /* Prevents pointer bubbling */
        >
          Show More
        </button>
      </p>
    );
  };
  // REPLACE your fetchProjects function
  const fetchProjects = async () => {
    try {
      setFetching(true);
      setPageError("");
      const [projectsData, supervisorsData] = await Promise.all([
        getAllProjects(),
        getSupervisors(),    // ← fetch at same time
      ]);
      setProjects(projectsData);
      setSupervisors(supervisorsData);
    } catch {
      setPageError("Could not load projects.");
    } finally {
      setFetching(false);
    }
  };

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openCreateModal = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };
  const handleStatusChange = async (project, newStatus) => {
    try {
      const updated = await updateProjectStatus(project.id, newStatus);
      setProjects(projects.map((p) => p.id === project.id ? updated : p));
      showToast(`Project status updated to "${newStatus}"`, "success");
    } catch {
      showToast("Failed to update project status.", "error");
    }
  };
  const openEditModal = (project) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description,
      tech_stack: project.tech_stack || "",
      status: project.status || "Not Started",
      supervisor_id: project.supervisor_id || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    try {
      const payload = {
        name: form.name,
        description: form.description,
        tech_stack: form.tech_stack || null,
        status: form.status,
        supervisor_id: form.supervisor_id || null,
      };
      if (editingProject) {
        const updated = await updateProject(editingProject.id, payload);
        setProjects(projects.map((p) => p.id === editingProject.id ? updated : p));
        showToast(`✏️ "${updated.name}" updated successfully!`);
      } else {
        const created = await createProject(payload);
        setProjects([created, ...projects]);
        showToast(`🎉 Project "${created.name}" created successfully!`);
      }
      handleCloseModal();
    } catch (err) {
      console.error("Error saving project:", err);
      setFormError(err.message || "Failed to save project.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId, projectName) => {
    const ok = await confirm({
      title: "Delete Project",
      message: `Are you sure you want to delete "${projectName}"? This action cannot be undone.`,
      confirmText: "Yes, Delete",
      confirmType: "danger",
    });
    if (!ok) return;
    try {
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
      showToast("🗑️ Project deleted.", "warning");
    } catch {
      showToast("Failed to delete project.", "error");
    }
  };

  const parseTechStack = (techStr) => {
    if (!techStr) return [];
    return techStr.split(",").map((t) => t.trim()).filter(Boolean);
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

  const getUserDisplayName = (user) =>
    user?.name || user?.full_name || user?.username || user?.email || "Unknown User";

  const getUserInitial = (user) =>
    getUserDisplayName(user).charAt(0).toUpperCase();

  const getRoleLabel = (user) =>
    String(user?.role || "intern").toUpperCase();
  const getRoleClass = (user) =>
    String(user?.role || "intern").toLowerCase();

  const getSupervisorName = (project) => {
    const projectSupervisorId =
      project?.supervisor_id ??
      project?.supervisor?.id ??
      project?.supervisor?.user_id ??
      project?.supervisor?.supervisor_id;

    const match = supervisors.find((s) => {
      const supervisorId = s?.id ?? s?.user_id ?? s?.supervisor_id;
      return String(supervisorId) === String(projectSupervisorId);
    });

    return match?.name || match?.full_name || project?.supervisor?.name || project?.supervisor?.full_name || "";
  };

  // ── Filtered projects ─────────────────────────────────────────
  const filteredProjects = projects.filter((project) => {
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      !q ||
      project.name.toLowerCase().includes(q) ||
      (project.description || "").toLowerCase().includes(q) ||
      (project.tech_stack || "").toLowerCase().includes(q) ||
      getSupervisorName(project).toLowerCase().includes(q);

    const matchesStatus =
      !statusFilter || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  return (
    <div className="projects-container">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1>🗂️ Projects</h1>
          <p>{filteredProjects.length} of {projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="primary-btn" onClick={openCreateModal}>+ New Project</button>
      </div>

      {pageError && <p className="msg error">⚠️ {pageError}</p>}

      {/* ── Search & Filter Bar ── */}
      <div className="projects-toolbar">

        {/* Search input */}
        <div className="projects-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, tech stack, supervisor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
            >✕</button>
          )}
        </div>

        {/* Status filter */}
        <select
          className="status-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s.label} value={s.label}>{s.label}</option>
          ))}
        </select>

        {/* Clear all filters */}
        {(searchQuery || statusFilter) && (
          <button
            className="clear-filters-btn"
            onClick={() => { setSearchQuery(""); setStatusFilter(""); }}
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* ── Project Grid ── */}
      {fetching ? (
        <p className="loading-text">Loading projects...</p>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <p>🗂️</p>
          <p>No projects yet. Create your first one!</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <p>🔍</p>
          <p>No projects match your search.</p>
          <button
            className="secondary-btn"
            style={{ marginTop: "1rem" }}
            onClick={() => { setSearchQuery(""); setStatusFilter(""); }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((project) => (   // ← changed from projects.map to filteredProjects.map
            <div
              key={project.id}
              className="project-card clickable-card"
              onClick={() => handleViewUsers(project)}
            >
              <div className="project-card-body">

                {/* Status badge top-right */}
                <div className="card-top-row">
                  <h3>{project.name}</h3>
                  <span
                    className="status-badge"
                    style={getStatusStyle(project.status)}
                  >
                    {project.status || "Not Started"}
                  </span>
                </div>

                <ExpandableDescription
                  text={project.description}
                  maxLength={140}
                  onShowMore={() => setViewingDescProject(project)}
                />

                {getSupervisorName(project) && (
                  <p className="project-supervisor">
                    👤 {getSupervisorName(project)}
                  </p>
                )}

                {parseTechStack(project.tech_stack).length > 0 && (
                  <div className="tech-stack">
                    {parseTechStack(project.tech_stack).map((tech) => (
                      <span key={tech} className="tech-tag">{tech}</span>
                    ))}
                  </div>
                )}

                {/* Status progress bar */}
                <div className="status-progress">
                  {STATUSES.map((s, i) => (
                    <div
                      key={s.label}
                      className={`progress-step ${project.status === s.label ? "active" :
                        STATUSES.findIndex(x => x.label === project.status) > i ? "done" : ""
                        }`}
                      title={s.label}
                      style={project.status === s.label ? { background: s.color } : {}}
                    />
                  ))}
                </div>

                <p className="card-click-hint">👥 Click to view assigned interns</p>
              </div>

              <div className="project-card-footer" onClick={(e) => e.stopPropagation()}>
                <span>📅 {formatDate(project.created_at)}</span>
                <div className="card-actions">

                  {/* Quick status advance button */}
                  {NEXT_STATUS[project.status] && (
                    <button
                      className="status-advance-btn"
                      onClick={() => handleStatusChange(project, NEXT_STATUS[project.status])}
                      title={`Advance to "${NEXT_STATUS[project.status]}"`}
                    >
                      → {NEXT_STATUS[project.status]}
                    </button>
                  )}

                  <button className="edit-btn" onClick={() => openEditModal(project)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(project.id, project.name)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      {showModal && (
        <Modal
          title={editingProject ? `✏️ Edit — ${editingProject.name}` : "➕ New Project"}
          onClose={handleCloseModal}
        >
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>Project Name</label>
              <input name="name" type="text" placeholder="e.g. Inventory System"
                value={form.name} onChange={handleFormChange} autoFocus required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" placeholder="What is this project about?"
                value={form.description} onChange={handleFormChange} rows={3} required />
            </div>
            <div className="form-group">
              <label>Tech Stack <span className="label-hint">(optional)</span></label>
              <input name="tech_stack" type="text"
                placeholder="e.g. React, FastAPI, PostgreSQL"
                value={form.tech_stack} onChange={handleFormChange} />
              {parseTechStack(form.tech_stack).length > 0 && (
                <div className="tech-stack preview">
                  {parseTechStack(form.tech_stack).map((tech) => (
                    <span key={tech} className="tech-tag">{tech}</span>
                  ))}
                </div>
              )}
              <p className="field-hint">Separate with commas</p>
            </div>
            <div className="form-group">
              <label>Project Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleFormChange}
              >
                {STATUSES.map((s) => (
                  <option key={s.label} value={s.label}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Supervisor <span className="label-hint">(Mandatory)</span></label>
              <select
                name="supervisor_id"
                value={form.supervisor_id}
                onChange={handleFormChange}
                required
              >
                <option value="">— Select a supervisor —</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
            </div>
            {formError && <p className="msg error">⚠️ {formError}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={handleCloseModal}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading
                  ? (editingProject ? "Saving..." : "Creating...")
                  : (editingProject ? "Save Changes" : "Create Project")}
              </button>
            </div>
          </form>

        </Modal>
      )}

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {dialog && <ConfirmDialog {...dialog} />}
      {viewingProject && (
        <Modal
          title={`👥 ${viewingProject.name} — Assigned Interns`}
          onClose={() => { setViewingProject(null); setProjectUsers([]); }}
        >
          <div className="project-users-modal">

            {/* Project info strip */}
            <div className="project-info-strip">
              <p className="project-strip-name">🗂️ {viewingProject.name}</p>
              {viewingProject.tech_stack && (
                <div className="tech-stack">
                  {viewingProject.tech_stack.split(",").map((t) => t.trim()).filter(Boolean)
                    .map((tech) => <span key={tech} className="tech-tag">{tech}</span>)}
                </div>
              )}
            </div>

            {usersLoading ? (
              <p className="loading-text">Loading team members...</p>
            ) : projectUsers.length === 0 ? (
              <div className="empty-state">
                <p>👤</p>
                <p>No interns assigned to this project yet.</p>
                <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                  Go to Users → Edit user to assign them here.
                </p>
              </div>
            ) : (
              <>
                <p className="team-count">
                  {projectUsers.length} intern{projectUsers.length > 1 ? "s" : ""} assigned
                </p>
                <div className="team-list">
                  {projectUsers.map((user, index) => (
                    <div key={(user?.id ?? user?.email ?? user?.username ?? "user") + "-" + index} className="team-member-row">
                      <div className="member-number">{index + 1}</div>
                      <div className="user-avatar">
                        {getUserInitial(user)}
                      </div>
                      <div className="team-member-info">
                        <p className="user-name">{getUserDisplayName(user)}</p>
                        <p className="user-email">✉️ {user.email || "No email provided"}</p>
                        {user.phone && <p className="user-phone">📞 {user.phone}</p>}
                      </div>
                      <span className={`badge role-${getRoleClass(user)}`}>{getRoleLabel(user)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        </Modal>
      )}
      {/* Project Description Modal */}
      {viewingDescProject && (
        <Modal
          title={`📄 ${viewingDescProject.name} — Description`}
          onClose={() => setViewingDescProject(null)}
        >
          <div className="description-modal-content">
            <p className="full-description-text">{viewingDescProject.description}</p>
          </div>
          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setViewingDescProject(null)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>

  );
}

export default Projects;
