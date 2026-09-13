/**
 * NexusMind AI - Python ML Client
 * Connects Node.js Express to the Python ML Sidecar Service (http://localhost:8000).
 * Features automatic and silent fallback to Node.js mathematical algorithms if Python is offline.
 */

const http = require('http');

const ML_SERVICE_URL = process.env.PYTHON_ML_URL || 'http://localhost:8000';

/**
 * Low-latency internal HTTP POST requester with strict 600ms timeout
 */
function postToMl(endpoint, data, timeoutMs = 600) {
  return new Promise((resolve) => {
    try {
      const url = new URL(endpoint, ML_SERVICE_URL);
      const postData = JSON.stringify(data || {});

      const options = {
        hostname: url.hostname,
        port: url.port || 8000,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: timeoutMs
      };

      const req = http.request(options, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(rawData));
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', () => { resolve(null); });
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.write(postData);
      req.end();
    } catch {
      resolve(null);
    }
  });
}

/**
 * Statistical Anomaly Detection (Python with JS fallback)
 */
async function detectAnomalies(records = []) {
  const pyResult = await postToMl('/api/ml/anomaly', { records });
  if (pyResult && pyResult.status) return pyResult;

  // Node.js Fallback
  if (!records || records.length < 3) {
    return { status: 'NOMINAL', anomaliesDetected: 0, anomalies: [] };
  }

  const pcts = records.map(r => Number(r.percentage || 0));
  const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const variance = pcts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pcts.length;
  const std = Math.sqrt(variance);

  const anomalies = [];
  records.forEach((r, i) => {
    const pct = Number(r.percentage || 0);
    const z = std > 0 ? (pct - mean) / std : 0;
    if (Math.abs(z) >= 1.96 || pct < 65) {
      anomalies.push({
        index: i,
        record: r,
        zScore: Math.round(z * 100) / 100,
        severity: pct < 60 ? 'HIGH' : 'MEDIUM'
      });
    }
  });

  return {
    status: anomalies.length > 0 ? 'ANOMALIES_DETECTED' : 'NOMINAL',
    meanAttendance: Math.round(mean * 100) / 100,
    stdDeviation: Math.round(std * 100) / 100,
    anomaliesDetected: anomalies.length,
    anomalies
  };
}

/**
 * 30-Day Trend Velocity Forecast (Python with JS fallback)
 */
async function calculateForecast(historicalPercentages = [], currentPercentage = 80) {
  const pyResult = await postToMl('/api/ml/forecast', { historicalPercentages, currentPercentage });
  if (pyResult && pyResult.velocity) return pyResult;

  // Node.js Fallback
  if (!historicalPercentages || historicalPercentages.length < 2) {
    return {
      velocity: 'STABLE',
      slope: 0,
      projected30Day: Number(currentPercentage),
      currentPercentage: Number(currentPercentage)
    };
  }

  const n = historicalPercentages.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = Number(historicalPercentages[i]);
    sumX += x;
    sumY += y;
    sumXY += (x * y);
    sumXX += (x * x);
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  const projected = Math.min(100, Math.max(0, slope * (n + 4) + intercept));

  let velocity = 'STABLE';
  if (slope > 0.4) velocity = 'UPWARD';
  else if (slope < -0.4) velocity = 'DOWNWARD';

  return {
    velocity,
    slope: Math.round(slope * 10000) / 10000,
    projected30Day: Math.round(projected * 100) / 100,
    currentPercentage: Number(currentPercentage)
  };
}

/**
 * Multi-Factor Risk Score (Python with JS fallback)
 */
async function evaluateRiskScore(attendancePercentage = 80, gpa = 7.5, pendingAssignments = 0) {
  const pyResult = await postToMl('/api/ml/risk-score', { attendancePercentage, gpa, pendingAssignments });
  if (pyResult && pyResult.riskLevel) return pyResult;

  // Node.js Fallback
  const attRisk = Math.max(0, 75 - attendancePercentage) * 2.0;
  const gpaRisk = Math.max(0, 6.0 - gpa) * 15.0;
  const assignRisk = Math.min(pendingAssignments * 5.0, 20.0);

  const totalRisk = Math.min(100, Math.max(0, attRisk + gpaRisk + assignRisk));
  let level = 'LOW';
  if (totalRisk >= 60) level = 'CRITICAL';
  else if (totalRisk >= 40) level = 'HIGH';
  else if (totalRisk >= 20) level = 'MEDIUM';

  return {
    riskScore: Math.round(totalRisk * 10) / 10,
    riskLevel: level,
    academicHealthScore: Math.max(0, Math.min(100, Math.round(100 - totalRisk))),
    recommendation: level === 'LOW' ? 'Optimal Standing' : 'Academic Advisory Recommended'
  };
}

/**
 * What-If Policy Simulation (Python with JS fallback)
 */
async function runSimulation(cohort = [], params = {}) {
  // Support either (cohort, params) or ({ cohort, params })
  let actualCohort = Array.isArray(cohort) ? cohort : (cohort?.cohort && Array.isArray(cohort.cohort) ? cohort.cohort : []);
  let actualParams = (cohort && !Array.isArray(cohort) && !cohort.cohort) ? cohort : (params || {});

  const pyResult = await postToMl('/api/ml/simulate', { cohort: actualCohort, params: actualParams });
  if (pyResult && pyResult.totalCohortSize !== undefined) return pyResult;

  // Node.js Fallback
  const threshold = Number(actualParams.threshold || actualParams.condonationCutoff || 75);
  const holidayCount = Number(actualParams.holidayCount || 0);
  const remedialClasses = Number(actualParams.remedialClasses || 0);

  let prevShortage = 0;
  let simShortage = 0;
  const retainedStudents = [];

  actualCohort.forEach(st => {
    const origTot = Math.max(1, Number(st.totalClasses || 1));
    const origPres = Number(st.presentClasses || 0);
    const origPct = Math.round((origPres / origTot) * 10000) / 100;

    const simTot = Math.max(1, origTot - holidayCount + remedialClasses);
    const simPres = Math.max(0, origPres + remedialClasses);
    const simPct = Math.min(100, Math.max(0, Math.round((simPres / simTot) * 10000) / 100));

    const wasShort = origPct < 75;
    const isShort = simPct < threshold;

    if (wasShort) prevShortage++;
    if (isShort) simShortage++;
    if (wasShort && !isShort) {
      retainedStudents.push({
        name: st.name || 'Student',
        rollNo: st.rollNo || 'N/A',
        originalPct: origPct,
        simulatedPct: simPct
      });
    }
  });

  const netRetained = Math.max(0, prevShortage - simShortage);

  return {
    totalCohortSize: cohort.length,
    simulatedThreshold: threshold,
    holidayDeltasApplied: holidayCount,
    remedialClassesAdded: remedialClasses,
    previousShortageCount: prevShortage,
    simulatedShortageCount: simShortage,
    netStudentsRetained: netRetained,
    averageAttendanceShift: cohort.length > 0 ? (remedialClasses * 1.5) : 0,
    retainedStudents: retainedStudents.slice(0, 10),
    recommendation: netRetained > 0
      ? `Simulated parameters successfully qualify ${netRetained} student(s) for examinations.`
      : 'Simulated parameters preserve baseline attendance distributions.'
  };
}

/**
 * Multi-Variable Intervention Prioritization (Python with JS fallback)
 */
async function prioritizeInterventions(students = []) {
  const pyResult = await postToMl('/api/ml/prioritize-interventions', { students });
  if (pyResult && pyResult.rankedInterventions) return pyResult;

  // Node.js Fallback
  const ranked = (students || []).map(st => {
    const att = Number(st.attendancePct || st.percentage || 75);
    const cgpa = Number(st.cgpa || 7.0);
    const pending = Number(st.pendingAssignments || 0);

    const attDeficit = Math.max(0, 75 - att);
    const cgpaDeficit = Math.max(0, 6.0 - cgpa);
    const urgency = (attDeficit * 2.5) + (cgpaDeficit * 15.0) + (pending * 6.0);

    let tier = 'TIER_3_MONITOR';
    let action = 'Routine classroom monitoring and check-in.';
    if (urgency >= 45) {
      tier = 'TIER_1_CRITICAL';
      action = 'Immediate formal notice & parent-mentor conference required.';
    } else if (urgency >= 20) {
      tier = 'TIER_2_MODERATE';
      action = 'Schedule faculty doubt session & assignment recovery submission.';
    }

    return {
      studentId: st.studentId || '',
      name: st.name || 'Student',
      rollNo: st.rollNo || 'N/A',
      attendancePct: att,
      cgpa,
      urgencyScore: Math.round(urgency * 10) / 10,
      urgencyTier: tier,
      recommendedAction: action,
      draftNoticeText: `Academic Advisory: ${st.name || 'Student'} (Roll: ${st.rollNo || 'N/A'}) has an attendance of ${att}%. Attending upcoming consecutive classes is required to avoid exam shortage.`
    };
  });

  ranked.sort((a, b) => b.urgencyScore - a.urgencyScore);

  return {
    totalEvaluated: students.length,
    criticalCount: ranked.filter(s => s.urgencyTier === 'TIER_1_CRITICAL').length,
    rankedInterventions: ranked
  };
}

/**
 * Dynamic Syllabus Question & Quiz Generator (Offline Python ML / Local LLM / JS Fallback)
 */
async function generateQuiz(syllabusText = '', count = 5, sourceName = 'Course Syllabus') {
  const safeCount = Math.max(1, Math.min(25, Number(count) || 5));
  console.log(`[Quiz] Requesting ${safeCount} questions from syllabus text (${syllabusText.length} chars) via Python sidecar...`);
  const pyResult = await postToMl('/api/ml/generate-quiz', {
    syllabusText,
    numQuestions: safeCount,
    sourceName
  }, 90000);  // 90s — Ollama on CPU takes 30-60s

  if (pyResult && pyResult.quizText) {
    return pyResult;
  }

  // Node.js local fallback if Python is offline or PDF is scanned with no text
  if (!syllabusText || syllabusText.trim().length < 20) {
    return {
      engine: "NexusMind Notice",
      count: safeCount,
      quizText: `⚠️ **Could Not Extract Text from \`${sourceName}\`**\n\n` +
        `The uploaded PDF appears to be a **scanned image or photograph** with no selectable digital text layer.\n\n` +
        `**To generate questions from your exact syllabus:**\n` +
        `1. Please upload a PDF that has **selectable digital text** (where you can highlight text with your mouse), or\n` +
        `2. Copy and paste the unit topics directly into the chat (e.g. *"Unit 1: ..., Unit 2: ... give me 5 questions"*).`,
      source: sourceName
    };
  }
}

/**
 * Post-process Ollama response: detect raw JSON and convert to readable markdown
 */
function cleanOllamaResponse(text) {
  if (!text) return text;

  // Detect if the entire response is a JSON object or array
  const trimmed = text.trim();
  if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
    try {
      const parsed = JSON.parse(trimmed);
      // It's a single question object
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.question) {
        const q = parsed;
        const opts = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n');
        return `**Q1: ${q.question}**\n\n${opts}\n\n👉 **Answer:** ${q.answer || q.correct || ''}\n*${q.explanation || ''}*`;
      }
      // It's an array of questions
      if (Array.isArray(parsed)) {
        return parsed.map((q, idx) => {
          const opts = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n');
          return `**Q${idx + 1}: ${q.question || q.q || ''}**\n\n${opts}\n\n👉 **Answer:** ${q.answer || q.correct || ''}\n*${q.explanation || ''}*`;
        }).join('\n\n---\n\n');
      }
    } catch {
      // Not valid JSON, return as-is
    }
  }
  return text;
}

/**
 * Build comprehensive student portal records for local offline LLM (e.g. phi3)
 */
function buildFullStudentPortalContext(context) {
  if (!context || Object.keys(context).length === 0) return 'No student portal records available.';

  const info = context.studentInfo || {};
  const att = context.attendance || {};
  const marks = context.marks || [];
  const courses = context.courses || [];
  const pending = context.pendingAssignments || [];
  const completed = context.completedAssignments || [];
  const twin = context.personalDigitalTwin || {};

  const lines = [];

  // 1. Student Identity & Academic Profile
  lines.push('=== STUDENT PORTAL PROFILE ===');
  lines.push(`• Name: ${info.name || 'Student'}`);
  if (info.rollNo) lines.push(`• Roll Number: ${info.rollNo}`);
  if (info.registerNumber) lines.push(`• Register Number: ${info.registerNumber}`);
  if (info.studentId) lines.push(`• Student ID: ${info.studentId}`);
  lines.push(`• Program/Branch: ${info.program || info.branch || 'N/A'}`);
  lines.push(`• Current Semester: ${info.semester || 'N/A'}${info.section ? ' (Section ' + info.section + ')' : ''}`);
  lines.push(`• CGPA: ${info.cgpa || 'N/A'}`);
  if (info.email) lines.push(`• Email: ${info.email}`);
  if (info.phone) lines.push(`• Contact Phone: ${info.phone}`);
  if (info.bloodGroup) lines.push(`• Blood Group: ${info.bloodGroup}`);

  // 2. Attendance Statistics & Breakdown
  lines.push('\n=== ATTENDANCE RECORDS ===');
  lines.push(`• Overall Attendance: ${att.percentage || 0}% (${att.effectivePresent || 0}/${att.totalClasses || 0} classes attended) — ${att.status || 'N/A'}`);
  lines.push(`• Safe to Miss: ${att.safeToMiss || 0} class(es) while staying above 75%`);
  lines.push(`• Classes needed to reach 75%: ${att.neededTo75 || 0} consecutive class(es)`);
  if (att.subjectWiseStats && att.subjectWiseStats.length > 0) {
    const subjStr = att.subjectWiseStats
      .map(s => `${s.subject}: ${s.percentage}% (${s.present + (s.onDuty || 0)}/${s.total} attended, ${s.status})`)
      .join(' | ');
    lines.push(`• Subject-Wise Attendance: ${subjStr}`);
  }

  // 3. Enrolled Courses & Assigned Faculty
  if (courses.length > 0) {
    lines.push('\n=== ENROLLED COURSES ===');
    courses.forEach((c, idx) => {
      lines.push(`• Course ${idx + 1}: ${c.name} (${c.code}) — Credits: ${c.credits || 3}, Faculty: ${c.faculty || 'Assigned Faculty'}`);
    });
  }

  // 4. Academic Marks & Exam Grades
  if (marks.length > 0) {
    lines.push('\n=== MARKS & GRADES ===');
    marks.forEach(m => {
      lines.push(`• ${m.courseName} (${m.courseCode}): Total ${m.total}/100 [Grade: ${m.grade}] (Semester Exam: ${m.semesterExam}/60, Internal/Assignment: ${m.assignmentScore}/20, Practical: ${m.practicalScore}/20)`);
    });
  } else {
    lines.push('\n=== MARKS & GRADES ===\n• Marks: No published marks recorded yet.');
  }

  // 5. Assignments (Pending & Completed)
  lines.push('\n=== ASSIGNMENTS & COURSEWORK ===');
  if (pending.length > 0) {
    lines.push(`• Pending Assignments (${pending.length}): ` + pending.map(p => `"${p.title}" for ${p.courseName} (Due: ${p.dueDate}, Faculty: ${p.faculty || 'Faculty'})`).join('; '));
  } else {
    lines.push('• Pending Assignments: None (All completed/up to date!)');
  }
  if (completed.length > 0) {
    lines.push(`• Completed Submissions (${completed.length}): ` + completed.slice(0, 5).map(c => `"${c.title}" for ${c.courseName}`).join('; '));
  }

  // 6. Digital Twin, Trajectory & Improvement Advice
  if (twin.velocityTrajectory) {
    lines.push('\n=== ACADEMIC VELOCITY & DIGITAL TWIN ===');
    lines.push(`• Attendance Velocity: ${twin.velocityTrajectory} | 30-Day Projection: ${twin.projected30DayAttendance}% | Academic Risk Level: ${twin.riskLevel}`);
    if (twin.recommendedImprovements && twin.recommendedImprovements.length > 0) {
      lines.push(`• Suggested Improvements: ${twin.recommendedImprovements.slice(0, 3).join(' | ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Query Local Offline LLM (e.g. Ollama http://127.0.0.1:11434) Grounded in Real-Time ERP Records
 * @param {string} prompt - The student's question
 * @param {object} context - Real-time ERP data (attendance, marks, etc.)
 * @param {string} attachedFileText - Full text content of any uploaded file (syllabus, notes, etc.)
 * @param {string} attachedFileName - Original filename of the uploaded file
 */
async function queryOfflineLlm(prompt, context = {}, attachedFileText = '', attachedFileName = '') {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
  const ollamaModel = process.env.OLLAMA_MODEL || 'phi3';

  const isQuizRequest = /quize?s?|mcqs?|questions?|practice|test me|test my|problems?|exam/i.test(prompt);
  const portalContext = buildFullStudentPortalContext(context);

  let systemPrompt;
  let mode;

  console.log(`[Ollama] File text: ${attachedFileText.length} chars | isQuiz: ${isQuizRequest} | prompt: "${prompt.substring(0, 50)}"`);

  // Parse requested question count (e.g., "5 quize", "10 questions")
  const countMatch = prompt.match(/(\d+)\s*(?:questions?|mcqs?|quize?s?)/i) || prompt.match(/(?:give|generate|create|ask|test)\s*(?:me|my)?\s*(\d+)/i);
  const count = countMatch ? Math.min(20, Math.max(1, parseInt(countMatch[1], 10))) : 5;

  if (attachedFileText && attachedFileText.trim().length > 20 && isQuizRequest) {
    mode = 'QUIZ_FROM_DOCUMENT';
    // === MODE 1: Quiz from uploaded syllabus document ===
    systemPrompt =
      `You are an expert professor and academic quiz creator.
The student uploaded their course syllabus document ("${attachedFileName || 'Syllabus'}") and asked: "${prompt}".
Generate exactly ${count} high-quality multiple-choice questions (MCQs) covering the different units and topics found in the syllabus document below.
Make sure the questions cover distinct units (e.g. Unit 1, Unit 2, Unit 3, etc.) as requested.

SYLLABUS DOCUMENT CONTENT:
--- START ---
${attachedFileText.substring(0, 6000)}
--- END ---

FORMAT each question clearly as:
Q1: [Question text - mention Unit if applicable]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct Letter]
Explanation: [Concise concept explanation]

Generate the ${count} questions now (plain text, NO JSON):`;

  } else if (isQuizRequest) {
    mode = 'QUIZ_FROM_COURSES';
    // === MODE 2: Quiz request — no document attached or document text is empty ===
    // Use the student's actual enrolled course names from their ERP profile.
    const courseNames = (context.courses || []).map(c => c.name).filter(Boolean);
    const courseList = courseNames.length > 0
      ? courseNames.join(', ')
      : 'the student\'s enrolled courses';
    systemPrompt =
      `You are an expert academic tutor and quiz creator for a college student.
The student asked: "${prompt}".

They have NOT uploaded a syllabus document, so generate questions based on their enrolled courses:
${courseList}

Generate exactly ${count} multiple-choice practice questions (MCQs) covering core topics of the above courses.
CRITICAL: Do NOT say "no quizzes recorded". You MUST CREATE and GENERATE the quiz questions now.

Student's ERP Portal Context:
${portalContext}

FORMAT each question clearly as:
Q[N]: [Question text — specify the subject/unit]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct Letter]
Explanation: [Concise concept explanation]

Generate the ${count} questions now (plain text, NO JSON):`;


  } else if (attachedFileText && attachedFileText.trim().length > 20) {
    mode = 'DOCUMENT_PLUS_PORTAL';
    // === MODE 3: Question with attached document AND access to student portal records ===
    systemPrompt =
      `You are Student AI, an academic assistant for a college ERP system.
Answer the student's question using their live Student Portal Records and the uploaded document below.
Be direct, helpful, and concise. Do NOT output JSON.

${portalContext}

ATTACHED DOCUMENT: "${attachedFileName || 'Uploaded File'}"
--- START ---
${attachedFileText.substring(0, 4000)}
--- END ---

Student question: ${prompt}

Answer (plain text):`;

  } else {
    mode = 'PORTAL_RECORDS';
    // === MODE 4: Comprehensive student portal inquiry ===
    systemPrompt =
      `You are Student AI, the personal academic assistant for the student logged into this college ERP system.
Answer the student's question accurately using their live portal records below.
If asked about attendance, marks, courses, faculty, assignments, roll number, CGPA, or recommendations, extract the exact values from their records.
Be friendly, professional, and concise. Do NOT output JSON.

${portalContext}

Student question: ${prompt}

Answer:`;
  }

  console.log(`[Ollama] Using mode: ${mode}`);

  try {
    const res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: systemPrompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 800 }
      }),
      signal: AbortSignal.timeout(90000)  // 90s for CPU-based phi3
    });

    if (res.ok) {
      const data = await res.json();
      let text = data.response?.trim();
      if (text && text.length > 2) {
        text = cleanOllamaResponse(text);  // Fix any JSON output
        return {
          reply: text,
          model: `Local Offline LLM (${ollamaModel})`
        };
      }
    }
  } catch (err) {
    // Offline LLM not running or timed out
  }
  return null;
}

/**
 * Build comprehensive Admin portal context for local offline LLM
 */
function buildFullAdminPortalContext(context) {
  if (!context || Object.keys(context).length === 0) return 'No administrative portal records available.';

  const overview = context.institutionOverview || {};
  const depts = context.departments || [];
  const faculty = context.facultyRoster || [];
  const students = context.studentRoster || [];
  const courses = context.courses || [];
  const assignments = context.assignments || [];
  const twin = context.nexusMindIntelligence || {};

  const lines = [];

  // 1. Institution Overview
  lines.push('=== INSTITUTION OVERVIEW ===');
  lines.push(`• Total Students: ${overview.totalStudents || students.length} | Total Faculty: ${overview.totalFaculty || faculty.length}`);
  lines.push(`• Departments: ${overview.totalDepartments || depts.length} | Courses: ${overview.totalCourses || courses.length} | Assignments: ${overview.totalAssignments || assignments.length}`);
  lines.push(`• Campus-Wide Student Attendance: ${overview.overallStudentAttendancePercentage || 0}%`);
  lines.push(`• Students Facing Attendance Shortage (<75%): ${overview.studentsWithAttendanceShortageCount || 0}`);

  // 2. Departments
  if (depts.length > 0) {
    lines.push('\n=== DEPARTMENTS ===');
    depts.forEach(d => {
      lines.push(`• ${d.name} (${d.code}) — HOD: ${d.hod || 'N/A'}, Students: ${d.studentCount || 0}, Faculty: ${d.facultyCount || 0}, Courses: ${d.coursesCount || 0}`);
    });
  }

  // 3. Faculty Highlights
  if (faculty.length > 0) {
    lines.push('\n=== FACULTY DIRECTORY ===');
    faculty.slice(0, 15).forEach(f => {
      lines.push(`• ${f.name} (ID: ${f.facultyId || f.employeeId || 'N/A'}) — Dept: ${f.department || 'General'}, Desig: ${f.designation || 'Faculty'}, Phone: ${f.phone || 'N/A'}, Email: ${f.email || 'N/A'}`);
    });
    if (faculty.length > 15) lines.push(`• ...and ${faculty.length - 15} more faculty members.`);
  }

  // 4. Students Facing Attendance Shortage
  const shortageStudents = (overview.studentsWithAttendanceShortage || []).slice(0, 10);
  if (shortageStudents.length > 0) {
    lines.push('\n=== STUDENTS AT RISK (ATTENDANCE SHORTAGE) ===');
    shortageStudents.forEach(s => {
      lines.push(`• ${s.name} (Roll: ${s.rollNo || 'N/A'}, Dept: ${s.department || 'N/A'}): ${s.percentage}% Attendance`);
    });
  }

  // 5. Assignments Overview
  if (assignments.length > 0) {
    lines.push('\n=== ACADEMIC ASSIGNMENTS ===');
    assignments.slice(0, 8).forEach(a => {
      lines.push(`• "${a.title}" (${a.courseName}) — Due: ${a.dueDate}, Submitted: ${a.submittedCount}/${a.totalEligible || 'N/A'}, Pending: ${a.pendingCount}`);
    });
  }

  // 6. Institutional Velocity & Digital Twin
  if (twin.institutionalVelocity) {
    lines.push('\n=== INSTITUTIONAL DIGITAL TWIN & PREDICTIONS ===');
    lines.push(`• Campus Velocity: ${twin.institutionalVelocity} | 30-Day Attendance Projection: ${twin.projected30DayAttendance}%`);
    lines.push(`• Anomaly Status: ${twin.anomalyStatus || 'NOMINAL'}`);
    if (twin.recommendedPolicyActions && twin.recommendedPolicyActions.length > 0) {
      lines.push(`• Strategic Recommendations: ${twin.recommendedPolicyActions.join(' | ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Query Local Offline LLM for Super Admin AI grounded in institution records
 */
async function queryAdminOfflineLlm(prompt, context = {}, attachedFileText = '', attachedFileName = '') {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
  const ollamaModel = process.env.OLLAMA_MODEL || 'phi3';
  const adminContext = buildFullAdminPortalContext(context);

  let systemPrompt;
  if (attachedFileText) {
    systemPrompt =
      `You are Super Admin AI, the administrative intelligence assistant for a college ERP system.
Answer the administrator's question using the live Institutional ERP Records and the attached document below.
Be concise, factual, and professional. Do NOT output JSON.

${adminContext}

ATTACHED DOCUMENT: "${attachedFileName || 'Uploaded File'}"
--- START ---
${attachedFileText.substring(0, 4000)}
--- END ---

Admin question: ${prompt}

Answer (plain text):`;
  } else {
    systemPrompt =
      `You are Super Admin AI, the administrative executive assistant for a college ERP system.
Answer the administrator's question accurately using their live campus database records below.
If asked about students, faculty, departments, overall attendance, shortages, or policy advice, extract the exact data from the records.
Be direct, professional, and concise. Do NOT output JSON.

${adminContext}

Admin question: ${prompt}

Answer:`;
  }

  try {
    const res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: systemPrompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 800 }
      }),
      signal: AbortSignal.timeout(90000)
    });

    if (res.ok) {
      const data = await res.json();
      let text = data.response?.trim();
      if (text && text.length > 2) {
        text = cleanOllamaResponse(text);
        return {
          reply: text,
          model: `Local Offline LLM (${ollamaModel})`
        };
      }
    }
  } catch (err) {
    // Offline LLM timed out or not running
  }
  return null;
}

/**
 * Build comprehensive Faculty portal context for local offline LLM
 */
function buildFullFacultyPortalContext(context) {
  if (!context || Object.keys(context).length === 0) return 'No faculty portal records available.';

  const info = context.facultyInfo || {};
  const courses = context.coursesTaught || [];
  const students = context.studentRoster || [];
  const assignments = context.assignments || [];
  const subjAtt = context.subjectAttendanceSummary || [];
  const twin = context.nexusMindIntelligence || {};
  const personalAtt = context.facultyPersonalAttendance || {};

  const lines = [];

  // 1. Faculty Profile
  lines.push('=== FACULTY PROFILE ===');
  lines.push(`• Name: ${info.name || 'Faculty Member'} (Faculty ID: ${info.facultyId || info.employeeId || 'N/A'})`);
  lines.push(`• Department: ${info.department || 'General'} | Designation: ${info.designation || 'Faculty'}`);
  if (info.email) lines.push(`• Email: ${info.email}`);
  if (info.phone) lines.push(`• Contact Phone: ${info.phone}`);
  lines.push(`• Total Students Taught: ${context.totalStudentsUnderFaculty || students.length}`);

  // 2. Courses Taught
  if (courses.length > 0) {
    lines.push('\n=== ASSIGNED COURSES ===');
    courses.forEach(c => {
      lines.push(`• ${c.name} (${c.code}) — Semester ${c.semester || 'All'}, Section ${c.section || 'All'}, Credits: ${c.credits || 3}, Enrolled: ${c.enrolledStudentsCount || 0} students`);
    });
  }

  // 3. Class Attendance by Subject
  if (subjAtt.length > 0) {
    lines.push('\n=== SUBJECT ATTENDANCE RATES ===');
    subjAtt.forEach(s => {
      lines.push(`• ${s.subject}: Overall ${s.overallPercentage}% (Classes: ${s.totalClasses}, Students Safe: ${s.studentsAbove75 || 0}, At Shortage: ${s.studentsBelow75 || 0})`);
    });
  }

  // 4. Assignments & Submissions
  if (assignments.length > 0) {
    lines.push('\n=== ASSIGNMENTS CREATED ===');
    assignments.slice(0, 8).forEach(a => {
      lines.push(`• "${a.title}" (${a.courseName}) — Due: ${a.dueDate}, Submitted: ${a.submittedCount}, Pending: ${a.pendingCount}`);
    });
  }

  // 5. At-Risk Students under Faculty
  const atRisk = (twin.atRiskStudents || students.filter(s => s.attendance?.percentage < 75)).slice(0, 10);
  if (atRisk.length > 0) {
    lines.push('\n=== AT-RISK STUDENTS (<75% ATTENDANCE / LOW MARKS) ===');
    atRisk.forEach(s => {
      lines.push(`• ${s.name} (Roll: ${s.rollNo || 'N/A'}): ${s.attendance?.percentage || s.percentage || 0}% Attendance, CGPA: ${s.cgpa || 'N/A'}`);
    });
  }

  // 6. Faculty Personal Attendance & Class Velocity
  if (personalAtt.totalClasses > 0) {
    lines.push('\n=== FACULTY TEACHING SESSIONS ===');
    lines.push(`• Classes Conducted: ${personalAtt.presentClasses || 0}/${personalAtt.totalClasses || 0} (${personalAtt.overallPercentage}%) — Status: ${personalAtt.status}`);
  }

  if (twin.classVelocity) {
    lines.push('\n=== CLASS INTELLIGENCE & DIGITAL TWIN ===');
    lines.push(`• Class Velocity: ${twin.classVelocity} | Predicted Pass Rate: ${twin.passRate || 0}%`);
    if (twin.recommendedInterventions && twin.recommendedInterventions.length > 0) {
      lines.push(`• Actionable Teaching Recommendations: ${twin.recommendedInterventions.join(' | ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Query Local Offline LLM for Faculty AI grounded in class and course records
 */
async function queryFacultyOfflineLlm(prompt, context = {}, attachedFileText = '', attachedFileName = '') {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
  const ollamaModel = process.env.OLLAMA_MODEL || 'phi3';
  const facultyContext = buildFullFacultyPortalContext(context);

  let systemPrompt;
  if (attachedFileText) {
    systemPrompt =
      `You are Faculty AI, the academic teaching assistant for a faculty member in a college ERP system.
Answer the instructor's question using their class ERP records and the attached file below.
Be concise, direct, and helpful. Do NOT output JSON.

${facultyContext}

ATTACHED DOCUMENT: "${attachedFileName || 'Uploaded File'}"
--- START ---
${attachedFileText.substring(0, 4000)}
--- END ---

Faculty question: ${prompt}

Answer (plain text):`;
  } else {
    systemPrompt =
      `You are Faculty AI, the teaching and course assistant for the instructor logged into this ERP system.
Answer the instructor's question accurately using their live class records below.
If asked about courses taught, student attendance, assignment submissions, marks, or at-risk students, extract the exact data from the records.
Be professional, concise, and helpful. Do NOT output JSON.

${facultyContext}

Faculty question: ${prompt}

Answer:`;
  }

  try {
    const res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: systemPrompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 800 }
      }),
      signal: AbortSignal.timeout(90000)
    });

    if (res.ok) {
      const data = await res.json();
      let text = data.response?.trim();
      if (text && text.length > 2) {
        text = cleanOllamaResponse(text);
        return {
          reply: text,
          model: `Local Offline LLM (${ollamaModel})`
        };
      }
    }
  } catch (err) {
    // Offline LLM timed out or not running
  }
  return null;
}

/**
 * Extract text from a scanned/image-based PDF via Python ML OCR service
 * @param {Buffer} pdfBuffer - The raw PDF buffer
 * @returns {string} Extracted text or empty string
 */
async function extractPdfTextOcr(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.length === 0) return '';
  try {
    const pdfBase64 = pdfBuffer.toString('base64');
    const result = await postToMl('/api/ml/ocr-pdf', { pdfBase64 }, 30000);  // 30s for OCR
    if (result && result.text && result.chars > 20) {
      console.log(`[OCR] Extracted ${result.chars} chars via ${result.method} from ${result.pages} pages`);
      return result.text;
    }
  } catch (err) {
    console.log('[OCR] Python ML OCR call failed:', err.message);
  }
  return '';
}

module.exports = {
  detectAnomalies,
  calculateForecast,
  evaluateRiskScore,
  runSimulation,
  prioritizeInterventions,
  generateQuiz,
  queryOfflineLlm,
  queryAdminOfflineLlm,
  queryFacultyOfflineLlm,
  extractPdfTextOcr
};

