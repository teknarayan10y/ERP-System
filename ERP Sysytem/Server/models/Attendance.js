const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['P', 'A', 'L'], default: 'P' },
}, { _id: false });

const AttendanceSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
  records: { type: [RecordSchema], default: [] },
  note: { type: String, default: '' },
}, { timestamps: true });

AttendanceSchema.index({ course: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);