import axios from 'axios';
import { notifyAuthExpired } from '../utils/jwtUtils';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add the auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    // Support both keys; AuthContext stores as 'token'
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If the data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      if (error.response.status === 401) {
        const url = error.config?.url || '';
        if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
          notifyAuthExpired();
        }
      }
    } else if (error.request) {
      console.error('API Error Request:', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;