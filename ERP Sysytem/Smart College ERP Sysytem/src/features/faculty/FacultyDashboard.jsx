import React from "react";
import "./FacultyDashboard.css";

/* ================== MAIN COMPONENT ================== */
export default function FacultyDashboard() {
  const kpis = [
    { title: "Subjects Handling", value: 4 },
    { title: "Total Students", value: 182 },
    { title: "Average Attendance", value: "86%", status: "good" },
    { title: "Pending Attendance", value: 3, status: "warn" },
    { title: "Pending Evaluations", value: 2, status: "bad" },
  ];

  const schedule = [
    {
      time: "09:00 – 10:00",
      subject: "Operating Systems",
      section: "CSE-A",
      room: "B-204",
    },
    {
      time: "11:00 – 12:00",
      subject: "DBMS",
      section: "CSE-B",
      room: "A-102",
    },
    {
      time: "02:00 – 04:00",
      subject: "Computer Networks Lab",
      section: "CSE-A",
      room: "Lab-3",
    },
  ];

  return (
    <div className="faculty">

      {/* HEADER */}
      <header className="faculty-header">
        <h1>Faculty Dashboard</h1>
        <p>Academic overview & daily teaching operations</p>
      </header>

      {/* KPI */}
      <section className="faculty-kpis">
        {kpis.map((kpi, i) => (
          <Kpi key={i} {...kpi} />
        ))}
      </section>

      {/* CONTENT GRID */}
      <section className="faculty-grid">

        {/* SCHEDULE */}
        <Card title="Today’s Teaching Schedule" wide>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Subject</th>
                <th>Section</th>
                <th>Room</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={i}>
                  <td>{row.time}</td>
                  <td>{row.subject}</td>
                  <td>{row.section}</td>
                  <td>{row.room}</td>
                  <td>
                    <button className="btn btn-outline">Attendance</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* QUICK ACTIONS */}
        <Card title="Quick Actions">
          <div className="actions">
            <button className="btn btn-primary">Mark Attendance</button>
            <button className="btn btn-secondary">Enter Marks</button>
            <button className="btn btn-ghost">Create Assignment</button>
          </div>
        </Card>

        {/* TASKS */}
        <Card title="Pending Tasks">
          <ul className="list">
            <li>Mark DBMS attendance</li>
            <li>Upload CIA-1 marks</li>
            <li>Evaluate Assignment-2</li>
          </ul>
        </Card>

        {/* NOTICES */}
        <Card title="Important Notices" wide>
          <ul className="notice">
            <li>Internal marks submission deadline – Friday</li>
            <li>Department meeting today at 3:00 PM</li>
            <li>Attendance audit next week</li>
          </ul>
        </Card>

      </section>
    </div>
  );
}

/* ================== REUSABLE COMPONENTS ================== */

function Card({ title, wide, children }) {
  return (
    <div className={`card ${wide ? "wide" : ""}`}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function Kpi({ title, value, status }) {
  return (
    <div className={`kpi ${status || ""}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
