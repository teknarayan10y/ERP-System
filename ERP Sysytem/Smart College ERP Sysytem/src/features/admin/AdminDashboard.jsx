import React from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {

  // ✅ Hook must be INSIDE component
  const navigate = useNavigate();

  return (
    <div className="admin-dark">

      {/* HEADER */}
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Institution overview & system control</p>
        </div>
      </div>

      {/* KPI SECTION */}
      <div className="admin-kpi-grid">
        <Kpi title="Total Students" value="1,284" />
        <Kpi title="Total Faculty" value="84" />
        <Kpi title="Courses Offered" value="62" />
        <Kpi title="Departments" value="8" />
      </div>

      <div className="admin-kpi-grid secondary">
        <Kpi title="Active Students" value="1,142" good />
        <Kpi title="Pending Approvals" value="18" warn />
        <Kpi title="Fees Pending" value="₹12.4 Lakh" bad />
        <Kpi title="System Alerts" value="3" bad />
      </div>

      {/* MAIN GRID */}
      <div className="admin-main-grid">

        <div className="admin-card">
          <h2>Academic Status</h2>
          <ul>
            <li>Current Semester: <strong>Semester 5</strong></li>
            <li>Courses Running: <strong>58</strong></li>
            <li>Unassigned Subjects: <strong>4</strong></li>
            <li>Upcoming Exams: <strong>Mid-Term</strong></li>
          </ul>
        </div>

        <div className="admin-card">
          <h2>Attendance & Results</h2>
          <ul>
            <li>Attendance Submitted: <strong>92%</strong></li>
            <li>Pending Attendance: <strong>8%</strong></li>
            <li>Results Published: <strong>Semester 4</strong></li>
            <li>Results Pending: <strong>Semester 5</strong></li>
          </ul>
        </div>

        <div className="admin-card">
          <h2>Fees Overview</h2>
          <ul>
            <li>Total Collected: <strong>₹2.8 Cr</strong></li>
            <li>Pending Fees: <strong>₹12.4 Lakh</strong></li>
            <li>Overdue Students: <strong>126</strong></li>
          </ul>
        </div>

        <div className="admin-card">
          <h2>Recent Activity</h2>
          <ul>
            <li>Student registration approved</li>
            <li>Faculty assigned to DBMS</li>
            <li>New course added (AI & ML)</li>
            <li>Fees reminder sent</li>
          </ul>
        </div>

      </div>

      {/* QUICK ACTIONS */}
      <div className="admin-actions">
        <button className="btn primary">Add Student</button>

        {/* ✅ Navigation works perfectly */}
        <button
          className="btn secondary"
          onClick={() => navigate("/admin/create-faculty")}
        >
          Add Faculty
        </button>

        <button className="btn ghost">Create Course</button>
        <button className="btn ghost">Assign Faculty</button>
        <button className="btn ghost">Settings</button>
      </div>

    </div>
  );
}

/* KPI COMPONENT */
function Kpi({ title, value, good, warn, bad }) {
  return (
    <div
      className={`admin-kpi ${
        good ? "good" : warn ? "warn" : bad ? "bad" : ""
      }`}
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
