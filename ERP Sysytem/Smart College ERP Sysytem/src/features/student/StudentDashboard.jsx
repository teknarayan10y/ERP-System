import React, { useEffect, useMemo, useState } from "react";
import "./StudentDashboard.css";
import { api } from "../../auth/api";

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const demo = useMemo(() => ({
    stats: {
      cgpa: 8.52,
      attendance: 91,
      totalSubjects: 6,
      pendingAssignments: 2,
    },
  }), []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.studentData();
        setData(res);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = data?.stats || demo.stats;

  if (loading) return <div>Loading...</div>;
  if (err) return <div>{err}</div>;

  return (
    <div className="grid grid-4 summary-cards">
      <SummaryCard title="Total Subjects" value={stats.totalSubjects} icon="📚" />
      <SummaryCard title="Attendance" value={`${stats.attendance}%`} icon="📊" />
      <SummaryCard title="Pending Assignments" value={stats.pendingAssignments} icon="📝" />
      <SummaryCard title="CGPA" value={stats.cgpa} icon="🎓" />
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div className="card summary">
      <div className="summary-icon">{icon}</div>
      <div>
        <span className="summary-title">{title}</span>
        <h2 className="summary-value">{value}</h2>
      </div>
    </div>
  );
}
