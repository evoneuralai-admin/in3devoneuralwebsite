import express from 'express';
import { emailService } from '../services/emailService';

const router = express.Router();

console.log('Email routes being initialized...');
console.log('✅ Email service imported:', emailService ? 'Success' : 'Failed');

// Test endpoint to verify route is working
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Email route is working!',
    timestamp: new Date().toISOString()
  });
});

// Contact form endpoint for Enterprise plan inquiries
router.post('/contact', async (req, res) => {
  try {
    const { name, email, message, plan } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email service is available and configured
    if (!emailService) {
      console.warn('⚠️  Email service not available. Contact form submission received but email not sent.');
      return res.status(503).json({
        success: false,
        message: 'Email service is temporarily unavailable. Please contact us directly at evoneural.ai@gmail.com'
      });
    }

    if (!emailService.isConfigured()) {
      console.warn('⚠️  Email service not configured. Contact form submission received but email not sent.');
      console.warn('   Request details:', { name, email, plan: plan || 'Enterprise' });
      console.warn('   💡 Check SMTP_USER and SMTP_PASSWORD in .env file');
      return res.status(503).json({
        success: false,
        message: 'Email service is temporarily unavailable. Please contact us directly at evoneural.ai@gmail.com'
      });
    }

    console.log('📧 Sending contact email:', { name, email, plan: plan || 'Enterprise' });

    // Send email
    const result = await emailService.sendContactEmail({
      name: name.trim(),
      email: email.trim(),
      message: message?.trim(),
      plan: plan || 'Enterprise'
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in contact endpoint:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;

