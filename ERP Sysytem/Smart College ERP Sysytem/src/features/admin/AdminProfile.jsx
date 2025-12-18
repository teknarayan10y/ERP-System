// src/features/admin/AdminProfile.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../auth/api";
import "../student/StudentProfile.css";

function toAbsoluteUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const filesBase = apiBase.replace(/\/api$/i, "");
  const rel = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${filesBase}${rel}`;
}

function splitName(name) {
  const parts = (name || "").trim().split(/\s+/);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

export default function AdminProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Local form state (editable fields)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    // Education
    qualification: "",
    institution: "",
    passingYear: "",
    // Photo
    profileImageUrl: "",
    profileImagePreview: "",
  });
  const [newPhotoFile, setNewPhotoFile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      setOk("");

      let u = null;
      let p = null;

      try {
        // Current user identity (name/email/role)
        const r = await api.me(); // { user }
        u = r?.user || null;
      } catch {
        // ignore; fallback below
      }

      try {
        // Profile details (phone/address/etc.)
        const r2 = await api.profileGet(); // { profile }
        p = r2?.profile || null;
      } catch (e) {
        if (!u) setErr(e.message || "Failed to load profile");
      }

      const names = splitName(u?.name);
      const profileImageUrl = toAbsoluteUploadUrl(p?.profileImage) || "";

      if (!cancelled) {
        setUser(u);
        setProfile(p);
        setForm(f => ({
          ...f,
          firstName: p?.firstName || u?.firstName || names.firstName || "",
          lastName: p?.lastName || u?.lastName || names.lastName || "",
          phone: p?.phone || "",
          address: p?.address || "",
          city: p?.city || "",
          state: p?.state || "",
          pincode: p?.pincode || "",
          qualification: p?.qualification || "",
          institution: p?.institution || "",
          passingYear: p?.passingYear || "",
          profileImageUrl,
          profileImagePreview: "",
        }));

        // cache avatar for header and notify
        if (profileImageUrl) {
          localStorage.setItem("admin_profile_image", profileImageUrl);
          window.dispatchEvent(new CustomEvent("profile-photo-updated", { detail: { url: profileImageUrl } }));
        }

        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const displayName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.name || "-";
  const email = user?.email || "-";
  const role = user?.role || "Admin";

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

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

      if (newPhotoFile) {
        const fd = new FormData();
        // Append editable fields including Education
        const keys = [
          "firstName","lastName",
          "phone","address","city","state","pincode",
          "qualification","institution","passingYear",
        ];
        keys.forEach(k => {
          const v = form[k];
          if (v !== undefined && v !== null) fd.append(k, v);
        });

        // IMPORTANT: backend expects 'profileImage' (multer upload.single('profileImage'))
        fd.append("profileImage", newPhotoFile);

        await api.profilePutForm(fd);
      } else {
        await api.profilePut({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          qualification: form.qualification,
          institution: form.institution,
          passingYear: form.passingYear,
        });
      }

      setOk("Profile updated");
      setEdit(false);

      // Reload latest profile and user
      try {
        const r2 = await api.profileGet();
        const p2 = r2?.profile || {};
        const profileImageUrl = toAbsoluteUploadUrl(p2?.profileImage) || "";
        setProfile(p2);
        setForm(f => ({
          ...f,
          profileImageUrl,
          profileImagePreview: "",
        }));

        // update header avatar cache and notify
        if (profileImageUrl) {
          localStorage.setItem("admin_profile_image", profileImageUrl);
          window.dispatchEvent(new CustomEvent("profile-photo-updated", { detail: { url: profileImageUrl } }));
        }
      } catch {}

      // refresh user display name/email from auth if needed
      try {
        const r = await api.me();
        const u = r?.user || {};
        setUser(u);
      } catch {}

      setNewPhotoFile(null);
    } catch (e) {
      setErr(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="profile-page"><p>Loading…</p></div>;

  return (
    <div className="profile-page">
      <h1>My Profile (Admin)</h1>
      {err && <div className="form-error">{err}</div>}
      {ok && <div className="form-ok">{ok}</div>}

      {/* Account header: photo + name/email/role + edit controls */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Account</h2>
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
                onClick={() => {
                  setErr(""); setOk("");
                  setEdit(false);
                  setNewPhotoFile(null);
                  setForm(f => ({ ...f, profileImagePreview: "" }));
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="grid-2">
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
                  <input type="file" accept="image/*" onChange={onPickPhoto} style={{ display: "none" }} />
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

          <div>
            <div><strong>Name:</strong> {displayName}</div>
            <div><strong>Email:</strong> {email}</div>
            <div><strong>Role:</strong> {role}</div>
          </div>
        </div>
      </section>

      {/* Personal & Contact */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Personal & Contact</h2>
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
                onClick={() => { setErr(""); setOk(""); setEdit(false); setNewPhotoFile(null); setForm(f => ({ ...f, profileImagePreview: "" })); }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="grid-2">
          <label className="field">
            <span>First Name</span>
            <input className="input" name="firstName" value={form.firstName} onChange={onChange} readOnly={!edit} />
          </label>
          <label className="field">
            <span>Last Name</span>
            <input className="input" name="lastName" value={form.lastName} onChange={onChange} readOnly={!edit} />
          </label>

          <label className="field">
            <span>Phone</span>
            <input className="input" name="phone" value={form.phone} onChange={onChange} readOnly={!edit} />
          </label>

          <label className="field col-span-2">
            <span>Address</span>
            <input className="input" name="address" value={form.address} onChange={onChange} readOnly={!edit} />
          </label>

          <label className="field">
            <span>City</span>
            <input className="input" name="city" value={form.city} onChange={onChange} readOnly={!edit} />
          </label>

          <label className="field">
            <span>State</span>
            <input className="input" name="state" value={form.state} onChange={onChange} readOnly={!edit} />
          </label>

          <label className="field">
            <span>Pincode</span>
            <input className="input" name="pincode" value={form.pincode} onChange={onChange} readOnly={!edit} />
          </label>
        </div>
      </section>

      <br />

      {/* Education */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Education</h2>
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
                onClick={() => { setErr(""); setOk(""); setEdit(false); setNewPhotoFile(null); setForm(f => ({ ...f, profileImagePreview: "" })); }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="grid-2">
          <label className="field">
            <span>Qualification</span>
            <input className="input" name="qualification" value={form.qualification} onChange={onChange} readOnly={!edit} />
          </label>
          <label className="field">
            <span>Institution</span>
            <input className="input" name="institution" value={form.institution} onChange={onChange} readOnly={!edit} />
          </label>
          <label className="field">
            <span>Passing Year</span>
            <input className="input" name="passingYear" value={form.passingYear} onChange={onChange} readOnly={!edit} />
          </label>
        </div>
      </section>
    </div>
  );
}