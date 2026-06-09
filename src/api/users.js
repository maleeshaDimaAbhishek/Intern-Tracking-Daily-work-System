import { apiFetch } from "./apiClient";

export const getAllUsers = async () => {
  const response = await apiFetch("/users");
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
};

export const registerUser = async (userData) => {
  const response = await apiFetch("/users/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const serverMsg =
      data?.detail || data?.message || "Failed to register user";
    throw new Error(serverMsg);
  }

  return data;
};

export const updateUser = async (userId, updatedData) => {
  const response = await apiFetch(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(updatedData),
  });
  if (!response.ok) throw new Error("Failed to update user");
  return response.json();
};

export const getUserById = async (userId) => {
  const response = await apiFetch(`/users/${userId}`);
  if (!response.ok) throw new Error("Failed to fetch user");
  return response.json();
};

export const getUserAssignedProjects = async (userId) => {
  const response = await apiFetch(`/users/${userId}/projects`);
  if (!response.ok) throw new Error("Failed to fetch user's projects");
  return response.json();
};

export const changePassword = async (newPassword) => {
  const response = await apiFetch("/users/change-password", {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to change password");
  }
  return response.json();
};

export const deleteUser = async (userId) => {
  const response = await apiFetch(`/users/${userId}`, {
    method: "DELETE",
    body: JSON.stringify({ is_active: false }),
  });
  if (!response.ok) throw new Error("Failed to delete user");
  return response.json();
};
export const mySupervisors = async (userId) => {
  const response = await apiFetch(`/users/${userId}/my-supervisors`);
  if (!response.ok) throw new Error("Failed to fetch my supervisors");
  return response.json();
};