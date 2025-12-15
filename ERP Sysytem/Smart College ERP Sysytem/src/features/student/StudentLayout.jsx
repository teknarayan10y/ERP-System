// src/features/student/StudentLayout.jsx
import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../../auth/storage";
import "./StudentDashboard.css";

/* ICONS */
import {
  FaHome,
  FaUser,
  FaBook,
  FaCalendarCheck,
  FaTasks,
  FaPen,
  FaChartBar,
  FaMoneyBill,
  FaQuestionCircle,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  /* Demo user data (replace with API/context later) */
  const demo = useMemo(
    () => ({
      profile: {
        name: "John Doe",
        program: "B.Tech CSE",
        semester: 5,
        rollNo: "CSE2021-1234",
        section: "A",
      },
      notices: [{ id: 1 }, { id: 2 }],
    }),
    []
  );

  const profile = demo.profile;
  const notices = demo.notices;

  return (
    <div
      className={`student-layout ${
        sidebarOpen ? "sidebar-open" : "sidebar-closed"
      }`}
    >
      {/* ========== SIDEBAR ========== */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Smart ERP</h2>
          <span>Student Panel</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/student/dashboard"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <FaHome className="nav-icon" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/student/profile"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <FaUser className="nav-icon" />
            <span>Complete Profile</span>
          </NavLink>

          <NavLink to="/student/courses" className="nav-item">
            <FaBook className="nav-icon" />
            <span>My Courses</span>
          </NavLink>

          <NavLink to="/student/attendance" className="nav-item">
            <FaCalendarCheck className="nav-icon" />
            <span>Attendance</span>
          </NavLink>

          <NavLink to="/student/assignments" className="nav-item">
            <FaTasks className="nav-icon" />
            <span>Assignments</span>
          </NavLink>

          <NavLink to="/student/exams" className="nav-item">
            <FaPen className="nav-icon" />
            <span>Exams</span>
          </NavLink>

          <NavLink to="/student/results" className="nav-item">
            <FaChartBar className="nav-icon" />
            <span>Results</span>
          </NavLink>

          <NavLink to="/student/fees" className="nav-item">
            <FaMoneyBill className="nav-icon" />
            <span>Fees</span>
          </NavLink>

          <NavLink to="/student/support" className="nav-item">
            <FaQuestionCircle className="nav-icon" />
            <span>Support / Help</span>
          </NavLink>

          <NavLink to="/student/settings" className="nav-item">
            <FaCog className="nav-icon" />
            <span>Settings</span>
          </NavLink>
        </nav>

        <button className="btn logout full" onClick={handleLogout}>
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </aside>

      {/* ========== MAIN ========== */}
      <main className="main">
        {/* HEADER */}
        <header className="page-header">
          <div className="header-left">
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <div>
              <h1>Student Portal</h1>
              <p>
                {profile.rollNo} · Section {profile.section}
              </p>
            </div>
          </div>

          <div className="header-right">
            <div className="notification">
              🔔
              {notices.length > 0 && (
                <span className="badge">{notices.length}</span>
              )}
            </div>

            <div
              className="header-profile clickable"
              onClick={() => navigate("/student/profile")}
            >
              <div className="avatar small">{profile.name[0]}</div>
              <div className="header-profile-info">
                <strong>{profile.name}</strong>
                <span>
                  {profile.program} · Sem {profile.semester}
                </span>
              </div>
            </div>

            <button className="btn logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
