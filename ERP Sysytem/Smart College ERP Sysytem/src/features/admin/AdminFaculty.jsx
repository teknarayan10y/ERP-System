import React from "react";
import { useNavigate } from "react-router-dom";
import "./AdminFaculty.css";

export default function AdminFaculty() {
  const navigate = useNavigate();

  // Demo data (later backend)
  const facultyList = [
    {
      id: "FAC001",
      name: "Dr. R. Kumar",
      department: "Computer Science",
      designation: "Professor",
      status: "Active",
    },
    {
      id: "FAC002",
      name: "Ms. Anita Sharma",
      department: "Electronics",
      designation: "Assistant Professor",
      status: "Active",
    },
    {
      id: "FAC003",
      name: "Mr. Rahul Verma",
      department: "Mechanical",
      designation: "Associate Professor",
      status: "Inactive",
    },
  ];

  return (
    <div className="admin-faculty">
      <h1>Faculty</h1>
      <p>Click on a faculty member to view profile</p>

      <table className="faculty-table">
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {facultyList.map((f) => (
            <tr key={f.id}>
              <td>{f.id}</td>

              <td
                className="clickable"
                onClick={() => navigate(`/admin/faculty/${f.id}`)}
              >
                {f.name}
              </td>

              <td>{f.department}</td>
              <td>{f.designation}</td>

              <td>
                <span
                  className={`faculty-status ${
                    f.status === "Active" ? "active" : "inactive"
                  }`}
                >
                  {f.status}
                </span>
              </td>

              <td>
                <button
                  className="btn ghost"
                  onClick={() => navigate(`/admin/faculty/${f.id}`)}
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
