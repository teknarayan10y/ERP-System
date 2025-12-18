import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../auth/api";
import "./AdminStudentProfile.css";

function toAbsoluteUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const filesBase = apiBase.replace(/\/api$/i, "");
  const rel = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${filesBase}${rel}`;
}

export default function AdminStudentProfile() {
  const { studentId } = useParams();
  const [data, setData] = useState({ user: null, profile: null });
  const [form, setForm] = useState({});
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    setErr(""); setOk("");
    const res = await api.adminStudentProfile(studentId);
    setData({ user: res.user, profile: res.profile });
    setForm({
      ...(res.profile || {})
    });
  }

  useEffect(() => { load().catch(e => setErr(e.message || "Failed to load profile")); }, [studentId]);

  const u = data.user || {};
  const p = data.profile || {};
  const photo = toAbsoluteUploadUrl(p.profileImage);

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSave = async () => {
    try {
      setSaving(true); setErr(""); setOk("");
      await api.adminUpdateStudentProfile(studentId, {
        rollNo: form.rollNo,
        program: form.program,
        department: form.department,
        semester: form.semester,
        phone: form.phone,
        cgpa: form.cgpa,
        remarks: form.remarks,
      });
      setOk("Profile updated");
      setEdit(false);
      await load();
    } catch (e) {
      setErr(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    try {
      setSaving(true); setErr(""); setOk("");
      const next = !u.isActive;
      await api.adminUpdateUserStatus(studentId, next);
      setOk(next ? "User activated" : "User deactivated");
      await load();
    } catch (e) {
      setErr(e.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-student-profile">
      <h1>Student Profile</h1>
      {err && <div className="form-error">{err}</div>}
      {ok && <div className="form-ok">{ok}</div>}

      <div className="profile-card">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#eee', overflow: 'hidden' }}>
            {photo ? <img src={photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </div>
          <div>
            <div><strong>{u.name}</strong></div>
            <div>{u.email}</div>
            <div>Status: <span className={`status ${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></div>
          </div>
        </div>

        {edit ? (
          <div className="grid-2">
            <label className="field"><span>Roll No</span>
              <input name="rollNo" value={form.rollNo || ""} onChange={onChange} />
            </label>
            <label className="field"><span>Program</span>
              <input name="program" value={form.program || ""} onChange={onChange} />
            </label>
            <label className="field"><span>Department</span>
              <input name="department" value={form.department || ""} onChange={onChange} />
            </label>
            <label className="field"><span>Semester</span>
              <input name="semester" value={form.semester || ""} onChange={onChange} />
            </label>
            <label className="field"><span>Phone</span>
              <input name="phone" value={form.phone || ""} onChange={onChange} />
            </label>
            <label className="field"><span>CGPA</span>
              <input name="cgpa" value={form.cgpa || ""} onChange={onChange} />
            </label>
            <label className="field col-span-2"><span>Remarks</span>
              <input name="remarks" value={form.remarks || ""} onChange={onChange} />
            </label>
          </div>
        ) : (
          <>
           
<div><strong>Roll No:</strong> {p.rollNo || "-"}</div>
<div><strong>Register No:</strong> {p.registerNumber || "-"}</div> {/* NEW */}
<div><strong>Program:</strong> {p.program || "-"}</div>
<div><strong>Department:</strong> {p.department || "-"}</div>
<div><strong>Section:</strong> {p.section || "-"}</div> {/* NEW */}
<div><strong>Semester:</strong> {p.semester || "-"}</div>
<div><strong>Join Year:</strong> {p.admissionYear || "-"}</div> {/* NEW */}
<div><strong>Passout Year:</strong> {p.passoutYear || "-"}</div> {/* NEW */}
<div><strong>Phone:</strong> {p.phone || "-"}</div>
<div><strong>CGPA:</strong> {p.cgpa || "-"}</div>
<div><strong>Remarks:</strong> {p.remarks || "-"}</div> 

{/* Optional address block */}
<div><strong>Address:</strong> {p.address || "-"}</div> {/* NEW (optional) */}
<div><strong>City:</strong> {p.city || "-"}</div>       {/* NEW (optional) */}
<div><strong>State:</strong> {p.state || "-"}</div>     {/* NEW (optional) */}
<div><strong>Pincode:</strong> {p.pincode || "-"}</div> {/* NEW (optional) */}
          </>
        )}
      </div>

      <div className="admin-actions">
        {!edit ? (
          <button className="btn primary" onClick={() => setEdit(true)}>Edit Profile</button>
        ) : (
          <button className="btn primary" disabled={saving} onClick={onSave}>{saving ? "Saving…" : "Save"}</button>
        )}
        <button className="btn secondary" disabled={saving} onClick={toggleActive}>
          {u.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}