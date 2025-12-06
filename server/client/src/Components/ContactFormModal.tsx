import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { emailService } from '../services/emailService';
import { toast } from 'react-hot-toast';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: string;
}

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  plan = 'Enterprise'
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await emailService.sendContactEmail({
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim() || undefined,
        plan
      });

      if (result.success) {
        toast.success(result.message || 'Message sent successfully!');
        setFormData({
          name: user?.displayName || '',
          email: user?.email || '',
          message: ''
        });
        onClose();
      } else {
        toast.error(result.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending contact form:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to send message. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="
        relative
        w-full max-w-md
        backdrop-blur-xl
        bg-[#0a0a0a]/95
        border border-[#1a1a1a]
        rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.8)]
        p-6
        transform transition-all duration-300
      ">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.05] via-transparent to-pink-500/[0.05] pointer-events-none rounded-2xl" />

        {/* Content */}
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Contact Us
              </h2>
              <p className="text-sm text-gray-400">
                Get in touch about our {plan} plan
              </p>
            </div>
            <button
              onClick={onClose}
              className="
                w-8 h-8 rounded-lg
                flex items-center justify-center
                bg-[#1a1a1a] hover:bg-[#2a2a2a]
                text-gray-400 hover:text-white
                transition-colors duration-200
              "
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[#0f0f0f] border border-[#1a1a1a]
                  text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                  transition-all duration-200
                "
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[#0f0f0f] border border-[#1a1a1a]
                  text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                  transition-all duration-200
                "
                placeholder="your.email@example.com"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message (Optional)
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[#0f0f0f] border border-[#1a1a1a]
                  text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                  transition-all duration-200
                  resize-none
                "
                placeholder="Tell us about your requirements..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full py-3 rounded-xl font-semibold
                bg-gradient-to-r from-purple-500 to-pink-600
                hover:from-purple-600 hover:to-pink-700
                text-white
                shadow-lg shadow-purple-500/30
                transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              "
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Send Message</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

