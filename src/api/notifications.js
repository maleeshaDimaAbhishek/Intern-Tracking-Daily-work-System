import { apiFetch } from "./apiClient";

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

// ── Get all notifications + unread count in one call ────────────
export const getMyNotifications = async () => {
  const response = await apiFetch("/notifications/");
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();   // { notifications: [...], unread_count: N }
};

// ── Mark specific notifications as read, or all if list is empty ─
export const markNotificationsRead = async (notificationIds = []) => {
  const response = await apiFetch("/notifications/read", {
    method: "PATCH",
    body: JSON.stringify({ notification_ids: notificationIds }),
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) throw new Error(data?.detail || "Failed to mark notifications as read");
  return data;
};