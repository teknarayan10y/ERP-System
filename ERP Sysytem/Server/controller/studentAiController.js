const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Assignment = require('../models/Assignment');
const StudentSubmission = require('../models/StudentSubmission');
const Course = require('../models/Course');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const { searchKnowledgeBase } = require('../services/ragService');

/**
 * Helper to ensure URLs are properly formatted with http/https prefix
 */
function formatUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'Not specified') return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Helper to format upload image URLs into absolute backend URLs
 */
function formatUploadUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed || trimmed === 'Not specified') return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const rel = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}${rel}`;
}

/**
 * Helper to fetch aggregated real-time MongoDB context strictly scoped to the student's personal portal
 */
async function getStudentContext(userId) {
  const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

  // 1. Fetch User and Student Profile first
  const [user, profile] = await Promise.all([
    User.findById(userObjId).select('name email role').lean(),
    StudentProfile.findOne({ $or: [{ user: userObjId }, { user: String(userId) }] }).lean()
  ]);

  const studentBranch = (profile?.branch || profile?.program || '').trim();
  const studentSemester = Number(profile?.semester) || null;

  // 2. Build course filter strictly scoped to student's department/semester
  const courseQuery = { isActive: true };
  if (studentBranch) {
    courseQuery.department = { $regex: new RegExp(`^${studentBranch}$`, 'i') };
  }
  if (studentSemester) {
    courseQuery.semester = studentSemester;
  }

  // 3. Fetch courses, attendance, marks, submissions in parallel
  const [enrolledCourses, attendance, marks, submissions] = await Promise.all([
    Course.find(courseQuery)
      .populate({ path: 'faculty', select: 'name email firstName lastName' })
      .select('code name credits semester department faculty')
      .lean(),
    Attendance.findOne({ $or: [{ userId: userObjId }, { userId: String(userId) }] }).lean(),
    Marks.find({ $or: [{ studentId: userObjId }, { studentId: String(userId) }] })
      .populate('courseId', 'code name credits semester department')
      .lean(),
    StudentSubmission.find({ $or: [{ student: userObjId }, { student: String(userId) }] })
      .select('assignment submittedAt note files')
      .lean()
  ]);

  const enrolledCourseIds = (enrolledCourses || []).map(c => c._id);

  // 4. Fetch assignments strictly belonging to student's enrolled courses
  const assignmentQuery = enrolledCourseIds.length > 0
    ? { courseId: { $in: enrolledCourseIds } }
    : {};

  const relevantAssignments = await Assignment.find(assignmentQuery)
    .populate('courseId', 'code name')
    .sort({ dueDate: 1 })
    .lean();

  // Map submitted assignment IDs
  const submittedAssignmentIds = new Set(
    (submissions || []).map(s => String(s.assignment))
  );

  // Categorize assignments into pending & submitted
  const pendingAssignments = [];
  const completedAssignments = [];

  (relevantAssignments || []).forEach(assign => {
    const isSubmitted = submittedAssignmentIds.has(String(assign._id));
    const item = {
      id: assign._id,
      title: assign.title,
      courseCode: assign.courseId?.code || 'N/A',
      courseName: assign.courseId?.name || 'N/A',
      dueDate: assign.dueDate ? new Date(assign.dueDate).toISOString().split('T')[0] : 'No deadline',
      description: assign.description
    };

    if (isSubmitted) {
      completedAssignments.push(item);
    } else {
      pendingAssignments.push(item);
    }
  });

  // Calculate attendance details
  let attendanceSummary = {
    totalClasses: 0,
    presentClasses: 0,
    absentClasses: 0,
    onDutyClasses: 0,
    percentage: 0,
    status: 'No attendance records yet',
    safeToMiss: 0,
    neededTo75: 0,
    recentLogs: []
  };

  if (attendance) {
    const total = attendance.totalClasses || 0;
    const present = attendance.presentClasses || 0;
    const absent = attendance.absentClasses || 0;
    const onDuty = attendance.onDutyClasses || 0;
    const effectivePresent = present + onDuty;
    const pct = total > 0 ? Math.round((effectivePresent / total) * 10000) / 100 : 0;

    // Class safety calculations
    let safeToMiss = 0;
    let neededTo75 = 0;
    if (total > 0) {
      if (pct >= 75) {
        safeToMiss = Math.max(0, Math.floor((effectivePresent - 0.75 * total) / 0.75));
      } else {
        neededTo75 = Math.max(0, Math.ceil((0.75 * total - effectivePresent) / 0.25));
      }
    }

    attendanceSummary = {
      totalClasses: total,
      presentClasses: present,
      absentClasses: absent,
      onDutyClasses: onDuty,
      percentage: pct,
      status: pct >= 75 ? 'Safe (Above 75%)' : 'Warning (Below 75%)',
      safeToMiss,
      neededTo75,
      recentLogs: (attendance.dailySchedule || []).slice(-5).map(s => ({
        session: s.session,
        status: s.status,
        subject: s.subject,
        date: s.date ? new Date(s.date).toISOString().split('T')[0] : ''
      }))
    };
  }

  // Format marks summary
  const marksSummary = (marks || []).map(m => ({
    courseCode: m.courseId?.code || 'N/A',
    courseName: m.courseId?.name || 'N/A',
    credits: m.courseId?.credits || 0,
    semesterExam: m.semesterExam,
    assignmentScore: m.assignment,
    practicalScore: m.practical,
    total: m.total,
    grade: m.grade,
    semester: m.semester,
    academicYear: m.academicYear
  }));

  // Format courses with faculty names
  const coursesFormatted = (enrolledCourses || []).map(c => {
    let facultyName = 'Unassigned';
    if (c.faculty) {
      const fn = c.faculty.firstName || '';
      const ln = c.faculty.lastName || '';
      facultyName = `${fn} ${ln}`.trim() || c.faculty.name || c.faculty.email || 'Faculty';
    }
    return {
      code: c.code,
      name: c.name,
      credits: c.credits,
      semester: c.semester,
      department: c.department,
      faculty: facultyName
    };
  });

  const isProfileComplete = Boolean(profile);

  // Student Profile details strictly from MongoDB
  const studentInfo = {
    isProfileComplete,
    name: user?.name || (profile?.firstName ? `${profile?.firstName} ${profile?.lastName || ''}`.trim() : null),
    accountEmail: user?.email || null,
    firstName: profile?.firstName || null,
    lastName: profile?.lastName || null,
    gender: profile?.gender || null,
    dob: profile?.dob || null,
    bloodGroup: profile?.bloodGroup || null,
    nationality: profile?.nationality || null,
    email: profile?.email || user?.email || null,
    phone: profile?.phone || null,
    altPhone: profile?.altPhone || null,
    address: profile?.address || null,
    city: profile?.city || null,
    state: profile?.state || null,
    pincode: profile?.pincode || null,
    registerNumber: profile?.registerNumber || null,
    rollNo: profile?.rollNo || profile?.studentId || null,
    studentId: profile?.studentId || null,
    program: profile?.program || profile?.branch || null,
    branch: profile?.branch || null,
    semester: profile?.semester || null,
    year: profile?.year || null,
    section: profile?.section || null,
    admissionYear: profile?.admissionYear || null,
    passoutYear: profile?.passoutYear || null,
    cgpa: profile?.cgpa || null,
    profileImage: formatUploadUrl(profile?.profileImage),
    github: formatUrl(profile?.github),
    linkedin: formatUrl(profile?.linkedin),
    portfolio: formatUrl(profile?.portfolio),
    leetcode: formatUrl(profile?.leetcode),
    hackerrank: formatUrl(profile?.hackerrank),
    codechef: formatUrl(profile?.codechef),
    codeforces: formatUrl(profile?.codeforces),
    kaggle: formatUrl(profile?.kaggle),
    resumeLink: formatUrl(profile?.resumeLink),
    aadhaar: profile?.aadhaar || null,
    hobbies: profile?.hobbies || null,
    achievements: profile?.achievements || null,
    remarks: profile?.remarks || null
  };

  return {
    studentInfo,
    attendance: attendanceSummary,
    marks: marksSummary,
    courses: coursesFormatted,
    pendingAssignments,
    completedAssignments
  };
}

/**
 * Universal Dynamic Grounding & Hybrid Fallback Engine (Strictly Scoped to Student Portal)
 */
function generateDataGroundedAnswer(userQuery, ctx, relevantKnowledge = []) {
  const q = (userQuery || '').toLowerCase().trim();
  const info = ctx.studentInfo;
  const att = ctx.attendance;
  const marks = ctx.marks;
  const courses = ctx.courses;
  const pending = ctx.pendingAssignments;
  const completed = ctx.completedAssignments;

  // Check for out-of-scope administrative or unauthorized queries
  if (
    q.includes('admin password') ||
    q.includes('salary') ||
    q.includes('faculty salary') ||
    q.includes('other student') ||
    q.includes('all student marks') ||
    q.includes('admin settings') ||
    q.includes('system database')
  ) {
    return "I can only access and assist with information related to your personal Student Portal and academic records.";
  }

  // 1. Check if query matches an Institutional Knowledge Chunk from Vector RAG
  const institutionalMatch = (relevantKnowledge || []).find(
    (k) => k.similarityScore >= 0.25 || (k.title && q.includes(k.title.toLowerCase().slice(0, 10)))
  );

  if (
    q.includes('condonation') ||
    q.includes('regulat') ||
    q.includes('policy') ||
    q.includes('weightage') ||
    q.includes('passing minimum') ||
    q.includes('sgpa') ||
    q.includes('grading scale') ||
    q.includes('leave') ||
    q.includes('on duty') ||
    q.includes('od rule')
  ) {
    if (institutionalMatch) {
      let reply = `📜 **College Academic Regulation: ${institutionalMatch.title}**\n\n`;
      reply += `${institutionalMatch.content}\n\n`;
      if (q.includes('attendance') && att.totalClasses > 0) {
        reply += `💡 *Your current live attendance is **${att.percentage}%** (${att.status}).*`;
      }
      return reply;
    }
  }

  // 2. Enrolled Courses Query
  if (q.includes('my course') || q.includes('my subject') || q.includes('enrolled course') || q.includes('which subject') || q.includes('classes')) {
    if (!courses || courses.length === 0) {
      return `No courses are currently registered for your semester (${info.semester ? `Semester ${info.semester}` : 'current semester'}) in the database.`;
    }
    let reply = `📚 **Your Registered Courses (Semester ${info.semester || 'Current'} - ${info.branch || 'General'}):**\n\n`;
    courses.forEach((c, idx) => {
      reply += `${idx + 1}. **${c.code} - ${c.name}**\n`;
      reply += `   • Credits: ${c.credits} | Faculty: ${c.faculty}\n`;
    });
    return reply;
  }

  // 3. Total Number of Semesters Query
  if (q.includes('total number of semester') || q.includes('total semester') || q.includes('how many semester') || q.includes('total sem')) {
    const prog = (info.program || '').toLowerCase();
    let totalSems = 8;
    if (prog.includes('bca') || prog.includes('bsc') || prog.includes('bba') || prog.includes('b.sc') || prog.includes('b.c.a')) {
      totalSems = 6;
    } else if (prog.includes('mca') || prog.includes('mba') || prog.includes('mtech') || prog.includes('m.tech') || prog.includes('m.sc')) {
      totalSems = 4;
    }

    let reply = `The total number of semesters for your program (**${info.program || 'Degree'}**) is **${totalSems} semesters**.`;
    if (info.semester) {
      reply += ` You are currently in **Semester ${info.semester}** of ${totalSems}.`;
    }
    return reply;
  }

  // Key Aliases & Labels for Dynamic Search
  const FIELD_MAP = [
    { keys: ['current sem', 'current semester', 'which sem', 'which semester', 'sem', 'semester'], label: 'current semester', val: info.semester ? `Semester ${info.semester}` : null },
    { keys: ['profile image', 'profile photo', 'profile picture', 'my photo', 'my picture', 'my avatar', 'photo', 'avatar', 'picture'], label: 'profile image', val: info.profileImage, isImage: true },
    { keys: ['last name', 'lastname', 'surname'], label: 'last name', val: info.lastName },
    { keys: ['first name', 'firstname'], label: 'first name', val: info.firstName },
    { keys: ['full name', 'my name', 'name'], label: 'name', val: info.name },
    { keys: ['gender', 'sex'], label: 'gender', val: info.gender },
    { keys: ['dob', 'date of birth', 'birthday', 'birth date'], label: 'Date of Birth', val: info.dob },
    { keys: ['blood group', 'bloodgroup', 'blood type', 'blood'], label: 'blood group', val: info.bloodGroup },
    { keys: ['nationality'], label: 'nationality', val: info.nationality },
    { keys: ['phone number', 'mobile number', 'phone', 'mobile', 'contact number'], label: 'phone number', val: info.phone },
    { keys: ['alt phone', 'alternate phone', 'alternate number'], label: 'alternate phone', val: info.altPhone },
    { keys: ['email address', 'email', 'mail'], label: 'email address', val: info.email },
    { keys: ['address'], label: 'address', val: info.address },
    { keys: ['city'], label: 'city', val: info.city },
    { keys: ['state'], label: 'state', val: info.state },
    { keys: ['pincode', 'zipcode', 'pin code'], label: 'pincode', val: info.pincode },
    { keys: ['register number', 'register no', 'reg no', 'reg number'], label: 'register number', val: info.registerNumber },
    { keys: ['roll number', 'roll no', 'rollno', 'roll'], label: 'roll number', val: info.rollNo },
    { keys: ['student id', 'studentid'], label: 'Student ID', val: info.studentId },
    { keys: ['program', 'branch', 'degree', 'department'], label: 'program/branch', val: info.program },
    { keys: ['section'], label: 'section', val: info.section },
    { keys: ['academic year', 'year'], label: 'academic year', val: info.year },
    { keys: ['admission year'], label: 'admission year', val: info.admissionYear },
    { keys: ['passout year', 'passing year', 'graduation year'], label: 'expected passout year', val: info.passoutYear },
    { keys: ['cgpa', 'gpa'], label: 'overall CGPA', val: info.cgpa },
    { keys: ['github'], label: 'GitHub profile link', val: info.github, isUrl: true },
    { keys: ['linkedin'], label: 'LinkedIn profile link', val: info.linkedin, isUrl: true },
    { keys: ['portfolio'], label: 'portfolio link', val: info.portfolio, isUrl: true },
    { keys: ['leetcode'], label: 'LeetCode link', val: info.leetcode, isUrl: true },
    { keys: ['hackerrank'], label: 'HackerRank link', val: info.hackerrank, isUrl: true },
    { keys: ['codechef'], label: 'CodeChef link', val: info.codechef, isUrl: true },
    { keys: ['codeforces'], label: 'Codeforces link', val: info.codeforces, isUrl: true },
    { keys: ['kaggle'], label: 'Kaggle link', val: info.kaggle, isUrl: true },
    { keys: ['resume'], label: 'Resume link', val: info.resumeLink, isUrl: true },
    { keys: ['aadhaar', 'aadhar'], label: 'Aadhaar number', val: info.aadhaar },
    { keys: ['hobbies', 'hobby'], label: 'hobbies', val: info.hobbies },
    { keys: ['achievements', 'achievement'], label: 'achievements', val: info.achievements },
    { keys: ['remarks', 'remark'], label: 'remarks', val: info.remarks }
  ];

  // Check for Single Specific Field Match
  for (const field of FIELD_MAP) {
    if (field.keys.some(k => q.includes(k))) {
      if (!q.includes('mark') && !q.includes('attendance') && !q.includes('all') && !q.includes('summary') && !q.includes('detail')) {
        if (field.val && field.val !== 'Not specified') {
          if (field.isImage) {
            return `Here is your profile photo:\n\n![Profile Photo](${field.val})\n\n[Open Full Image](${field.val})`;
          }
          if (field.isUrl) {
            return `Your ${field.label} is [${field.val}](${field.val}).`;
          }
          return field.label === 'current semester' ? `You are currently in **${field.val}**.` : `Your ${field.label} is **${field.val}**.`;
        } else {
          return `That data is not present in your database records.`;
        }
      }
    }
  }

  // 4. Attendance & Bunking Queries
  if (q.includes('attendance') || q.includes('absent') || q.includes('present') || q.includes('miss') || q.includes('leave') || q.includes('bunk') || q.includes('cut') || q.includes('holiday')) {
    if (att.totalClasses === 0) {
      return `That data is not present in your database records.`;
    }

    let reply = `📊 **Attendance Summary for ${info.name || 'Student'}**\n\n`;
    reply += `• **Total Classes Conducted:** ${att.totalClasses}\n`;
    reply += `• **Classes Attended (Present + OD):** ${att.presentClasses + att.onDutyClasses} (${att.presentClasses} Present, ${att.onDutyClasses} On-Duty)\n`;
    reply += `• **Classes Absent:** ${att.absentClasses}\n`;
    reply += `• **Overall Attendance:** **${att.percentage}%** (${att.status})\n\n`;

    if (att.percentage >= 75) {
      if (att.safeToMiss > 0) {
        reply += `💡 **Good Standing:** You can miss up to **${att.safeToMiss}** more class(es) while maintaining your attendance above the required 75% cutoff.`;
      } else {
        reply += `⚠️ **Borderline Standing:** Your attendance is currently at 75%. Attending all upcoming classes is recommended to prevent dropping below the threshold.`;
      }
    } else {
      reply += `🚨 **Warning:** Your attendance is currently below 75%. You need to attend the next **${att.neededTo75}** consecutive class(es) to reach the 75% minimum requirement.`;
    }

    if (att.recentLogs && att.recentLogs.length > 0) {
      reply += `\n\n🗓️ **Recent Class Logs:**\n`;
      att.recentLogs.forEach(l => {
        const icon = l.status === 'PRESENT' ? '✅' : l.status === 'ON-DUTY' ? '🔵' : '❌';
        reply += `- ${l.date || ''} (${l.session}): ${icon} ${l.status} ${l.subject ? `[${l.subject}]` : ''}\n`;
      });
    }

    return reply;
  }

  // 5. Marks & Exams Queries
  if (q.includes('mark') || q.includes('grade') || q.includes('result') || q.includes('score') || q.includes('exam') || q.includes('seme') || q.includes('fail') || q.includes('pass')) {
    if (!marks || marks.length === 0) {
      return `That data is not present in your database records.`;
    }

    let reply = `📝 **Academic Performance & Marks Report**\n\n`;
    reply += `👤 **Student Details:** ${info.name || 'Student'} | Roll: ${info.rollNo || 'N/A'} | CGPA: **${info.cgpa || 'N/A'}**\n\n`;
    reply += `📚 **Subject-Wise Marks & Exam Breakdown:**\n\n`;
    marks.forEach(m => {
      reply += `📘 **${m.courseCode} - ${m.courseName}**\n`;
      reply += `  • Semester Exam: **${m.semesterExam}** / 60\n`;
      reply += `  • Assignment: **${m.assignmentScore}** / 20\n`;
      reply += `  • Practical: **${m.practicalScore}** / 20\n`;
      reply += `  • **Total Score:** **${m.total}** / 100\n`;
      reply += `  • **Letter Grade:** **${m.grade}**\n\n`;
    });

    return reply;
  }

  // 6. Assignments & Tasks Queries
  if (q.includes('assignment') || q.includes('homework') || q.includes('task') || q.includes('pending') || q.includes('due') || q.includes('submit') || q.includes('submission')) {
    let reply = `📚 **Assignment Tracker for ${info.name || 'Student'}**\n\n`;

    if (pending.length === 0) {
      reply += `🎉 **Great news!** You have zero pending assignments. All assigned coursework has been submitted.\n\n`;
    } else {
      reply += `⏳ **Pending Assignments (${pending.length}):**\n`;
      pending.forEach((p, idx) => {
        reply += `${idx + 1}. **${p.title}** (${p.courseCode})\n`;
        reply += `   - **Due Date:** ${p.dueDate}\n`;
        if (p.description) reply += `   - **Details:** ${p.description}\n`;
      });
      reply += `\n`;
    }

    if (completed && completed.length > 0) {
      reply += `✅ **Completed Submissions (${completed.length}):**\n`;
      completed.forEach(c => {
        reply += `- ${c.title} (${c.courseCode})\n`;
      });
    }

    return reply;
  }

  // 7. Full Profile / Personal Details Summary
  if (q.includes('personal') || q.includes('detail') || q.includes('info') || q.includes('about me') || q.includes('profile')) {
    if (!info.isProfileComplete && !info.name) {
      return `That data is not present in your database records. You can complete your profile at /student/profile.`;
    }

    let reply = `📋 **Personal & Profile Summary from MongoDB**\n\n`;
    reply += `• **Full Name:** ${info.name || 'Not specified'}\n`;
    reply += `• **Roll Number:** ${info.rollNo || 'Not specified'}\n`;
    reply += `• **Program / Branch:** ${info.program || 'Not specified'}\n`;
    reply += `• **Semester:** ${info.semester ? `Semester ${info.semester}` : 'Not specified'}\n`;
    reply += `• **CGPA:** ${info.cgpa || 'Not specified'}\n`;
    reply += `• **Phone:** ${info.phone || 'Not specified'}\n`;
    reply += `• **Email:** ${info.email || 'Not specified'}\n`;
    reply += `• **Blood Group:** ${info.bloodGroup || 'Not specified'}\n`;
    reply += `• **DOB:** ${info.dob || 'Not specified'}\n`;
    reply += `• **Address:** ${info.address || 'Not specified'}, ${info.city || 'Not specified'}\n`;
    if (info.profileImage) reply += `\n![Profile Photo](${info.profileImage})\n`;
    if (info.github) reply += `• **GitHub:** [${info.github}](${info.github})\n`;
    if (info.linkedin) reply += `• **LinkedIn:** [${info.linkedin}](${info.linkedin})\n`;
    if (info.leetcode) reply += `• **LeetCode:** [${info.leetcode}](${info.leetcode})\n`;
    return reply;
  }

  // 8. If vector knowledge chunk was retrieved
  if (institutionalMatch) {
    return `📜 **${institutionalMatch.title}**\n\n${institutionalMatch.content}`;
  }

  // 9. Universal Strict Fallback
  return `That data is not present in your database records.`;
}

/**
 * Controller endpoint: POST /api/student/ai/chat
 * Executes Hybrid RAG: Strictly bounded to the student's personal portal records + Vector Institutional Knowledge Chunks + Google Gemini LLM
 */
exports.chatWithStudentAi = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID missing in request' });
    }

    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message string is required' });
    }

    // 1. Concurrently fetch Live Structured Student Context (strictly scoped to this student) + Semantic Vector Knowledge Chunks
    const [studentContext, relevantKnowledge] = await Promise.all([
      getStudentContext(userId),
      searchKnowledgeBase(message, 3)
    ]);

    let aiReply = '';
    let modelUsed = 'Deterministic Rule Engine (Hybrid RAG)';
    const sources = (relevantKnowledge || []).map(k => ({
      title: k.title,
      category: k.category,
      score: k.similarityScore
    }));

    // 2. Invoke Google Gemini LLM if GEMINI_API_KEY is configured
    if (process.env.GEMINI_API_KEY) {
      const candidates = [
        process.env.GEMINI_MODEL,
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-flash-latest',
        'gemini-3.5-flash'
      ].filter(Boolean);

      const uniqueModels = [...new Set(candidates)];
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const knowledgeContextText = (relevantKnowledge || []).length > 0
        ? relevantKnowledge.map((k, i) => `[INSTITUTIONAL KNOWLEDGE DOC ${i + 1}: ${k.title}]\n${k.content}`).join('\n\n')
        : 'No specific institutional policy document matched.';

      const hybridPrompt = `
You are the dedicated AI Assistant for the Student Portal.
Your scope of authority is STRICTLY BOUNDED to the personal portal records of the logged-in student, and relevant institutional student regulations.

==================================================
[1. LOGGED-IN STUDENT PORTAL DATABASE CONTEXT (MongoDB)]
${JSON.stringify(studentContext, null, 2)}
==================================================

==================================================
[2. RETRIEVED STUDENT REGULATIONS & POLICIES (Vector RAG)]
${knowledgeContextText}
==================================================

[STUDENT QUERY]
"${message}"

[STRICT SCOPE & BOUNDARY RULES]
1. PORTAL ISOLATION: You can ONLY answer queries regarding this logged-in student's portal data:
   - Their Profile (Personal, Contact, Roll No, CGPA, Social links, Resume, Photo)
   - Their Attendance (Total classes, Present/Absent/OD count, percentage, safe-to-miss margin, daily schedule)
   - Their Enrolled Courses & Subjects for their branch and semester
   - Their Course Marks & Letter Grades (Exam 60, Assignment 20, Practical 20, Total 100)
   - Their Course Assignments & Submissions (Pending deadlines, completed submissions)
   - Institutional Student Regulations (Attendance rules, 75% cutoff, condonation, grading scale)
2. SECURITY & BOUNDARY: If the user asks about other students, faculty private details, administrative settings, faculty salaries, or backend management, decline politely:
   "I can only access and assist with information related to your personal Student Portal and academic records."
3. GROUNDING: Provide exact numbers and metrics computed in the context. Never hallucinate marks or attendance numbers.
4. IMAGES: If asked for profile photo or image, format as markdown image: ![Profile Photo](profileImage_URL).
5. LINKS: If asked for coding/social links (GitHub, LinkedIn, LeetCode, Resume), format as clickable markdown links: [Label](URL).
6. MISSING DATA: If a field is null, unfilled, or missing in the student's records, state clearly: "That data is not present in your database records."
7. FORMATTING: Use clean, professional Markdown with bullet points and bold highlights.
`;

      let generated = false;
      for (const modelName of uniqueModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(hybridPrompt);
          if (result && result.response) {
            aiReply = result.response.text();
            modelUsed = `Google Gemini (${modelName}) + Hybrid RAG`;
            generated = true;
            break;
          }
        } catch (err) {
          // Try next model candidate
        }
      }

      if (!generated) {
        aiReply = generateDataGroundedAnswer(message, studentContext, relevantKnowledge);
      }
    } else {
      // Local Hybrid Grounding Engine (combines live DB + Vector Knowledge Chunks)
      aiReply = generateDataGroundedAnswer(message, studentContext, relevantKnowledge);
    }

    return res.json({
      success: true,
      reply: aiReply,
      model: modelUsed,
      sources,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[StudentAI Error]:', error);
    return res.status(500).json({
      message: 'Failed to process AI chat request',
      error: error.message
    });
  }
};
