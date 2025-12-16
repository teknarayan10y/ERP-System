import React from "react";
import { useNavigate } from "react-router-dom";
import "./AdminStudents.css";

export default function AdminStudents() {
  const navigate = useNavigate();

  // demo data (later from backend)
  const students = [
    { id: "CSE001", name: "John Doe", dept: "CSE", semester: 5 },
    { id: "CSE002", name: "Anita Sharma", dept: "CSE", semester: 3 },
    { id: "ECE011", name: "Rahul Verma", dept: "ECE", semester: 7 },
  ];

  return (
    <div className="admin-students">
      <h1>Students</h1>
      <p>Click on a student to view profile</p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Department</th>
            <th>Semester</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td className="clickable"
                  onClick={() => navigate(`/admin/students/${s.id}`)}>
                {s.name}
              </td>
              <td>{s.dept}</td>
              <td>{s.semester}</td>
              <td>
                <button
                  className="btn ghost"
                  onClick={() => navigate(`/admin/students/${s.id}`)}
                >
                  View Profile
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
