const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, unique: true, required: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'faculty', 'student'], default: 'student' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Hide sensitive fields in JSON automatically
userSchema.set('toJSON', {
  transform: function (_doc, ret) {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);