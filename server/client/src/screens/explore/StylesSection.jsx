import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { skyboxApiService } from '../../services/skyboxApiService';

const StylesSection = ({ onSelect }) => {
  const navigate = useNavigate();
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Load skybox styles from API
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Fetching skybox styles for Explore page...');
        
        const response = await skyboxApiService.getStyles(1, 100);
        
        // Handle different response structures
        const stylesData = response?.data?.styles || response?.styles || response?.data || [];
        const stylesArray = Array.isArray(stylesData) ? stylesData : [];
        
        if (stylesArray.length === 0) {
          console.warn('⚠️ No styles returned from API');
          // Don't set error if API call succeeded but returned empty array
          // This could mean API key is not configured or no styles available
        }
        
        setStyles(stylesArray);
        console.log('✅ Loaded skybox styles for Explore page:', stylesArray.length, 'styles');
      } catch (err) {
        console.error('❌ Error loading skybox styles:', err);
        
        // Provide more helpful error messages
        let errorMessage = 'Failed to load styles';
        if (err.message) {
          errorMessage = err.message;
        } else if (err.response?.status === 500) {
          errorMessage = 'Server error. The BlockadeLabs API key may not be configured in Firebase Functions.';
        } else if (err.response?.status === 403) {
          errorMessage = 'Access denied. Please check API configuration.';
        } else if (!err.response) {
          errorMessage = 'Network error. Please check your connection and API configuration.';
        }
        
        setError(errorMessage);
        setStyles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStyles();
  }, []);

  // Group styles by category/type
  const groupedStyles = React.useMemo(() => {
    const groups = {
      all: styles,
      realistic: styles.filter(s => s.name?.toLowerCase().includes('realistic') || s.id === 2),
      fantasy: styles.filter(s => s.name?.toLowerCase().includes('fantasy') || s.id === 5),
      cyberpunk: styles.filter(s => s.name?.toLowerCase().includes('cyberpunk') || s.id === 12),
      stylized: styles.filter(s => s.name?.toLowerCase().includes('stylized') || s.id === 8),
      'low-poly': styles.filter(s => s.name?.toLowerCase().includes('low poly') || s.id === 15),
    };
    return groups;
  }, [styles]);

  const categories = [
    { id: 'all', name: 'All Styles', count: styles.length },
    { id: 'realistic', name: 'Realistic', count: groupedStyles.realistic.length },
    { id: 'fantasy', name: 'Fantasy', count: groupedStyles.fantasy.length },
    { id: 'cyberpunk', name: 'Cyberpunk', count: groupedStyles.cyberpunk.length },
    { id: 'stylized', name: 'Stylized', count: groupedStyles.stylized.length },
    { id: 'low-poly', name: 'Low Poly', count: groupedStyles['low-poly'].length },
  ];

  const displayStyles = groupedStyles[selectedCategory] || styles;

  const handleStyleSelect = (style) => {
    // Store in sessionStorage for persistence and navigation
    sessionStorage.setItem('selectedSkyboxStyle', JSON.stringify(style));
    sessionStorage.setItem('fromExplore', 'true');
    sessionStorage.setItem('navigateToMain', 'true');
    
    // Call the onSelect callback if provided
    if (onSelect) {
      onSelect(style);
    }

    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
    successMessage.innerHTML = `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
      <span>Style "${style.name || style.title || 'Selected'}" selected! Navigating to Create...</span>
    `;
    document.body.appendChild(successMessage);
    
    // Navigate to main section after a short delay
    setTimeout(() => {
      navigate('/main');
      
      // Remove the message after navigation
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 2000);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading skybox styles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-6">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-white font-semibold mb-2">Failed to Load Styles</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Skybox Styles</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Choose from our collection of skybox styles to create the perfect environment
        </p>
      </div>

      {/* Category Filter */}
      {styles.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      )}

      {/* Styles Grid */}
      {displayStyles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayStyles.map((style, index) => (
            <motion.div
              key={style.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group relative rounded-xl overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all"
            >
              {/* Style Preview Image */}
              <div className="aspect-video relative overflow-hidden bg-gray-800">
                {style.image_jpg || style.image || style.thumb_url ? (
                  <img
                    src={style.image_jpg || style.image || style.thumb_url}
                    alt={style.name || style.title || 'Skybox style'}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback to placeholder if image fails
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%231a1a1a" width="400" height="300"/%3E%3Ctext fill="%23fff" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Preview%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20">
                    <div className="text-center p-4">
                      <div className="w-16 h-16 mx-auto mb-2 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-400">No Preview</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Style Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-1 truncate">
                  {style.name || style.title || `Style ${style.id}`}
                </h3>
                {style.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{style.description}</p>
                )}
                {style.model && (
                  <p className="text-xs text-gray-500 mb-3">Model: {style.model}</p>
                )}

                {/* Action Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStyleSelect(style)}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-500 hover:to-blue-500 
                           text-white rounded-lg transition-all duration-200 font-medium text-sm"
                >
                  Use This Style
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400">No styles available in this category.</p>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-12 p-6 rounded-xl backdrop-blur-md bg-white/5 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">How to Use Styles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg bg-white/5">
            <h4 className="text-lg font-medium text-white mb-2">1. Browse Styles</h4>
            <p className="text-gray-400">Explore our collection of skybox styles and find the perfect one for your project</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5">
            <h4 className="text-lg font-medium text-white mb-2">2. Select Style</h4>
            <p className="text-gray-400">Click "Use This Style" to select a style and navigate to the Create page</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5">
            <h4 className="text-lg font-medium text-white mb-2">3. Generate</h4>
            <p className="text-gray-400">Enter your prompt and generate your skybox with the selected style</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StylesSection; 