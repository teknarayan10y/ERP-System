// src/features/faculty/FacultyMarksEntry.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../auth/api';
import './FacultyMarksEntry.css';

function getCourseId(c) {
  return (c && (c._id || c.id || c.courseId || (c.course && c.course._id))) || '';
}

function displayName(p) {
  const u = p?.user || {};
  const prof = p?.profile || {};
  const first = prof.firstName || u.firstName || '';
  const last  = prof.lastName  || u.lastName  || '';
  const idLike = prof.registerNumber || prof.rollNo || '';
  return (first + ' ' + last).trim() || idLike || u.email || 'Unknown';
}

function getGradeClassName(grade) {
  switch(grade) {
    case 'A+': return 'grade-aplus';
    case 'B+': return 'grade-bplus';
    default: return `grade-${grade.toLowerCase()}`;
  }
}

function validateMarksData(marksBySubject, selectedCourse) {
  if (!selectedCourse) {
    return { valid: false, message: 'Please select a course first' };
  }
  
  let hasMarks = false;
  Object.values(marksBySubject).forEach(subjectMarks => {
    Object.values(subjectMarks).forEach(mark => {
      if (mark && mark > 0) {
        hasMarks = true;
      }
    });
  });
  
  if (!hasMarks) {
    return { valid: false, message: 'Please enter at least one mark before saving' };
  }
  
  return { valid: true };
}

export default function FacultyMarksEntry() {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('All Subjects');
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingMarks, setExistingMarks] = useState({});

  // 👉 Subject-wise marks state (independent per subject)
  const [marksBySubject, setMarksBySubject] = useState({
    'Semester Exam': {},
    'Assignment': {},
    'Practical': {}
  });

  // Mark distribution configuration
  const markDistribution = {
    'Semester Exam': { weight: 60, maxMarks: 60, color: '#007bff' },
    'Assignment': { weight: 20, maxMarks: 20, color: '#28a745' },
    'Practical': { weight: 20, maxMarks: 20, color: '#ffc107' }
  };

  // Available exam types for tabs
  const examTypes = ['All Subjects', 'Semester Exam', 'Assignment', 'Practical'];

  // Helper function for making requests (same as in api.js)
  async function request(url, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // Clear all marks permanently from database
  async function clearAllMarks() {
    if (!selectedCourse) {
      setError('Please select a course first');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL marks (Semester Exam, Assignment, and Practical) for this course. This action cannot be undone!\n\nAre you sure you want to continue?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setSaving(true);
      
      console.log('Deleting all marks for course:', selectedCourse);
      
      // Get all students first
      const studentsData = await api.facultyCourseStudents(selectedCourse);
      const students = Array.isArray(studentsData?.items) ? studentsData.items : (studentsData?.students || []);
      
      let deletedCount = 0;
      let errorCount = 0;
      
      // Delete marks for each student using existing API
      for (const student of students) {
        const studentId = student?._id || student?.userId || student?.user?._id || student?.user?.id || student?.studentId;
        
        if (studentId && studentId !== `temp-0` && !studentId.startsWith('temp-')) {
          try {
            // Use the existing delete API for each student
            await request(`/faculty/marks/${encodeURIComponent(selectedCourse)}/${encodeURIComponent(studentId)}`, { method: 'DELETE' });
            deletedCount++;
            console.log(`Deleted marks for student: ${studentId}`);
          } catch (err) {
            errorCount++;
            console.log(`Failed to delete marks for student ${studentId}:`, err);
          }
        }
      }
      
      console.log(`Delete all summary: ${deletedCount} deleted, ${errorCount} errors`);
      
      if (deletedCount > 0) {
        setSuccess(`Successfully deleted ${deletedCount} student marks from the database!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      } else {
        setError('No marks found to delete');
      }
      
      // Clear all local state
      setMarksBySubject({
        'Semester Exam': {},
        'Assignment': {},
        'Practical': {}
      });
      setExistingMarks({});
      setSelectedExamType('All Subjects');
      
      // Reload to show empty state
      await loadExistingMarks();
      
    } catch (err) {
      console.error('Delete all marks error:', err);
      setError('Failed to delete marks from database');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadStudents();
      loadExistingMarks();
    }
  }, [selectedCourse]);

  // Scroll detection effect
  useEffect(() => {
    const tableWrapper = document.querySelector('.table-wrapper');
    if (!tableWrapper) return;

    const handleScroll = () => {
      const maxScroll = tableWrapper.scrollWidth - tableWrapper.clientWidth;
      const isScrollable = maxScroll > 0;
      const isAtEnd = tableWrapper.scrollLeft >= maxScroll - 5;
      
      // Add/remove scrollable class
      if (isScrollable && !isAtEnd) {
        tableWrapper.classList.add('scrollable');
      } else {
        tableWrapper.classList.remove('scrollable');
      }
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    tableWrapper.addEventListener('scroll', handleScroll);
    
    // Handle window resize
    const handleResize = () => {
      handleScroll();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      tableWrapper.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [students]);

  async function loadCourses() {
    try {
      const crs = await api.facultyCourses();
      console.log('Raw API response:', crs);
      
      const all = crs?.courses || crs?.items || [];
      console.log('Final courses array:', all);
      
      setCourses(all);
      if (all.length && !selectedCourse) {
        const firstId = getCourseId(all[0]);
        if (firstId) setSelectedCourse(firstId);
      }
    } catch (err) {
      console.error('Load courses error:', err);
      setError('Failed to load courses');
    }
  }

  async function loadStudents() {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const r = await api.facultyCourseStudents(selectedCourse);
      console.log('Raw student data from API:', r);
      const students = Array.isArray(r?.items) ? r.items : (r?.students || []);
      console.log('Processed students array:', students);
      setStudents(students);
    } catch (err) {
      console.error('Failed to load students:', err);
      setError('Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingMarks() {
    if (!selectedCourse) return;
    try {
      const r = await api.facultyMarksGet(selectedCourse);
      console.log('Loaded existing marks:', r);
      const loadedMarks = r?.marks || {};
      setExistingMarks(loadedMarks);
      
      // hydrate subject-wise state
      const next = { 'Semester Exam': {}, 'Assignment': {}, 'Practical': {} };
      Object.entries(loadedMarks).forEach(([studentId, row]) => {
        if (row?.semesterExam != null) next['Semester Exam'][studentId] = row.semesterExam;
        if (row?.assignment != null) next['Assignment'][studentId] = row.assignment;
        if (row?.practical != null) next['Practical'][studentId] = row.practical;
      });
      setMarksBySubject(next);
      
    } catch (err) {
      console.error('Failed to load existing marks:', err);
      if (err?.status === 404) {
        console.log('No existing marks found for this course');
        setExistingMarks({});
        setMarksBySubject({
          'Semester Exam': {},
          'Assignment': {},
          'Practical': {}
        });
      } else if (err?.status === 403) {
        console.log('Not authorized to view marks for this course');
        setExistingMarks({});
        setMarksBySubject({
          'Semester Exam': {},
          'Assignment': {},
          'Practical': {}
        });
      } else {
        console.error('Unexpected error loading marks:', err);
        setExistingMarks({});
        setMarksBySubject({
          'Semester Exam': {},
          'Assignment': {},
          'Practical': {}
        });
      }
    }
  }

  function handleMarkChange(studentId, examType, value) {
    const max = markDistribution[examType].maxMarks;
    const num = Math.max(0, Math.min(max, Number(value) || 0));
    setMarksBySubject(prev => ({
      ...prev,
      [examType]: {
        ...prev[examType],
        [studentId]: num
      }
    }));
  }

  function getValue(studentId, examType) {
    return marksBySubject[examType]?.[studentId] ?? '';
  }

  function calculateTotal(studentId) {
    if (selectedExamType === 'All Subjects') {
      return (
        (marksBySubject['Semester Exam']?.[studentId] || 0) +
        (marksBySubject['Assignment']?.[studentId] || 0) +
        (marksBySubject['Practical']?.[studentId] || 0)
      );
    } else {
      // For specific subjects, show only that subject's marks
      return marksBySubject[selectedExamType]?.[studentId] || 0;
    }
  }

  function calculateGrade(total) {
    if (total >= 95) return 'O';      // Outstanding - 95-100
    if (total >= 90) return 'A+';     // A+ - 90-94
    if (total >= 80) return 'A';      // A - 80-89
    if (total >= 70) return 'B+';     // B+ - 70-79
    if (total >= 60) return 'B';      // B - 60-69
    if (total >= 50) return 'C';      // C - 50-59
    return 'F';                       // Fail - Below 50
  }

  async function saveMarks() {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const validation = validateMarksData(marksBySubject, selectedCourse);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      // Filter out invalid student IDs
      const validStudents = students.filter((student, idx) => {
        const studentId = student?._id || student?.userId || student?.user?._id || student?.user?.id || student?.studentId || `temp-${idx}`;
        return studentId && 
               studentId !== `temp-0` && 
               !studentId.startsWith('temp-') &&
               typeof studentId === 'string' && 
               studentId.length === 24 && 
               /^[0-9a-fA-F]{24}$/.test(studentId);
      });

      if (validStudents.length === 0) {
        setError('No valid students found to save marks');
        return;
      }

      const payload = {
        courseId: selectedCourse,
        marks: validStudents.map(student => {
          const studentId = student?._id || student?.userId || student?.user?._id || student?.user?.id || student?.studentId;
          const total = (marksBySubject['Semester Exam']?.[studentId] || 0) + 
                       (marksBySubject['Assignment']?.[studentId] || 0) + 
                       (marksBySubject['Practical']?.[studentId] || 0);
          return {
            studentId,
            semesterExam: marksBySubject['Semester Exam']?.[studentId] || 0,
            assignment: marksBySubject['Assignment']?.[studentId] || 0,
            practical: marksBySubject['Practical']?.[studentId] || 0,
            total: total,
            grade: calculateGrade(total)
          };
        })
      };

      console.log('=== SAVE PAYLOAD DEBUG ===');
      console.log('Valid students:', validStudents.length);
      console.log('Payload:', payload);
      console.log('========================');
      
      const result = await api.facultyMarksSave(payload);
      console.log('Save result:', result);
      
      setSuccess(`Successfully saved ${validStudents.length} student marks!`);
      
      await loadExistingMarks();
      await loadStudents();
      
    } catch (err) {
      console.error('Save marks error:', err);
      
      if (err?.status === 500) {
        if (err?.failed && Array.isArray(err.failed)) {
          const failedDetails = err.failed.map(f => 
            `Student ${f.studentId}: ${f.error}`
          ).join(', ');
          setError(`Save failed: ${failedDetails}`);
        } else {
          setError('Server error occurred while saving marks.');
        }
      } else if (err?.status === 404) {
        setError('Course not found. Please select a valid course.');
      } else if (err?.status === 403) {
        if (err?.debug) {
          setError(`Unauthorized: Faculty ID mismatch. (Your ID: ${err.debug.facultyId})`);
        } else {
          setError('You are not authorized to save marks for this course.');
        }
      } else if (err?.status === 400) {
        setError('Invalid marks data. Please check your entries and try again.');
      } else {
        setError(err?.message || 'Failed to save marks');
      }
    } finally {
      setSaving(false);
    }
  }

  const courseName = useMemo(() => {
    const course = courses.find(c => getCourseId(c) === selectedCourse);
    return course?.name || 'Select Course';
  }, [courses, selectedCourse]);

  const selectedCourseData = useMemo(() => {
    const course = courses.find(c => getCourseId(c) === selectedCourse);
    return course || {};
  }, [courses, selectedCourse]);

  // Get subject-wise statistics
  const subjectStats = useMemo(() => {
    if (!selectedCourse || !students.length) return {};
    
    const stats = {};
    examTypes.filter(type => type !== 'All Subjects').forEach(examType => {
      let totalStudents = 0;
      let totalMarks = 0;
      let completedStudents = 0;
      
      students.forEach(student => {
        const studentId = student?._id || student?.userId || student?.user?._id || student?.user?.id || student?.studentId;
        
        // Count all valid students
        if (studentId && typeof studentId === 'string' && studentId.length === 24 && /^[0-9a-fA-F]{24}$/.test(studentId)) {
          totalStudents++;
          
          const studentMark = marksBySubject[examType]?.[studentId];
          if (studentMark !== undefined && studentMark > 0) {
            totalMarks += studentMark;
            completedStudents++;
          }
        }
      });
      
      stats[examType] = {
        totalStudents,
        completedStudents,
        averageMarks: totalStudents > 0 ? (totalMarks / totalStudents).toFixed(1) : 0,
        completionRate: totalStudents > 0 ? ((completedStudents / totalStudents) * 100).toFixed(1) : 0
      };
    });
    
    return stats;
  }, [students, marksBySubject, selectedCourse]);

  // Helper function to show columns based on selected exam type
  const show = (examType) => selectedExamType === 'All Subjects' || selectedExamType === examType;

  return (
    <div className="faculty">
      <div className="card wide">
        <div className="marks-header">
          <div>
            <h2>Subject-Wise Marks Entry</h2>
            {selectedCourse && (
              <p className="header-subject">Subject: {courseName}</p>
            )}
          </div>
          <div className="marks-actions">
            <button
              className="btn btn-danger"
              onClick={clearAllMarks}
              disabled={!selectedCourse || saving}
            >
              {saving ? 'Deleting…' : '🗑️ Delete All Marks'}
            </button>
            <button
              className="btn btn-primary"
              onClick={saveMarks}
              disabled={saving || !selectedCourse}
            >
              {saving ? 'Saving…' : 'Save All Marks'}
            </button>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <div className="marks-controls">
          <div className="control-group">
            <label className="fd-label">Course</label>
            <select
              className="fd-input"
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
            >
              <option value="">Select course</option>
              {courses.map(c => {
                const cid = getCourseId(c);
                return <option key={cid} value={cid}>{c.name || cid}</option>;
              })}
            </select>
          </div>

          <div className="control-group">
            <label className="fd-label">Subject Filter</label>
            <div className="subject-tabs">
              {examTypes.map(examType => (
                <button
                  key={examType}
                  className={`subject-tab ${selectedExamType === examType ? 'active' : ''}`}
                  onClick={() => setSelectedExamType(examType)}
                  style={selectedExamType === examType ? { 
                    backgroundColor: markDistribution[examType]?.color || '#007bff' 
                  } : {}}
                >
                  {examType}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group full-width">
            <label className="fd-label">Subject Progress Dashboard</label>
            <div className="subject-stats">
              {Object.entries(subjectStats).map(([examType, stats]) => (
                <div key={examType} className="stat-item" style={{ 
                  borderLeft: `4px solid ${markDistribution[examType]?.color || '#007bff'}` 
                }}>
                  <div className="stat-header">
                    <span className="stat-label">{examType}</span>
                    <span className="stat-badge" style={{ 
                      backgroundColor: markDistribution[examType]?.color || '#007bff' 
                    }}>
                      {stats.completionRate}%
                    </span>
                  </div>
                  <div className="stat-details">
                    <div className="stat-row">
                      <span className="stat-label-small">Completed:</span>
                      <span className="stat-number">{stats.completedStudents}/{stats.totalStudents}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-small">Average:</span>
                      <span className="stat-number">{stats.averageMarks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="control-group full-width">
            <label className="fd-label">Mark Distribution</label>
            <div className="distribution-info">
              {Object.entries(markDistribution).map(([type, config]) => (
                <span key={type} className="dist-item" style={{ 
                  borderColor: config.color 
                }}>
                  {type}: {config.weight}% (Max: {config.maxMarks})
                </span>
              ))}
            </div>
          </div>
        </div>

        {selectedCourse && (
          <div className="marks-section">
            <div className="section-header">
              <h3>
                {selectedExamType === 'All Subjects' ? 'All Subjects' : selectedExamType} - {courseName}
              </h3>
              <div className="student-count">
                Showing {students.length} students
              </div>
            </div>
            
            {/* Debug Information */}
            {selectedExamType && selectedExamType !== 'All Subjects' && (
              <div className="debug-info" style={{ 
                background: '#f0f0f0', 
                padding: '10px', 
                margin: '10px 0', 
                borderRadius: '5px',
                fontSize: '12px'
              }}>
                <strong>Subject View:</strong><br/>
                Selected Subject: {selectedExamType}<br/>
                Total Students: {students.length}<br/>
                Showing: All students with {selectedExamType.toLowerCase()} column only
              </div>
            )}
            
            {loading ? (
              <div className="loading">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="empty-hint">
                No students found in this course
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="marks-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Reg/Roll No</th>
                      {show('Semester Exam') && <th>Semester Exam<br/>(60)</th>}
                      {show('Assignment') && <th>Assignment<br/>(20)</th>}
                      {show('Practical') && <th>Practical<br/>(20)</th>}
                      <th>Total<br/>({selectedExamType === 'All Subjects' ? '100' : markDistribution[selectedExamType]?.maxMarks || '100'})</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => {
                      const studentId = student?._id || student?.userId || student?.user?._id || student?.user?.id || student?.studentId || `temp-${idx}`;
                      const total = calculateTotal(studentId);
                      const grade = calculateGrade(total);
                      const prof = student?.profile || {};
                      const regNo = prof.registerNumber || prof.rollNo || '-';
                      
                      return (
                        <tr key={studentId}>
                          <td className="student-name">{displayName(student)}</td>
                          <td className="reg-no">{regNo}</td>
                          {show('Semester Exam') && (
                            <td>
                              <input
                                type="number"
                                className="mark-input"
                                min="0"
                                max="60"
                                value={getValue(studentId, 'Semester Exam')}
                                onChange={(e) => handleMarkChange(studentId, 'Semester Exam', e.target.value)}
                                placeholder="0-60"
                              />
                            </td>
                          )}
                          {show('Assignment') && (
                            <td>
                              <input
                                type="number"
                                className="mark-input"
                                min="0"
                                max="20"
                                value={getValue(studentId, 'Assignment')}
                                onChange={(e) => handleMarkChange(studentId, 'Assignment', e.target.value)}
                                placeholder="0-20"
                              />
                            </td>
                          )}
                          {show('Practical') && (
                            <td>
                              <input
                                type="number"
                                className="mark-input"
                                min="0"
                                max="20"
                                value={getValue(studentId, 'Practical')}
                                onChange={(e) => handleMarkChange(studentId, 'Practical', e.target.value)}
                                placeholder="0-20"
                              />
                            </td>
                          )}
                          <td className="total-marks">
                            <strong>{total}</strong>
                          </td>
                          <td className={`grade ${getGradeClassName(grade)}`}>
                            <strong>{grade}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="marks-legend">
          <h4>Grade Legend</h4>
          <div className="grade-list">
            <span className="grade-item">O: 95-100</span>
            <span className="grade-item">A+: 90-94</span>
            <span className="grade-item">A: 80-89</span>
            <span className="grade-item">B+: 70-79</span>
            <span className="grade-item">B: 60-69</span>
            <span className="grade-item">C: 50-59</span>
            <span className="grade-item fail">F: Below 50</span>
          </div>
        </div>
      </div>
    </div>
  );
}