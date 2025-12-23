import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../../auth/storage";
import { api } from "../../auth/api";
import "../student/StudentDashboard.css"; // 👈 reuse SAME CSS

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const [admin, setAdmin] = useState({
    name: "",
    email: "",
  });

  // Header avatar URL (updates after profile photo upload)
  const [avatarUrl, setAvatarUrl] = useState(
    localStorage.getItem("admin_profile_image") || ""
  );

  useEffect(() => {
    // Update avatar immediately when profile photo changes
    function onPhotoUpdated(e) {
      const url =
        (e && e.detail && e.detail.url) ||
        localStorage.getItem("admin_profile_image") ||
        "";
      setAvatarUrl(url || "");
    }
    window.addEventListener("profile-photo-updated", onPhotoUpdated);
    // Initialize on mount
    onPhotoUpdated();
    return () => window.removeEventListener("profile-photo-updated", onPhotoUpdated);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        // Primary source for current user
        const res = await api.me(); // { user: { firstName, lastName, email, name? } }
        const u = res?.user || {};
        const displayName =
          `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.name || "";
        const email = u.email || "";
        if (!cancelled) setAdmin({ name: displayName, email });
        return;
      } catch {
        // fallback to /profile if needed
      }

      try {
        const res = await api.profileGet(); // { user, profile }
        const u = res?.user || {};
        const displayName =
          `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.name || "";
        const email = u.email || "";
        if (!cancelled) setAdmin({ name: displayName, email });
      } catch {
        // keep defaults on failure
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  const initial = (admin.name || admin.email || "A").trim().charAt(0).toUpperCase();

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

          <NavLink to="/admin/attendance" className="nav-item">
  <span className="nav-icon">🗓️</span>
  <span>Attendance</span>
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
              <h1>Admin Portal</h1>
              <p>College administration & management</p>
            </div>
          </div>

          <div className="header-right">
            <div
              className="header-profile"
              onClick={() => navigate("/admin/profile")}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate("/admin/profile");
              }}
            >
              {avatarUrl ? (
                <img
                  className="avatar small"
                  src={avatarUrl}
                  alt="Profile"
                  onError={(e) => { e.currentTarget.src = "/avatar-placeholder.png"; }}
                />
              ) : (
                <div className="avatar small">{initial}</div>
              )}
              <div className="header-profile-info">
                <strong>{admin.name || "-"}</strong>
                <span>{admin.email || "-"}</span>
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