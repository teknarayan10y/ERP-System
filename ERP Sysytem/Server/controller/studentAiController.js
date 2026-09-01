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
 * Concise Fallback Answer Generator (when Gemini LLM is unavailable)
 */
function generateFallbackAnswer(userQuery, ctx, relevantKnowledge = []) {
  const q = (userQuery || '').toLowerCase().trim();
  const att = ctx.attendance;
  const info = ctx.studentInfo;
  const marks = ctx.marks || [];
  const pending = ctx.pendingAssignments || [];

  // 1. Security Check
  if (q.includes('password') || q.includes('salary') || q.includes('other student') || q.includes('admin settings')) {
    return "I can only access and assist with information related to your personal Student Portal and academic records.";
  }

  // 2. Attendance Specific Single Queries
  if (
    q.includes('percentage') ||
    q.includes('percent') ||
    q.includes('%') ||
    q === 'attendance' ||
    q === 'what is my attendance' ||
    q === 'what is my attendance percentage' ||
    q === 'show my attendance'
  ) {
    return `Your current attendance is **${att.percentage}%** (${att.status}).`;
  }

  if (q.includes('can i miss') || q.includes('safe to miss') || q.includes('bunk') || q.includes('how many class can i miss')) {
    if (att.percentage >= 75) {
      return `You can safely miss up to **${att.safeToMiss}** class(es) while maintaining your attendance above the 75% cutoff (Current: **${att.percentage}%**).`;
    }
    return `Your attendance is currently **${att.percentage}%** (Below 75%). You need to attend the next **${att.neededTo75}** consecutive classes to reach 75%.`;
  }

  if (q.includes('classes attended') || q.includes('present class') || q.includes('how many present')) {
    return `You have attended **${att.presentClasses + att.onDutyClasses}** out of **${att.totalClasses}** classes.`;
  }

  if (q.includes('absent class') || q.includes('how many absent') || q.includes('missed class')) {
    return `You have been absent for **${att.absentClasses}** out of **${att.totalClasses}** classes.`;
  }

  if (q.includes('total class') || q.includes('conducted class')) {
    return `A total of **${att.totalClasses}** classes have been conducted so far.`;
  }

  // 3. Single Profile Field Queries (ONLY return that specific detail)
  const singleFieldMap = [
    { keys: ['cgpa', 'gpa', 'my cgpa'], answer: `Your current CGPA is **${info.cgpa || 'N/A'}**.` },
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
    { keys: ['photo', 'profile photo', 'avatar', 'picture'], answer: info.profileImage ? `Here is your profile photo:\n\n![Profile Photo](${info.profileImage})` : `No profile photo uploaded.` },
    { keys: ['github'], answer: info.github ? `Your GitHub link is [${info.github}](${info.github}).` : `GitHub link not specified.` },
    { keys: ['linkedin'], answer: info.linkedin ? `Your LinkedIn link is [${info.linkedin}](${info.linkedin}).` : `LinkedIn link not specified.` },
    { keys: ['leetcode'], answer: info.leetcode ? `Your LeetCode link is [${info.leetcode}](${info.leetcode}).` : `LeetCode link not specified.` },
    { keys: ['resume'], answer: info.resumeLink ? `Your Resume link is [${info.resumeLink}](${info.resumeLink}).` : `Resume link not specified.` },
    { keys: ['full name', 'my name', 'name'], answer: `Your name is **${info.name || 'N/A'}**.` },
    { keys: ['pending assignment', 'assignments pending', 'due assignment'], answer: pending.length > 0 ? `You have **${pending.length}** pending assignment(s).` : `You have **0** pending assignments!` }
  ];

  if (!q.includes('all') && !q.includes('summary') && !q.includes('report') && !q.includes('breakdown') && !q.includes('everything')) {
    for (const item of singleFieldMap) {
      if (item.keys.some(k => q.includes(k))) {
        return item.answer;
      }
    }
  }

  // 4. Institutional Knowledge Match
  const institutionalMatch = (relevantKnowledge || []).find(k => k.similarityScore >= 0.25);
  if (institutionalMatch) {
    return `📜 **${institutionalMatch.title}**\n\n${institutionalMatch.content}`;
  }

  // 5. Default Fallback
  return `That specific information is not found in your student portal records.`;
}

/**
 * Controller endpoint: POST /api/student/ai/chat
 * Executes Hybrid RAG: Personal Student Portal records (MongoDB) + Institutional Regulations (Vector RAG) + Google Gemini LLM
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

    // 1. Concurrently fetch Live Structured Student Context + Semantic Vector Knowledge Chunks
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
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-flash-latest',
        'gemini-3.5-flash'
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
[1. LOGGED-IN STUDENT PORTAL DATABASE CONTEXT (MongoDB)]
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

2. FULL DETAILS ONLY WHEN EXPLICITLY ASKED:
   - ONLY provide a complete multi-field breakdown or full summary when the student explicitly uses words like: "give full details", "show all details", "full report", "detailed breakdown", "complete summary", or "everything".

3. PORTAL ISOLATION & SECURITY:
   - You can ONLY access this logged-in student's records.
   - If asked about other students, faculty private details, administrative settings, or faculty salaries, decline politely:
     "I can only access and assist with information related to your personal Student Portal and academic records."

4. GROUNDING: Provide exact numbers and metrics from MongoDB context. Never hallucinate.
5. FORMATTING: Use clean, professional Markdown with bold highlights.
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
