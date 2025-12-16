const StudentProfile = require('../models/StudentProfile');

async function getProfile(req, res) {
  const userId = req.user.sub;
  let profile = await StudentProfile.findOne({ user: userId });
  if (!profile) {
    profile = await StudentProfile.create({ user: userId, email: req.user.email });
  }
  return res.json({ profile });
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.sub;
    const updates = req.body || {};
    delete updates.user;

    if (req.file) {
      updates.profileImage = `/uploads/${req.file.filename}`;
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { user: userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    return res.json({ profile });
  } catch (err) {
    const msg = err.message || 'Upload failed';
    return res.status(400).json({ message: msg });
  }
}
module.exports = { getProfile, updateProfile };