import { useState, useEffect } from "react";
import {
  getAllUsers, registerUser, updateUser,
  getUserAssignedProjects, deleteUser
} from "../api/users";
import { getAllProjects } from "../api/projects";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import "./Users.css"; // reuse same styles

const emptyForm = {
  name: "", email: "", password: "",
  role: "supervisor", project_ids: [], phone: "",
};

function Supervisors() {
  const [supervisors, setSupervisors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectSupervisorMap, setProjectSupervisorMap] = useState({});
  const { confirm, dialog } = useConfirm();

  const showToast = (message, type = "success") => setToast({ message, type });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setFetching(true);
      const [usersData, projectsData] = await Promise.all([
        getAllUsers(),
        getAllProjects(),
      ]);
      // Filter only supervisors
      const supervisorsData = usersData.filter(u => u.role === "supervisor");
      const assignmentResults = await Promise.allSettled(
        supervisorsData.map(async (supervisor) => ({
          supervisorId: supervisor.id,
          projects: await getUserAssignedProjects(supervisor.id),
        }))
      );
      const assignmentMap = {};
      assignmentResults.forEach((result) => {
        if (result.status !== "fulfilled") return;
        result.value.projects.forEach((project) => {
          assignmentMap[String(project.id)] = result.value.supervisorId;
        });
      });

      setSupervisors(supervisorsData);
      setProjects(projectsData);
      setProjectSupervisorMap(assignmentMap);
    } catch {
      setPageError("Could not load data.");
    } finally {
      setFetching(false);
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getProjectSupervisorId = (project) => {
    const directSupervisorId =
      project?.supervisor_id ??
      project?.supervisor?.id ??
      project?.supervisor?.user_id ??
      project?.supervisor?.supervisor_id ??
      null;

    return directSupervisorId === "" || directSupervisorId === null
      ? projectSupervisorMap[String(project?.id)] ?? null
      : directSupervisorId;
  };

  const getAssignedSupervisorName = (project) => {
    const supervisorId = getProjectSupervisorId(project);
    const supervisor = supervisors.find((s) => String(s.id) === String(supervisorId));
    return supervisor?.name || supervisor?.full_name || "another supervisor";
  };

  const isProjectAssignedToAnotherSupervisor = (project) => {
    const supervisorId = getProjectSupervisorId(project);
    if (!supervisorId) return false;
    return !editingUser || String(supervisorId) !== String(editingUser.id);
  };

  const toggleProject = (project) => {
    if (isProjectAssignedToAnotherSupervisor(project)) return;

    const projectId = project.id;
    const isSelected = form.project_ids.includes(projectId);
    setForm({
      ...form,
      project_ids: isSelected
        ? form.project_ids.filter((id) => id !== projectId)
        : [...form.project_ids, projectId],
    });
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError("");
    setProjectSearch("");
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormError("");
    setProjectSearch("");
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: "supervisor",
      project_ids: [],
      phone: user.phone || "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormError("");
    setProjectSearch("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!editingUser) {
      const hasUnavailableProject = form.project_ids.some((projectId) => {
        const project = projects.find((p) => String(p.id) === String(projectId));
        return project && isProjectAssignedToAnotherSupervisor(project);
      });
      if (hasUnavailableProject) {
        setFormError("One or more selected projects already have another supervisor.");
        return;
      }
    }

    setLoading(true);
    try {
      if (editingUser) {
        const { password: _password, project_ids: _projectIds, ...rest } = form;
        const updated = await updateUser(editingUser.id, rest);
        setSupervisors(supervisors.map((u) =>
          u.id === editingUser.id ? updated : u
        ));
        showToast(`✏️ ${updated.name}'s details updated successfully!`);
      } else {
        const created = await registerUser({ ...form, role: "supervisor" });
        setSupervisors([created, ...supervisors]);
        showToast(`🎉 Supervisor "${created.name}" registered! Credentials sent to ${created.email}.`);
      }
      handleCloseModal();
      await fetchData();
    } catch (err) {
      const raw = err?.message || "";
      const isDupEmail = raw.toLowerCase().includes("email");
      console.error("Error creating/updating supervisor:", err);
      setFormError(
        isDupEmail ? "This email is already registered." :
          editingUser ? "Failed to update supervisor." : "Failed to create supervisor."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    const ok = await confirm({
      title: "Deactivate Supervisor",
      message: `Are you sure you want to deactivate "${user.name}"? They will no longer be able to log in.`,
      confirmText: "Yes, Deactivate",
      confirmType: "warning",
    });
    if (!ok) return;
    try {
      await deleteUser(user.id);
      setSupervisors(supervisors.filter((u) => u.id !== user.id));
      showToast(`⚠️ "${user.name}" has been deactivated.`, "warning");
      await fetchData();
    } catch {
      showToast("Failed to deactivate supervisor.", "error");
    }
  };

  return (
    <div className="users-container">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>👨‍💼 Supervisors</h1>
          <p>{supervisors.length} supervisor{supervisors.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button className="primary-btn" onClick={openCreateModal}>
          + Add Supervisor
        </button>
      </div>

      {pageError && <p className="msg error">⚠️ {pageError}</p>}

      {/* Table */}
      {fetching ? (
        <p className="loading-text">Loading supervisors...</p>
      ) : (
        <div className="table-card">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supervisors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>
                    No supervisors registered yet.
                  </td>
                </tr>
              ) : (
                supervisors.map((user, index) => (
                  <tr key={user.id}>
                    <td className="td-index">{index + 1}</td>
                    <td className="td-name">{user.name}</td>
                    <td className="td-email">{user.email}</td>
                    <td className={user.role === "supervisor" ? "td-phone" : "td-role"}>
                      {user.role === "supervisor" ? (user.phone || "—") : (user.role || "—")}
                    </td>
                    <td className="td-date">
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="edit-btn" onClick={() => openEditModal(user)}>
                          Edit
                        </button>
                        <button className="delete-btn" onClick={() => handleDelete(user)}>
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal
          title={editingUser ? `Edit — ${editingUser.name}` : "➕ Add New Supervisor"}
          onClose={handleCloseModal}
        >
          <form onSubmit={handleSubmit} className="modal-form">

            <div className="form-section-title">Basic Info</div>

            <div className="form-group">
              <label>Full Name</label>
              <input
                name="name" type="text"
                placeholder="e.g. Kasun Perera"
                value={form.name}
                maxLength={100}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                name="email" type="email"
                placeholder="supervisor@example.com"
                value={form.email}
                maxLength={100}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                name="phone" type="tel"
                placeholder="e.g. +94771234567"
                value={form.phone || ""}
                maxLength={15}
                onChange={handleFormChange}
                required
              />
            </div>

            {!editingUser && (
              <div className="form-group">
                <label>Password</label>
                <input
                  name="password" type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleFormChange}
                  minLength={8}
                  required
                />
              </div>
            )}

            {!editingUser && (
              <>
                {/* Project Assignment */}
                <div className="form-section-title">
                  Assign Projects
                  <span className="label-hint"> — click to select</span>
                </div>

                {projects.length === 0 ? (
                  <p className="empty-small">⚠️ No projects available.</p>
                ) : (
                  <>
                    <div className="project-search-box">
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                      {projectSearch && (
                        <button className="search-clear" onClick={() => setProjectSearch("")}>
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="project-checkboxes">
                      {projects
                        .filter((p) =>
                          p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                          (p.tech_stack || "").toLowerCase().includes(projectSearch.toLowerCase())
                        )
                        .map((project) => {
                          const isSelected = form.project_ids.includes(project.id);
                          const isUnavailable = isProjectAssignedToAnotherSupervisor(project);
                          return (
                            <div
                              key={project.id}
                              className={`project-checkbox-row ${isSelected ? "selected" : ""} ${isUnavailable ? "disabled" : ""}`}
                              onClick={() => toggleProject(project)}
                              aria-disabled={isUnavailable}
                              title={isUnavailable ? `Already assigned to ${getAssignedSupervisorName(project)}` : ""}
                            >
                              <div className={`custom-checkbox ${isSelected ? "checked" : ""}`}>
                                {isSelected && "✓"}
                              </div>
                              <div className="project-checkbox-info">
                                <p className="project-name">{project.name}</p>
                                <p className="project-desc-small">{project.description}</p>
                                {isUnavailable && (
                                  <p className="project-assigned-note">
                                    Already assigned to {getAssignedSupervisorName(project)}
                                  </p>
                                )}
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

                      {projects.filter((p) =>
                        p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                        (p.tech_stack || "").toLowerCase().includes(projectSearch.toLowerCase())
                      ).length === 0 && (
                          <p className="empty-small">No projects match "{projectSearch}"</p>
                        )}
                    </div>

                    {form.project_ids.length > 0 && (
                      <p className="selected-count">
                        ✅ {form.project_ids.length} project
                        {form.project_ids.length > 1 ? "s" : ""} selected
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {formError && <p className="msg error">⚠️ {formError}</p>}

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={handleCloseModal}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading
                  ? (editingUser ? "Saving..." : "Creating...")
                  : (editingUser ? "Save Changes" : "Create Supervisor")}
              </button>
            </div>

          </form>
        </Modal>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {dialog && <ConfirmDialog {...dialog} />}

    </div>
  );
}

export default Supervisors;