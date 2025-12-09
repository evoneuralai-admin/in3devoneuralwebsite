/**
 * Centralized API configuration utility
 * Provides consistent API base URL across the application
 */

/**
 * Get the API base URL from environment variables or fallback to defaults
 * @returns The API base URL string
 */
export const getApiBaseUrl = (): string => {
  // Detect if we're running on localhost
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '');
  
  // Check for explicit API base URL from environment
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    
    // If we're on localhost but env URL is not localhost, log a warning
    if (isLocalhost && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      console.warn('⚠️ Running on localhost but VITE_API_BASE_URL points to:', envUrl);
      console.warn('💡 Consider using: http://localhost:5001/in3devoneuralai/asia-south1/api');
    }
    
    // If we're on localhost and env URL is wrong port, use correct localhost URL
    if (isLocalhost && import.meta.env.DEV && envUrl.includes('localhost:5002')) {
      console.warn('⚠️ Detected wrong localhost port (5002), using correct port (5001)');
      return 'http://localhost:5001/in3devoneuralai/asia-south1/api';
    }
    
    return envUrl;
  }
  
  // Use local backend in development (especially on localhost)
  if (import.meta.env.DEV || isLocalhost) {
    const localhostUrl = 'http://localhost:5001/in3devoneuralai/asia-south1/api';
    console.log('🔧 Development mode detected, using localhost API:', localhostUrl);
    return localhostUrl;
  }
  
  // In preview channels or production, use Firebase Functions
  // Preview channels share the same Firebase Functions as production
  // Use asia-south1 region (matching database location)
  const region = 'asia-south1';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'in3devoneuralai';
  const functionsUrl = `https://${region}-${projectId}.cloudfunctions.net/api`;
  
  // Log for debugging in preview environments
  if (typeof window !== 'undefined' && window.location.hostname.includes('--')) {
    console.log('🔍 Preview environment detected, using API:', functionsUrl);
  }
  
  return functionsUrl;
};

/**
 * Get Firebase project configuration
 */
export const getFirebaseProjectConfig = () => {
  // Use asia-south1 region (matching database location)
  const region = 'asia-south1';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'in3devoneuralai';
  return {
    region,
    projectId,
    functionsUrl: `https://${region}-${projectId}.cloudfunctions.net`
  };
};

