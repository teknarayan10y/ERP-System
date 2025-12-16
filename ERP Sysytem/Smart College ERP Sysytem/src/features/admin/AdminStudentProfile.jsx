import React from "react";
import { useParams } from "react-router-dom";
import "./AdminStudentProfile.css";

export default function AdminStudentProfile() {
  const { studentId } = useParams();

  // demo student (later fetch using studentId)
  const student = {
    rollNo: studentId,
    name: "John Doe",
    department: "Computer Science",
    program: "B.Tech",
    semester: 5,
    email: "john.doe@college.edu",
    phone: "+91 9876543210",
    cgpa: 8.4,
    status: "Active",
  };

  return (
    <div className="admin-student-profile">

      <h1>Student Profile</h1>
      <p>Admin view of student details</p>

      <div className="profile-card">
        <div><strong>Roll No:</strong> {student.rollNo}</div>
        <div><strong>Name:</strong> {student.name}</div>
        <div><strong>Program:</strong> {student.program}</div>
        <div><strong>Department:</strong> {student.department}</div>
        <div><strong>Semester:</strong> {student.semester}</div>
        <div><strong>Email:</strong> {student.email}</div>
        <div><strong>Phone:</strong> {student.phone}</div>
        <div><strong>CGPA:</strong> {student.cgpa}</div>
        <div>
          <strong>Status:</strong>
          <span className="status active">{student.status}</span>
        </div>
      </div>

      <div className="admin-actions">
        <button className="btn primary">Edit Profile</button>
        <button className="btn secondary">Deactivate</button>
      </div>
    </div>
  );
}
