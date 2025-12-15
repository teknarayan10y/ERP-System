// src/features/admin/AdminDashboard.jsx
import React, { useMemo, useState } from 'react';
import './admin.css'; // add this

export default function AdminDashboard() {
  const admin = { name: 'System Administrator' };

  const users = [
    { id: 'U-0001', name: 'Alice Johnson', email: 'alice@college.edu', role: 'ADMIN', status: 'Active' },
    { id: 'U-1023', name: 'Bob Kumar', email: 'bob@college.edu', role: 'FACULTY', status: 'Active' },
    { id: 'U-2099', name: 'Carol Singh', email: 'carol@college.edu', role: 'STUDENT', status: 'Suspended' },
    { id: 'U-3111', name: 'Deep Patel', email: 'deep@college.edu', role: 'STUDENT', status: 'Active' },
  ];

  const reconciliations = [
    { id: 'REC-2025-01', gateway: 'Stripe', mismatches: 2, status: 'Attention' },
    { id: 'REC-2025-02', gateway: 'Razorpay', mismatches: 0, status: 'OK' },
  ];

  const services = [
    { name: 'API Gateway', status: 'Healthy', latency: 42 },
    { name: 'Auth Service', status: 'Healthy', latency: 55 },
    { name: 'Fees Service', status: 'Degraded', latency: 190 },
    { name: 'Attendance Service', status: 'Healthy', latency: 61 },
  ];

  const stats = [
    { label: 'Total Users', value: users.length },
    { label: 'Active Students', value: users.filter(u => u.role === 'STUDENT' && u.status === 'Active').length },
    { label: 'Overdue Invoices', value: 34 },
  ];

  // Local UI state for filters (non-persistent demo)
  const [q, setQ] = useState('');
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchQ = q.trim()
        ? `${u.id} ${u.name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase())
        : true;
      const matchRole = role === 'ALL' ? true : u.role === role;
      const matchStatus = status === 'ALL' ? true : u.status === status;
      return matchQ && matchRole && matchStatus;
    });
  }, [q, role, status, users]);

  return (
    <div className="container">
      <header className="page-header">
        <div className="toolbar">
          <div>
            <h1 style={{ marginBottom: 4 }}>Admin Dashboard</h1>
            <p className="card-subtitle">{admin.name}</p>
          </div>
          <div className="toolbar-row">
            <input
              className="input"
              placeholder="Search users (name, email, ID)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="ALL">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="FACULTY">Faculty</option>
              <option value="STUDENT">Student</option>
            </select>
            <div className="pills" role="tablist" aria-label="Status filter">
              <button className={`pill ${status === 'ALL' ? 'active' : ''}`} onClick={() => setStatus('ALL')}>All</button>
              <button className={`pill ${status === 'Active' ? 'active' : ''}`} onClick={() => setStatus('Active')}>Active</button>
              <button className={`pill ${status === 'Suspended' ? 'active' : ''}`} onClick={() => setStatus('Suspended')}>Suspended</button>
            </div>
            <button className="btn secondary">Settings</button>
            <button className="btn">New User</button>
          </div>
        </div>
      </header>

      <div className="stats">
        {stats.map((s, i) => (
          <div key={i} className="stat">
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
            {s.label === 'Overdue Invoices' && (
              <div style={{ marginTop: 10 }}>
                <div className="progress"><span style={{ width: '38%' }} /></div>
                <div className="legend" style={{ marginTop: 6 }}>
                  <span><span className="status-dot" style={{ background: '#ef4444' }} />Overdue</span>
                  <span><span className="status-dot" style={{ background: '#22c55e' }} />Paid</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid">
        {/* Users & Roles */}
        <section className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>User & Role Management</h2>
            <div className="toolbar-row">
              <button className="btn ghost">Refresh</button>
              <button className="btn">Invite</button>
            </div>
          </div>
          <table className="table compact">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="chip"><span className="dot ok" />{u.role}</span>
                  </td>
                  <td>
                    <span className={u.status === 'Active' ? 'badge success' : 'badge danger'}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button className="btn secondary">Edit</button>
                      <button className="btn">Roles</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ color: 'var(--muted)', textAlign: 'center', padding: 16 }}>
                    No users match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Fees & Reconciliation */}
        <section className="card">
          <div className="card-header">
            <div>
              <h2 style={{ margin: 0 }}>Fees & Reconciliation</h2>
              <p className="card-subtitle">Gateway reconciliation and mismatches</p>
            </div>
            <div className="toolbar-row">
              <button className="btn secondary">Export</button>
              <button className="btn">Run Reconciliation</button>
            </div>
          </div>
          <ul className="list">
            {reconciliations.map(r => (
              <li key={r.id} className="list-item">
                <span>{r.id} · {r.gateway}</span>
                <span>{r.mismatches} mismatches</span>
                <span className={r.status === 'OK' ? 'badge success' : 'badge warning'}>
                  {r.status}
                </span>
                <span></span>
              </li>
            ))}
          </ul>
        </section>

        {/* System Health */}
        <section className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>System Health</h2>
            <div className="legend">
              <span><span className="status-dot" style={{ background: '#22c55e' }} />Healthy</span>
              <span><span className="status-dot" style={{ background: '#f59e0b' }} />Degraded</span>
            </div>
          </div>
          <ul className="list">
            {services.map(s => (
              <li key={s.name} className="list-item">
                <span>{s.name}</span>
                <span>{s.latency}ms</span>
                <span className={s.status === 'Healthy' ? 'badge success' : 'badge warning'}>
                  {s.status}
                </span>
                <span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}