// Server/controller/facultyCoursesController.js
const Course = require('../models/Course');

// GET /api/faculty/courses
async function facultyMyCourses(req, res) {
  try {
    const user = req.user || {};
    const facultyId = user.id || user._id; // support both shapes from auth middleware
    if (!facultyId) return res.status(401).json({ message: 'Unauthorized' });

    const rows = await Course.find({ faculty: facultyId })
  .select('code name department semester credits isActive section')
  .sort({ semester: 1, code: 1 })
  .lean();

    return res.json({ courses: rows });
  } catch (e) {
    console.error('facultyMyCourses error:', e);
    return res.status(500).json({ message: 'Failed to load courses' });
  }
}

module.exports = { facultyMyCourses };