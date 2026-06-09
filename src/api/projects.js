import { apiFetch } from "./apiClient";

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const getErrorMessage = (data, fallback) => {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item?.msg || "Invalid input").join(", ");
  }
  return fallback;
};

export const getAllProjects = async () => {
  const response = await apiFetch("/projects/");
  if (!response.ok) throw new Error("Failed to fetch projects");
  return response.json();
};

export const getMyProjects = async () => {
  const response = await apiFetch("/projects/my");
  if (!response.ok) throw new Error("Failed to fetch my projects");
  return response.json();
};

export const createProject = async (name, description, tech_stack, status = "Not Started") => {
  const response = await apiFetch("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description, tech_stack, status }),
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) throw new Error(getErrorMessage(data, "Failed to create project"));
  return data;
};

export const deleteProject = async (projectId) => {
  const response = await apiFetch(`/projects/${projectId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete project");
  return true;
};

export const updateProject = async (projectId, data) => {
  const response = await apiFetch(`/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) throw new Error(getErrorMessage(body, "Failed to update project"));
  return body;
};
export const getProjectUsers = async (projectId) => {
  const response = await apiFetch(`/projects/${projectId}/users`);
  if (!response.ok) throw new Error("Failed to fetch project users");
  return response.json();
}
export const updateProjectStatus = async (projectId, status) => {
  const response = await apiFetch(`/projects/${projectId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update project status");
  return response.json();
};

export const getSupervisors = async () => {
  const response = await apiFetch("/users/supervisors");
  if (!response.ok) throw new Error("Failed to fetch supervisors");
  return response.json();
};