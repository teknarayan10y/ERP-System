// controller/authController.js
const jwt = require('jsonwebtoken');
const { registerUser, loginUser } = require('../services/authService');
const User = require('../models/User');

function signToken(user) {
  const payload = { sub: user._id.toString(), email: user.email, role: user.role };
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

// Add this helper
function getRedirectPath(role) {
  if (role === 'student') return '/student/dashboard';
  if (role === 'faculty') return '/faculty/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  return '/';
}

async function signup(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' });
    }
    const user = await registerUser({ name, email, password, role });
    const token = signToken(user);
    const redirectPath = getRedirectPath(user.role);
    return res.status(201).json({ user: user.toJSON(), token, redirectPath });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error';
    if (status === 500) console.error('Signup error:', err);
    return res.status(status).json({ message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }
    const user = await loginUser({ email, password });
    const token = signToken(user);
    const redirectPath = getRedirectPath(user.role);
    return res.json({ user: user.toJSON(), token, redirectPath });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error';
    if (status === 500) console.error('Login error:', err);
    return res.status(status).json({ message });
  }
}
async function refresh(req, res) {
  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const token = signToken(user);
  const redirectPath = getRedirectPath(user.role);
  return res.json({ user: user.toJSON(), token, redirectPath });
}

module.exports = { signup, login, refresh };