// src/auth/api.js
import { getToken } from './storage';
const BASE = import.meta.env.VITE_API_BASE_URL;

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// New: for multipart/form-data (do not set Content-Type yourself)
async function requestForm(path, formData, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { method: 'PUT', headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  signup:     (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login:      (body) => request('/auth/login',  { method: 'POST', body: JSON.stringify(body) }),
  me:         ()    => request('/auth/refresh', { method: 'POST' }),

  studentData: ()   => request('/dashboard/student-data'),
  facultyData: ()   => request('/dashboard/faculty-data'),

  profileGet:    ()   => request('/profile', { method: 'GET' }),
  profilePut:    (b)  => request('/profile', { method: 'PUT', body: JSON.stringify(b) }),
  profilePutForm: (fd) => requestForm('/profile', fd),

  // Admin Students
  adminStudents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/students${qs ? `?${qs}` : ""}`, { method: 'GET' });
  },
  adminStudentProfile: (userId) =>
    request(`/admin/students/${userId}/profile`, { method: 'GET' }),
  adminUpdateStudentProfile: (userId, body) =>
    request(`/admin/students/${userId}/profile`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminUpdateStudentStatus: (userId, isActive) =>
    request(`/admin/students/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),

  // Faculty (self)
  facultyProfileGet: () => request('/faculty-profile', { method: 'GET' }),
  facultyProfilePut: (b) => request('/faculty-profile', { method: 'PUT', body: JSON.stringify(b) }),
  facultyProfilePutForm: (fd) => requestForm('/faculty-profile', fd),
  facultyMyCourses: () => request('/faculty/courses', { method: 'GET' }),

  // Admin Faculty
  adminCreateFaculty: (body) =>
    request('/admin/faculty', { method: 'POST', body: JSON.stringify(body) }),
  adminFaculty: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/faculty${qs ? `?${qs}` : ""}`, { method: 'GET' });
  },
  adminFacultyProfile: (userId) =>
    request(`/admin/faculty/${userId}/profile`, { method: 'GET' }),
  adminUpdateFacultyProfile: (userId, body) =>
    request(`/admin/faculty/${userId}/profile`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminUpdateFacultyStatus: (userId, isActive) =>
    request(`/admin/faculty/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),

  // Admin Courses
  adminCourses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/courses${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  adminCreateCourse: (body) =>
    request('/admin/courses', { method: 'POST', body: JSON.stringify(body) }),
  adminCourseById: (id) => request(`/admin/courses/${id}`, { method: 'GET' }),
  adminUpdateCourse: (id, body) =>
    request(`/admin/courses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminDeleteCourse: (id) =>
    request(`/admin/courses/${id}`, { method: 'DELETE' }),

  // Admin Departments
  adminDepartments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/departments${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  adminCreateDepartment: (body) =>
    request('/admin/departments', { method: 'POST', body: JSON.stringify(body) }),
  adminDepartmentById: (id) =>
    request(`/admin/departments/${id}`, { method: 'GET' }),
  adminUpdateDepartment: (id, body) =>
    request(`/admin/departments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminDeleteDepartment: (id) =>
    request(`/admin/departments/${id}`, { method: 'DELETE' }),

  // Admin Attendance
  adminAttendanceList: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/attendance${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  adminAttendanceGet: (id) =>
    request(`/admin/attendance/${id}`, { method: 'GET' }),
  adminAttendanceUpsert: (body) =>
    request('/admin/attendance', { method: 'POST', body: JSON.stringify(body) }),
  adminAttendanceDelete: (id) =>
    request(`/admin/attendance/${id}`, { method: 'DELETE' }),

  // Student
  studentCourses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/dashboard/student-courses${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
};