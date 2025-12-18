const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./.config/db');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes')
const adminStudentRoutes = require('./routes/adminStudentRoutes') 
const facultyProfileRoutes = require('./routes/facultyProfileRoutes');
const adminFacultyRoutes = require('./routes/adminFacultyRoutes');
dotenv.config();

const app = express();

// at top
const path = require('path');
const fs = require('fs');

// after app initialization (before routes)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Middleware
app.use(cors());
app.use(express.json());

// 
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin/students', adminStudentRoutes);
app.use('/api/faculty-profile', facultyProfileRoutes);
app.use('/api/admin/faculty', adminFacultyRoutes); 


app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Start
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });