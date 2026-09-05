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
 * Helper to ensure URLs are properly formatted
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

  // 1. Fetch User and Student Profile
  const [user, profile] = await Promise.all([
    User.findById(userObjId).select('name email role firstName lastName department').lean(),
    StudentProfile.findOne({ $or: [{ user: userObjId }, { user: String(userId) }] }).lean()
  ]);

  const studentBranch = (profile?.branch || profile?.program || user?.department || '').trim();
  const studentSemester = Number(profile?.semester) || null;

  // 2. Build course filter scoped to student's department/semester
  const courseQuery = { isActive: { $ne: false } };
  if (studentBranch) {
    courseQuery.$or = [
      { department: new RegExp(studentBranch, 'i') },
      { department: studentBranch },
      { department: '' },
      { department: { $exists: false } }
    ];
  }
  if (studentSemester) {
    courseQuery.semester = studentSemester;
  }

  // 3. Fetch courses, all attendance documents, marks, and submissions in parallel
  let [enrolledCourses, attendanceDocs, marks, submissions] = await Promise.all([
    Course.find(courseQuery)
      .populate({ path: 'faculty', select: 'name email firstName lastName' })
      .select('code name credits semester department faculty')
      .lean(),
    Attendance.find({ $or: [{ userId: userObjId }, { userId: String(userId) }] })
      .sort({ date: -1 })
      .lean(),
    Marks.find({ $or: [{ studentId: userObjId }, { studentId: String(userId) }] })
      .populate('courseId', 'code name credits semester department')
      .lean(),
    StudentSubmission.find({ $or: [{ student: userObjId }, { student: String(userId) }] })
      .select('assignment submittedAt note files')
      .lean()
  ]);

  // Fallback if department name slightly differs in courses collection
  if ((!enrolledCourses || enrolledCourses.length === 0) && studentSemester) {
    enrolledCourses = await Course.find({ semester: studentSemester, isActive: { $ne: false } })
      .populate({ path: 'faculty', select: 'name email firstName lastName' })
      .select('code name credits semester department faculty')
      .lean();
  }

  const enrolledCourseIds = (enrolledCourses || []).map(c => c._id);

  // 4. Fetch assignments strictly belonging to student's enrolled courses or semester
  let assignmentQuery = {};
  if (enrolledCourseIds.length > 0) {
    assignmentQuery = { courseId: { $in: enrolledCourseIds } };
  } else if (studentSemester) {
    const semCourses = await Course.find({ semester: studentSemester }).select('_id').lean();
    if (semCourses.length > 0) {
      assignmentQuery = { courseId: { $in: semCourses.map(c => c._id) } };
    }
  }

  const relevantAssignments = await Assignment.find(assignmentQuery)
    .populate('courseId', 'code name')
    .populate('faculty', 'name firstName lastName email')
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
    let facultyName = '-';
    if (assign.faculty) {
      facultyName = `${assign.faculty.firstName || ''} ${assign.faculty.lastName || ''}`.trim() || assign.faculty.name || assign.faculty.email || '-';
    }
    const item = {
      id: assign._id,
      title: assign.title,
      courseCode: assign.courseId?.code || 'N/A',
      courseName: assign.courseId?.name || 'N/A',
      faculty: facultyName,
      dueDate: assign.dueDate ? new Date(assign.dueDate).toISOString().split('T')[0] : 'No deadline',
      description: assign.description || ''
    };

    if (isSubmitted) {
      completedAssignments.push(item);
    } else {
      pendingAssignments.push(item);
    }
  });

  // 5. Aggregate attendance across ALL days/records in MongoDB
  let totalClasses = 0;
  let presentClasses = 0;
  let absentClasses = 0;
  let onDutyClasses = 0;
  const subjectMap = new Map();
  const recentLogs = [];

  const dailyRecords = (attendanceDocs || []).map(doc => {
    const rawDate = doc.date ? new Date(doc.date) : null;
    const dateStr = rawDate ? rawDate.toISOString().split('T')[0] : '';
    const formattedDate = rawDate
      ? rawDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
      : '';

    const schedule = (doc.dailySchedule || []).map(s => ({
      session: s.session || 'FN',
      subject: s.subject || 'General',
      status: s.status || 'PRESENT',
      faculty: s.faculty || '',
      topic: s.topic || '',
      date: s.date ? new Date(s.date).toISOString().split('T')[0] : dateStr
    }));

    const docTotal = typeof doc.totalClasses === 'number' && doc.totalClasses > 0 ? doc.totalClasses : schedule.length;
    const docPresent = typeof doc.presentClasses === 'number' ? doc.presentClasses : schedule.filter(s => s.status === 'PRESENT').length;
    const docAbsent = typeof doc.absentClasses === 'number' ? doc.absentClasses : schedule.filter(s => s.status === 'ABSENT').length;
    const docOnDuty = typeof doc.onDutyClasses === 'number' ? doc.onDutyClasses : schedule.filter(s => s.status === 'ON-DUTY').length;

    totalClasses += docTotal;
    presentClasses += docPresent;
    absentClasses += docAbsent;
    onDutyClasses += docOnDuty;

    for (const item of schedule) {
      const subj = (item.subject || 'General').trim();
      const curr = subjectMap.get(subj) || { subject: subj, present: 0, onDuty: 0, absent: 0, total: 0 };
      curr.total += 1;
      if (item.status === 'PRESENT') curr.present += 1;
      else if (item.status === 'ON-DUTY') curr.onDuty += 1;
      else if (item.status === 'ABSENT') curr.absent += 1;
      subjectMap.set(subj, curr);

      if (recentLogs.length < 10) {
        recentLogs.push({
          subject: subj,
          status: item.status,
          session: item.session,
          date: item.date ? new Date(item.date).toISOString().split('T')[0] : dateStr,
          faculty: item.faculty || '',
          topic: item.topic || ''
        });
      }
    }

    return {
      date: dateStr,
      formattedDate,
      academicYear: doc.academicYear || '2025-26',
      semester: doc.semester || 'Odd',
      totalClasses: docTotal,
      presentClasses: docPresent,
      absentClasses: docAbsent,
      onDutyClasses: docOnDuty,
      schedule
    };
  });

  const effectivePresent = presentClasses + onDutyClasses;
  const percentage = totalClasses > 0 ? Math.round((effectivePresent / totalClasses) * 10000) / 100 : 0;
  const presentPct = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 10000) / 100 : 0;
  const onDutyPct = totalClasses > 0 ? Math.round((onDutyClasses / totalClasses) * 10000) / 100 : 0;
  const absentPct = totalClasses > 0 ? Math.round((absentClasses / totalClasses) * 10000) / 100 : 0;

  let safeToMiss = 0;
  let neededTo75 = 0;
  if (totalClasses > 0) {
    if (percentage >= 75) {
      safeToMiss = Math.max(0, Math.floor((effectivePresent - 0.75 * totalClasses) / 0.75));
    } else {
      neededTo75 = Math.max(0, Math.ceil((0.75 * totalClasses - effectivePresent) / 0.25));
    }
  }

  const subjectWiseStats = Array.from(subjectMap.values()).map(s => {
    const eff = s.present + s.onDuty;
    const pct = s.total > 0 ? Math.round((eff / s.total) * 10000) / 100 : 0;
    return {
      subject: s.subject,
      total: s.total,
      present: s.present,
      onDuty: s.onDuty,
      absent: s.absent,
      percentage: pct,
      status: pct >= 75 ? 'Safe' : 'Shortage'
    };
  });

  const attendanceSummary = {
    totalClasses,
    presentClasses,
    absentClasses,
    onDutyClasses,
    effectivePresent,
    percentage,
    presentPercentage: presentPct,
    onDutyPercentage: onDutyPct,
    absentPercentage: absentPct,
    status: totalClasses === 0 ? 'No attendance records yet' : (percentage >= 75 ? 'Safe (Above 75%)' : 'Warning (Below 75%)'),
    safeToMiss,
    neededTo75,
    subjectWiseStats,
    recentLogs,
    dailyRecords
  };

  // 6. Format Marks and compute GPA dynamically
  const GRADE_POINTS = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0 };
  let totalCredits = 0;
  let weightedPoints = 0;
  let totalScored = 0;
  let maxPossible = 0;

  const marksSummary = (marks || []).map(m => {
    const credits = m.courseId?.credits || 3;
    const gp = GRADE_POINTS[m.grade] !== undefined ? GRADE_POINTS[m.grade] : 0;
    totalCredits += credits;
    weightedPoints += (gp * credits);
    totalScored += (m.total || 0);
    maxPossible += 100;

    return {
      courseCode: m.courseId?.code || 'N/A',
      courseName: m.courseId?.name || 'N/A',
      credits,
      semesterExam: m.semesterExam || 0,
      assignmentScore: m.assignment || 0,
      practicalScore: m.practical || 0,
      total: m.total || 0,
      grade: m.grade || 'F',
      gradePoints: gp,
      semester: m.semester,
      academicYear: m.academicYear
    };
  });

  const calculatedGPA = totalCredits > 0
    ? (Math.round((weightedPoints / totalCredits) * 100) / 100).toFixed(2)
    : (marksSummary.length > 0 ? (totalScored / marksSummary.length / 10).toFixed(2) : null);

  const averagePercentage = maxPossible > 0
    ? (Math.round((totalScored / maxPossible) * 10000) / 100)
    : null;

  // 7. Format courses with faculty names
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
  const studentName = profile?.firstName
    ? `${profile?.firstName} ${profile?.lastName || ''}`.trim()
    : (user?.name || (user?.firstName ? `${user?.firstName} ${user?.lastName || ''}`.trim() : 'Student'));

  // Student Profile details strictly from MongoDB
  const studentInfo = {
    isProfileComplete,
    name: studentName,
    accountEmail: user?.email || null,
    firstName: profile?.firstName || user?.firstName || null,
    lastName: profile?.lastName || user?.lastName || null,
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
    program: profile?.program || profile?.branch || user?.department || null,
    branch: profile?.branch || profile?.program || user?.department || null,
    semester: profile?.semester || (coursesFormatted[0]?.semester ? String(coursesFormatted[0].semester) : null),
    year: profile?.year || null,
    section: profile?.section || null,
    admissionYear: profile?.admissionYear || null,
    passoutYear: profile?.passoutYear || null,
    cgpa: profile?.cgpa || calculatedGPA || null,
    calculatedGPA,
    averagePercentage,
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

  console.log('[StudentAI Realtime Context]:', {
    name: studentInfo.name,
    attendance: `${attendanceSummary.percentage}% (${attendanceSummary.effectivePresent}/${attendanceSummary.totalClasses} classes across ${dailyRecords.length} recorded days)`,
    courses: coursesFormatted.length,
    marks: marksSummary.length,
    cgpa: studentInfo.cgpa,
    pendingAssignments: pendingAssignments.length
  });

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
 * Helper to match relative or explicit dates within a student's query
 */
function findDailyRecordInQuery(userQuery, dailyRecords = []) {
  const q = (userQuery || '').toLowerCase().trim();
  const now = new Date();

  // 1. Relative keywords: "today"
  if (q.includes('today') || q.includes('todays') || q.includes("today's")) {
    const todayStr = now.toISOString().split('T')[0];
    const match = dailyRecords.find(d => d.date === todayStr);
    return { targetDateLabel: `Today (${todayStr})`, record: match, searchedKey: todayStr };
  }

  // 2. Relative keywords: "yesterday"
  if (q.includes('yesterday') || q.includes('yesterdays') || q.includes("yesterday's")) {
    const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yStr = yDate.toISOString().split('T')[0];
    const match = dailyRecords.find(d => d.date === yStr);
    return { targetDateLabel: `Yesterday (${yStr})`, record: match, searchedKey: yStr };
  }

  // 3. Match standard ISO date: YYYY-MM-DD
  const isoMatch = q.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    const dateStr = isoMatch[1];
    const match = dailyRecords.find(d => d.date === dateStr);
    return { targetDateLabel: dateStr, record: match, searchedKey: dateStr };
  }

  // 4. Match DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
  const dmyMatch = q.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    const dateStr = `${year}-${month}-${day}`;
    const match = dailyRecords.find(d => d.date === dateStr);
    return { targetDateLabel: `${day}/${month}/${year}`, record: match, searchedKey: dateStr };
  }

  // 5. Match Month names (e.g. "1st september", "september 2", "sep 1", "2nd aug")
  const monthNames = [
    { name: 'january', short: 'jan', num: '01' },
    { name: 'february', short: 'feb', num: '02' },
    { name: 'march', short: 'mar', num: '03' },
    { name: 'april', short: 'apr', num: '04' },
    { name: 'may', short: 'may', num: '05' },
    { name: 'june', short: 'jun', num: '06' },
    { name: 'july', short: 'jul', num: '07' },
    { name: 'august', short: 'aug', num: '08' },
    { name: 'september', short: 'sep', num: '09' },
    { name: 'october', short: 'oct', num: '10' },
    { name: 'november', short: 'nov', num: '11' },
    { name: 'december', short: 'dec', num: '12' }
  ];

  for (const m of monthNames) {
    if (q.includes(m.name) || q.includes(m.short)) {
      const dayMatch = q.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      if (dayMatch) {
        const day = dayMatch[1].padStart(2, '0');
        const year = (q.match(/\b(20\d\d)\b/) || [])[1] || String(now.getFullYear());
        const dateStr = `${year}-${m.num}-${day}`;
        const match = dailyRecords.find(d => d.date === dateStr || (d.date && d.date.endsWith(`-${m.num}-${day}`)));
        return {
          targetDateLabel: `${day} ${m.name.charAt(0).toUpperCase() + m.name.slice(1)} ${year}`,
          record: match,
          searchedKey: dateStr
        };
      }
    }
  }

  return null;
}

/**
 * Concise Fallback Answer Generator (when Gemini LLM is unavailable)
 */
function generateFallbackAnswer(userQuery, ctx, relevantKnowledge = []) {
  const q = (userQuery || '').toLowerCase().trim();
  const att = ctx.attendance;
  const info = ctx.studentInfo;
  const marks = ctx.marks || [];
  const courses = ctx.courses || [];
  const pending = ctx.pendingAssignments || [];
  const completed = ctx.completedAssignments || [];

  // 1. Security Check
  if (q.includes('password') || q.includes('salary') || q.includes('other student') || q.includes('admin settings')) {
    return "I can only access and assist with information related to your personal Student Portal and academic records.";
  }

  // 2. Specific Day / Date Queries (Today, Yesterday, Specific Date)
  const dateMatchResult = findDailyRecordInQuery(userQuery, att.dailyRecords || []);
  if (dateMatchResult) {
    const { targetDateLabel, record } = dateMatchResult;
    if (!record) {
      return `📅 No attendance record found for **${targetDateLabel}** in your portal. Either no classes were scheduled, college was closed, or attendance was not marked for that day.`;
    }

    const sched = record.schedule || [];
    const statusCounts = [];
    if (record.presentClasses > 0) statusCounts.push(`${record.presentClasses} Present`);
    if (record.onDutyClasses > 0) statusCounts.push(`${record.onDutyClasses} On-Duty`);
    if (record.absentClasses > 0) statusCounts.push(`${record.absentClasses} Absent`);
    const statusSummary = statusCounts.join(', ') || '0 Classes';

    let sessionList = '';
    if (sched.length > 0) {
      sessionList = '\n\n**Class Schedule & Session Logs**:\n' + sched.map(s => {
        const icon = s.status === 'PRESENT' ? '✅' : (s.status === 'ON-DUTY' ? '🔷' : '❌');
        const facText = s.faculty ? ` (Faculty: ${s.faculty})` : '';
        const topicText = s.topic ? ` | Topic: *${s.topic}*` : '';
        return `• ${icon} **${s.subject}** [${s.session}]: **${s.status}**${facText}${topicText}`;
      }).join('\n');
    }

    return `📅 **Attendance for ${targetDateLabel}**:\n\n• **Summary**: **${statusSummary}** out of **${record.totalClasses}** total class(es)${sessionList}`;
  }

  // 3. Historical Attendance Log Queries
  if (
    q.includes('recent log') ||
    q.includes('recent attendance') ||
    q.includes('daily attendance') ||
    q.includes('attendance history') ||
    q.includes('past attendance') ||
    q.includes('attendance log')
  ) {
    if (!att.dailyRecords || att.dailyRecords.length === 0) {
      return "No historical attendance records found in your portal.";
    }
    const historyList = att.dailyRecords.slice(0, 6).map(d => {
      const presentCount = d.presentClasses + d.onDutyClasses;
      const icon = d.absentClasses > 0 ? (presentCount > 0 ? '⚠️' : '❌') : '✅';
      const subjs = (d.schedule || []).map(s => `${s.subject} (${s.status})`).join(', ');
      return `• ${icon} **${d.date}**: ${presentCount}/${d.totalClasses} Present — ${subjs || 'No subjects recorded'}`;
    }).join('\n');
    return `🗓️ **Recent Daily Attendance History**:\n\n${historyList}\n\n**Overall Attendance**: **${att.percentage}%** (${att.effectivePresent}/${att.totalClasses} classes)`;
  }

  // 4. Attendance Specific Single Queries
  if (
    q.includes('percentage') ||
    q.includes('percent') ||
    q.includes('%') ||
    q === 'attendance' ||
    q === 'what is my attendance' ||
    q === 'what is my attendance percentage' ||
    q === 'show my attendance' ||
    q === 'my attendance'
  ) {
    if (att.totalClasses === 0) {
      return "You currently have **no attendance records** marked in the portal.";
    }
    return `Your current attendance is **${att.percentage}%** (${att.status}) with **${att.effectivePresent}** attended out of **${att.totalClasses}** total classes.`;
  }

  if (q.includes('can i miss') || q.includes('safe to miss') || q.includes('bunk') || q.includes('how many class can i miss')) {
    if (att.totalClasses === 0) {
      return "No attendance records are available yet to calculate margin.";
    }
    if (att.percentage >= 75) {
      return `You can safely miss up to **${att.safeToMiss}** class(es) while maintaining your attendance above the 75% cutoff (Current: **${att.percentage}%**).`;
    }
    return `Your attendance is currently **${att.percentage}%** (Below 75%). You need to attend the next **${att.neededTo75}** consecutive classes to reach 75%.`;
  }

  if (q.includes('need to attend') || q.includes('needed to 75') || q.includes('reach 75') || q.includes('attendance shortage')) {
    if (att.percentage >= 75) {
      return `Your attendance is already **${att.percentage}%** (Above the 75% requirement). You can safely miss up to **${att.safeToMiss}** class(es).`;
    }
    return `You need to attend the next **${att.neededTo75}** consecutive class(es) to reach the 75% attendance cutoff (Current: **${att.percentage}%**).`;
  }

  if (q.includes('classes attended') || q.includes('present class') || q.includes('how many present')) {
    return `You have attended **${att.effectivePresent}** out of **${att.totalClasses}** classes (${att.presentClasses} Present + ${att.onDutyClasses} On-Duty).`;
  }

  if (q.includes('absent class') || q.includes('how many absent') || q.includes('missed class')) {
    return `You have been absent for **${att.absentClasses}** out of **${att.totalClasses}** classes.`;
  }

  if (q.includes('total class') || q.includes('conducted class')) {
    return `A total of **${att.totalClasses}** classes have been conducted across your registered courses so far.`;
  }

  if (q.includes('subject attendance') || q.includes('subject-wise') || q.includes('subject wise attendance')) {
    if (att.subjectWiseStats.length === 0) {
      return `No subject-wise attendance breakdown is recorded yet. Overall Attendance: **${att.percentage}%** (${att.effectivePresent}/${att.totalClasses} classes).`;
    }
    const breakdown = att.subjectWiseStats
      .map(s => `• **${s.subject}**: ${s.percentage}% (${s.present + s.onDuty}/${s.total} classes) - *${s.status}*`)
      .join('\n');
    return `📊 **Subject-Wise Attendance Breakdown**:\n\n${breakdown}\n\n**Overall Attendance**: **${att.percentage}%**`;
  }

  // 5. Marks & Academics Queries
  if (q.includes('marks') || q.includes('grade') || q.includes('score') || q.includes('exam result')) {
    if (marks.length === 0) {
      return `No semester marks have been published in your portal yet.`;
    }
    const tableHeader = `| Course | Semester Exam | Assignment | Practical | Total | Grade |\n| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
    const tableRows = marks.map(m => `| **${m.courseName}** (${m.courseCode}) | ${m.semesterExam}/60 | ${m.assignmentScore}/20 | ${m.practicalScore}/20 | **${m.total}/100** | **${m.grade}** |`).join('\n');
    const cgpaNote = info.cgpa ? `\n\n🎯 **Cumulative GPA / CGPA**: **${info.cgpa}**` : '';
    return `🎓 **Your Academic Marks & Grades**:\n\n${tableHeader}${tableRows}${cgpaNote}`;
  }

  // 6. Assignments Queries
  if (q.includes('assignment') || q.includes('task') || q.includes('homework') || q.includes('submission')) {
    if (pending.length === 0 && completed.length === 0) {
      return "You have no active assignments posted at this time.";
    }
    if (q.includes('pending') || q.includes('due') || q.includes('left')) {
      if (pending.length === 0) {
        return "🎉 You have **0 pending assignments**! All coursework is up to date.";
      }
      const list = pending.map((p, i) => `${i + 1}. **${p.title}** (${p.courseName}) - *Due: ${p.dueDate}* (Faculty: ${p.faculty})`).join('\n');
      return `📝 **You have ${pending.length} pending assignment(s)**:\n\n${list}`;
    }
    const pendingList = pending.length > 0
      ? pending.map(p => `• ⏳ **${p.title}** (${p.courseName}) - Due: ${p.dueDate}`).join('\n')
      : '• 🎉 *No pending assignments*';
    const completedList = completed.length > 0
      ? completed.map(c => `• ✅ **${c.title}** (${c.courseName}) - *Submitted*`).join('\n')
      : '• *No submissions yet*';
    return `📚 **Course Assignments Overview**:\n\n**Pending Tasks (${pending.length})**:\n${pendingList}\n\n**Completed Submissions (${completed.length})**:\n${completedList}`;
  }

  // 7. Courses Queries
  if (q.includes('course') || q.includes('subject') || q.includes('enrolled')) {
    if (courses.length === 0) {
      return `No courses are currently assigned for your department and semester in the database.`;
    }
    const list = courses.map((c, i) => `${i + 1}. **${c.name}** (\`${c.code}\`) - Credits: ${c.credits} | Faculty: ${c.faculty}`).join('\n');
    return `📖 **Your Enrolled Courses (Semester ${info.semester || 'Current'})**:\n\n${list}`;
  }

  // 8. Single Profile Field Queries (ONLY return that specific detail)
  const singleFieldMap = [
    { keys: ['cgpa', 'gpa', 'my cgpa', 'what is my cgpa'], answer: `Your current CGPA is **${info.cgpa || 'N/A'}**.` },
    { keys: ['roll no', 'roll number', 'rollno', 'roll'], answer: `Your Roll Number is **${info.rollNo || 'N/A'}**.` },
    { keys: ['student id', 'studentid'], answer: `Your Student ID is **${info.studentId || 'N/A'}**.` },
    { keys: ['register no', 'register number', 'reg no'], answer: `Your Register Number is **${info.registerNumber || 'N/A'}**.` },
    { keys: ['email', 'mail', 'email address'], answer: `Your registered email is **${info.email || 'N/A'}**.` },
    { keys: ['phone', 'mobile', 'contact number', 'phone number'], answer: `Your phone number is **${info.phone || 'N/A'}**.` },
    { keys: ['blood group', 'bloodgroup', 'blood type'], answer: `Your blood group is **${info.bloodGroup || 'N/A'}**.` },
    { keys: ['dob', 'date of birth', 'birthday', 'birth date'], answer: `Your Date of Birth is **${info.dob || 'N/A'}**.` },
    { keys: ['address', 'city', 'state', 'pincode'], answer: `Your address is **${info.address || 'N/A'}**, ${info.city || ''}, ${info.state || ''} ${info.pincode || ''}.` },
    { keys: ['branch', 'department', 'program', 'degree'], answer: `Your branch/program is **${info.program || info.branch || 'N/A'}**.` },
    { keys: ['current sem', 'which sem', 'current semester', 'semester', 'sem'], answer: `You are currently in **Semester ${info.semester || 'N/A'}**.` },
    { keys: ['academic year', 'year'], answer: `Your academic year is **${info.year || 'N/A'}**.` },
    { keys: ['section'], answer: `Your section is **${info.section || 'N/A'}**.` },
    { keys: ['photo', 'profile photo', 'avatar', 'picture'], answer: info.profileImage ? `Here is your profile photo:\n\n![Profile Photo](${info.profileImage})` : `No profile photo uploaded in your profile.` },
    { keys: ['github'], answer: info.github ? `Your GitHub link is [${info.github}](${info.github}).` : `GitHub link not specified.` },
    { keys: ['linkedin'], answer: info.linkedin ? `Your LinkedIn link is [${info.linkedin}](${info.linkedin}).` : `LinkedIn link not specified.` },
    { keys: ['leetcode'], answer: info.leetcode ? `Your LeetCode link is [${info.leetcode}](${info.leetcode}).` : `LeetCode link not specified.` },
    { keys: ['resume'], answer: info.resumeLink ? `Your Resume link is [${info.resumeLink}](${info.resumeLink}).` : `Resume link not specified.` },
    { keys: ['full name', 'my name', 'name', 'who am i'], answer: `Your name is **${info.name || 'Student'}**.` }
  ];

  if (!q.includes('all') && !q.includes('summary') && !q.includes('report') && !q.includes('breakdown') && !q.includes('everything') && !q.includes('profile')) {
    for (const item of singleFieldMap) {
      if (item.keys.some(k => q.includes(k))) {
        return item.answer;
      }
    }
  }

  // Full Profile Report
  if (q.includes('profile') || q.includes('full details') || q.includes('all details') || q.includes('summary') || q.includes('everything')) {
    return `👤 **Complete Student Profile: ${info.name}**\n\n` +
      `• **Roll Number**: ${info.rollNo || 'N/A'}\n` +
      `• **Register Number**: ${info.registerNumber || 'N/A'}\n` +
      `• **Branch / Program**: ${info.program || info.branch || 'N/A'}\n` +
      `• **Semester / Year**: Semester ${info.semester || 'N/A'} (${info.year || 'N/A'})\n` +
      `• **CGPA**: **${info.cgpa || 'N/A'}**\n` +
      `• **Attendance**: **${att.percentage}%** (${att.status})\n` +
      `• **Email**: ${info.email || 'N/A'}\n` +
      `• **Phone**: ${info.phone || 'N/A'}\n` +
      `• **Pending Assignments**: ${pending.length} pending\n` +
      (info.github ? `• **GitHub**: [${info.github}](${info.github})\n` : '') +
      (info.linkedin ? `• **LinkedIn**: [${info.linkedin}](${info.linkedin})\n` : '');
  }

  // 9. Institutional Knowledge Match
  const institutionalMatch = (relevantKnowledge || []).find(k => k.similarityScore >= 0.25);
  if (institutionalMatch) {
    return `📜 **${institutionalMatch.title}**\n\n${institutionalMatch.content}`;
  }

  // 10. Default Contextual Summary
  return `Here is your current academic summary:\n\n• **Student**: ${info.name} (${info.rollNo || info.email || 'N/A'})\n• **Attendance**: **${att.percentage}%** (${att.effectivePresent}/${att.totalClasses} classes)\n• **CGPA**: **${info.cgpa || 'N/A'}**\n• **Pending Tasks**: **${pending.length}** assignment(s)\n\nAsk me specific questions like *"What is my attendance today?"*, *"Was I present on September 1st?"*, or *"Show my marks"*.`;
}

/**
 * Controller endpoint: POST /api/student/ai/chat
 * Executes Hybrid RAG: Personal Student Portal records (MongoDB) + Institutional Regulations (Vector RAG) + Google Gemini LLM
 */
exports.chatWithStudentAi = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'User ID missing in request' });
    }

    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message string is required' });
    }

    // 1. Concurrently fetch Live Structured Student Context + Semantic Vector Knowledge Chunks (Zero Caching)
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

    // 2. Invoke Google Gemini LLM
    if (process.env.GEMINI_API_KEY) {
      const candidates = [
        process.env.GEMINI_MODEL,
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-flash-latest'
      ].filter(Boolean);

      const uniqueModels = [...new Set(candidates)];
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const knowledgeContextText = (relevantKnowledge || []).length > 0
        ? relevantKnowledge.map((k, i) => `[INSTITUTIONAL REGULATION ${i + 1}: ${k.title}]\n${k.content}`).join('\n\n')
        : 'No specific institutional policy document matched.';

      const hybridPrompt = `
You are the dedicated AI Assistant for the Student Portal.
Your scope of authority is STRICTLY BOUNDED to the personal portal records of the logged-in student, and relevant institutional student regulations.

==================================================
[1. LOGGED-IN STUDENT PORTAL DATABASE CONTEXT (Live MongoDB - Zero Caching)]
${JSON.stringify(studentContext, null, 2)}
==================================================

==================================================
[2. RETRIEVED STUDENT REGULATIONS & POLICIES (Vector RAG)]
${knowledgeContextText}
==================================================

[STUDENT QUERY]
"${message}"

[STRICT SCOPE & PRECISION RULES - ABSOLUTE PRIORITY]
1. DEFAULT TO ONLY THE EXACT DETAIL ASKED (CRITICAL):
   - Unless the student explicitly asks for "full details", "complete report", "detailed breakdown", "summary", or "everything", you MUST ONLY answer with the EXACT single detail requested.
   - DO NOT dump other metrics, do not add unsolicited advice, and do not provide full profile or attendance sheets.
   - Examples:
     • Question: "What is my attendance percentage?" -> Answer ONLY: "Your current attendance is **84.5%** (Safe / Above 75%)."
     • Question: "What is my CGPA?" -> Answer ONLY: "Your current CGPA is **8.75**."
     • Question: "What is my roll number?" -> Answer ONLY: "Your Roll Number is **21CS101**."
     • Question: "What is my email?" -> Answer ONLY: "Your registered email is **student@example.com**."
     • Question: "What is my branch / department?" -> Answer ONLY: "Your branch is **Computer Science and Engineering**."
     • Question: "What is my semester?" -> Answer ONLY: "You are currently in **Semester 6**."
     • Question: "How many classes can I safely miss?" -> Answer ONLY: "You can safely miss up to **2** class(es) while maintaining 75% attendance."
     • Question: "How many assignments are pending?" -> Answer ONLY: "You have **2** pending assignment(s)."
     • Question: "Show my profile photo" -> Answer ONLY: "Here is your profile photo:\n\n![Profile Photo](profileImage_URL)"
     • Question: "Show my GitHub" -> Answer ONLY: "Your GitHub link is [URL](URL)."

2. SPECIFIC DATE OR RELATIVE DAY QUERIES (TODAY, YESTERDAY, SPECIFIC DATES):
   - When the student asks about attendance or schedule on a specific date (e.g. "today", "yesterday", "2026-09-01", "on September 1st", "on Monday"):
   - Look up that date in \`attendance.dailyRecords\`.
   - If found, provide the exact session-by-session breakdown: date, total classes, status counts (Present/Absent/On-Duty), session (FN/AN), subject name, status (PRESENT/ABSENT/ON-DUTY), faculty name, and topic covered.
   - If not found in \`attendance.dailyRecords\`, state clearly:
     "No attendance record is found for **[Date]** in your portal. Either no classes were scheduled or attendance was not marked for that day."

3. REAL-TIME SYNCHRONIZATION & ZERO CACHING:
   - You are directly connected to live MongoDB records without any delay or cache.
   - Whenever faculty or admin updates attendance, marks, or assignments, the new records are reflected instantly. Always base answers on the latest numbers in the database context.

4. FULL DETAILS ONLY WHEN EXPLICITLY ASKED:
   - ONLY provide a complete multi-field breakdown or full summary when the student explicitly uses words like: "give full details", "show all details", "full report", "detailed breakdown", "complete summary", or "everything".

5. PORTAL ISOLATION & SECURITY:
   - You can ONLY access this logged-in student's records.
   - If asked about other students, faculty private details, administrative settings, or faculty salaries, decline politely:
     "I can only access and assist with information related to your personal Student Portal and academic records."

6. GROUNDING: Provide exact numbers and metrics from MongoDB context. Never hallucinate.
7. FORMATTING: Use clean, professional Markdown with bold highlights.
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
          // Try next candidate
        }
      }

      if (!generated) {
        aiReply = generateFallbackAnswer(message, studentContext, relevantKnowledge);
      }
    } else {
      aiReply = generateFallbackAnswer(message, studentContext, relevantKnowledge);
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
