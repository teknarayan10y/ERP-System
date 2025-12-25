// controller/dashboardController.js
const StudentProfile = require('../models/StudentProfile');
const Course = require('../models/Course');

async function getStudentData(req, res) {
  // Example payload; replace with real data fetch
  return res.json({
    message: 'Student dashboard data',
    user: req.user,
  });
}

async function getFacultyData(req, res) {
  // Example payload; replace with real data fetch
  return res.json({
    message: 'Faculty dashboard data',
    user: req.user,
  });
}

// Returns courses for the logged-in student, filtered by department and optional semester
async function getStudentCourses(req, res) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const profile = await StudentProfile.findOne({ user: userId }).lean();
  if (!profile) return res.json({ items: [] });

  // Optional query param: ?semester=all | 1..8
  const semesterParam = (req.query?.semester || '').trim();

  // Default semester from profile
  let semesterNum = Number(profile.semester) || 0;

  // Override with query param if provided and not "all"
  if (semesterParam && semesterParam !== 'all') {
    const s = Number(semesterParam);
    if (Number.isFinite(s) && s > 0) semesterNum = s;
  }

  // Department from profile (branch). Ensure Course.department values align with this.
  const department = (profile.branch || '').trim();

  // Build query
  const query = {};
  if (semesterParam !== 'all' && semesterNum) query.semester = semesterNum;
  if (department) query.department = department;

  // Populate faculty and compute a display name
  const raw = await Course.find(query)
    .populate({ path: 'faculty', select: 'firstName lastName name email' })
    .sort({ name: 1 })
    .lean();

  const items = raw.map((c) => {
    let facultyName = '-';
    const f = c.faculty;
    if (f) {
      const combined = `${f.firstName || ''} ${f.lastName || ''}`.trim();
      facultyName = combined || f.name || f.email || '-';
    }
    return { ...c, facultyName };
  });

  return res.json({
    items,
    profile: { semester: profile.semester, branch: profile.branch },
  });
}

module.exports = { getStudentData, getFacultyData, getStudentCourses };