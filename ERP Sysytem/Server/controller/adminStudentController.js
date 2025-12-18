const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');

async function listStudents(req, res) {
  // list basic student rows + a few profile fields
  const students = await User.find({ role: 'student' }, { name: 1, email: 1 })
    .sort({ name: 1 })
    .lean();

  const ids = students.map(s => s._id);
  const profiles = await StudentProfile.find({ user: { $in: ids } }, {
    user: 1, rollNo: 1, department: 1, semester: 1, profileImage: 1
  }).lean();

  const profMap = new Map(profiles.map(p => [String(p.user), p]));
  const rows = students.map(s => {
    const p = profMap.get(String(s._id)) || {};
    return {
      userId: s._id,
      name: s.name,
      email: s.email,
      rollNo: p.rollNo || '',
      department: p.department || '',
      semester: p.semester || '',
      profileImage: p.profileImage || ''
    };
  });

  return res.json({ students: rows });
}

async function getStudentProfile(req, res) {
  const userId = req.params.userId;
  const user = await User.findById(userId, { name: 1, email: 1, role: 1 }).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role !== 'student') return res.status(400).json({ message: 'Not a student' });

  const profile = await StudentProfile.findOne({ user: userId }).lean();
  return res.json({ user, profile });
}

// below existing exports
async function updateStudentProfile(req, res) {
  const userId = req.params.userId;
  const allowed = [
    'firstName','lastName','gender','dob','bloodGroup','nationality',
    'email','phone','altPhone','address','city','state','pincode',
    'registerNumber','rollNo','program','department','semester','section',
    'admissionYear','passoutYear','cgpa',
    'github','linkedin','portfolio','leetcode','hackerrank','codechef','codeforces','kaggle','resumeLink',
    'aadhaar','hobbies','achievements','remarks',
  ];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

  const profile = await StudentProfile.findOneAndUpdate(
    { user: userId },
    { $set: updates },
    { new: true, upsert: true }
  ).lean();

  return res.json({ profile });
}

async function updateUserStatus(req, res) {
  const userId = req.params.userId;
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive must be boolean' });
  }
  const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true, fields: { name:1,email:1,role:1,isActive:1 } }).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ user });
}
module.exports = { listStudents, getStudentProfile, updateStudentProfile, updateUserStatus };
