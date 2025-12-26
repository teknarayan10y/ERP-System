// src/features/faculty/FacultyProfile.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../auth/api";
import "../student/StudentProfile.css";

function toAbsoluteUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  // Drop trailing /api if present to point to the server origin for static files
  const filesBase = apiBase.replace(/\/api$/i, "");
  const rel = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${filesBase}${rel}`;
}
function splitName(name) {
  const parts = (name || "").trim().split(/\s+/);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

function Field({ label, name, value, onChange, readOnly, type = "text", col, disabled }) {
  return (
    <label className={`field ${col ? "col" : ""}`}>
      <span>{label}</span>
      <input
        className="input"
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        readOnly={!!readOnly}
        disabled={!!disabled}
      />
    </label>
  );
}

export default function FacultyProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [form, setForm] = useState({
    // Personal
    firstName: "", lastName: "", gender: "", dob: "",
    // Contact
    email: "", phone: "", altPhone: "", address: "", city: "", state: "", pincode: "",
    // Faculty
    facultyId: "", department: "", designation: "",
    // Photo
    profileImage: null,
    profileImagePreview: "",
    profileImageUrl: "",
    // Social
    github: "", linkedin: "", portfolio: "",
    // Career
    qualification: "", experienceYears: "", experienceSummary: "", employmentStatus: "active",
    // Teaching subjects (comma-separated in UI)
    teachingSubjectsText: "",
    // Misc
    remarks: "",
  });

  const [newPhotoFile, setNewPhotoFile] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  async function reloadProfile() {
    const res = await api.facultyProfileGet();
    const p = res.profile || {};
    const u = res.user || {};

    const names = splitName(u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim());
    const profileImageUrl = toAbsoluteUploadUrl(p.profileImage) || "";

    const teachingSubjectsText = Array.isArray(p.teachingSubjects)
      ? p.teachingSubjects.join(", ")
      : (p.teachingSubjects || "");

    setForm(f => ({
      ...f,
      // Personal
      firstName: p.firstName || u.firstName || names.firstName || "",
      lastName: p.lastName || u.lastName || names.lastName || "",
      gender: p.gender || "",
      dob: p.dob || "",
      // Contact
      email: u.email || p.email || "",
      phone: p.phone || "",
      altPhone: p.altPhone || "",
      address: p.address || "",
      city: p.city || "",
      state: p.state || "",
      pincode: p.pincode || "",
      // Faculty
      facultyId: p.facultyId || "",
      department: p.department || "",
      designation: p.designation || "",
      // Photo
      profileImage: null,
      profileImagePreview: "",
      profileImageUrl,
      // Social
      github: p.github || "",
      linkedin: p.linkedin || "",
      portfolio: p.portfolio || "",
      // Career
      qualification: p.qualification || "",
      experienceYears: p.experienceYears ?? "",
      experienceSummary: p.experienceSummary || "",
      employmentStatus: p.employmentStatus || "active",
      // Teaching subjects UI text
      teachingSubjectsText,
      // Misc
      remarks: p.remarks || "",
    }));

    // cache avatar for header
    if (profileImageUrl) {
      localStorage.setItem("faculty_profile_image", profileImageUrl);
      window.dispatchEvent(new CustomEvent("profile-photo-updated", { detail: { url: profileImageUrl } }));
    }
  }

  useEffect(() => {
    setLoading(true);
    setErr(""); setOk("");
    reloadProfile()
      .catch(e => setErr(e.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, profileImagePreview: reader.result }));
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setErr(""); setOk("");

      // Prepare teachingSubjects array from text
      const subjects = (form.teachingSubjectsText || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      if (newPhotoFile) {
        const fd = new FormData();

        // Append allowed fields (exclude facultyId)
        const keys = [
          "firstName","lastName","gender","dob",
          "phone","altPhone","address","city","state","pincode",
          "department","designation",
          "qualification","experienceYears","experienceSummary","employmentStatus",
          "github","linkedin","portfolio","remarks"
        ];
        keys.forEach(k => {
          const v = form[k];
          if (v !== undefined && v !== null) fd.append(k, v);
        });

        // teachingSubjects as JSON string
        fd.append("teachingSubjects", JSON.stringify(subjects));

        // IMPORTANT: field name must match multer.single('profileImage')
        fd.append("profileImage", newPhotoFile);

        await api.facultyProfilePutForm(fd);
      } else {
        const {
          facultyId, teachingSubjectsText, profileImage, profileImagePreview, profileImageUrl,
          ...rest
        } = form;

        await api.facultyProfilePut({
          ...rest,
          teachingSubjects: subjects,
        });
      }

      setOk("Profile updated");
      setEdit(false);
      await reloadProfile();

      // update header name/email cache if needed
      const displayName = `${form.firstName || ""} ${form.lastName || ""}`.trim();
      if (displayName) localStorage.setItem("faculty_name", displayName);
      if (form.email) localStorage.setItem("faculty_email", form.email);
      window.dispatchEvent(new Event("profile-info-updated"));
    } catch (e) {
      setErr(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
      setNewPhotoFile(null);
    }
  };

  if (loading) return <div className="profile-page"><p>Loading…</p></div>;

  return (
    <div className="profile-page">
      <h1>My Profile (Faculty)</h1>
      {err && <div className="form-error">{err}</div>}
      {ok && <div className="form-ok">{ok}</div>}

      {/* Personal */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Personal</h2>
          {!edit ? (
            <button type="button" className="btn small ghost" onClick={() => setEdit(true)}>Edit</button>
          ) : (
            <>
              <button type="button" className="btn small primary" disabled={saving} onClick={onSave}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn small ghost"
                onClick={async () => { setErr(""); setOk(""); await reloadProfile(); setEdit(false); }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
        <div className="grid-2">
          <Field label="First Name" name="firstName" value={form.firstName} onChange={onChange} readOnly={!edit} />
          <Field label="Last Name" name="lastName" value={form.lastName} onChange={onChange} readOnly={!edit} />
          <label className="field">
            <span>Gender</span>
            <select
              className="input"
              name="gender"
              value={form.gender || ""}
              onChange={onChange}
              disabled={!edit}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <Field label="Date of Birth" name="dob" type="date" value={form.dob} onChange={onChange} readOnly={!edit} />
        </div>
      </section>
      <br></br>

      {/* Contact */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Contact</h2>
          {!edit ? (
            <button type="button" className="btn small ghost" onClick={() => setEdit(true)}>Edit</button>
          ) : (
            <>
              <button type="button" className="btn small primary" disabled={saving} onClick={onSave}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn small ghost"
                onClick={async () => { setErr(""); setOk(""); await reloadProfile(); setEdit(false); }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
        <div className="grid-2">
          <Field label="Email" name="email" value={form.email} onChange={onChange} readOnly />
          <Field label="Phone" name="phone" value={form.phone} onChange={onChange} readOnly={!edit} />
          <Field label="Alternate Phone" name="altPhone" value={form.altPhone} onChange={onChange} readOnly={!edit} />
          <Field label="Address" name="address" value={form.address} onChange={onChange} readOnly={!edit} col />
          <Field label="City" name="city" value={form.city} onChange={onChange} readOnly={!edit} />
          <Field label="State" name="state" value={form.state} onChange={onChange} readOnly={!edit} />
          <Field label="Pincode" name="pincode" value={form.pincode} onChange={onChange} readOnly={!edit} />
        </div>
      </section>
      <br></br>

      {/* Faculty */}
      <section className="profile-section">
       <div className="section-header">
  <h2>Faculty</h2>
  {!edit ? (
    <button
      type="button"
      className="btn small ghost"
      onClick={() => setEdit(true)}
    >
      Edit
    </button>
  ) : (
    <>
      <button
        type="button"
        className="btn small primary"
        disabled={saving}
        onClick={onSave}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        className="btn small ghost"
        onClick={async () => { setErr(""); setOk(""); await reloadProfile(); setEdit(false); }}
      >
        Cancel
      </button>
    </>
  )}
</div>
        <div className="grid-2">
          <Field
            label="Faculty ID"
            name="facultyId"
            value={form.facultyId}
            onChange={onChange}
            readOnly={true}
            disabled={true}
          />
          <Field label="Department" name="department" value={form.department} onChange={onChange} readOnly={true} disabled={true} />
          <Field label="Designation" name="designation" value={form.designation} onChange={onChange} readOnly={true} disabled={true} />
          <Field
            label="Teaching Subjects (comma-separated)"
            name="teachingSubjectsText"
            value={form.teachingSubjectsText || ""}
            onChange={onChange}
            readOnly={true}
            disabled={true}
            col
          /> <br></br>
        </div>
        <div className="profile-photo-box">
          <div className="photo-preview">
            {form.profileImagePreview
              ? <img src={form.profileImagePreview} alt="Profile" />
              : form.profileImageUrl
                ? <img src={form.profileImageUrl} alt="Profile" />
                : <span>No Photo</span>}
          </div>
          {edit && (
            <div className="photo-actions">
              <label className="btn small">
                Upload Photo
                <input type="file" accept="image/*" multiple={false} onChange={onPickPhoto} style={{ display: "none" }} />
              </label>
              {form.profileImageUrl && !form.profileImagePreview && (
                <button
                  type="button"
                  className="btn small ghost"
                  onClick={() => setForm(f => ({ ...f, profileImageUrl: "", profileImagePreview: "" }))}
                >
                  Remove Existing
                </button>
              )}
              {form.profileImagePreview && (
                <button
                  type="button"
                  className="btn small ghost"
                  onClick={() => { setForm(f => ({ ...f, profileImagePreview: "" })); setNewPhotoFile(null); }}
                >
                  Clear New
                </button>
              )}
            </div>
          )}
        </div>
      </section>
      <br></br>

      {/* Career */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Career</h2>
          {!edit ? (
            <button type="button" className="btn small ghost" onClick={() => setEdit(true)}>Edit</button>
          ) : (
            <button
              type="button"
              className="btn small ghost"
              onClick={async () => { setErr(""); setOk(""); await reloadProfile(); setEdit(false); }}
            >
              Cancel
            </button>
          )}
        </div>
        <div className="grid-2">
          <Field label="Highest Qualification" name="qualification" value={form.qualification} onChange={onChange} readOnly={!edit} />
          <Field label="Experience (years)" name="experienceYears" value={form.experienceYears} onChange={onChange} readOnly={!edit} />
          <Field label="Experience Summary" name="experienceSummary" value={form.experienceSummary} onChange={onChange} readOnly={!edit} col />
          <label className="field">
            <span>Employment Status</span>
            <select
              className="input"
              name="employmentStatus"
              value={form.employmentStatus || "active"}
              onChange={onChange}
              disabled={!edit}
            >
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="resigned">Resigned</option>
            </select>
          </label>
        </div>
      </section>
      <br></br>

      {/* Social */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Social & Links</h2>
          {!edit ? (
            <button type="button" className="btn small ghost" onClick={() => setEdit(true)}>Edit</button>
          ) : (
            <button
              type="button"
              className="btn small ghost"
              onClick={async () => { setErr(""); setOk(""); await reloadProfile(); setEdit(false); }}
            >
              Cancel
            </button>
          )}
        </div>
        <div className="grid-2">
          <Field label="GitHub" name="github" value={form.github} onChange={onChange} readOnly={!edit} />
          <Field label="LinkedIn" name="linkedin" value={form.linkedin} onChange={onChange} readOnly={!edit} />
          <Field label="Portfolio" name="portfolio" value={form.portfolio} onChange={onChange} readOnly={!edit} col />
        </div>
      </section>
      <br></br>
    </div>
  );
}