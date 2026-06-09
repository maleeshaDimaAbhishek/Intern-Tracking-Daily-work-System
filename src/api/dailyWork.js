import { apiFetch } from "./apiClient";

const getStoredUserId = () => {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) return null;

  try {
    const parsedUser = JSON.parse(rawUser);
    return parsedUser?.id ?? null;
  } catch {
    return null;
  }
};

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const submitTask = async (description, project_ids) => {
  const userId = getStoredUserId();
  const response = await apiFetch("/daily-work/submit", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, description, project_ids }),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((item) => item?.msg || "Invalid input").join(", ")
          : "Failed to submit task";
    throw new Error(detail);
  }
  return data;
};

export const getMyTasks = async () => {
  const response = await apiFetch("/daily-work/my_tasks");
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
};

export const getUserLast10DaysTasks = async (user_id) => {
  const response = await apiFetch(`/daily-work/user/${user_id}/last10days`);
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
};

export const getYesterdayAllTasks = async () => {
  const response = await apiFetch("/daily-work/yesterday/all");
  if (!response.ok) throw new Error("Failed to fetch yesterday tasks");
  return response.json();
};

export const getTasksByDateRange = async (userId, fromDate, toDate) => {
  const response = await apiFetch(
    `/daily-work/user/${userId}/range?from_date=${fromDate}&to_date=${toDate}`
  );
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
};

export const getUsersTasksByDate = async (users, date) => {
  const results = await Promise.allSettled(
    users.map((user) => getTasksByDateRange(user.id, date, date))
  );

  const hasSuccessfulResult = results.some((result) => result.status === "fulfilled");
  if (!hasSuccessfulResult && users.length > 0) {
    throw new Error("Failed to fetch yesterday tasks by user");
  }

  return results.flatMap((result, index) => {
    if (result.status !== "fulfilled") return [];

    const user = users[index];
    const tasks = Array.isArray(result.value) ? result.value : [];

    return tasks.map((task) => ({
      ...task,
      user_id: task.user_id ?? user.id,
      user_name: task.user_name ?? user.name,
      user_email: task.user_email ?? user.email,
    }));
  });
};
