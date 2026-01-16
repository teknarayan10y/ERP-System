const path = require('path');
const Assignment = require('../models/Assignment');


// Server/controller/assignmentController.js
exports.create = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { title, description, courseId, dueDate } = body;

    if (!title || !courseId) {
      return res.status(400).json({ message: 'title and courseId are required' });
    }

    const files = (req.files || []).map(f => ({
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      path: f.path.replace(/\\/g, '/'),
      url: `/uploads/${path.basename(f.path)}`,
    }));

    const doc = await Assignment.create({
      faculty: req.user._id,
      courseId,
      title,
      description: description || '',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      files,
    });

    res.status(201).json({ item: doc });
  } catch (e) { next(e); }
};

exports.listMine = async (req, res, next) => {
  try {
    const items = await Assignment.find({ faculty: req.user._id }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const doc = await Assignment.findOne({ _id: req.params.id, faculty: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ item: doc });
  } catch (e) { next(e); }
};