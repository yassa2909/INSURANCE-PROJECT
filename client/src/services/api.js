import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API calls ───────────────────────────────────────────────────────────

export const registerUser = (data) => api.post('/auth/register', data);

export const loginUser = (data) => api.post('/auth/login', data);

export const sendOTP = (phone) => api.post('/auth/send-otp', { phone });

export const verifyOTP = (data) => api.post('/auth/verify', data);

export const getUserProfile = () => api.get('/user/profile');

export default api;

// Upload documents related to a quote (multipart/form-data)
export const uploadQuoteDocuments = (quoteId, files) => {
  const form = new FormData();
  (files || []).forEach((f) => form.append('files', f));

  return api.post(`/quotes/${quoteId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    maxBodyLength: Infinity,
  });
};
