// src/auth/storage.js
export const tokenKey = 'access_token';
export const setToken = (t) => localStorage.setItem(tokenKey, t);
export const getToken = () => localStorage.getItem(tokenKey);
export const clearToken = () => localStorage.removeItem(tokenKey);