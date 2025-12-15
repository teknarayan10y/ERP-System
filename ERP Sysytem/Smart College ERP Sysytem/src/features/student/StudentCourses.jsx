import React, { useMemo, useState } from "react";
import "./StudentCourses.css";

export default function StudentCourses() {
  const [semester, setSemester] = useState("all");

  const courses = useMemo(() => [
    {
      code: "CSE501",
      name: "Operating Systems",
      faculty: "Dr. Sharma",
      credits: 4,
      semester: 5,
      attendance: 92,
      progress: 72,
      status: "Ongoing",
    },
    {
      code: "CSE502",
      name: "Database Management Systems",
      faculty: "Prof. Kumar",
      credits: 3,
      semester: 5,
      attendance: 86,
      progress: 64,
      status: "Ongoing",
    },
    {
      code: "CSE503",
      name: "Computer Networks",
      faculty: "Dr. Singh",
      credits: 4,
      semester: 4,
      attendance: 98,
      progress: 100,
      status: "Completed",
    },
  ], []);

  const filtered =
    semester === "all"
      ? courses
      : courses.filter(c => c.semester === Number(semester));

  return (
    <div className="courses-elite">

      {/* HERO HEADER */}
      <div className="courses-hero">
        <div>
          <h1>My Courses</h1>
          <p>Track learning, performance & academic progress</p>
        </div>

        <select
          className="elite-select"
          value={semester}
          onChange={e => setSemester(e.target.value)}
        >
          <option value="all">All Semesters</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
          <option value="3">Semester 3</option>
          <option value="4">Semester 4</option>
          <option value="5">Semester 5</option>
          <option value="6">Semester 6</option>
          <option value="7">Semester 7</option>
          <option value="8">Semester 8</option>
        </select>
      </div>

      {/* COURSE GRID */}
      <div className="elite-grid">
        {filtered.map(course => (
          <div className="elite-card" key={course.code}>

            {/* HEADER */}
            <div className="elite-card-header">
              <div>
               <h3 className="course-title">{course.name}</h3>

                <span>{course.code}</span>
              </div>

              <span
                className={`elite-status ${
                  course.status === "Ongoing" ? "ongoing" : "completed"
                }`}
              >
                {course.status}
              </span>
            </div>

            {/* FACULTY */}
            <p className="elite-faculty">👨‍🏫 {course.faculty}</p>

            {/* PROGRESS */}
            <div className="elite-progress">
              <div className="progress-top">
                <span>Completion</span>
                <span>{course.progress}%</span>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            {/* STATS */}
            <div className="elite-stats">
              <EliteStat label="Credits" value={course.credits} />
              <EliteStat label="Attendance" value={`${course.attendance}%`} />
              <EliteStat label="Semester" value={`Sem ${course.semester}`} />
            </div>

            {/* ACTIONS */}
            <div className="elite-actions">
              <button className="btn primary">Open</button>
              <button className="btn ghost">Syllabus</button>
            </div>

          </div>
        ))}
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
