// src/features/student/StudentProfile.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../auth/api";
import "./StudentProfile.css";

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [activeTab, setActiveTab] = useState("personal");

  /* ---------- EDIT MODE ---------- */
  const [editMode, setEditMode] = useState({
    personal: false,
    contact: false,
    academic: false,
    professional: false,
    other: false,
  });

  /* ---------- FORM DATA ---------- */
  const [form, setForm] = useState({
    /* Personal */
    firstName: "",
    lastName: "",
    gender: "",
    dob: "",
    bloodGroup: "",
    nationality: "",

    /* Contact */
    email: "",
    phone: "",
    altPhone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",

    /* Academic */
    registerNumber: "",
    rollNo: "",
    program: "",
    department: "",
    semester: "",
    section: "",
    admissionYear: "",
    passoutYear: "",
    cgpa: "",

    /* Professional */
    profileImage: null,
    profileImagePreview: "",
    github: "",
    linkedin: "",
    portfolio: "",
    leetcode: "",
    hackerrank: "",
    codechef: "",
    codeforces: "",
    kaggle: "",
    resumeLink: "",

    /* Other */
    aadhaar: "",
    hobbies: "",
    achievements: "",
    remarks: "",
  });

  /* ---------- LOAD PROFILE ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.studentProfile();
        setForm(f => ({ ...f, ...(res?.profile || {}) }));
      } catch (e) {
        setErr(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- HANDLERS ---------- */
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setForm(prev => ({
      ...prev,
      profileImage: file,
      profileImagePreview: URL.createObjectURL(file),
    }));
  };

  const toggleEdit = (section) => {
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    try {
      setSaving(true);

      // Backend ready (FormData)
      const fd = new FormData();
      Object.keys(form).forEach(key => fd.append(key, form[key]));

      await api.updateStudentProfile(fd);

      setOk("Profile updated successfully");
      setEditMode({
        personal: false,
        contact: false,
        academic: false,
        professional: false,
        other: false,
      });
    } catch (e) {
      setErr(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="profile-wrap"><div className="profile-skeleton">Loading…</div></div>;
  }

  return (
    <div className="profile-wrap">

      {/* HEADER */}
      <div className="profile-header">
        <div className="avatar-xl">
          {form.profileImagePreview ? (
            <img src={form.profileImagePreview} alt="Profile" />
          ) : (
            (form.firstName || "S")[0]
          )}
        </div>
        <div>
          <h1>My Profile</h1>
          <p>Manage your student & professional details</p>
        </div>
      </div>

      <div className="profile-layout">

        {/* LEFT MENU */}
        <aside className="profile-menu">
          <button className={activeTab === "personal" ? "active" : ""} onClick={() => setActiveTab("personal")}>👤 Personal</button>
          <button className={activeTab === "contact" ? "active" : ""} onClick={() => setActiveTab("contact")}>📞 Contact</button>
          <button className={activeTab === "academic" ? "active" : ""} onClick={() => setActiveTab("academic")}>🎓 Academic</button>
          <button className={activeTab === "professional" ? "active" : ""} onClick={() => setActiveTab("professional")}>💼 Professional</button>
          <button className={activeTab === "other" ? "active" : ""} onClick={() => setActiveTab("other")}>🧩 Other</button>
        </aside>

        {/* RIGHT CONTENT */}
        <form className="profile-form" onSubmit={onSubmit}>

          {/* PERSONAL */}
          {activeTab === "personal" && (
            <Section title="Personal Details" editing={editMode.personal} onEdit={() => toggleEdit("personal")}>
              <Grid>
                <Input label="First Name" name="firstName" value={form.firstName} onChange={onChange} readOnly={!editMode.personal} />
                <Input label="Last Name" name="lastName" value={form.lastName} onChange={onChange} readOnly={!editMode.personal} />
                <Input label="Gender" name="gender" value={form.gender} onChange={onChange} readOnly={!editMode.personal} />
                <Input type="date" label="DOB" name="dob" value={form.dob} onChange={onChange} readOnly={!editMode.personal} />
                <Input label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={onChange} readOnly={!editMode.personal} />
                <Input label="Nationality" name="nationality" value={form.nationality} onChange={onChange} readOnly={!editMode.personal} />
              </Grid>
            </Section>
          )}

          {/* CONTACT */}
          {activeTab === "contact" && (
            <Section title="Contact Details" editing={editMode.contact} onEdit={() => toggleEdit("contact")}>
              <Grid>
                <Input label="Email" name="email" value={form.email} onChange={onChange} readOnly={!editMode.contact} />
                <Input label="Mobile" name="phone" value={form.phone} onChange={onChange} readOnly={!editMode.contact} />
                <Input label="Alternate Mobile" name="altPhone" value={form.altPhone} onChange={onChange} readOnly={!editMode.contact} />
                <Input label="Address" name="address" value={form.address} onChange={onChange} readOnly={!editMode.contact} col />
                <Input label="City" name="city" value={form.city} onChange={onChange} readOnly={!editMode.contact} />
                <Input label="State" name="state" value={form.state} onChange={onChange} readOnly={!editMode.contact} />
                <Input label="Pincode" name="pincode" value={form.pincode} onChange={onChange} readOnly={!editMode.contact} />
              </Grid>
            </Section>
          )}

          {/* ACADEMIC */}
          {activeTab === "academic" && (
            <Section title="Academic Details" editing={editMode.academic} onEdit={() => toggleEdit("academic")}>
              <Grid>
                <Input label="Register No" name="registerNumber" value={form.registerNumber} onChange={onChange} readOnly={!editMode.academic} />
                <Input label="Roll No" name="rollNo" value={form.rollNo} onChange={onChange} readOnly={!editMode.academic} />
                <Input label="Program" name="program" value={form.program} onChange={onChange} readOnly={!editMode.academic} />
                <Input label="Department" name="department" value={form.department} onChange={onChange} readOnly={!editMode.academic} />
                <Input label="Semester" name="semester" value={form.semester} onChange={onChange} readOnly={!editMode.academic} />
                <Input label="Section" name="section" value={form.section} onChange={onChange} readOnly={!editMode.academic} />
                <Input label="CGPA" name="cgpa" value={form.cgpa} onChange={onChange} readOnly={!editMode.academic} />
                <Input label="AdmissionYear" name="admissionyear" value={form.admissionYear} onChange={onChange} readOnly={!editMode.academic} />
                 <Input label="PassoutYear" name="passoutyear" value={form.passoutYear} onChange={onChange} readOnly={!editMode.academic} />
                  

              </Grid>
            </Section>
          )}

          {/* PROFESSIONAL */}
          {activeTab === "professional" && (
            <Section title="Professional Details" editing={editMode.professional} onEdit={() => toggleEdit("professional")}>
              
              {/* PROFILE PHOTO */}
              <div className="profile-photo-box">
                <div className="photo-preview">
                  {form.profileImagePreview ? (
                    <img src={form.profileImagePreview} alt="Profile" />
                  ) : (
                    <span>No Photo</span>
                  )}
                </div>

                {editMode.professional && (
                  <label className="upload-btn">
                    Upload Photo
                    <input type="file" accept="image/*" hidden onChange={onImageChange} />
                  </label>
                )}
              </div>

              <Grid>
                <Input label="GitHub" name="github" value={form.github} onChange={onChange} readOnly={!editMode.professional} />
                <Input label="LinkedIn" name="linkedin" value={form.linkedin} onChange={onChange} readOnly={!editMode.professional} />
                <Input label="Portfolio" name="portfolio" value={form.portfolio} onChange={onChange} readOnly={!editMode.professional} />
                <Input label="LeetCode" name="leetcode" value={form.leetcode} onChange={onChange} readOnly={!editMode.professional} />
                <Input label="Resume Link" name="resumeLink" value={form.resumeLink} onChange={onChange} readOnly={!editMode.professional} col />
              </Grid>
            </Section>
          )}

          {/* OTHER */}
          {activeTab === "other" && (
            <Section title="Other Information" editing={editMode.other} onEdit={() => toggleEdit("other")}>
              <Grid>
                <Input label="Aadhaar" name="aadhaar" value={form.aadhaar} onChange={onChange} readOnly={!editMode.other} />
                <Input label="Hobbies" name="hobbies" value={form.hobbies} onChange={onChange} readOnly={!editMode.other} />
                <Input label="Achievements" name="achievements" value={form.achievements} onChange={onChange} readOnly={!editMode.other} col />
                <Input label="Remarks" name="remarks" value={form.remarks} onChange={onChange} readOnly={!editMode.other} col />
              </Grid>
            </Section>
          )}

          {err && <div className="form-error">{err}</div>}
          {ok && <div className="form-ok">{ok}</div>}

          <div className="profile-actions">
            <button className="btn primary" disabled={saving}>
              {saving ? "Saving…" : "Save All Changes"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

/* ---------- REUSABLES ---------- */
function Section({ title, children, editing, onEdit }) {
  return (
    <section className="profile-section">
      <div className="section-header">
        <h2>{title}</h2>
        <button type="button" className="btn small ghost" onClick={onEdit}>
          {editing ? "Save" : "Edit"}
        </button>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }) {
  return <div className="grid-2">{children}</div>;
}

function Input({ label, name, value, onChange, type = "text", col, readOnly }) {
  return (
    <label className={`field ${col ? "col-span-2" : ""}`}>
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={readOnly ? "readonly" : ""}
      />
    </label>
  );
}
