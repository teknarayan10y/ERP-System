const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const ctrl = require('../controller/facultyAttendanceController');

// Protect all endpoints: must be authenticated faculty
router.use(requireAuth, requireRole('faculty'));

// Optional quick health check (you can remove once verified)
// router.get('/ping', (req, res) => res.json({ ok: true }));

// My attendance (for the faculty user)
router.get('/', ctrl.myAttendance);

// My courses (taught by this faculty)
router.get('/courses', ctrl.myCourses);

// Students for a course (faculty-owned)
router.get('/students', ctrl.courseStudents);

// Mark a student session (single)
router.post('/mark-student-session', ctrl.markStudentSession);

// Bulk day mark for a course
router.post('/bulk-day', ctrl.bulkDay);

module.exports = router;