// src/features/faculty/FacultyDashboard.jsx
import React from 'react';

export default function FacultyDashboard() {
  // Static mock data for now; replace with API calls later
  const faculty = { name: 'Dr. Smith', department: 'Computer Science' };
  const classes = [
    { id: 'CSE-501', title: 'Distributed Systems', today: '10:00–11:30', room: 'A-204' },
    { id: 'CSE-502', title: 'Data Mining', today: '13:00–14:30', room: 'B-105' },
  ];
  const sessions = [
    { id: 'S-1001', course: 'CSE-501', startAt: '09:58', status: 'Active', attendees: 42 },
    { id: 'S-1000', course: 'CSE-502', startAt: '11:00', status: 'Closed', attendees: 39 },
  ];
  const tasks = [
    { id: 1, text: 'Grade Assignment 2 (CSE-501)', due: 'Today' },
    { id: 2, text: 'Upload quiz keys (CSE-502)', due: 'Tomorrow' },
  ];

  const stats = [
    { label: 'Classes Today', value: classes.length },
    { label: 'Active Session', value: sessions.filter(s => s.status === 'Active').length },
    { label: 'Pending Tasks', value: tasks.length },
  ];

  return (
    <div className="container">
      <header className="page-header">
        <div className="toolbar">
          <div>
            <h1 style={{ marginBottom: 4 }}>Faculty Dashboard</h1>
            <p className="card-subtitle">{faculty.name} · {faculty.department}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn secondary" title="Create announcement">Announcements</button>
            <button className="btn">Start QR Session</button>
          </div>
        </div>
      </header>

      <div className="stats">
        {stats.map((s, i) => (
          <div key={i} className="stat">
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid">
        <section className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Today’s Classes</h2>
            <button className="btn ghost" title="Refresh">Refresh</button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Title</th>
                <th>Time</th>
                <th>Room</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.title}</td>
                  <td>{c.today}</td>
                  <td>{c.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 style={{ margin: 0 }}>QR Attendance Sessions</h2>
              <p className="card-subtitle">Rotate QR every 60s to prevent reuse</p>
            </div>
            <button className="btn">Start New Session</button>
          </div>
          <ul className="list">
            {sessions.map(s => (
              <li key={s.id} className="list-item">
                <span>{s.id} · {s.course}</span>
                <span>Start {s.startAt}</span>
                <span className={s.status === 'Active' ? 'badge success' : 'badge neutral'}>{s.status}</span>
                <span>{s.attendees} attendees</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>To-Do</h2>
            <button className="btn secondary">Add Task</button>
          </div>
          <ul className="list">
            {tasks.map(t => (
              <li key={t.id} className="list-item">
                <span>{t.text}</span>
                <span></span>
                <span className="badge warning">{t.due}</span>
                <span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}