const FacultyProfile = require('../models/FacultyProfile');

async function getProfile(req, res) {
  const userId = req.user.sub;
  let profile = await FacultyProfile.findOne({ user: userId });
  if (!profile) {
    profile = await FacultyProfile.create({ user: userId, email: req.user.email });
  }
  return res.json({ profile });
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.sub;

    // Whitelist of allowed fields
    const allowed = [
      // Personal
      'firstName','lastName','gender','dob',
      // Contact
      'email','phone','altPhone','address','city','state','pincode',
      // Faculty
      'facultyId','department','designation','teachingSubjects',
      // Career
      'qualification','experienceYears','experienceSummary','employmentStatus',
      // Social/Other
      'github','linkedin','portfolio','remarks',
    ];

    const updates = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        updates[k] = req.body[k];
      }
    }

    // Coerce types / validate
    if (updates.experienceYears !== undefined) {
      const n = Number(updates.experienceYears);
      updates.experienceYears = Number.isFinite(n) ? n : 0;
    }
    if (updates.employmentStatus !== undefined) {
      const ok = new Set(['active','on_leave','resigned']);
      if (!ok.has(String(updates.employmentStatus))) {
        return res.status(400).json({ message: 'Invalid employmentStatus' });
      }
    }

    // Image upload
    if (req.file) {
      updates.profileImage = `/uploads/${req.file.filename}`;
    }

    const profile = await FacultyProfile.findOneAndUpdate(
      { user: userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    return res.json({ profile });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Update failed' });
  }
}

module.exports = { getProfile, updateProfile };