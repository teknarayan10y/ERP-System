import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";

/* -------- STUDENT -------- */
import StudentLayout from "./features/student/StudentLayout";
import StudentDashboard from "./features/student/StudentDashboard";
import StudentProfile from "./features/student/StudentProfile";
import StudentCourses from "./features/student/StudentCourses";

/* -------- FACULTY -------- */
import FacultyLayout from "./features/faculty/FacultyLayout";
import FacultyDashboard from "./features/faculty/FacultyDashboard";
import FacultyProfile from "./features/faculty/FacultyProfile";
import FacultyMySubjects from "./features/faculty/FacultyMySubjects";

/* -------- ADMIN -------- */
import AdminLayout from "./features/admin/AdminLayout";
import AdminProfile from "./features/admin/AdminProfile";
import AdminDashboard from "./features/admin/AdminDashboard";
import CreateFaculty from "./features/admin/CreateFaculty";
import AdminFaculty from "./features/admin/AdminFaculty";
import AdminFacultyProfile from "./features/admin/AdminFacultyProfile";
import AdminStudents from "./features/admin/AdminStudents";
import AdminStudentProfile from "./features/admin/AdminStudentProfile";
import AdminCourses from "./features/admin/AdminCourses";
import CreateCourse from "./features/admin/CreateCourse";
import EditCourse from "./features/admin/EditCourse";

/* -------- AUTH -------- */
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import "./App.css";

/* ---------------- HOME ---------------- */
function Home() {
  return (
    <div className="container">
      <header className="page-header">
        <h1>Smart College ERP</h1>
        <p>Select a dashboard to continue.</p>
      </header>

      <nav className="nav">
        <Link to="/student" className="btn">Student Dashboard</Link>
        <Link to="/faculty" className="btn">Faculty Dashboard</Link>
        <Link to="/admin" className="btn">Admin Dashboard</Link>
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

        {/* ================= STUDENT ================= */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="courses" element={<StudentCourses />} />
        </Route>

        {/* ================= FACULTY ================= */}
        <Route path="/faculty" element={<FacultyLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FacultyDashboard />} />
           <Route path="profile" element={<FacultyProfile />} /> {/* NEW */}
             <Route path="my-subjects" element={<FacultyMySubjects />} />
          {/* add more faculty pages later */}
        </Route>

        {/* ================= ADMIN ================= */}
        <Route path="/admin" element={<AdminLayout />}>
        <Route path="profile" element={<AdminProfile />} /> 
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
           <Route path="create-faculty" element={<CreateFaculty />} />
           <Route path="faculty" element={<AdminFaculty />} />
  <Route path="faculty/:facultyId" element={<AdminFacultyProfile />} />
            <Route path="students" element={<AdminStudents />} />
  <Route path="students/:studentId" element={<AdminStudentProfile />} />
  <Route path="courses" element={<AdminCourses />} />
<Route path="courses/create" element={<CreateCourse />} />

<Route path="courses/:courseId/edit" element={<EditCourse />} />

          {/* add admin pages later */}
        </Route>

        {/* ================= AUTH ================= */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
