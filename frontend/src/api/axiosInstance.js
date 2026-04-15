import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor - add token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and normalize Vercel/infra error formats
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize structured error objects (e.g. Vercel returns { error: { code, message } })
    // into plain strings so components can safely render err.response?.data?.error
    if (error.response?.data?.error && typeof error.response.data.error === 'object') {
      error.response.data.error =
        error.response.data.error.message || String(error.response.data.error.code) || 'An error occurred';
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
