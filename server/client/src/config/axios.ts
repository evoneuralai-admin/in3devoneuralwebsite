import axios from 'axios';
import { auth } from './firebase';
import { getApiBaseUrl } from '../utils/apiConfig';

const apiBaseUrl = getApiBaseUrl();
console.log('🌐 API Configuration:', {
  baseURL: apiBaseUrl,
  isLocalhost: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
  env: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  useEmulator: import.meta.env.VITE_USE_FUNCTIONS_EMULATOR
});

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: false,
  timeout: 30000, // 30 second timeout for API calls
});

// Add request interceptor to include Firebase auth token
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
    // Don't block the request if token fetch fails - some endpoints are public
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error details for debugging, especially in preview environments
    const isPreviewEnv = typeof window !== 'undefined' && window.location.hostname.includes('--');
    if (isPreviewEnv) {
      console.warn('🔍 Preview environment API error:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        status: error.response?.status,
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

export default api; 