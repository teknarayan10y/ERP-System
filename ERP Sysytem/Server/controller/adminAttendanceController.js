const Attendance = require('../models/Attendance');
const Course = require('../models/Course');

exports.listSessions = async (req, res) => {
  const { courseId, date } = req.query;
  const q = {};
  if (courseId) q.course = courseId;
  if (date) q.date = date;
  const sessions = await Attendance.find(q)
    .populate({ path: 'course', select: 'code name semester department' })
    .sort({ date: -1 })
    .lean();

  const items = sessions.map(s => {
    const total = s.records?.length || 0;
    const present = s.records?.filter(r => r.status === 'P').length || 0;
    return {
      _id: s._id,
      date: s.date,
      total,
      present,
      course: s.course,
      note: s.note || '',
    };
  });
  res.json({ items });
};

exports.getSession = async (req, res) => {
  const { id } = req.params;
  const s = await Attendance.findById(id)
    .populate({ path: 'course', select: 'code name semester department' })
    .populate({ path: 'records.student', select: 'firstName lastName name email' })
    .lean();
  if (!s) return res.status(404).json({ message: 'Not found' });

  const items = (s.records || []).map(r => {
    const u = r.student || {};
    const display = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email || '-';
    return { student: u._id, name: display, status: r.status };
  });

  res.json({
    session: {
      _id: s._id,
      date: s.date,
      note: s.note || '',
      course: s.course,
      records: items,
    }
  });
};

exports.upsertSession = async (req, res) => {
  const { courseId, date, records = [], note = '' } = req.body;
  if (!courseId || !date) return res.status(400).json({ message: 'courseId and date are required' });
  const course = await Course.findById(courseId).lean();
  if (!course) return res.status(400).json({ message: 'Invalid course' });

  const normRecords = records.map(r => ({
    student: r.student,
    status: ['P','A','L'].includes(r.status) ? r.status : 'P',
  }));

  const s = await Attendance.findOneAndUpdate(
    { course: courseId, date },
    { course: courseId, date, records: normRecords, note },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ ok: true, id: s._id });
};

exports.deleteSession = async (req, res) => {
  await Attendance.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};