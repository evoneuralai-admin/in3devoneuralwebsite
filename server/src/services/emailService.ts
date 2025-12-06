import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    password: string;
  };
}

interface ContactEmailData {
  name: string;
  email: string;
  message?: string;
  plan?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private recipientEmail: string = 'evoneural.ai@gmail.com';

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // For Gmail, we'll use OAuth2 or App Password
    // For now, using SMTP with environment variables
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || ''
      }
    };

    // Only create transporter if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.password) {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.auth.user,
          pass: emailConfig.auth.password
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service configuration error:', error);
          console.error('Error details:', {
            code: (error as any).code,
            command: (error as any).command,
            response: (error as any).response,
            responseCode: (error as any).responseCode
          });
          console.error('💡 Common issues:');
          console.error('   - Invalid SMTP credentials (check SMTP_USER and SMTP_PASSWORD)');
          console.error('   - For Gmail: Use App Password, not regular password');
          console.error('   - 2-Step Verification must be enabled for Gmail');
          console.error('   - Check firewall/network settings');
        } else {
          console.log('✅ Email service is ready to send messages');
          console.log('📧 Configuration:', {
            host: emailConfig.host,
            port: emailConfig.port,
            user: emailConfig.auth.user,
            recipient: this.recipientEmail
          });
        }
      });
    } else {
      console.warn('⚠️  Email service not configured. SMTP credentials missing.');
      console.warn('   Set SMTP_USER and SMTP_PASSWORD environment variables to enable email functionality.');
    }
  }

  async sendContactEmail(data: ContactEmailData): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      return {
        success: false,
        message: 'Email service is not configured. Please contact support directly.'
      };
    }

    try {
      const mailOptions = {
        from: `"In3D.ai Contact Form" <${process.env.SMTP_USER}>`,
        to: this.recipientEmail,
        replyTo: data.email,
        subject: `Enterprise Plan Inquiry from ${data.name}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
                .label { font-weight: bold; color: #667eea; }
                .message-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>Enterprise Plan Inquiry</h2>
                </div>
                <div class="content">
                  <div class="info-row">
                    <span class="label">Name:</span> ${data.name}
                  </div>
                  <div class="info-row">
                    <span class="label">Email:</span> <a href="mailto:${data.email}">${data.email}</a>
                  </div>
                  ${data.plan ? `
                  <div class="info-row">
                    <span class="label">Interested Plan:</span> ${data.plan}
                  </div>
                  ` : ''}
                  ${data.message ? `
                  <div class="message-box">
                    <span class="label">Message:</span>
                    <p>${data.message.replace(/\n/g, '<br>')}</p>
                  </div>
                  ` : ''}
                  <div class="footer">
                    <p>This email was sent from the In3D.ai Enterprise contact form.</p>
                    <p>You can reply directly to this email to contact ${data.name}.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Enterprise Plan Inquiry

Name: ${data.name}
Email: ${data.email}
${data.plan ? `Interested Plan: ${data.plan}` : ''}

${data.message ? `Message:\n${data.message}` : ''}

---
This email was sent from the In3D.ai Enterprise contact form.
You can reply directly to this email to contact ${data.name}.
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Contact email sent successfully:', info.messageId);
      console.log('📧 Email details:', {
        to: this.recipientEmail,
        from: process.env.SMTP_USER,
        subject: mailOptions.subject
      });
      
      return {
        success: true,
        message: 'Email sent successfully! We will get back to you soon.'
      };
    } catch (error) {
      console.error('❌ Error sending contact email:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          code: (error as any).code,
          command: (error as any).command,
          response: (error as any).response
        });
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email. Please try again later.'
      };
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }
}

export const emailService = new EmailService();

