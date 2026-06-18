import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyTasks, getUserLast10DaysTasks, getUsersTasksByDate, getYesterdayAllTasks } from "../api/dailyWork";
import { getAllProjects, getMyProjects } from "../api/projects";
import { getAllUsers, mySupervisors } from "../api/users";
import "./Dashboard.css";

const toLocalDateStr = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
};

const getRelativeLocalDateStr = (daysFromToday) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return toLocalDateStr(date);
};
const getTaskDateStr = (dateValue) => {
  if (!dateValue) return "";
  if (typeof dateValue === "string") return dateValue.slice(0, 10);
  return toLocalDateStr(new Date(dateValue));
};

const getTaskUserName = (task) =>
  task.user_name || (task.user && (task.user.name || task.user.full_name)) || "Unknown User";

const getTaskUserEmail = (task) =>
  task.user_email || (task.user && task.user.email) || "Email not provided";

const getTaskUserKey = (task) =>
  String(task.user_id || (task.user && (task.user.id || task.user.email)) || getTaskUserEmail(task) || getTaskUserName(task));

const getTaskProjectId = (task) => task.project_id || (task.project && task.project.id);

// ─── Admin Dashboard ───────────────────────────────────────────────
function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [yesterdayTasks, setYesterday] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [userTasksLoading, setUserTasksLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  useEffect(() => {
    fetchAdminData();
  }, []);

  const loadYesterdayFallback = async (yesterdayDate) => {
    const tasks = await getYesterdayAllTasks();
    const taskList = Array.isArray(tasks) ? tasks : [];
    return taskList.filter((task) => !task.date || getTaskDateStr(task.date) === yesterdayDate);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    const yesterdayDate = getRelativeLocalDateStr(-1);

    try {
      const [usersRes, projectsRes] = await Promise.allSettled([
        getAllUsers(),
        getAllProjects(),
      ]);

      const loadedUsers = usersRes.status === "fulfilled" && Array.isArray(usersRes.value)
        ? usersRes.value
        : [];
      const loadedProjects = projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value)
        ? projectsRes.value
        : [];

      setUsers(loadedUsers);
      setProjects(loadedProjects);

      const taskUsers = loadedUsers.filter((user) => user.role !== "admin" && user.is_active !== false);
      let loadedYesterday = [];

      if (taskUsers.length > 0) {
        try {
          loadedYesterday = await getUsersTasksByDate(taskUsers, yesterdayDate);
        } catch (err) {
          console.error("Failed to load yesterday tasks by user:", err);
          loadedYesterday = await loadYesterdayFallback(yesterdayDate);
        }
      } else {
        loadedYesterday = await loadYesterdayFallback(yesterdayDate);
      }

      setYesterday(loadedYesterday);
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);
      setYesterday([]);
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setUserTasksLoading(true);
    try {
      const tasks = await getUserLast10DaysTasks(user.id);
      setUserTasks(tasks);
    } catch (err) {
      console.error("Failed to load user tasks:", err);
      setUserTasks([]);
    } finally {
      setUserTasksLoading(false);
    }
  };

  const getProjectName = (id) => {
    const p = projects.find((p) => p.id === id);
    return p ? p.name : "—";
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit",
    });

  // Group yesterday tasks by a stable user key, not by display name.
  const normalizedYesterdayTasks = yesterdayTasks.map((task) => ({
    ...task,
    user_name: getTaskUserName(task),
    user_email: getTaskUserEmail(task),
  }));

  const yesterdayByUser = normalizedYesterdayTasks.reduce((acc, task) => {
    const key = getTaskUserKey(task);
    if (!acc[key]) {
      acc[key] = {
        key,
        name: getTaskUserName(task),
        email: getTaskUserEmail(task),
        tasks: [],
      };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {});

  if (loading) return <p className="loading-text">⏳ Loading dashboard...</p>;

  return (
    <div className="dashboard-container">

      {/* ── Welcome Banner ── */}
      <div className="welcome-banner">
        <div>
          <h1>{user?.role === "supervisor" ? "👨‍💼 Supervisor Dashboard" : "🛡️ Admin Dashboard"}</h1>
          <p>{new Date().toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}</p>
        </div>
        <span className="dashboard-role-pill admin">Admin</span>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-grid">
        <div className="stat-card purple">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{users.length}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🗂️</div>
          <div className="stat-info">
            <h3>{projects.length}</h3>
            <p>Total Projects</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{normalizedYesterdayTasks.length}</h3>
            <p>Tasks Submitted Yesterday</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{Object.keys(yesterdayByUser).length}</h3>
            <p>Active Users Yesterday</p>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="admin-grid">

        {/* Left — User Search + Task Viewer */}
        <div className="dash-card user-search-card">
          <div className="card-header">
            <h2>🔍 Search Users</h2>
            <span className="badge purple">{users.length} users</span>
          </div>

          {/* Search input */}
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-btn" onClick={() => {
                setSearchQuery("");
                setSelectedUser(null);
                setUserTasks([]);
              }}>✕</button>
            )}
          </div>

          {/* User list */}
          <div className="user-list">
            {filteredUsers.length === 0 ? (
              <p className="empty-small">No users found.</p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`user-row ${selectedUser?.id === user.id ? "selected" : ""}`}
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <p className="user-name">{user.name}</p>
                    <p className="dashboard-user-email">{user.email}</p>
                  </div>
                  <span className={`badge ${user.role}`}>{user.role}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — Selected User Tasks */}
        <div className="dash-card user-tasks-card">
          {!selectedUser ? (
            <div className="select-prompt">
              <p>👆</p>
              <p>Select a user to view their last 10 days of tasks</p>
            </div>
          ) : (
            <>
              <div className="card-header">
                <div>
                  <h2>📋 {selectedUser.name}'s Tasks</h2>
                  <p className="card-subtitle">Last 10 days activity</p>
                </div>
                <span className="badge purple">{userTasks.length} tasks</span>
              </div>

              {userTasksLoading ? (
                <p className="loading-text">Loading tasks...</p>
              ) : userTasks.length === 0 ? (
                <div className="empty-state">
                  <p>📭</p>
                  <p>No tasks in the last 10 days.</p>
                </div>
              ) : (
                <div className="task-list scrollable">
                  {userTasks.map((task) => (
                    <div key={task.id} className="task-item">
                      <div className="task-left">
                        <span className="task-dot" />
                        <div>
                          <p className="task-description">{task.description}</p>
                          <div className="task-meta">
                            <span className="project-tag">
                              🗂️ {getProjectName(getTaskProjectId(task))}
                            </span>
                            <span>📅 {formatDate(task.date)}</span>
                            <span>🕐 {formatTime(task.submision_time)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Yesterday's Tasks by All Users ── */}
      <div className="dash-card">
        <div className="card-header">
          <h2>📅 Yesterday's Submissions</h2>
          <span className="badge green">{normalizedYesterdayTasks.length} tasks</span>
        </div>

        {Object.keys(yesterdayByUser).length === 0 ? (
          <div className="empty-state">
            <p>📭</p>
            <p>No tasks were submitted yesterday.</p>
          </div>
        ) : (
          <div className="yesterday-grid">
            {Object.values(yesterdayByUser).map((data) => (
              <div key={data.key} className="yesterday-user-card">

                {/* User header */}
                <div className="yesterday-user-header">
                  <div className="user-avatar small">
                    {data.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="user-name">{data.name}</p>
                    <p className="dashboard-user-email">{data.email}</p>
                  </div>
                  <span className="badge green">{data.tasks.length}</span>
                </div>

                {/* Tasks */}
                <div className="yesterday-tasks">
                  {data.tasks.map((task) => (
                    <div key={task.id} className="yesterday-task-row">
                      <span className="check">✓</span>
                      <div>
                        <p className="task-description">{task.description}</p>
                        <span className="project-tag">
                          🗂️ {getProjectName(getTaskProjectId(task))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Intern Dashboard ──────────────────────────────────────────────
function InternDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [tasksRes, projectsRes, supervisorsRes] = await Promise.allSettled([
        getMyTasks(),
        getMyProjects(),
        mySupervisors(user.id),
      ]);
      if (tasksRes.status === "fulfilled") setTasks(tasksRes.value);

      let assignedProjects = [];
      if (projectsRes.status === "fulfilled") {
        assignedProjects = projectsRes.value;
        setProjects(assignedProjects);
      }

      if (supervisorsRes.status === "fulfilled") {
        setSupervisors(supervisorsRes.value);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const getProjectName = (id) => {
    const p = projects.find((p) => p.id === id);
    return p ? p.name : "—";
  };

  const todayStr = toLocalDateStr(new Date());
  const todayTasks = tasks.filter((t) => getTaskDateStr(t.date) === todayStr);

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  function getSupervisorId(item) {
    return (
      item?.supervisor_id ??
      item?.supervisor?.id ??
      item?.supervisor?.user_id ??
      item?.supervisor?.supervisor_id ??
      item?.id ??
      item?.user_id
    );
  }

  function getSupervisorPhone(item) {
    return (
      item?.phone ??
      item?.mobile ??
      item?.mobile_no ??
      item?.mobile_number ??
      item?.phone_number ??
      item?.contact_no ??
      item?.contact_number
    );
  }

  const supervisorContacts = projects.reduce((contacts, project) => {
    const supervisorId = getSupervisorId(project);
    const matchedSupervisor = supervisors.find((supervisor) => {
      const matchedId = getSupervisorId(supervisor);
      return supervisorId && matchedId && String(matchedId) === String(supervisorId);
    });

    const embeddedSupervisor = project?.supervisor || {};
    const contact = {
      id: supervisorId ?? matchedSupervisor?.id ?? embeddedSupervisor?.id,
      name:
        matchedSupervisor?.name ||
        matchedSupervisor?.full_name ||
        embeddedSupervisor?.name ||
        embeddedSupervisor?.full_name ||
        project?.supervisor_name,
      email:
        matchedSupervisor?.email ||
        embeddedSupervisor?.email ||
        project?.supervisor_email,
      phone:
        getSupervisorPhone(matchedSupervisor) ||
        getSupervisorPhone(embeddedSupervisor) ||
        project?.supervisor_phone ||
        project?.supervisor_mobile,
    };

    if (!contact.name && !contact.email && !contact.phone) return contacts;

    const contactKey = contact.id || contact.email || contact.name;
    const exists = contacts.some((existing) =>
      String(existing.id || existing.email || existing.name) === String(contactKey)
    );

    return exists ? contacts : [...contacts, contact];
  }, []);

  // ── same logic as DailyWork page ──
  const buildDayWiseHistory = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];


    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      // ✅ local date — not UTC
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayTasks = tasks.filter((t) => getTaskDateStr(t.date) === dateStr);
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

  if (loading) return <p className="loading-text">⏳ Loading dashboard...</p>;

  return (
    <div className="dashboard-container">

      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div>
          <h1>👋 Welcome, {user?.email?.split("@")[0]}!</h1>
          <p>{new Date().toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}</p>
        </div>
        <span className="dashboard-role-pill intern">EmpDiary</span>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card purple">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{tasks.length}</h3>
            <p>Total Tasks Submitted</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{todayTasks.length}</h3>
            <p>Tasks Submitted Today</p>
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🗂️</div>
          <div className="stat-info">
            <h3>{projects.length}</h3>
            <p>Assigned Projects</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">

        {/* ── Day-wise Task History ── */}
        <div className="dash-card">
          <div className="card-header">
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
                {/* Date label */}
                <div className="day-label">
                  <span className="day-name">{formatDayLabel(date, isToday)}</span>
                  <span className="day-date">{dateStr}</span>
                </div>

                {/* Content */}
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
                              🗂️ {getProjectName(getTaskProjectId(task))}
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

                {/* Status icon */}
                <div className="day-badge">
                  {isWeekend ? (
                    <span className="badge-icon">🌙</span>
                  ) : dayTasks.length > 0 ? (
                    <span className="badge-icon">✅</span>
                  ) : isToday ? (
                    <span className="badge-icon">⏳</span>
                  ) : (
                    <span className="badge-icon">❌</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="right-column">

          {/* Supervisor Contact */}
          <div className="dash-card">
            <div className="card-header">
              <h2>👤 My Supervisor</h2>
              <span className="badge blue">{supervisorContacts.length}</span>
            </div>
            {supervisorContacts.length === 0 ? (
              <p className="empty-small">No supervisor details available yet.</p>
            ) : (
              <div className="supervisor-list">
                {supervisorContacts.map((supervisor, index) => (
                  <div
                    key={supervisor.id || supervisor.email || supervisor.name || index}
                    className="supervisor-card"
                  >
                    <div className="supervisor-info">
                      <p className="supervisor-avatar">
                        {(supervisor.name || supervisor.email || "S").charAt(0).toUpperCase()}
                      </p>

                      {/* ✅ Wrap name + contact rows in a column container */}
                      <div className="supervisor-details">
                        <p className="supervisor-name">{supervisor.name || "Supervisor"}</p>
                        <p className="supervisor-detail">✉️ {supervisor.email || "Email not provided"}</p>
                        <p className="supervisor-detail">📞 {supervisor.phone || "Mobile no not provided"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Projects */}
          <div className="dash-card">
            <div className="card-header">
              <h2>🗂️ My Projects</h2>
              <span className="badge blue">{projects.length}</span>
            </div>
            {projects.length === 0 ? (
              <p className="empty-small">No projects assigned yet.</p>
            ) : (
              <div className="project-list">
                {projects.map((p) => (
                  <div key={p.id} className="project-row">
                    <div className="project-dot" />
                    <div>
                      <p className="project-name">{p.name}</p>
                      <p className="project-desc">{p.description}</p>
                      {p.tech_stack && (
                        <div className="tech-stack" style={{ marginTop: "0.35rem" }}>
                          {p.tech_stack.split(",").map((t) => t.trim()).filter(Boolean)
                            .map((tech) => (
                              <span key={tech} className="tech-tag">{tech}</span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Summary */}
          <div className="dash-card">
            <div className="card-header">
              <h2>⚡ Today's Summary</h2>
              <span className="badge green">{todayTasks.length}</span>
            </div>
            {todayTasks.length === 0 ? (
              <p className="empty-small">No tasks submitted today yet.</p>
            ) : (
              todayTasks.map((task) => (
                <div key={task.id} className="today-item">
                  <span className="check">✓</span>
                  <p>{task.description}</p>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Root — picks which dashboard to show ─────────────────────────
function Dashboard() {
  const { user } = useAuth();
  return (user?.role === "admin" || user?.role === "supervisor")
    ? <AdminDashboard />
    : <InternDashboard />;
}

export default Dashboard;
