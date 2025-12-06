// API base URL - use environment variable or fallback to defaults
const getApiBaseUrl = () => {
  // Check for explicit API base URL from environment
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Use local backend in development
  if (import.meta.env.DEV) {
    return 'http://localhost:5002/api';
  }
  
  // Use Firebase Functions in production
  const region = 'us-central1';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'in3devoneuralai';
  return `https://${region}-${projectId}.cloudfunctions.net/api`;
};

interface ContactFormData {
  name: string;
  email: string;
  message?: string;
  plan?: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
}

class EmailService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiBaseUrl();
  }

  async sendContactEmail(data: ContactFormData): Promise<ContactResponse> {
    try {
      const url = `${this.baseUrl}/email/contact`;
      console.log('📧 Sending email request to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response received:', text.substring(0, 200));
        throw new Error(`Server returned ${response.status}: ${response.statusText}. The email route may not be registered.`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to send email: ${response.status} ${response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error('Error sending contact email:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();

