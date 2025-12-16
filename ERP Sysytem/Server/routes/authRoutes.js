const express = require('express');
const requireAuth = require('../middleware/auth');
const { signup, login, refresh } = require('../controller/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', requireAuth, refresh);

module.exports = router;