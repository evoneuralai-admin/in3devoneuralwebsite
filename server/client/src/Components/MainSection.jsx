import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscriptionService';
import DownloadPopup from './DownloadPopup';
import UpgradeModal from './UpgradeModal';
import LoadingPlaceholder from './LoadingPlaceholder';
import { skyboxApiService } from '../services/skyboxApiService';
import AssetGenerationPanel from './AssetGenerationPanel';
import { MeshyTestPanel } from './MeshyTestPanel';
import { assetGenerationService } from '../services/assetGenerationService';
import { isStorageAvailable } from '../utils/firebaseStorage';
import { StorageTestUtility } from '../utils/storageTest';
import { StorageStatusIndicator } from './StorageStatusIndicator';
import ConfigurationDiagnostic from './ConfigurationDiagnostic';
import SkyboxBackground from './SkyboxBackground';
import Meshy3DViewer from './Meshy3DViewer';

const MainSection = ({ setBackgroundSkybox }) => {
  console.log('MainSection component rendered');
  const [showNegativeTextInput, setShowNegativeTextInput] = useState(false);
  const [skyboxStyles, setSkyboxStyles] = useState([]);
  const [selectedSkybox, setSelectedSkybox] = useState(40);
  const [prompt, setPrompt] = useState("");
  const [negativeText, setNegativeText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showStylePreview, setShowStylePreview] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [generatedImageId, setGeneratedImageId] = useState(null);
  const [generatedVariations, setGeneratedVariations] = useState([]);
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [numVariations, setNumVariations] = useState(5);
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentSkyboxIndex, setCurrentSkyboxIndex] = useState(0);
  const [currentImageForDownload, setCurrentImageForDownload] = useState(null);
  const [stylesLoading, setStylesLoading] = useState(true);
  const [stylesError, setStylesError] = useState(null);
  const [showAssetPanel, setShowAssetPanel] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState([]);
  const [has3DObjects, setHas3DObjects] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [serviceStatusLoading, setServiceStatusLoading] = useState(true);
  const [serviceStatusError, setServiceStatusError] = useState(null);
  // Add state for progress and loading
  const [isGenLoading, setIsGenLoading] = useState(false);
  const [liveSkyboxUrl, setLiveSkyboxUrl] = useState(null);
  const [liveMeshUrl, setLiveMeshUrl] = useState(null);

  // Reactive object detection with error handling
  useEffect(() => {
    if (prompt.trim()) {
      try {
        const extraction = assetGenerationService.previewExtraction(prompt);
        setHas3DObjects(extraction.hasObjects);
        console.log('🔄 Prompt changed, re-analyzing:', {
          prompt,
          hasObjects: extraction.hasObjects,
          objects: extraction.objects,
          meshyConfigured: assetGenerationService.isMeshyConfigured()
        });
      } catch (error) {
        console.error('Error analyzing prompt:', error);
        setHas3DObjects(false);
      }
    } else {
      setHas3DObjects(false);
    }
  }, [prompt]);

  useEffect(() => {
    setStylesLoading(true);
    setStylesError(null);
    const fetchSkyboxStyles = async () => {
      try {
        const response = await skyboxApiService.getStyles(1, 100);
        const styles = response.data || [];
        setSkyboxStyles(styles);
        setStylesLoading(false);
        setStylesError(null);
        console.log('Fetched In3D.Ai styles:', styles);
      } catch (error) {
        setStylesLoading(false);
        setStylesError("Failed to load In3D.Ai styles. Please check your API configuration.");
        setSkyboxStyles([]);
        console.error("Error fetching In3D.Ai styles:", error);
        
        // Show user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        errorMessage.innerHTML = `
          <div class="font-bold mb-2">⚠️ Configuration Issue</div>
          <div class="text-sm">Unable to load 3D generation styles. Please check your API configuration.</div>
        `;
        document.body.appendChild(errorMessage);
        setTimeout(() => document.body.removeChild(errorMessage), 5000);
      }
    };
    fetchSkyboxStyles();
  }, []);

  useEffect(() => {
    // Check service availability with alternative storage support
    const checkAvailability = async () => {
      try {
        setServiceStatusLoading(true);
        setServiceStatusError(null);
        
        // Check if Meshy is configured first
        const meshyConfigured = assetGenerationService.isMeshyConfigured();
        console.log('🔧 Meshy configuration check:', meshyConfigured);
        
        if (!meshyConfigured) {
          setServiceStatusError('Meshy API key not configured. Please add VITE_MESHY_API_KEY to your environment variables.');
          setServiceStatusLoading(false);
          setStorageAvailable(false);
          return;
        }
        
        const available = await assetGenerationService.isServiceAvailable();
        setStorageAvailable(available);
        const status = await assetGenerationService.getServiceStatus();
        setServiceStatus(status);
        setServiceStatusLoading(false);
        
        if (!available) {
          if (status.errors.length > 0) {
            setServiceStatusError(status.errors.join(' | '));
          }
        }
        
        console.log('🔧 Service availability check completed:', { available, status });
      } catch (error) {
        setServiceStatusLoading(false);
        setStorageAvailable(false);
        setServiceStatusError(error.message || 'Unknown error');
        console.error('❌ Service availability check failed:', error);
      }
    };
    checkAvailability();
  }, []);

  // Add recovery function for storage issues with alternative storage support
  const handleStorageRecovery = async () => {
    try {
      console.log('🔄 User requested storage recovery...');
      setError('Attempting to recover storage connection...');
      
      // Check current service status
      const status = await assetGenerationService.getServiceStatus();
      
      // If alternative storage is available, we can still work
      if (status.alternativeStorageAvailable) {
        setStorageAvailable(true);
        setError(null);
        console.log('✅ Alternative storage available - service can continue');
        
        // Show success message about alternative storage
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        successMessage.innerHTML = `
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span>Using alternative storage! 3D asset generation is available.</span>
        `;
        document.body.appendChild(successMessage);
        setTimeout(() => document.body.removeChild(successMessage), 5000);
        return;
      }
      
      // Try to recover Firebase Storage
      const fixes = await StorageTestUtility.attemptAutoFix();
      
      // Check if recovery was successful
      const available = await isStorageAvailable();
      
      if (available) {
        setStorageAvailable(true);
        setError(null);
        console.log('✅ Firebase Storage recovery successful');
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        successMessage.innerHTML = `
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span>Firebase Storage recovered! 3D asset generation is now available.</span>
        `;
        document.body.appendChild(successMessage);
        setTimeout(() => document.body.removeChild(successMessage), 5000);
      } else {
        setError('Storage recovery failed. Alternative storage is also unavailable.');
        console.error('❌ All storage recovery failed');
        
        // Show detailed error with fixes attempted
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md';
        errorMessage.innerHTML = `
          <div class="font-bold mb-2">❌ Recovery Failed</div>
          <div class="text-sm mb-2">Both Firebase and alternative storage are unavailable.</div>
          <div class="text-sm mb-2">Attempted fixes:</div>
          <ul class="list-disc list-inside text-sm">
            ${fixes.map(fix => `<li>${fix}</li>`).join('')}
          </ul>
        `;
        document.body.appendChild(errorMessage);
        setTimeout(() => document.body.removeChild(errorMessage), 8000);
      }
    } catch (error) {
      setError(`Recovery failed: ${error.message}`);
      console.error('❌ Storage recovery error:', error);
    }
  };

  // Add diagnostic function for debugging with alternative storage support
  const runDiagnostics = async () => {
    try {
      console.log('🔧 Running comprehensive diagnostics...');
      
      // Get asset generation service status
      const serviceStatus = await assetGenerationService.getServiceStatus();
      
      // Run Firebase storage diagnostics
      const firebaseResults = await StorageTestUtility.runFullDiagnostics();
      
      // Combine results
      const results = {
        ...firebaseResults,
        serviceStatus,
        alternativeStorage: {
          available: serviceStatus.alternativeStorageAvailable,
          providers: serviceStatus.alternativeStorageAvailable ? 
            ['localStorage', 'directUrl', 'cloudinary'].filter(p => {
              if (p === 'cloudinary') return !!import.meta.env.VITE_CLOUDINARY_CLOAD_NAME;
              return true;
            }) : []
        }
      };
      
      // Display enhanced results
      const diagnosticMessage = document.createElement('div');
      diagnosticMessage.className = 'fixed top-4 right-4 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-lg';
      
      let messageHtml = '<div class="font-bold mb-3">🔧 Diagnostic Results</div>';
      
      // Service status
      messageHtml += '<div class="mb-3"><div class="font-semibold text-sm">Service Status:</div>';
      messageHtml += `<div class="text-xs">• Meshy API: ${serviceStatus.meshyConfigured ? '✅' : '❌'}</div>`;
      messageHtml += `<div class="text-xs">• Firebase Storage: ${serviceStatus.firebaseStorageAvailable ? '✅' : '❌'}</div>`;
      messageHtml += `<div class="text-xs">• Alternative Storage: ${serviceStatus.alternativeStorageAvailable ? '✅' : '❌'}</div>`;
      messageHtml += `<div class="text-xs">• User Auth: ${serviceStatus.userAuthenticated ? '✅' : '❌'}</div>`;
      messageHtml += '</div>';
      
      // Alternative storage providers
      if (serviceStatus.alternativeStorageAvailable) {
        messageHtml += '<div class="mb-3"><div class="font-semibold text-sm">Alternative Storage Providers:</div>';
        results.alternativeStorage.providers.forEach(provider => {
          messageHtml += `<div class="text-xs">• ${provider}</div>`;
        });
        messageHtml += '</div>';
      }
      
      // Errors
      if (serviceStatus.errors.length > 0) {
        messageHtml += '<div class="mb-3"><div class="font-semibold text-sm text-red-400">Errors:</div>';
        serviceStatus.errors.forEach(error => {
          messageHtml += `<div class="text-xs text-red-300">• ${error}</div>`;
        });
        messageHtml += '</div>';
      }
      
      // Firebase results
      if (firebaseResults.network) {
        messageHtml += '<div class="mb-3"><div class="font-semibold text-sm">Network Status:</div>';
        messageHtml += `<div class="text-xs">• Connectivity: ${firebaseResults.network.connectivity ? '✅' : '❌'}</div>`;
        messageHtml += `<div class="text-xs">• Firebase API: ${firebaseResults.network.firebaseApi ? '✅' : '❌'}</div>`;
        messageHtml += '</div>';
      }
      
      messageHtml += '<div class="text-xs text-gray-400 mt-3">Check browser console for detailed logs</div>';
      
      diagnosticMessage.innerHTML = messageHtml;
      document.body.appendChild(diagnosticMessage);
      setTimeout(() => document.body.removeChild(diagnosticMessage), 10000);
      
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      
      // Show simple error message
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.innerHTML = `
        <div class="font-bold mb-2">❌ Diagnostic Error</div>
        <div class="text-sm">${error.message}</div>
      `;
      document.body.appendChild(errorMessage);
      setTimeout(() => document.body.removeChild(errorMessage), 5000);
    }
  };

  // Modify the effect to handle navigation source and style selection
  useEffect(() => {
    const fromExplore = sessionStorage.getItem('fromExplore');
    const savedStyle = sessionStorage.getItem('selectedSkyboxStyle');
    const navigateToMain = sessionStorage.getItem('navigateToMain');
    
    if (fromExplore && savedStyle && navigateToMain) {
      try {
        const parsedStyle = JSON.parse(savedStyle);
        setSelectedSkybox(parsedStyle);
        setShowStylePreview(true);
        
        // Show success message that style is now selected
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        successMessage.innerHTML = `
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span>Style "${parsedStyle.name}" is now selected! Ready to create.</span>
        `;
        document.body.appendChild(successMessage);
        
        // Remove the message after 3 seconds
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 3000);
        
        // Clear the stored data after using it
        sessionStorage.removeItem('fromExplore');
        sessionStorage.removeItem('selectedSkyboxStyle');
        sessionStorage.removeItem('navigateToMain');
      } catch (error) {
        console.error('Error parsing saved skybox style:', error);
        sessionStorage.removeItem('fromExplore');
        sessionStorage.removeItem('selectedSkyboxStyle');
        sessionStorage.removeItem('navigateToMain');
      }
    }
  }, [setBackgroundSkybox]);

  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      if (user?.uid) {
        const userSubscription = await subscriptionService.getUserSubscription(user.uid);
        setSubscription(userSubscription);
      }
    };
    
    loadSubscription();
  }, [user?.uid]);

  // Calculate subscription info from subscription data
  const subscriptionInfo = {
    plan: subscription?.planId || 'Free',
    generationsLeft: subscription?.usage?.limit - subscription?.usage?.count || 0,
    totalGenerations: subscription?.usage?.count || 0,
    planName: subscription?.planId === 'free' ? 'Free Plan' : subscription?.planId === 'pro' ? 'Pro Plan' : 'Enterprise Plan',
    maxGenerations: subscription?.planId === 'free' ? 5 : subscription?.planId === 'pro' ? 50 : 100
  };

  // Get current plan details with proper type safety
  const currentPlan = subscriptionService.getPlanById(subscription?.planId || 'free');
  const currentUsage = parseInt(subscription?.usage?.skyboxGenerations || 0);
  const currentLimit = currentPlan?.limits.skyboxGenerations || 10;
  const isUnlimited = currentLimit === Infinity;
  
  // Calculate remaining generations (current)
  const remainingGenerations = isUnlimited 
    ? '∞' 
    : Math.max(0, currentLimit - currentUsage);
  
  // Calculate remaining generations after current generation
  const remainingAfterGeneration = isUnlimited 
    ? '∞' 
    : Math.max(0, currentLimit - currentUsage - numVariations);
  
  // Calculate usage percentage (current usage only)
  const usagePercentage = isUnlimited 
    ? 0 
    : Math.min((currentUsage / currentLimit) * 100, 100);
  
  // Calculate projected usage percentage (for warning display)
  const projectedUsagePercentage = isUnlimited 
    ? 0 
    : Math.min(((currentUsage + numVariations) / currentLimit) * 100, 100);

  // Update subscription after generation
  const updateSubscriptionCount = async () => {
    if (user?.uid) {
      const updatedSubscription = await subscriptionService.getUserSubscription(user.uid);
      setSubscription(updatedSubscription);
    }
  };

  // Add a single Generate button that triggers both background and object generation
  console.log(selectedSkybox)
  const handleDualGenerate = async () => {
    console.log("Generate button clicked");
    console.log('Current prompt:', prompt, typeof prompt);
    console.log('Current selectedSkybox:', selectedSkybox);
    if (!prompt.trim()) {
      setError('Please enter a prompt before generating.');
      alert('Prompt missing!');
      return;
    }
    if (!selectedSkybox || !selectedSkybox.id) {
      setError('Please select a style before generating.');
      alert('Style missing!');
      return;
    }
    setIsGenLoading(true);
    setError(null);
    setProgress(10);
    setLiveSkyboxUrl(null);
    setLiveMeshUrl(null);
    try {
      // Extract context and main subject from the prompt
      const promptText = prompt.trim();
      let context = '';
      let subject = promptText;
      const inTheMatch = promptText.match(/(.+) in the (.+)/i);
      if (inTheMatch) {
        subject = inTheMatch[1].trim();
        context = inTheMatch[2].trim();
      }
      setProgress(20);
      // Generate 3D background (context)
      const backgroundPayload = {
        prompt: context ? `A 3D environment of ${context}` : promptText,
        skybox_style_id: Number(selectedSkybox.id),
        userId: user?.uid || undefined,
        negative_text: negativeText || ""
      };
      setProgress(30);
      // Debug log for payload
      console.log('Skybox backgroundPayload:', backgroundPayload, 'Types:', {
        prompt: typeof backgroundPayload.prompt,
        style_id: typeof backgroundPayload.skybox_style_id,
        userId: typeof backgroundPayload.userId
      });
      alert('Payload: ' + JSON.stringify(backgroundPayload));
      // Generate 3D object/character (subject)
      const [backgroundRes, meshRes] = await Promise.all([
        skyboxApiService.generateSkybox(backgroundPayload),
        assetGenerationService.generateSingleAsset(
          subject ? subject : promptText,
          user?.uid,
          'main-scene',
          'medium'
        )
      ]);
      setProgress(60);
      // --- SKYBOX POLLING LOGIC ---
      if (backgroundRes.data && backgroundRes.data.id) {
        let pollCount = 0;
        let maxPolls = 60; // 2 minutes max
        let found = false;
        let lastError = null;
        while (pollCount < maxPolls && !found) {
          pollCount++;
          try {
            const statusRes = await skyboxApiService.getSkyboxStatus(backgroundRes.data.id);
            const statusJson = statusRes.data;
            if (statusJson.success && statusJson.data) {
              if (statusJson.data.status === 'complete' && statusJson.data.file_url) {
                setLiveSkyboxUrl(statusJson.data.file_url);
                found = true;
                break;
              } else if (statusJson.data.status === 'failed') {
                lastError = 'Skybox generation failed on server.';
                break;
              }
            } else {
              lastError = statusJson.message || 'Unknown error from skybox status API.';
            }
          } catch (err) {
            lastError = err.message || 'Network error while polling skybox status.';
          }
          setProgress(60 + Math.floor((pollCount / maxPolls) * 20));
          await new Promise(res => setTimeout(res, 2000));
        }
      }
      setProgress(90);
      // --- MESH LOGIC ---
      if (meshRes && meshRes.assets && meshRes.assets.length > 0) {
        const asset = meshRes.assets[0];
        setLiveMeshUrl(asset.url || asset.fileUrl || asset.modelUrl);
      }
      setProgress(100);
      console.log('Skybox API response:', backgroundRes);
      console.log('Mesh API response:', meshRes);
    } catch (err) {
      setProgress(0);
      setError('Generation failed. Please try again.');
    } finally {
      setTimeout(() => setIsGenLoading(false), 500);
    }
  };

  const handleVariationChange = (direction) => {
    if (generatedVariations.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentVariationIndex + 1) % generatedVariations.length;
    } else {
      newIndex = (currentVariationIndex - 1 + generatedVariations.length) % generatedVariations.length;
    }

    setCurrentVariationIndex(newIndex);
    setBackgroundSkybox(generatedVariations[newIndex]);
    setCurrentImageForDownload(generatedVariations[newIndex]);
  };

  // Modify the skybox style selection handler
  const handleSkyboxStyleChange = (e) => {
    const style = skyboxStyles.find(s => String(s.id) === String(e.target.value));
    console.log('Dropdown selected style:', style);
    setSelectedSkybox(style);
    setShowStylePreview(true);
  };

  // Modify the handleUpgrade function to show modal instead of direct navigation
  const handleUpgrade = () => {
    setShowUpgradeModal(true); // Show modal instead of navigating directly
  };

  // Add function to toggle panel size
  const togglePanelSize = () => {
    setIsMinimized(!isMinimized);
  };

  // Helper for progress status text
  const getProgressStatusText = () => {
    if (progress < 30) return "Initializing generation...";
    if (progress < 60) return "Generating skybox variations...";
    if (progress < 90) return "Processing final results...";
    return "Finalizing...";
  };

  // Handle 3D asset generation
  const handleAssetGeneration = (assets) => {
    setGeneratedAssets(assets);
    setShowAssetPanel(false);
    
    // Show success notification
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
    successMessage.innerHTML = `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
      </svg>
      <span>Generated ${assets.length} 3D assets for your skybox!</span>
    `;
    document.body.appendChild(successMessage);
    setTimeout(() => document.body.removeChild(successMessage), 5000);
  };

  // Debug logging for button visibility
  console.log('🔍 Current state:', {
    prompt,
    has3DObjects,
    meshyConfigured: assetGenerationService.isMeshyConfigured(),
    shouldShowButton: has3DObjects && assetGenerationService.isMeshyConfigured()
  });

  // Debug function to test Meshy integration
  const testMeshyIntegration = async () => {
    console.log('🧪 Testing Meshy integration...');
    
    // Test 1: Check if Meshy is configured
    const isConfigured = assetGenerationService.isMeshyConfigured();
    console.log('✅ Meshy configured:', isConfigured);
    
    // Test 2: Test keyword extraction
    const testPrompt = "A sci-fi jungle with alien structures and a crashed spaceship";
    const extraction = assetGenerationService.previewExtraction(testPrompt);
    console.log('✅ Keyword extraction test:', extraction);
    
    // Test 3: Test cost estimation
    const costEstimate = assetGenerationService.estimateCost(testPrompt, 'medium');
    console.log('✅ Cost estimation test:', costEstimate);
    
    // Test 4: Test single asset generation (if configured)
    if (isConfigured && user?.uid) {
      try {
        console.log('🚀 Testing single asset generation...');
        const asset = await assetGenerationService.generateSingleAsset(
          "futuristic spaceship",
          user.uid,
          "test-skybox-id",
          "low"
        );
        console.log('✅ Asset generation test result:', asset);
      } catch (error) {
        console.error('❌ Asset generation test failed:', error);
      }
    }
  };

  // Check Firebase services on component mount
  useEffect(() => {
    console.log('🔧 Checking Firebase services...');
    console.log('📦 Storage available:', isStorageAvailable());
    console.log('🔑 Auth available:', !!useAuth);
    console.log('🗄️ Firestore available:', !!require('../config/firebase').db);
  }, []);

  // Helper: get missing requirements
  const getMissingRequirements = () => {
    if (!serviceStatus) return [];
    const missing = [];
    if (!serviceStatus.meshyConfigured) missing.push('Meshy API Key');
    if (!serviceStatus.firebaseStorageAvailable && !serviceStatus.alternativeStorageAvailable) missing.push('Storage (Firebase or Alternative)');
    if (!serviceStatus.userAuthenticated) missing.push('User Authentication');
    return missing;
  };


  return (
    <div className="relative w-full min-h-screen">
      {/* Sidebar for Style Preview */}
        {showStylePreview && selectedSkybox && (
          <div className="fixed right-0 top-[64px] bottom-[64px] w-72 bg-gray-800/40 shadow-2xl backdrop-blur-sm border-l border-gray-700/50 transform transition-transform duration-300 ease-in-out z-20">
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-700/50">
                <h3 className="text-lg font-semibold text-gray-100">Style Preview</h3>
                <button
                  onClick={() => setShowStylePreview(false)}
                  className="text-gray-300 hover:text-white focus:outline-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-200 mb-2">{selectedSkybox.name}</h4>
                    {selectedSkybox.description && (
                    <p className="text-sm text-gray-300 mb-4">
                      {selectedSkybox.description}
                    </p>
                    )}
                  </div>

                  {selectedSkybox.image_jpg && (
                    <div className="space-y-4">
                      <div className="aspect-square w-full relative rounded-lg overflow-hidden">
                      <img
                        src={selectedSkybox.image_jpg}
                        alt={selectedSkybox.name}
                        className="w-full h-full object-cover"
                      />
                      </div>
                    
                      <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-200 mb-2">Style Details</h5>
                        <div className="space-y-2 text-sm text-gray-300">
                          <p>Model: {selectedSkybox.model}</p>
                        {selectedSkybox.dimensions && (
                          <p>Dimensions: {selectedSkybox.dimensions}</p>
                        )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            
              <div className="p-4 border-t border-gray-700/50">
                <button
                  onClick={() => setShowStylePreview(false)}
                  className="w-full py-2 px-4 bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 rounded-md transition-colors duration-200 backdrop-blur-sm"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Main Control Panel with dynamic classes */}
      <div 
        className={`fixed inset-x-0 bottom-0 flex items-end justify-center transition-all duration-500 ease-in-out ${
          isMinimized ? 'pb-4' : 'pb-16'
        } ${showStylePreview ? 'mr-72' : ''}`}
      >
        <div className={`relative w-full max-w-4xl mx-auto px-4 transition-all duration-500 ease-in-out ${
          isMinimized ? 'max-w-lg' : ''
        }`}>
          <div className={`relative z-10 bg-gray-800/30 rounded-xl shadow-2xl backdrop-blur-sm border border-gray-700/50 transition-all duration-500 ease-in-out ${
            isMinimized ? 'bg-gray-800/20' : ''
          }`}>
            {/* Toggle button for panel size */}
              {setBackgroundSkybox && (
                <button
                  onClick={togglePanelSize}
                  className="absolute -top-3 right-3 w-6 h-6 rounded-full bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center transition-all duration-200"
                  aria-label={isMinimized ? "Expand panel" : "Minimize panel"}
                >
                  <svg
                  className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${
                    isMinimized ? 'rotate-180' : ''
                  }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={isMinimized ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                    />
                  </svg>
                </button>
              )}

            <div className={`transition-all duration-500 ease-in-out ${
              isMinimized ? 'p-2' : 'p-4'
            }`}>
                {isMinimized ? (
                // Minimized View
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => setIsMinimized(false)}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                    >
                      New Generation
                    </button>
                  </div>
                ) : (
                // Full View - Show only progress during generation
                <>
                  {error && (
                    <div className="mb-4 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {liveSkyboxUrl && (
                    <div className="mt-6">
                      <h3 className="text-lg font-bold text-white mb-2">Generated Skybox</h3>
                      <img src={liveSkyboxUrl} alt="Generated Skybox" className="w-full rounded-lg shadow-lg" />
                    </div>
                  )}

                  {liveMeshUrl && (
                    <div className="mt-6">
                      <h3 className="text-lg font-bold text-white mb-2">Generated 3D Mesh</h3>
                      <Meshy3DViewer url={liveMeshUrl} />
                    </div>
                  )}

                  {/* Prompt - Full Width */}
                    <div>
                    <label htmlFor="prompt" className="block text-xs font-medium mb-1 text-gray-200">
                      Prompt
                    </label>
                      <textarea
                        id="prompt"
                        maxLength={600}
                        rows={2}
                      placeholder="Tell us what to bring to life..."
                        className="w-full p-2 bg-gray-700/30 border border-gray-600/50 rounded-md text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm backdrop-blur-sm"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      disabled={isGenerating}
                      />
                    </div>

                  {/* Negative Text Section */}
                  <div className="mt-4">
                    <label htmlFor="negative-text" className="block text-sm font-medium text-gray-200 mb-2">Negative Text</label>
                    <input
                      id="negative-text"
                      type="text"
                      className="w-full p-2 bg-gray-700/30 border border-gray-600/50 rounded-md text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm backdrop-blur-sm"
                      placeholder="Elements or words to exclude from generation..."
                      value={negativeText}
                      onChange={e => setNegativeText(e.target.value)}
                    />
                  </div>

                

                  {/* Skybox Style and Generate Button - Three Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-200">In3D.Ai Style</label>
                      {stylesLoading ? (
                        <div className="text-gray-400 text-xs py-2">Loading styles...</div>
                      ) : (
                        <select
                          className="w-full p-2 bg-gray-700/30 border border-gray-600/50 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm backdrop-blur-sm"
                          onChange={handleSkyboxStyleChange}
                          value={selectedSkybox?.id || ""}
                        >
                          <option value="" disabled>
                            -- Choose an In3D.Ai Style --
                          </option>
                          {skyboxStyles.map((style) => (
                            <option key={style.id} value={style.id}>
                              {style.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {stylesError && (
                        <div className="text-red-400 text-xs py-2">{stylesError}</div>
                      )}
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={handleDualGenerate}
                        disabled={isGenLoading || !prompt.trim() || !selectedSkybox || !selectedSkybox.id}
                        className="w-full mt-6 py-3 rounded-lg font-bold text-base bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isGenLoading ? "Generating..." : "Generate"}
                      </button>
                      {isGenLoading && (
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mt-2 animate-pulse">
                          <div
                            className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                            style={{ width: `${progress}%`, transition: 'width 0.3s' }}
                          ></div>
                        </div>
                      )}
                          </div>

                    <div className="flex items-end">
                      <button
                        className={`w-full py-2 px-4 rounded-md text-white font-medium transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500/50 
                          ${!currentImageForDownload 
                            ? 'bg-gray-600/30 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-purple-500/50 to-pink-600/50 hover:from-purple-600/60 hover:to-pink-700/60 transform hover:-translate-y-0.5 active:translate-y-0'} 
                          backdrop-blur-sm`}
                        onClick={() => setShowDownloadPopup(true)}
                        disabled={!currentImageForDownload}
                      >
                        <div className="relative flex items-center justify-center">
                          <svg 
                            className="w-4 h-4 mr-2" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          <span className="text-sm">Download</span>
                          </div>
                      </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

      <DownloadPopup
        isOpen={showDownloadPopup}
        onClose={() => setShowDownloadPopup(false)}
        imageUrl={currentImageForDownload?.image}
        title={prompt || 'In3D.Ai environment'}
      />

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={subscriptionInfo.plan}
      />

      <AssetGenerationPanel
        isVisible={showAssetPanel}
        prompt={prompt}
        skyboxId={generatedVariations[currentVariationIndex]?.id}
        onAssetsGenerated={handleAssetGeneration}
        onClose={() => setShowAssetPanel(false)}
      />

      {/* Replace the bottom navigation with side arrows */}
      {generatedVariations.length > 0 && (
        <>
          {/* Left Arrow */}
          <button
            onClick={() => handleVariationChange('prev')}
            className="fixed left-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm border border-gray-700/50 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/50 z-50"
            aria-label="Previous variation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => handleVariationChange('next')}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm border border-gray-700/50 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/50 z-50"
            aria-label="Next variation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Variation Counter */}
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-700/50 text-white text-sm z-50">
            {currentVariationIndex + 1} / {generatedVariations.length}
      </div>
        </>
      )}

      {/* Render the 3D background and mesh view if available */}
      {liveSkyboxUrl && <SkyboxBackground imageUrl={liveSkyboxUrl} />}
      {liveMeshUrl && (
        <div className="fixed inset-0 w-full h-full z-10 pointer-events-none">
          <Meshy3DViewer
            modelUrl={liveMeshUrl}
            autoRotate={true}
            showControls={false}
            showEnvironment={false}
            backgroundColor="transparent"
            className="w-full h-full"
          />
        </div>
      )}

      {/* Storage Status Indicator */}
      <StorageStatusIndicator />
      
      {/* Configuration Diagnostic - Show in development or when there are errors */}
      {(process.env.NODE_ENV === 'development' || serviceStatusError || !storageAvailable) && (
        <ConfigurationDiagnostic />
      )}
    </div>
  );
}

export default MainSection;