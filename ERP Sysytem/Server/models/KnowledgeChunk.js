const mongoose = require('mongoose');

const KnowledgeChunkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['REGULATION', 'GRADING', 'ATTENDANCE', 'EXAM', 'SYLLABUS', 'FACILITY', 'GENERAL'],
      default: 'GENERAL'
    },
    content: {
      type: String,
      required: true
    },
    embedding: {
      type: [Number],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    metadata: {
      department: { type: String, default: 'ALL' },
      semester: { type: Number, default: 0 },
      courseCode: { type: String, default: '' },
      author: { type: String, default: 'Institution Admin' }
    }
  },
  { timestamps: true }
);

KnowledgeChunkSchema.index({ category: 1 });
KnowledgeChunkSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('KnowledgeChunk', KnowledgeChunkSchema);
