const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const studentAiCtrl = require('../controller/studentAiController');

// POST /api/student/ai/chat
router.post('/chat', requireAuth, requireRole('student'), studentAiCtrl.chatWithStudentAi);

module.exports = router;
