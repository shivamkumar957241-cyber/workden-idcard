// Centralized API configuration
const API_BASE = import.meta.env.VITE_API_URL || '';

export default API_BASE;

// Auth token helpers
export const getToken = () => localStorage.getItem('wd_token');
export const getUser = () => {
  try {
    const u = localStorage.getItem('wd_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};
export const setAuth = (token, user) => {
  localStorage.setItem('wd_token', token);
  localStorage.setItem('wd_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('wd_token');
  localStorage.removeItem('wd_user');
};

// Authenticated fetch wrapper
export const authFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  return res;
};
