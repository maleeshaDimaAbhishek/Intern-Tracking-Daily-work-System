import { useState, useEffect } from "react";
import { getAllUsers, registerUser, updateUser, getUserAssignedProjects, deleteUser } from "../api/users";
import { getAllProjects, getMyProjects } from "../api/projects";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import "./Users.css";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "", email: "", password: "", role: "intern", project_ids: [], phone: "",
};

function Users() {
  const [users, setUsers] = useState([]);
  const [toast, setToast] = useState(null);
  const [projects, setProjects] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const isCreateMode = !editingUser;
  const requiresProjectSelection = isCreateMode;
  const isProjectSelectionMissing = requiresProjectSelection && form.project_ids.length === 0;
  const showToast = (message, type = "success") => setToast({ message, type });
  const { confirm, dialog } = useConfirm();
  const { user: currentUser } = useAuth();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setFetching(true);
      const isSupervisor = currentUser?.role === "supervisor";
      const [usersData, projectsData] = await Promise.all([
        getAllUsers(),
        isSupervisor ? getAllProjects() : getAllProjects(),
        // supervisor's GET /projects/ already returns only their projects
      ]);
      setUsers(usersData.filter(u => u.role === "intern"));
      setProjects(projectsData);
    } catch (err) {
      setPageError("Could not load data.");
    } finally {
      setFetching(false);
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Click a project row to toggle it on/off
  const toggleProject = (projectId) => {
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

  const openEditModal = async (user) => {
    setEditingUser(user);
    setFormError("");
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      project_ids: [],
      phone: user.phone || "",
    });
    setShowModal(true);
    try {
      const assigned = await getUserAssignedProjects(user.id);
      const assignedIds = assigned.map((p) => p.id);
      setForm((prev) => ({ ...prev, project_ids: assignedIds }));
    } catch (err) {
      console.error("Could not load assigned projects:", err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormError("");
    setProjectSearch("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (isProjectSelectionMissing) {
      setFormError("Please select at least one project before creating a user.");
      return;
    }

    setLoading(true);
    try {
      if (editingUser) {
        const updateData = { ...form };
        if (!updateData.password) delete updateData.password;
        const updated = await updateUser(editingUser.id, updateData);
        console.log(updated);
        setUsers(users.map((u) => (u.id === editingUser.id ? updated : u)));
        showToast(`✏️ ${updated.name}'s details updated successfully!`);
      } else {
        const created = await registerUser(form);
        setUsers([created, ...users]);
        showToast(`🎉 User "${created.name}" registered! Credentials sent to ${created.email}.`);
      }
      handleCloseModal();
    } catch (err) {
      const raw = err?.message || "";
      const isDupEmail = raw.toLowerCase().includes("email");
      const fallbackMsg = editingUser ? "Failed to update user." : "Failed to create user.";
      setFormError(isDupEmail ? "This email is already registered." : (raw || fallbackMsg));

    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (user) => {
    const ok = await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete "${user.name}"? All their data will be permanently removed.`,
      confirmText: "Yes, Delete",
      confirmType: "danger",
    });
    if (!ok) return;
    try {
      await deleteUser(user.id);
      setUsers(users.filter((u) => u.id !== user.id));
      showToast(`🗑️ "${user.name}" deleted.`, "warning");
    } catch (err) {
      showToast("Failed to delete user.", "error");
    }
  };

  return (
    <div className="users-container">

      <div className="page-header">
        <div>
          <h1>👥 Users</h1>
          <p>{users.length} user{users.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button className="primary-btn" onClick={openCreateModal}>+ Add User</button>
      </div>
      {/* Success message — shows after create or edit */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {pageError && <p className="msg error">⚠️ {pageError}</p>}
      {fetching ? (
        <p className="loading-text">Loading users...</p>
      ) : (
        <div className="table-card">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Email</th><th>Phone</th>
                <th>Role</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id}>
                  <td className="td-index" data-label="Index">{index + 1}</td>
                  <td className="td-name" data-label="Name">{user.name}</td>
                  <td className="td-email" data-label="Email">{user.email}</td>
                  <td className="td-phone" data-label="Phone number">{user.phone}</td>
                  <td className="td-role" data-label="Role">
                    <span className={`badge ${user.role}`}>{user.role}</span>
                  </td>
                  <td className="td-date" data-label="Joined">
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </td>
                  <td data-label="Actions">
                    <div className="table-row-actions">
                      <button className="edit-btn" onClick={() => openEditModal(user)}>
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(user)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editingUser ? `Edit — ${editingUser.name}` : "➕ Add New User"}
          onClose={handleCloseModal}
        >
          <form onSubmit={handleSubmit} className="modal-form">

            {/* Basic Info */}
            <div className="form-section-title">Basic Info</div>

            <div className="form-row">
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
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                name="email" type="email"
                placeholder="kasun@example.com"
                value={form.email}
                onChange={handleFormChange}
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                name="phone"
                type="tel"
                placeholder="e.g. +94771234567"
                maxLength={15}
                value={form.phone || ""}
                onChange={handleFormChange}
              />
            </div>
            {!editingUser && (
              <div className="form-group">
                <label>
                  Password{" "}
                  {editingUser && (
                    <span className="label-hint">(leave blank to keep current)</span>
                  )}
                </label>
                <input
                  name="password" type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleFormChange}
                  minLength={editingUser ? 0 : 8}
                  required={!editingUser}
                />
              </div>
            )}
            {/* Project Assignment */}
            <div className="form-section-title">
              Assign Projects
              <span className="label-hint"> — click to select</span>
            </div>

            {projects.length === 0 ? (
              <p className="empty-small">⚠️ No projects available.</p>
            ) : (
              <>
                {/* ✅ Search box */}
                <div className="project-search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                  {projectSearch && (
                    <button
                      className="search-clear"
                      onClick={() => setProjectSearch("")}
                    >✕</button>
                  )}
                </div>

                {/* Filtered project list */}
                <div className="project-checkboxes">
                  {projects
                    .filter((p) =>
                      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                      (p.tech_stack || "").toLowerCase().includes(projectSearch.toLowerCase())
                    )
                    .map((project) => {
                      const isSelected = form.project_ids.includes(project.id);
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
                            <p className="project-desc-small">{project.description}</p>
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

                  {/* No results message */}
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
            {isProjectSelectionMissing && (
              <p className="msg error">⚠️ Select at least one project to continue.</p>
            )}

            {pageError && <p className="msg error">⚠️ {pageError}</p>}
            {formError && <p className="msg error">⚠️ {formError}</p>}

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={handleCloseModal}>
                Cancel
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={loading || isProjectSelectionMissing}
              >
                {loading
                  ? (editingUser ? "Saving..." : "Creating...")
                  : (editingUser ? "Save Changes" : "Create User")}
              </button>
            </div>


          </form>
        </Modal>
      )}
      {dialog && <ConfirmDialog {...dialog} />}
    </div>
  );
}

export default Users;
