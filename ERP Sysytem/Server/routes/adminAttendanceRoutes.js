const express = require('express');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { listSessions, getSession, upsertSession, deleteSession } = require('../controller/adminAttendanceController');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listSessions);
router.get('/:id', getSession);
router.post('/', upsertSession);     // create or update by (courseId,date)
router.delete('/:id', deleteSession);

module.exports = router;