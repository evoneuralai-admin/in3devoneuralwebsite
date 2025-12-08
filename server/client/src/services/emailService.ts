// Import centralized API config
import { getApiBaseUrl } from '../utils/apiConfig';

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

