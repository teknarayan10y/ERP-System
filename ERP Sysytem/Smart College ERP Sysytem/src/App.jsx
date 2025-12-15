// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";

import StudentLayout from "./features/student/StudentLayout";
import StudentDashboard from "./features/student/StudentDashboard";
import StudentProfile from "./features/student/StudentProfile";
import StudentCourses from "./features/student/StudentCourses";

import FacultyLayout from "./features/faculty/FacultyLayout";
import FacultyDashboard from "./features/faculty/FacultyDashboard";
import AdminDashboard from "./features/admin/AdminDashboard";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import "./App.css";

/* ---------------- HOME PAGE ---------------- */
function Home() {
  return (
    <div className="container">
      <header className="page-header">
        <h1>Smart College ERP</h1>
        <p>Select a dashboard to continue.</p>
      </header>

      <nav className="nav">
        <Link to="/student/dashboard" className="btn">Student Dashboard</Link>
        <Link to="/faculty/dashboard" className="btn">Faculty Dashboard</Link>
        <Link to="/admin/dashboard" className="btn">Admin Dashboard</Link>
        <Link to="/login" className="btn secondary">Login</Link>
        <Link to="/signup" className="btn ghost">Signup</Link>
      </nav>
    </div>
  );
}

/* ---------------- APP ---------------- */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* HOME */}
        <Route path="/" element={<Home />} />

        {/* STUDENT (SHARED LAYOUT) */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="/student/courses" element={<StudentCourses />} />
        </Route>

        {/* FACULTY */}
        <Route path="/faculty" element={<FacultyLayout />}>
  <Route path="dashboard" element={<FacultyDashboard />} />
  {/* add more faculty pages here */}
</Route>

        {/* ADMIN */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
