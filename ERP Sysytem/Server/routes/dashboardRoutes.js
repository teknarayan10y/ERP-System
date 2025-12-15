// routes/dashboardRoutes.js
const express = require('express');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { getStudentData, getFacultyData } = require('../controller/dashboardController');

const router = express.Router();

router.get('/student-data', requireAuth, requireRole('student'), getStudentData);
router.get('/faculty-data', requireAuth, requireRole('faculty'), getFacultyData);

module.exports = router;