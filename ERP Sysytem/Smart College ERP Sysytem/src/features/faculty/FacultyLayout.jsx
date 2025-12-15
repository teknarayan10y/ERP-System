import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../../auth/storage";
import "../student/StudentDashboard.css"; // ✅ reuse same CSS

export default function FacultyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  /* Demo faculty data (replace with API/context later) */
  const demo = useMemo(() => ({
    profile: {
      name: "Dr. Rajesh Sharma",
      department: "Computer Science",
      designation: "Associate Professor",
      facultyId: "FAC-CSE-102",
    },
    notices: [{ id: 1 }, { id: 2 }, { id: 3 }],
  }), []);

  const { profile, notices } = demo;

  return (
    <div className={`student-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>

      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Smart ERP</h2>
          <span>Faculty Panel</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/faculty/dashboard" className="nav-item">
            <span className="nav-icon">🏠</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/faculty/profile" className="nav-item">
            <span className="nav-icon">👤</span>
            <span>My Profile</span>
          </NavLink>

          <NavLink to="/faculty/courses" className="nav-item">
            <span className="nav-icon">📚</span>
            <span>My Subjects</span>
          </NavLink>

          <NavLink to="/faculty/students" className="nav-item">
            <span className="nav-icon">👨‍🎓</span>
            <span>My Students</span>
          </NavLink>

          <NavLink to="/faculty/attendance" className="nav-item">
            <span className="nav-icon">📝</span>
            <span>Attendance</span>
          </NavLink>

          <NavLink to="/faculty/marks" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Marks</span>
          </NavLink>

          <NavLink to="/faculty/assignments" className="nav-item">
            <span className="nav-icon">📂</span>
            <span>Assignments</span>
          </NavLink>

          <NavLink to="/faculty/settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </NavLink>
        </nav>

        <button className="btn logout full" onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="main">

        {/* ================= HEADER ================= */}
        <header className="page-header">
          <div className="header-left">
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>

            <div>
              <h1>Faculty Portal</h1>
              <p>{profile.facultyId} · {profile.department}</p>
            </div>
          </div>

          <div className="header-right">
            {/* Notifications */}
            <div className="notification">
              🔔
              {notices.length > 0 && (
                <span className="badge">{notices.length}</span>
              )}
            </div>

            {/* Profile */}
            <div
              className="header-profile clickable"
              onClick={() => navigate("/faculty/profile")}
            >
              <div className="avatar small">
                {profile.name.charAt(0)}
              </div>
              <div className="header-profile-info">
                <strong>{profile.name}</strong>
                <span>{profile.designation}</span>
              </div>
            </div>

            <button className="btn logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* ================= PAGE CONTENT ================= */}
        <div className="container">
          <Outlet />
        </div>

      </main>
    </div>
  );
}
