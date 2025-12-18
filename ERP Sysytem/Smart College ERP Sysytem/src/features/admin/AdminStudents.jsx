// src/features/admin/AdminStudents.jsx
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
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const res = await api.adminStudents();
        const items = Array.isArray(res.items) ? res.items : [];
        setRows(items);
      } catch (e) {
        setErr(e.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="admin-students"><p>Loading…</p></div>;

  return (
    <div className="admin-students">
      <h1>Students</h1>
      {err && <div className="form-error">{err}</div>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Student ID</th>
            <th>Name</th>
            <th>Branch</th>
            <th>Semester</th>
            <th>Email</th>
            <th>Resume</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: "center" }}>No students found.</td></tr>
          ) : rows.map(({ user, profile }) => {
            const userId = user?._id;
            const img = toAbsoluteUploadUrl(profile?.profileImage);
            const name = [user?.firstName || profile?.firstName, user?.lastName || profile?.lastName]
              .filter(Boolean).join(" ") || "-";
            return (
              <tr key={userId}>
                <td>
                  {img
                    ? <img src={img} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                           onError={(e) => { e.currentTarget.src = "/avatar-placeholder.png"; }} />
                    : "-"}
                </td>
                <td>{profile?.studentId || "-"}</td>
                <td className="clickable" onClick={() => navigate(`/admin/students/${userId}`)}>{name}</td>
                <td>{profile?.branch || "-"}</td>
                <td>{profile?.semester || "-"}</td>
                <td>{user?.email || profile?.email || "-"}</td>
                <td>
                  {profile?.resumeLink
                    ? <a href={profile.resumeLink} target="_blank" rel="noreferrer">Open</a>
                    : "-"}
                </td>
                <td>
                  <button className="btn ghost" onClick={() => navigate(`/admin/students/${userId}`)}>
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