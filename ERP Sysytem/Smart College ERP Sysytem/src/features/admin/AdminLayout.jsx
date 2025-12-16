import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../../auth/storage";
import "../student/StudentDashboard.css"; // 👈 reuse SAME CSS

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const admin = useMemo(() => ({
    name: "Admin User",
    role: "System Administrator",
  }), []);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`student-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>

      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Smart ERP</h2>
          <span>Admin Panel</span>
        </div>

        <nav className="sidebar-nav">

          <NavLink to="/admin/dashboard" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </NavLink>

         <NavLink to="/admin/students" className="nav-item">
  <span className="nav-icon">👨‍🎓</span>
  <span>Students</span>
</NavLink>


          <NavLink to="/admin/faculty" className="nav-item">
  <span className="nav-icon">👨‍🏫</span>
  <span>Faculty</span>
</NavLink>


          <NavLink to="/admin/courses" className="nav-item">
            <span className="nav-icon">📚</span>
            <span>Courses</span>
          </NavLink>

          <NavLink to="/admin/departments" className="nav-item">
            <span className="nav-icon">🏢</span>
            <span>Departments</span>
          </NavLink>

          <NavLink to="/admin/fees" className="nav-item">
            <span className="nav-icon">💰</span>
            <span>Fees</span>
          </NavLink>

          <NavLink to="/admin/settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </NavLink>

        </nav>

        <button className="btn logout full" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* ===== MAIN ===== */}
      <main className="main">

        {/* HEADER (SAME AS STUDENT/FACULTY) */}
        <header className="page-header">
          <div className="header-left">
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <div>
              <h1>Admin Portal</h1>
              <p>College administration & management</p>
            </div>
          </div>

          <div className="header-right">
            <div className="header-profile">
              <div className="avatar small">A</div>
              <div className="header-profile-info">
                <strong>{admin.name}</strong>
                <span>{admin.role}</span>
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
