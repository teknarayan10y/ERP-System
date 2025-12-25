import React, { useEffect, useMemo, useState } from "react";
import "./StudentCourses.css";
import { api } from "../../auth/api";

export default function StudentCourses() {
  const [semester, setSemester] = useState("all");
  const [courses, setCourses] = useState([]);
  const [profile, setProfile] = useState({ semester: "", branch: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Initial load to get profile + default semester + courses
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.studentCourses(); // { items, profile: { semester, branch } }
        if (cancel) return;
        setCourses(Array.isArray(res?.items) ? res.items : []);
        const p = res?.profile || {};
        setProfile({ semester: p.semester || "", branch: p.branch || "" });
        const sem = Number(p.semester);
        if (Number.isFinite(sem) && sem > 0) {
          setSemester(String(sem)); // default to student's semester
        } else {
          setSemester("all");
        }
      } catch (e) {
        if (!cancel) setError(e?.message || "Failed to load courses");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Refetch when semester changes (server filters by semester + department)
  useEffect(() => {
    let cancel = false;
    if (semester === "") return;

    (async () => {
      try {
        setLoading(true);
        const params = semester === "all" ? {} : { semester };
        const res = await api.studentCourses(params);
        if (!cancel) setCourses(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        if (!cancel) setError(e?.message || "Failed to load courses");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, [semester]);

  // Using server-side filtering; just render what we have
  const filtered = useMemo(() => courses, [courses]);

  if (loading) {
    return (
      <div className="courses-elite">
        <div className="courses-hero">
          <div>
            <h1>My Courses</h1>
            <p>Loading your courses…</p>
          </div>
        </div>
      </div>
    );
  }

  const semesterOptions = [1,2,3,4,5,6,7,8];

  return (
    <div className="courses-elite">
      {/* HERO HEADER */}
      <div className="courses-hero">
        <div>
          <h1>My Courses</h1>
          <p>
            {profile.branch ? `${profile.branch} · ` : ""}
            {profile.semester ? `Semester ${profile.semester}` : "All semesters"}
          </p>
          {error && <div className="alert error" style={{ marginTop: 8 }}>{error}</div>}
          {/* Chips bar (only when All Semesters is selected) */}
          {semester === "all" && (
            <div className="sem-chips" aria-label="Quick semester filter">
              {semesterOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  onClick={() => setSemester(String(s))}
                >
                  Sem {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          className="elite-select"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        >
          <option value="all">All Semesters</option>
          {semesterOptions.map((s) => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>
      </div>

      {/* COURSE GRID */}
      <div className="elite-grid">
        {filtered.map((course) => {
          const progress = Number.isFinite(course.progress) ? course.progress : 0;
          const attendance = Number.isFinite(course.attendance) ? course.attendance : 0;
          const status = course.status || (progress >= 100 ? "Completed" : "Ongoing");
          const facultyName = course.facultyName || course.faculty?.name || "-";

          return (
            <div className="elite-card" key={course._id || course.code}>
              {/* HEADER */}
              <div className="elite-card-header">
                <div>
                  <h3 className="course-title">{course.name}</h3>
                  <span>{course.code}</span>
                </div>

                <span className={`elite-status ${status === "Ongoing" ? "ongoing" : "completed"}`}>
                  {status}
                </span>
              </div>

              {/* FACULTY */}
              <p className="elite-faculty">👨‍🏫 {facultyName}</p>

              {/* PROGRESS */}
              <div className="elite-progress">
                <div className="progress-top">
                  <span>Completion</span>
                  <span>{progress}%</span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                  />
                </div>
              </div>

              {/* STATS */}
              <div className="elite-stats">
                <EliteStat label="Credits" value={course.credits ?? "-"} />
                <EliteStat label="Attendance" value={`${attendance}%`} />
                <EliteStat
                  label="Semester"
                  value={
                    <button
                      type="button"
                      className="link-chip"
                      onClick={() => setSemester(String(course.semester))}
                      title={`Show Semester ${course.semester} courses`}
                    >
                      Sem {course.semester}
                    </button>
                  }
                />
              </div>

              {/* ACTIONS */}
              <div className="elite-actions">
                <button className="btn primary">Open</button>
                <button className="btn ghost">Syllabus</button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="elite-card" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
            No courses found for the selected semester.
          </div>
        )}
      </div>
    </div>
  );
}

/* --- SUB COMPONENT --- */
function EliteStat({ label, value }) {
  return (
    <div className="elite-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}