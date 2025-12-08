import React, { useState } from "react";
import { 
  FaTwitter, 
  FaInstagram, 
  FaFacebook, 
  FaLinkedin, 
  FaWhatsapp, 
  FaMapMarkerAlt, 
  FaGlobe,
  FaFileAlt,
  FaShieldAlt,
  FaPhone,
  FaEnvelope,
  FaRss,
  FaServer,
  FaWifi,
  FaDatabase,
  FaCog
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { MeshyTestPanel } from './MeshyTestPanel';
import { MeshyDebugPanel } from './MeshyDebugPanel';

function Footer() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  const socialLinks = [
    {
      name: "Website",
      url: "https://www.evoneural.ai",
      icon: FaGlobe,
      color: "hover:text-blue-400"
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/profile.php?id=61565933257547",
      icon: FaFacebook,
      color: "hover:text-blue-600"
    },
    {
      name: "Twitter",
      url: "#", // Placeholder - update when available
      icon: FaTwitter,
      color: "hover:text-blue-400"
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/company/evoneural-ai-opc/?viewAsMember=true",
      icon: FaLinkedin,
      color: "hover:text-blue-700"
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/evoneural.ai/",
      icon: FaInstagram,
      color: "hover:text-pink-500"
    },
    {
      name: "Blog",
      url: "/blog",
      icon: FaRss,
      color: "hover:text-orange-500"
    }
  ];

  const quickLinks = [
    {
      name: "Privacy Policy",
      url: "/privacy-policy",
      icon: FaShieldAlt
    },
    {
      name: "Terms & Conditions",
      url: "/terms-conditions",
      icon: FaFileAlt
    }
  ];

  // Additional link categories inspired by meshy.ai structure
  const productLinks = [
    { name: "3D Model Generation", url: "/3d-generate" },
    { name: "Skybox Creation", url: "/main" },
    { name: "Explore Gallery", url: "/explore" },
    { name: "Generation History", url: "/history" },
  ];

  const companyLinks = [
    { name: "About Us", url: "/about" },
    { name: "Careers", url: "/careers" },
    { name: "Blog", url: "/blog" },
    { name: "Contact", url: "/contact" },
  ];

  const resourcesLinks = [
    { name: "Documentation", url: "/docs" },
    { name: "API Reference", url: "/api-docs" },
    { name: "Tutorials", url: "/tutorials" },
    { name: "Support", url: "/support" },
  ];

  return (
    <footer className="relative z-50 backdrop-blur-md bg-[#141414]/80 border-t border-[#262626]">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-10">
        {/* Top Section - Social Media Icons (Meshy.ai style) */}
        <div className="mb-12 lg:mb-16">
          <div className="flex flex-col items-center gap-6">
            {/* Logo and Tagline */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="w-2 h-2 rounded-full bg-amber-400/70" />
                  <span className="w-2 h-2 rounded-full bg-red-500/70" />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">In3D.AI</h3>
              </div>
              <p className="text-gray-400 text-sm text-center max-w-md">
                Powered by Evoneural Artificial Intelligence OPC
              </p>
            </div>

            {/* Social Media Icons Row */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {socialLinks.map((social) => (
                social.name === "Blog" ? (
                  <button
                    key={social.name}
                    onClick={() => navigate('/blog')}
                    className="
                      w-10 h-10 
                      flex items-center justify-center
                      rounded-lg
                      text-gray-400 hover:text-white
                      hover:bg-white/[0.05]
                      transition-all duration-300
                      group
                    "
                    title={social.name}
                    type="button"
                  >
                    <social.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                ) : (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      w-10 h-10 
                      flex items-center justify-center
                      rounded-lg
                      text-gray-400 hover:text-white
                      hover:bg-white/[0.05]
                      transition-all duration-300
                      group
                    "
                    title={social.name}
                  >
                    <social.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </a>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Main Footer Content - Link Columns (Meshy.ai style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          
          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.url}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  {link.name === "Blog" ? (
                    <button
                      onClick={() => navigate(link.url)}
                      className="text-sm text-gray-400 hover:text-white transition-colors duration-200 text-left"
                    >
                      {link.name}
                    </button>
                  ) : (
                    <Link
                      to={link.url}
                      className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              {resourcesLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.url}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.url}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Status & Contact */}
          <div className="space-y-4 col-span-2 md:col-span-1">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Services
            </h3>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => navigate('/system-status?tab=system-status')}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 text-left"
                >
                  System Status
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/system-status?tab=test-panel')}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 text-left"
                >
                  Test Panel
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/system-status?tab=debug-panel')}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 text-left"
                >
                  Debug Panel
                </button>
              </li>
              <li className="pt-2">
                <a
                  href="https://wa.me/917023310122"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2"
                >
                  <FaWhatsapp className="w-4 h-4" />
                  WhatsApp Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar - Copyright and Legal (Meshy.ai style) */}
        <div className="border-t border-[#262626] pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-xs text-gray-500 font-medium">
                © {currentYear} <span className="text-white">In3D.AI</span> | Evoneural Artificial Intelligence OPC. All rights reserved.
              </p>
            </div>
            
            {/* Legal Links Row */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <Link 
                to="/privacy-policy" 
                className="text-xs text-gray-500 hover:text-white font-medium transition-colors duration-200 uppercase tracking-wide"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-600">|</span>
              <Link 
                to="/terms-conditions" 
                className="text-xs text-gray-500 hover:text-white font-medium transition-colors duration-200 uppercase tracking-wide"
              >
                Terms & Conditions
              </Link>
              <span className="text-gray-600">|</span>
              <Link
                to="/3d-generate"
                className="text-xs text-gray-500 hover:text-cyan-400 font-medium transition-colors duration-200 uppercase tracking-wide"
              >
                Generate 3D Asset
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
