import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../auth/api";
import "./AdminStudents.css";

function toAbsoluteUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const filesBase = apiBase.replace(/\/api$/i, "");
  const rel = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${filesBase}${rel}`;
}

export default function AdminStudents() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.adminStudents();
        setRows(res.students || []);
      } catch (e) {
        setErr(e.message || "Failed to load students");
      }
    })();
  }, []);

  return (
    <div className="admin-students">
      <h1>Students</h1>
      {err && <div className="form-error">{err}</div>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Roll No</th>
            <th>Name</th>
            <th>Department</th>
            <th>Semester</th>
            <th>Email</th>
            <th>Resume</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(s => {
            const photo = toAbsoluteUploadUrl(s.profileImage);
            return (
              <tr key={s.userId}>
                <td>{photo ? <img src={photo} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} /> : "-"}</td>
                <td>{s.rollNo || "-"}</td>
                <td className="clickable" onClick={() => navigate(`/admin/students/${s.userId}`)}>{s.name}</td>
                <td>{s.department || "-"}</td>
                <td>{s.semester || "-"}</td>
                <td>{s.email}</td>
                <td>
  {s.resumeLink ? <a href={s.resumeLink} target="_blank" rel="noreferrer">Open</a> : "-"}
</td>
                <td>
                  <button className="btn ghost" onClick={() => navigate(`/admin/students/${s.userId}`)}>
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