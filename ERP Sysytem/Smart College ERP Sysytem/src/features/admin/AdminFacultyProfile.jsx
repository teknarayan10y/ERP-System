import React from "react";
import { useParams } from "react-router-dom";
import "./AdminFacultyProfile.css";

export default function AdminFacultyProfile() {
  const { facultyId } = useParams();

  // Demo faculty profile (fetch by facultyId later)
  const faculty = {
    employeeId: facultyId,
    name: "Dr. R. Kumar",
    department: "Computer Science",
    designation: "Professor",
    email: "rkumar@college.edu",
    phone: "+91 9876543210",
    qualification: "Ph.D",
    experience: "12 Years",
    status: "Active",
    subjects: ["DBMS", "Operating Systems", "Cloud Computing"],
  };

  return (
    <div className="admin-faculty-profile">
      <h1>Faculty Profile</h1>
      <p>Admin view of faculty details</p>

      <div className="faculty-profile-card">
        <div><strong>Employee ID:</strong> {faculty.employeeId}</div>
        <div><strong>Name:</strong> {faculty.name}</div>
        <div><strong>Department:</strong> {faculty.department}</div>
        <div><strong>Designation:</strong> {faculty.designation}</div>
        <div><strong>Email:</strong> {faculty.email}</div>
        <div><strong>Phone:</strong> {faculty.phone}</div>
        <div><strong>Qualification:</strong> {faculty.qualification}</div>
        <div><strong>Experience:</strong> {faculty.experience}</div>
        <div>
          <strong>Status:</strong>
          <span className="faculty-status active">{faculty.status}</span>
        </div>
      </div>

      {/* SUBJECTS */}
      <div className="subject-list">
        <h3>Subjects Handling</h3>
        {faculty.subjects.map((sub) => (
          <span key={sub} className="subject-chip">{sub}</span>
        ))}
      </div>

      {/* ACTIONS */}
      <div className="admin-actions">
        <button className="btn primary">Edit Profile</button>
        <button className="btn secondary">Deactivate Faculty</button>
      </div>
    </div>
  );
}
