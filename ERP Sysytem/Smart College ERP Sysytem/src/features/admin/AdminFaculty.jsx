import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../auth/api";
import "./AdminFaculty.css";

function toAbsoluteUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const filesBase = apiBase.replace(/\/api$/i, "");
  const rel = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${filesBase}${rel}`;
}

export default function AdminFaculty() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.adminFaculty();
        setRows(res.faculty || []);
      } catch (e) {
        setErr(e.message || "Failed to load faculty");
      }
    })();
  }, []);

  return (
    <div className="admin-faculty">
      <h1>Faculty</h1>
      {err && <div className="form-error">{err}</div>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Faculty ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Email</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(f => {
            const photo = toAbsoluteUploadUrl(f.profileImage);
            return (
              <tr key={f.userId}>
                <td>{photo ? <img src={photo} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} /> : "-"}</td>
                <td>{f.facultyId || "-"}</td>
                <td className="clickable" onClick={() => navigate(`/admin/faculty/${f.userId}`)}>{f.name}</td>
                <td>{f.department || "-"}</td>
                <td>{f.designation || "-"}</td>
                <td>{f.email}</td>
                <td>
                  <span className={`status ${f.isActive ? "active" : "inactive"}`}>
                    {f.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button className="btn ghost" onClick={() => navigate(`/admin/faculty/${f.userId}`)}>
                    View Profile
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}