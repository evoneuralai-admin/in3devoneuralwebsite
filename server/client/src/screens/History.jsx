import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AssetViewerWithSkybox } from '../Components/AssetViewerWithSkybox';

const History = ({ setBackgroundSkybox }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSkybox, setSelectedSkybox] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'completed', 'pending'
  const [previewItem, setPreviewItem] = useState(null); // Item to show in preview modal
  const [previewType, setPreviewType] = useState('skybox'); // 'skybox' or '3d'
  const navigate = useNavigate();
  const { user } = useAuth();

  // Reusable thumbnail image component with proxy fallback
  const ThumbnailImage = ({ src, alt, className }) => {
    const [imageSrc, setImageSrc] = React.useState(src);
    const [hasError, setHasError] = React.useState(false);
    
    // Helper to check if URL is a 3D model file
    const is3DModelUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      const urlLower = url.toLowerCase();
      return urlLower.includes('.glb') || 
             urlLower.includes('.gltf') || 
             urlLower.includes('.fbx') || 
             urlLower.includes('.obj') || 
             urlLower.includes('.usdz') ||
             urlLower.includes('model.glb');
    };
    
    // Helper to check if URL is a video file
    const isVideoUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      const urlLower = url.toLowerCase();
      return urlLower.includes('.mp4') || 
             urlLower.includes('output.mp4') || 
             urlLower.includes('video');
    };
    
    React.useEffect(() => {
      // Don't try to load 3D model URLs as images
      if (is3DModelUrl(src)) {
        console.warn('⚠️ Thumbnail: Skipping 3D model URL (cannot display as image):', src);
        setHasError(true);
        return;
      }
      
      setImageSrc(src);
      setHasError(false);
    }, [src]);
    
    const handleError = async (e) => {
      if (hasError) return; // Already tried proxy
      
      // Don't try proxy for video URLs or 3D model URLs
      if (isVideoUrl(src) || is3DModelUrl(src)) {
        console.warn('⚠️ Thumbnail: Skipping proxy for non-image URL:', src);
        setHasError(true);
        e.target.style.display = 'none';
        if (e.target.nextSibling) {
          e.target.nextSibling.style.display = 'flex';
        }
        return;
      }
      
      // Try proxy fallback
      try {
        const { getApiBaseUrl } = await import('../utils/apiConfig');
        const proxyUrl = `${getApiBaseUrl()}/proxy-asset?url=${encodeURIComponent(src)}`;
        console.log('🔄 Thumbnail: Trying proxy URL for:', src);
        setImageSrc(proxyUrl);
        setHasError(false);
      } catch (err) {
        console.error('❌ Thumbnail: Failed to get proxy URL:', err);
        setHasError(true);
        e.target.style.display = 'none';
        if (e.target.nextSibling) {
          e.target.nextSibling.style.display = 'flex';
        }
      }
    };
    
    if (hasError && imageSrc === src) {
      // If direct failed and we're still on direct, hide image
      return null;
    }
    
    return (
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onError={handleError}
        crossOrigin="anonymous"
      />
    );
  };

  useEffect(() => {
    if (!user?.uid) {
      console.log('⚠️ History: No user ID, skipping query');
      setLoading(false);
      setHistory([]);
      return;
    }

    console.log('🔍 History: Starting to load history for user:', user.uid);
    console.log('🔍 History: User object:', { uid: user.uid, email: user.email });
    console.log('🔍 History: Firestore db instance:', db ? 'Available' : 'Missing');
    
    if (!db) {
      console.error('❌ History: Firestore db is not available!');
      setError('Firestore database is not initialized. Please refresh the page.');
      setLoading(false);
      setHistory([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Query both skyboxes and unified_jobs collections
    const skyboxesRef = collection(db, 'skyboxes');
    const jobsRef = collection(db, 'unified_jobs');
    
    // Use simple query without orderBy to avoid index requirements - always sort client-side
    const skyboxQuery = query(
      skyboxesRef,
      where('userId', '==', user.uid)
    );
    
    const jobsQuery = query(
      jobsRef,
      where('userId', '==', user.uid)
    );
    
    console.log(`🔍 History: Query created for userId: ${user.uid}`);
    console.log(`🔍 History: Query details:`, {
      collections: ['skyboxes', 'unified_jobs'],
      filter: `userId == '${user.uid}'`,
      hasOrderBy: false
    });

    let skyboxUnsubscribe;
    let jobsUnsubscribe;
    let skyboxData = [];
    let jobsData = [];
    let hasProcessed = false;
    let processTimeout = null;
    let skyboxQueryComplete = false;
    let jobsQueryComplete = false;
    
    // Fallback timeout to ensure we process data even if queries hang
    const fallbackTimeout = setTimeout(() => {
      if (!hasProcessed) {
        console.warn('⚠️ History: Fallback timeout reached, processing available data');
        processAndMergeData();
      }
    }, 10000); // 10 second fallback

    const processAndMergeData = () => {
      try {
        // Clear any pending timeout
        if (processTimeout) {
          clearTimeout(processTimeout);
        }

        // Debounce processing to avoid multiple rapid updates
        processTimeout = setTimeout(() => {
          try {
            const allItems = [...skyboxData, ...jobsData];
            
            // Filter out invalid items
            const validItems = allItems.filter(item => {
              if (!item || !item.id) return false;
              
              // Check for file_url (skybox image)
              const hasFileUrl = !!item.file_url;
              
              // Check for meshUrl (3D model URL)
              const hasMeshUrl = !!item.jobData?.meshUrl;
              
              // Check for model_urls in meshResult (3D model URLs from Meshy API)
              const hasModelUrls = !!(item.jobData?.model_urls || item.jobData?.meshResult?.model_urls);
              
              // Check for skybox URL in jobData
              const hasSkyboxUrl = !!(item.jobData?.skyboxUrl || item.jobData?.skyboxResult?.fileUrl);
              
              // Item is valid if it has at least one of these
              const isValid = hasFileUrl || hasMeshUrl || hasModelUrls || hasSkyboxUrl;
              
              if (!isValid) {
                console.warn(`⚠️ History: Item ${item.id} has no valid URLs (file_url, meshUrl, model_urls, or skyboxUrl), skipping`);
                return false;
              }
              
              return true;
            });
            
            // Always sort by createdAt client-side (most recent first)
            validItems.sort((a, b) => {
              try {
                const aTime = a.created_at?.toDate ? a.created_at.toDate().getTime() : 
                             (a.created_at ? new Date(a.created_at).getTime() : 0);
                const bTime = b.created_at?.toDate ? b.created_at.toDate().getTime() : 
                             (b.created_at ? new Date(b.created_at).getTime() : 0);
                return bTime - aTime; // Descending order (newest first)
              } catch (sortErr) {
                console.warn('⚠️ History: Error sorting items, using default order:', sortErr);
                return 0;
              }
            });

            console.log(`✅ History: Processed ${validItems.length} items (${skyboxData.length} skyboxes, ${jobsData.length} jobs), sorted by createdAt`);
            setHistory(validItems);
            setLoading(false);
            setError(null);
            hasProcessed = true;
          } catch (err) {
            console.error("❌ History: Error processing merged data:", err);
            setError("Error processing history data: " + err.message);
            setLoading(false);
          }
        }, 100); // 100ms debounce
      } catch (err) {
        console.error("❌ History: Error in processAndMergeData:", err);
        setError("Error processing history data: " + err.message);
        setLoading(false);
      }
    };

    // Listen to skyboxes collection
    skyboxUnsubscribe = onSnapshot(
      skyboxQuery,
      (snapshot) => {
        try {
          skyboxQueryComplete = true;
          
          if (snapshot.empty) {
            console.log('📦 History: No skybox documents found');
            skyboxData = [];
            processAndMergeData();
            return;
          }

          console.log(`📦 History: Received ${snapshot.docs.length} skybox documents from Firestore`);
          
          skyboxData = snapshot.docs.map(doc => {
            try {
              const data = doc.data();
              
              // Validate required fields
              if (!data.userId || data.userId !== user.uid) {
                console.warn(`⚠️ History: Skipping skybox ${doc.id} - userId mismatch`);
                return null;
              }
              
              // Get file URL with multiple fallbacks
              const fileUrl = data.imageUrl || 
                            data.image || 
                            data.file_url || 
                            data.skyboxUrl || 
                            data.preview_url ||
                            data.fileUrl ||
                            data.downloadUrl;
              
              // Validate we have at least a title or prompt
              const title = data.title || data.promptUsed || data.prompt || 'Untitled Generation';
              const prompt = data.promptUsed || data.prompt || '';
              
              // Get created_at with multiple fallbacks
              let createdAt = null;
              if (data.createdAt) {
                createdAt = data.createdAt;
              } else if (data.created_at) {
                createdAt = data.created_at;
              } else if (doc.metadata?.createTime) {
                createdAt = doc.metadata.createTime;
              } else {
                // Fallback to current time if no timestamp
                createdAt = new Date();
              }
              
              const baseSkybox = {
                id: doc.id,
                file_url: fileUrl,
                title: title,
                prompt: prompt,
                created_at: createdAt,
                status: data.status || 'completed',
                metadata: data.metadata || {},
                isVariation: false,
                source: 'skyboxes'
              };

              // If there are variations, include them in the same object
              if (data.variations && Array.isArray(data.variations) && data.variations.length > 0) {
                baseSkybox.variations = data.variations
                  .filter(v => v !== null && v !== undefined) // Filter out null/undefined variations
                  .map((variation, index) => {
                    const variationFileUrl = variation.image || 
                                           variation.image_jpg || 
                                           variation.file_url || 
                                           variation.preview_url ||
                                           variation.fileUrl;
                    return {
                      id: `${doc.id}_variation_${index}`,
                      file_url: variationFileUrl,
                      title: variation.title || `${baseSkybox.title} (Variation ${index + 1})`,
                      prompt: variation.prompt || baseSkybox.prompt,
                      created_at: createdAt,
                      status: variation.status || data.status || 'completed',
                      metadata: data.metadata || {},
                      isVariation: true,
                      parentId: doc.id,
                      variationIndex: index,
                      source: 'skyboxes'
                    };
                  });
              } else {
                baseSkybox.variations = [];
              }

              return baseSkybox;
            } catch (docErr) {
              console.error(`❌ History: Error processing skybox document ${doc.id}:`, docErr);
              return null;
            }
          }).filter(item => item !== null);

          processAndMergeData();
        } catch (err) {
          console.error("❌ History: Error processing skybox data:", err);
          setError("Error processing skybox data: " + err.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error("❌ History: Error in skybox listener:", err);
        console.error("   Error code:", err.code);
        console.error("   Error message:", err.message);
        console.error("   Error details:", err);
        
        // Handle specific error codes
        let errorMessage = 'Failed to load skybox history';
        if (err.code === 'permission-denied') {
          errorMessage = "Permission denied. Please check your authentication and refresh the page.";
        } else if (err.code === 'unavailable') {
          errorMessage = "Firestore is temporarily unavailable. Please check your internet connection and try again.";
        } else if (err.code === 'unauthenticated') {
          errorMessage = "Please sign in to view your history.";
        } else if (err.message) {
          errorMessage = `Failed to load skybox history: ${err.message}`;
        }
        
        // Set error but don't block jobs query - continue with jobs data
        skyboxQueryComplete = true;
        skyboxData = []; // Reset skybox data on error
        processAndMergeData(); // Process with empty skybox data
        // Only set error if jobs query also fails
        if (!jobsQueryComplete) {
          setError(errorMessage);
        }
      }
    );

    // Listen to unified_jobs collection
    jobsUnsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        try {
          jobsQueryComplete = true;
          
          if (snapshot.empty) {
            console.log('📦 History: No job documents found');
            jobsData = [];
            processAndMergeData();
            return;
          }

          console.log(`📦 History: Received ${snapshot.docs.length} job documents from Firestore`);
          
          jobsData = snapshot.docs.map(doc => {
            try {
              const data = doc.data();
              
              // Validate required fields
              if (!data.userId || data.userId !== user.uid) {
                console.warn(`⚠️ History: Skipping job ${doc.id} - userId mismatch`);
                return null;
              }
              
              // Normalize errors field - handle both array and object formats for backward compatibility
              let errors = [];
              if (data.errors) {
                if (Array.isArray(data.errors)) {
                  errors = data.errors;
                } else if (typeof data.errors === 'object') {
                  // Handle legacy object format: { id, prompt, status }
                  // Convert to array of error messages
                  if (data.errors.status && data.errors.status !== 'completed') {
                    errors = [`Status: ${data.errors.status}`];
                  }
                  if (data.errors.prompt) {
                    errors.push(`Prompt: ${data.errors.prompt}`);
                  }
                }
              }
              
              // Helper to check if URL is a video file
              const isVideoUrl = (url) => {
                if (!url || typeof url !== 'string') return false;
                const urlLower = url.toLowerCase();
                return urlLower.includes('.mp4') || 
                       urlLower.includes('output.mp4') || 
                       urlLower.includes('/output/output.mp4') ||
                       urlLower.includes('video');
              };
              
              // Helper to check if URL is a 3D model file
              const is3DModelUrl = (url) => {
                if (!url || typeof url !== 'string') return false;
                if (isVideoUrl(url)) return false;
                const urlLower = url.toLowerCase();
                return urlLower.includes('.glb') || 
                       urlLower.includes('.gltf') || 
                       urlLower.includes('.fbx') || 
                       urlLower.includes('.obj') || 
                       urlLower.includes('.usdz') ||
                       urlLower.includes('model.glb');
              };
              
              // Get file URL with multiple fallbacks (but exclude video URLs and 3D model URLs)
              // Prioritize skybox URLs, then image URLs, but never video URLs or 3D model URLs
              let fileUrl = data.skyboxUrl || 
                           data.skyboxResult?.fileUrl || 
                           data.skyboxResult?.downloadUrl || 
                           data.skyboxResult?.preview_url ||
                           data.imageUrl ||
                           data.file_url ||
                           data.fileUrl;
              
              // Filter out video and 3D model URLs
              if (fileUrl && (isVideoUrl(fileUrl) || is3DModelUrl(fileUrl))) {
                fileUrl = null;
              }
              
              // Only use meshResult URLs if they're not videos or 3D models (meshResult might have video previews or GLB URLs)
              if (!fileUrl) {
                const meshPreviewUrl = data.meshResult?.previewUrl;
                const meshDownloadUrl = data.meshResult?.downloadUrl;
                
                // Use mesh URLs only if they're not videos or 3D models
                if (meshPreviewUrl && !isVideoUrl(meshPreviewUrl) && !is3DModelUrl(meshPreviewUrl)) {
                  fileUrl = meshPreviewUrl;
                } else if (meshDownloadUrl && !isVideoUrl(meshDownloadUrl) && !is3DModelUrl(meshDownloadUrl)) {
                  fileUrl = meshDownloadUrl;
                } else if (data.meshResult?.preview_url && !isVideoUrl(data.meshResult.preview_url) && !is3DModelUrl(data.meshResult.preview_url)) {
                  fileUrl = data.meshResult.preview_url;
                } else {
                  // If all URLs are videos or 3D models, set to null (we'll use model_urls for 3D preview)
                  fileUrl = null;
                }
              }
              
              // Log if we found a video or 3D model URL and rejected it
              if (data.meshResult?.downloadUrl) {
                if (isVideoUrl(data.meshResult.downloadUrl)) {
                  console.log(`ℹ️ History: Item ${doc.id} has video URL in meshResult.downloadUrl, will use model_urls for 3D preview instead`);
                } else if (is3DModelUrl(data.meshResult.downloadUrl)) {
                  console.log(`ℹ️ History: Item ${doc.id} has 3D model URL in meshResult.downloadUrl, will use model_urls for 3D preview instead`);
                }
              }
              
              // Validate we have at least a title or prompt
              const title = data.prompt || data.title || 'Untitled Generation';
              const prompt = data.prompt || '';
              
              // Get created_at with multiple fallbacks
              let createdAt = null;
              if (data.createdAt) {
                createdAt = data.createdAt;
              } else if (data.created_at) {
                createdAt = data.created_at;
              } else if (doc.metadata?.createTime) {
                createdAt = doc.metadata.createTime;
              } else {
                // Fallback to current time if no timestamp
                createdAt = new Date();
              }
              
              // Extract model_urls from multiple possible locations
              const extractedModelUrls = data.meshResult?.model_urls || 
                                        data.model_urls || 
                                        (data.meshResult && typeof data.meshResult === 'object' && 'model_urls' in data.meshResult ? data.meshResult.model_urls : null) ||
                                        null;
              
              // Debug logging for model_urls extraction
              if (data.meshResult && !extractedModelUrls) {
                console.log(`🔍 History: Item ${doc.id} has meshResult but no model_urls found:`, {
                  hasMeshResult: !!data.meshResult,
                  meshResultKeys: data.meshResult ? Object.keys(data.meshResult) : [],
                  meshResultType: typeof data.meshResult
                });
              } else if (extractedModelUrls) {
                console.log(`✅ History: Item ${doc.id} has model_urls:`, {
                  hasGlb: !!extractedModelUrls.glb,
                  hasFbx: !!extractedModelUrls.fbx,
                  hasObj: !!extractedModelUrls.obj,
                  hasUsdz: !!extractedModelUrls.usdz
                });
              }
              
              // Convert job to history item format
              const jobItem = {
                id: doc.id,
                file_url: fileUrl,
                title: title,
                prompt: prompt,
                created_at: createdAt,
                status: data.status || 'pending',
                metadata: {
                  ...(data.metadata || {}),
                  jobId: doc.id,
                  hasSkybox: !!(data.skyboxUrl || data.skyboxResult),
                  hasMesh: !!(data.meshUrl || data.meshResult),
                  errors: errors
                },
                isVariation: false,
                source: 'unified_jobs',
                // Include full job data for potential future use
                jobData: {
                  skyboxUrl: data.skyboxUrl || data.skyboxResult?.fileUrl || data.skyboxResult?.downloadUrl,
                  meshUrl: data.meshUrl,
                  skyboxResult: data.skyboxResult || null,
                  meshResult: data.meshResult || null,
                  // Include model_urls if available (from Meshy API response)
                  model_urls: extractedModelUrls
                }
              };

              // If job has both skybox and mesh, create variations
              if ((data.skyboxUrl || data.skyboxResult) && (data.meshUrl || data.meshResult)) {
                const skyboxVariationUrl = data.skyboxUrl || 
                                          data.skyboxResult?.fileUrl || 
                                          data.skyboxResult?.downloadUrl ||
                                          data.skyboxResult?.preview_url;
                const meshVariationUrl = data.meshResult?.previewUrl || 
                                       data.meshResult?.downloadUrl || 
                                       data.meshUrl ||
                                       data.meshResult?.preview_url;
                
                jobItem.variations = [
                  {
                    id: `${doc.id}_skybox`,
                    file_url: skyboxVariationUrl,
                    title: `${jobItem.title} (Skybox)`,
                    prompt: jobItem.prompt,
                    created_at: createdAt,
                    status: data.skyboxResult?.status || data.status || 'completed',
                    isVariation: true,
                    parentId: doc.id,
                    variationIndex: 0,
                    jobData: jobItem.jobData,
                    source: 'unified_jobs'
                  },
                  {
                    id: `${doc.id}_mesh`,
                    file_url: meshVariationUrl,
                    title: `${jobItem.title} (3D Asset)`,
                    prompt: jobItem.prompt,
                    created_at: createdAt,
                    status: data.meshResult?.status || data.status || 'completed',
                    isVariation: true,
                    parentId: doc.id,
                    variationIndex: 1,
                    jobData: jobItem.jobData,
                    source: 'unified_jobs'
                  }
                ].filter(v => v.file_url); // Only include variations with file URLs
              } else {
                jobItem.variations = [];
              }

              return jobItem;
            } catch (docErr) {
              console.error(`❌ History: Error processing job document ${doc.id}:`, docErr);
              return null;
            }
          }).filter(item => item !== null);

          processAndMergeData();
        } catch (err) {
          console.error("❌ History: Error processing job data:", err);
          setError("Error processing job data: " + err.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error("❌ History: Error in jobs listener:", err);
        console.error("   Error code:", err.code);
        console.error("   Error message:", err.message);
        console.error("   Error details:", err);
        
        // Handle specific error codes
        let errorMessage = 'Failed to load generation history';
        if (err.code === 'permission-denied') {
          errorMessage = "Permission denied. Please check your authentication and refresh the page.";
        } else if (err.code === 'unavailable') {
          errorMessage = "Firestore is temporarily unavailable. Please check your internet connection and try again.";
        } else if (err.code === 'unauthenticated') {
          errorMessage = "Please sign in to view your history.";
        } else if (err.code === 'failed-precondition') {
          errorMessage = "Database query failed. Please refresh the page.";
        } else if (err.message) {
          errorMessage = `Failed to load generation history: ${err.message}`;
        }
        
        jobsQueryComplete = true;
        jobsData = []; // Reset jobs data on error
        processAndMergeData(); // Process with empty jobs data
        // Set error message
        setError(errorMessage);
      }
    );

    return () => {
      // Cleanup: unsubscribe from listeners
      if (skyboxUnsubscribe) {
        try {
          skyboxUnsubscribe();
          console.log('🧹 History: Skybox listener unsubscribed');
        } catch (err) {
          console.error('❌ History: Error unsubscribing skybox listener:', err);
        }
      }
      if (jobsUnsubscribe) {
        try {
          jobsUnsubscribe();
          console.log('🧹 History: Jobs listener unsubscribed');
        } catch (err) {
          console.error('❌ History: Error unsubscribing jobs listener:', err);
        }
      }
      // Clear timeouts if exist
      if (processTimeout) {
        clearTimeout(processTimeout);
      }
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
      }
      // Reset data
      skyboxData = [];
      jobsData = [];
      hasProcessed = false;
      skyboxQueryComplete = false;
      jobsQueryComplete = false;
    };
  }, [user?.uid]);

  const handleSkyboxClick = (item) => {
    if (!item.file_url) {
      console.warn("No file URL available for this skybox");
      return;
    }

    setSelectedSkybox(item);
    setSelectedVariation(null);
    const skyboxData = {
      image: item.file_url,
      image_jpg: item.file_url,
      title: formatTitle(item.title),
      prompt: item.prompt,
      metadata: item.metadata
    };
    if (setBackgroundSkybox) {
      setBackgroundSkybox(skyboxData);
    }
  };

  const handleItemClick = (item, e) => {
    // Don't open preview if clicking on buttons or interactive elements
    if (e?.target?.closest('button') || e?.target?.closest('a')) {
      return;
    }
    
    // Validate item before opening preview
    if (!item || !item.id) {
      console.error('❌ Cannot open preview: Invalid item');
      return;
    }
    
    // Open preview viewer when clicking on the card
    handlePreviewClick(item, e);
  };

  const handlePreviewClick = (item, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    // Validate item
    if (!item || !item.id) {
      console.error('❌ Preview: Invalid item provided');
      return;
    }
    
    // Helper to check if URL is a video file
    const isVideoUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      const urlLower = url.toLowerCase();
      // Check for video extensions
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
      if (videoExtensions.some(ext => urlLower.includes(ext))) {
        return true;
      }
      // Check for specific video URL patterns
      if (urlLower.includes('/output/output.mp4') || 
          urlLower.includes('/output.mp4') ||
          urlLower.includes('video') ||
          urlLower.includes('output.mp4')) {
        return true;
      }
      return false;
    };
    
    // Helper to check if URL is a 3D model file
    const is3DModelUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      if (isVideoUrl(url)) return false;
      const urlLower = url.toLowerCase();
      return urlLower.includes('.glb') || 
             urlLower.includes('.gltf') || 
             urlLower.includes('.fbx') || 
             urlLower.includes('.obj') || 
             urlLower.includes('.usdz');
    };
    
    // Get file_url with comprehensive fallbacks
    let fileUrl = item.file_url || 
                  item.jobData?.skyboxUrl || 
                  item.jobData?.skyboxResult?.fileUrl ||
                  item.jobData?.skyboxResult?.downloadUrl ||
                  item.jobData?.skyboxResult?.preview_url ||
                  item.jobData?.meshResult?.previewUrl ||
                  item.jobData?.meshResult?.downloadUrl ||
                  null;
    
    // Get 3D model URL - ALWAYS prioritize GLB from model_urls first
    let meshUrl = null;
    let meshFormat = 'glb';
    
    // STEP 1: ALWAYS check model_urls FIRST (highest priority for GLB)
    const modelUrls = item.jobData?.model_urls || item.jobData?.meshResult?.model_urls;
    if (modelUrls) {
      // Prioritize GLB, then FBX, OBJ, USDZ - but skip video URLs
      if (modelUrls.glb && !isVideoUrl(modelUrls.glb)) {
        meshUrl = modelUrls.glb;
        meshFormat = 'glb';
        console.log('✅ Found GLB in model_urls:', meshUrl);
      } else if (modelUrls.fbx && !isVideoUrl(modelUrls.fbx)) {
        meshUrl = modelUrls.fbx;
        meshFormat = 'fbx';
        console.log('✅ Found FBX in model_urls:', meshUrl);
      } else if (modelUrls.obj && !isVideoUrl(modelUrls.obj)) {
        meshUrl = modelUrls.obj;
        meshFormat = 'obj';
        console.log('✅ Found OBJ in model_urls:', meshUrl);
      } else if (modelUrls.usdz && !isVideoUrl(modelUrls.usdz)) {
        meshUrl = modelUrls.usdz;
        meshFormat = 'usdz';
        console.log('✅ Found USDZ in model_urls:', meshUrl);
      }
    }
    
    // STEP 2: Check meshResult.downloadUrl if no model_urls found
    if (!meshUrl && item.jobData?.meshResult?.downloadUrl) {
      const downloadUrl = item.jobData.meshResult.downloadUrl;
      if (is3DModelUrl(downloadUrl) && !isVideoUrl(downloadUrl)) {
        meshUrl = downloadUrl;
        meshFormat = item.jobData.meshResult.format || 'glb';
        console.log('✅ Found 3D model in meshResult.downloadUrl:', meshUrl);
      }
    }
    
    // STEP 3: Fallback to meshUrl from jobData (only if it's a 3D model, not video)
    if (!meshUrl && item.jobData?.meshUrl) {
      if (is3DModelUrl(item.jobData.meshUrl) && !isVideoUrl(item.jobData.meshUrl)) {
        meshUrl = item.jobData.meshUrl;
        console.log('✅ Found 3D model in jobData.meshUrl:', meshUrl);
      } else if (isVideoUrl(item.jobData.meshUrl)) {
        console.warn('⚠️ jobData.meshUrl is a video, skipping:', item.jobData.meshUrl);
      }
    }
    
    // Ensure fileUrl is set for skybox preview
    if (!fileUrl && !meshUrl) {
      console.warn('⚠️ Preview: No file URL or mesh URL available for item:', item.id);
      // Still open preview to show item info
    }
    
    // More comprehensive 3D asset detection
    const hasModelUrls = !!(item.jobData?.model_urls || item.jobData?.meshResult?.model_urls);
    const has3DAsset = !!meshUrl || 
                      item.metadata?.hasMesh || 
                      !!item.jobData?.meshUrl ||
                      !!item.jobData?.meshResult ||
                      hasModelUrls;
    
    // Validate meshUrl is actually a 3D model (not video)
    const isValid3DUrl = meshUrl && !isVideoUrl(meshUrl) && is3DModelUrl(meshUrl);
    
    console.log('🔍 Preview click:', {
      itemId: item.id,
      itemTitle: item.title,
      has3DAsset,
      hasModelUrls,
      meshUrl,
      meshFormat,
      isValid3DUrl,
      file_url: fileUrl,
      original_file_url: item.file_url,
      meshResult: item.jobData?.meshResult,
      model_urls: item.jobData?.model_urls || item.jobData?.meshResult?.model_urls,
      jobData_meshUrl: item.jobData?.meshUrl,
      metadata_hasMesh: item.metadata?.hasMesh,
      downloadUrl: item.jobData?.meshResult?.downloadUrl,
      isVideo: meshUrl ? isVideoUrl(meshUrl) : false,
      finalMeshUrl: meshUrl
    });
    
    // Prioritize 3D preview if we have a valid 3D model URL
    if (has3DAsset && isValid3DUrl) {
      console.log('✅ Opening 3D preview with meshUrl:', meshUrl);
      setPreviewType('3d');
      setPreviewItem({
        ...item,
        file_url: fileUrl || item.file_url, // Ensure file_url is set for skybox background
        meshUrl,
        meshFormat,
        // Preserve all jobData for 3D viewer
        jobData: {
          ...item.jobData,
          meshUrl: meshUrl,
          model_urls: item.jobData?.model_urls || item.jobData?.meshResult?.model_urls
        }
      });
    } else if (has3DAsset && !isValid3DUrl && hasModelUrls) {
      // Has model_urls but meshUrl might be invalid - extract from model_urls
      const modelUrls = item.jobData?.model_urls || item.jobData?.meshResult?.model_urls;
      if (modelUrls) {
        const extractedUrl = modelUrls.glb || modelUrls.fbx || modelUrls.obj || modelUrls.usdz;
        const extractedFormat = modelUrls.glb ? 'glb' : modelUrls.fbx ? 'fbx' : modelUrls.obj ? 'obj' : 'usdz';
        if (extractedUrl && !isVideoUrl(extractedUrl)) {
          console.log('✅ Extracted 3D model URL from model_urls:', extractedUrl);
          setPreviewType('3d');
          setPreviewItem({
            ...item,
            file_url: fileUrl || item.file_url,
            meshUrl: extractedUrl,
            meshFormat: extractedFormat,
            jobData: {
              ...item.jobData,
              meshUrl: extractedUrl,
              model_urls: modelUrls
            }
          });
          return;
        }
      }
      // Has mesh but URL might be invalid - log and try anyway
      console.warn('⚠️ Has 3D asset but URL validation failed, attempting 3D preview anyway:', meshUrl);
      setPreviewType('3d');
      setPreviewItem({
        ...item,
        file_url: fileUrl || item.file_url,
        meshUrl,
        meshFormat: meshFormat || 'glb',
        jobData: {
          ...item.jobData,
          meshUrl: meshUrl
        }
      });
    } else {
      // Fallback to skybox preview - always open preview even if no file_url
      console.log('✅ Opening skybox preview with file_url:', fileUrl || item.file_url);
      setPreviewType('skybox');
      setPreviewItem({
        ...item,
        file_url: fileUrl || item.file_url, // Use found fileUrl or original
        meshUrl: null,
        meshFormat: null
      });
    }
  };

  const closePreview = () => {
    setPreviewItem(null);
    setPreviewType('skybox');
  };

  // Auto-detect and switch to 3D preview when previewItem changes
  useEffect(() => {
    if (!previewItem) return;
    
    // Helper to extract 3D model URL from model_urls
    const get3DModelUrl = () => {
      // First, check if meshUrl is already a valid 3D model (not video)
      if (previewItem.meshUrl) {
        const urlLower = previewItem.meshUrl.toLowerCase();
        const isVideo = urlLower.includes('.mp4') || 
                       urlLower.includes('output.mp4') || 
                       urlLower.includes('/output/output.mp4') ||
                       urlLower.includes('video');
        const is3DModel = urlLower.includes('.glb') || 
                         urlLower.includes('.gltf') || 
                         urlLower.includes('.fbx') || 
                         urlLower.includes('.obj') || 
                         urlLower.includes('.usdz');
        
        if (!isVideo && is3DModel) {
          console.log('✅ Found valid 3D model URL in meshUrl:', previewItem.meshUrl);
          return { url: previewItem.meshUrl, format: previewItem.meshFormat || 'glb' };
        } else if (isVideo) {
          console.warn('⚠️ meshUrl is a video, ignoring:', previewItem.meshUrl);
        }
      }
      
      // Try to get from model_urls
      const modelUrls = previewItem.jobData?.model_urls || 
                      previewItem.jobData?.meshResult?.model_urls;
      
      console.log('🔍 Checking model_urls:', {
        hasJobDataModelUrls: !!previewItem.jobData?.model_urls,
        hasMeshResultModelUrls: !!previewItem.jobData?.meshResult?.model_urls,
        modelUrls: modelUrls
      });
      
      if (modelUrls) {
        // Prioritize GLB, then FBX, OBJ, USDZ
        if (modelUrls.glb) {
          console.log('✅ Found GLB URL in model_urls:', modelUrls.glb);
          return { url: modelUrls.glb, format: 'glb' };
        } else if (modelUrls.fbx) {
          console.log('✅ Found FBX URL in model_urls:', modelUrls.fbx);
          return { url: modelUrls.fbx, format: 'fbx' };
        } else if (modelUrls.obj) {
          console.log('✅ Found OBJ URL in model_urls:', modelUrls.obj);
          return { url: modelUrls.obj, format: 'obj' };
        } else if (modelUrls.usdz) {
          console.log('✅ Found USDZ URL in model_urls:', modelUrls.usdz);
          return { url: modelUrls.usdz, format: 'usdz' };
        }
      }
      
      console.warn('⚠️ No valid 3D model URL found in model_urls');
      return null;
    };
    
    const modelData = get3DModelUrl();
    
    // Auto-switch to 3D preview if we have a valid model but previewType is not '3d'
    if (modelData && modelData.url && previewType !== '3d') {
      console.log('🔄 Auto-detecting 3D asset, switching to 3D preview:', {
        url: modelData.url,
        format: modelData.format,
        hasMesh: previewItem.metadata?.hasMesh,
        currentPreviewType: previewType
      });
      setPreviewType('3d');
      setPreviewItem(prev => ({ 
        ...prev, 
        meshUrl: modelData.url, 
        meshFormat: modelData.format 
      }));
    } else if (!modelData && previewItem.metadata?.hasMesh) {
      console.warn('⚠️ Item has hasMesh=true but no valid 3D model URL found:', {
        meshUrl: previewItem.meshUrl,
        jobData: previewItem.jobData,
        model_urls: previewItem.jobData?.model_urls || previewItem.jobData?.meshResult?.model_urls
      });
    }
  }, [previewItem?.id, previewItem?.meshUrl, previewItem?.jobData?.model_urls, previewItem?.jobData?.meshResult?.model_urls, previewItem?.metadata?.hasMesh, previewType]);

  const handleVariationClick = (variation) => {
    if (!variation.file_url) {
      console.warn("No file URL available for this variation");
      return;
    }

    setSelectedVariation(variation);
    const skyboxData = {
      image: variation.file_url,
      image_jpg: variation.file_url,
      title: formatTitle(variation.title),
      prompt: variation.prompt,
      metadata: variation.metadata
    };
    setBackgroundSkybox(skyboxData);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date';
    
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    const date = new Date(timestamp);
    return isNaN(date.getTime()) 
      ? 'Invalid Date'
      : date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  };

  const formatTitle = (title) => {
    if (!title) return 'Untitled Generation';
    return title.replace(/^World #\d+ /, '').trim();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'complete':
        return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40 shadow-emerald-500/20';
      case 'pending':
      case 'processing':
        return 'text-amber-300 bg-amber-500/20 border-amber-500/40 shadow-amber-500/20';
      case 'failed':
        return 'text-red-300 bg-red-500/20 border-red-500/40 shadow-red-500/20';
      case 'partial':
        return 'text-blue-300 bg-blue-500/20 border-blue-500/40 shadow-blue-500/20';
      default:
        return 'text-gray-300 bg-gray-500/20 border-gray-500/40 shadow-gray-500/20';
    }
  };

  const filteredHistory = history.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const downloadImage = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 pt-20 bg-transparent min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white/90 mb-2">Generation History</h1>
            <p className="text-gray-400">Manage and explore your created In3D.Ai environments</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                // Force refresh by re-triggering the query
                console.log('🔄 Manual refresh triggered');
                setLoading(true);
                // The useEffect will re-run when loading state changes, but we need to force it
                // Actually, the onSnapshot should auto-update, so this is just for user feedback
                setTimeout(() => setLoading(false), 1000);
              }}
              className="px-4 py-2 bg-[#141414]/60 hover:bg-[#141414]/80 text-white rounded-xl transition-all duration-200 text-sm border border-[#262626]"
              title="Refresh history"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => navigate('/main')}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create New</span>
              </div>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-[#141414]/60 rounded-xl p-1 border border-[#262626]">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-[#141414]/60 border border-[#262626] rounded-xl text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="text-sm text-gray-400">
            {filteredHistory.length} generation{filteredHistory.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 backdrop-blur-0 rounded-xl border border-red-500/30">
            <p className="text-red-300 font-semibold mb-2">Error loading history:</p>
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                // Force re-render by updating a dependency
                window.location.reload();
              }}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm"
            >
              Retry
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-t-2 border-b-2 border-blue-400 rounded-full animate-spin"></div>
              <p className="text-blue-300">Loading your generations...</p>
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="relative bg-[#141414]/60 backdrop-blur-0 rounded-xl p-12 text-center border border-[#262626] shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/[0.01] via-transparent to-purple-500/[0.01] pointer-events-none rounded-xl overflow-hidden" />
            <div className="relative">
            <div className="w-16 h-16 bg-[#141414]/60 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#262626]">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No generations found</h3>
            <p className="text-gray-400 mb-6">Start creating your first In3D.Ai environment to see it here</p>
            <button
              onClick={() => navigate('/main')}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 font-medium"
            >
                              Create Your First In3D.Ai Environment
            </button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewMode}-${filterStatus}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}
            >
              {filteredHistory.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={viewMode === 'grid' ? 'space-y-3' : ''}
                  onMouseEnter={() => setHoveredGroup(item.id)}
                  onMouseLeave={() => setHoveredGroup(null)}
                >
                  {/* Main In3D.Ai Environment - Enhanced Card */}
                  <div
                    className={`
                      relative group bg-[#141414]/80 
                      backdrop-blur-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                      transform transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_48px_rgba(0,0,0,0.6)] cursor-pointer
                      border border-[#262626] hover:border-sky-500/50 active:scale-[0.98]
                      ${selectedSkybox?.id === item.id ? 'ring-2 ring-sky-500/70 shadow-sky-500/20' : ''}
                      ${viewMode === 'list' ? 'flex items-center space-x-4 p-4' : ''}
                    `}
                    onClick={(e) => handleItemClick(item, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleItemClick(item, e);
                      }
                    }}
                  >
                    {/* Image Container with Enhanced Styling */}
                    <div className={`relative overflow-hidden ${viewMode === 'grid' ? 'aspect-[16/9]' : 'w-32 h-32 flex-shrink-0 rounded-lg'}`}>
                      {item.file_url && !is3DModelUrl(item.file_url) && !isVideoUrl(item.file_url) ? (
                        <ThumbnailImage 
                          src={item.file_url}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800/90 via-gray-700/80 to-gray-900/90 ${
                          item.file_url ? 'hidden' : 'flex'
                        }`}
                      >
                        <div className="text-center">
                          <svg className="w-12 h-12 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs text-gray-500">No Preview</p>
                        </div>
                      </div>

                      {/* Enhanced Status Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg border backdrop-blur-sm shadow-lg ${getStatusColor(item.status)}`}>
                          <span className="flex items-center gap-1.5">
                            {item.status === 'completed' && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {item.status === 'pending' && (
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            {item.status === 'failed' && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="capitalize">{item.status}</span>
                          </span>
                        </span>
                        {/* Source Indicator */}
                        {item.source && (
                          <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-gray-800/80 backdrop-blur-sm text-gray-300 border border-gray-700/50">
                            {item.source === 'skyboxes' ? 'Skybox' : 'Job'}
                          </span>
                        )}
                      </div>

                      {/* Enhanced Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
                        <div className="p-5 w-full">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="text-white text-sm font-semibold">Click to preview</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Preview Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewClick(item, e);
                                }}
                                className="p-2.5 bg-sky-500/20 hover:bg-sky-500/30 backdrop-blur-sm rounded-lg transition-all duration-200 hover:scale-110 border border-sky-500/30"
                                title="Preview"
                              >
                                <svg className="w-5 h-5 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              {/* Apply Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSkyboxClick(item);
                                }}
                                className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-sm rounded-lg transition-all duration-200 hover:scale-110 border border-emerald-500/30"
                                title="Apply as background"
                              >
                                <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                              </button>
                              {/* Download Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(item.file_url, `${item.title}.jpg`);
                                }}
                                className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all duration-200 hover:scale-110"
                                title="Download"
                              >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {item.prompt && (
                            <p className="text-xs text-gray-300 line-clamp-2 mb-2">{item.prompt}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Content Section */}
                    <div className={viewMode === 'grid' ? 'p-5' : 'flex-1 p-4'}>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-white line-clamp-2 flex-1 pr-2 group-hover:text-blue-300 transition-colors">
                          {formatTitle(item.title)}
                        </h3>
                        {item.variations && item.variations.length > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-md border border-purple-500/30">
                            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="text-xs font-semibold text-purple-300">{item.variations.length}</span>
                          </div>
                        )}
                      </div>
                      
                      {item.prompt && (
                        <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">{item.prompt}</p>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                        {item.metadata?.hasMesh && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-md border border-emerald-500/30">
                            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span className="text-[10px] font-medium text-emerald-300">3D</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Variations Section */}
                  {item.variations && item.variations.length > 0 && (
                    <div className="mt-4 space-y-3 pt-4 border-t border-gray-700/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <h4 className="text-sm font-semibold text-gray-300">Variations</h4>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{item.variations.length} total</span>
                      </div>
                      
                      <div className={`grid gap-3 ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                        {item.variations.map((variation) => (
                          <div
                            key={variation.id}
                            className={`
                              relative group bg-[#141414]/60 backdrop-blur-0 
                              rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)]
                              transform transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] cursor-pointer
                              border border-[#262626] hover:border-purple-500/60 active:scale-95
                              ${selectedVariation?.id === variation.id ? 'ring-2 ring-purple-500/70 shadow-purple-500/30' : ''}
                            `}
                            onClick={() => handleVariationClick(variation)}
                          >
                            <div className="aspect-square relative overflow-hidden">
                              {variation.file_url ? (
                                <img
                                  src={variation.file_url}
                                  alt={variation.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800/90 to-gray-900/90">
                                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}

                              {/* Enhanced Variation Number Badge */}
                              <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg backdrop-blur-sm border border-purple-400/30">
                                #{variation.variationIndex + 1}
                              </div>

                              {/* Enhanced Hover Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
                                <div className="p-3 w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      Apply
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadImage(variation.file_url, `${variation.title}.jpg`);
                                      }}
                                      className="p-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all duration-200 hover:scale-110"
                                      title="Download"
                                    >
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={closePreview}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 bg-[#141414]/95 backdrop-blur-0 rounded-2xl overflow-hidden border border-[#262626] shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
            >
              {/* Close Button */}
              <button
                onClick={closePreview}
                className="absolute top-4 right-4 z-10 p-3 bg-[#141414]/90 hover:bg-[#1a1a1a]/90 backdrop-blur-0 rounded-xl transition-all duration-200 hover:scale-110 border border-[#262626]"
                aria-label="Close preview"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Preview Content */}
              <div className="w-full h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                  <h2 className="text-2xl font-bold text-white mb-2">{formatTitle(previewItem.title)}</h2>
                  {previewItem.prompt && (
                    <p className="text-gray-300 text-sm">{previewItem.prompt}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDate(previewItem.created_at)}
                    </span>
                    <span className={`px-2 py-1 rounded-md border ${getStatusColor(previewItem.status)}`}>
                      {previewItem.status}
                    </span>
                    {previewItem.source && (
                      <span className="px-2 py-1 rounded-md bg-gray-700/50 text-gray-300 border border-gray-600/50">
                        {previewItem.source === 'skyboxes' ? 'Skybox' : 'Job'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Preview Body */}
                <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-900 to-black min-h-[500px]">
                  {(() => {
                    // Helper to check if URL is a video file
                    const isVideoUrl = (url) => {
                      if (!url || typeof url !== 'string') return false;
                      const urlLower = url.toLowerCase();
                      return urlLower.includes('.mp4') || 
                             urlLower.includes('output.mp4') || 
                             urlLower.includes('/output/output.mp4') ||
                             urlLower.includes('video');
                    };
                    
                    // Helper to check if URL is a 3D model file
                    const is3DModelUrl = (url) => {
                      if (!url || typeof url !== 'string') return false;
                      if (isVideoUrl(url)) return false;
                      const urlLower = url.toLowerCase();
                      return urlLower.includes('.glb') || 
                             urlLower.includes('.gltf') || 
                             urlLower.includes('.fbx') || 
                             urlLower.includes('.obj') || 
                             urlLower.includes('.usdz') ||
                             urlLower.includes('model.glb');
                    };
                    
                    // Helper to extract 3D model URL - ALWAYS prioritize GLB from model_urls
                    const get3DModelUrl = () => {
                      console.log('🔍 get3DModelUrl: Extracting 3D model URL...', {
                        hasMeshUrl: !!previewItem.meshUrl,
                        meshUrl: previewItem.meshUrl,
                        hasJobDataModelUrls: !!previewItem.jobData?.model_urls,
                        hasMeshResultModelUrls: !!previewItem.jobData?.meshResult?.model_urls
                      });
                      
                      // FIRST: Always check model_urls for GLB (highest priority)
                      const modelUrls = previewItem.jobData?.model_urls || 
                                      previewItem.jobData?.meshResult?.model_urls;
                      
                      if (modelUrls) {
                        console.log('🔍 Found model_urls:', {
                          hasGlb: !!modelUrls.glb,
                          hasFbx: !!modelUrls.fbx,
                          hasObj: !!modelUrls.obj,
                          hasUsdz: !!modelUrls.usdz,
                          glbUrl: modelUrls.glb
                        });
                        
                        // Prioritize GLB, then FBX, OBJ, USDZ - skip video URLs
                        if (modelUrls.glb && !isVideoUrl(modelUrls.glb)) {
                          console.log('✅ Using GLB from model_urls:', modelUrls.glb);
                          return { url: modelUrls.glb, format: 'glb' };
                        } else if (modelUrls.fbx && !isVideoUrl(modelUrls.fbx)) {
                          console.log('✅ Using FBX from model_urls:', modelUrls.fbx);
                          return { url: modelUrls.fbx, format: 'fbx' };
                        } else if (modelUrls.obj && !isVideoUrl(modelUrls.obj)) {
                          console.log('✅ Using OBJ from model_urls:', modelUrls.obj);
                          return { url: modelUrls.obj, format: 'obj' };
                        } else if (modelUrls.usdz && !isVideoUrl(modelUrls.usdz)) {
                          console.log('✅ Using USDZ from model_urls:', modelUrls.usdz);
                          return { url: modelUrls.usdz, format: 'usdz' };
                        }
                      }
                      
                      // SECOND: Check if meshUrl is a valid 3D model (not video)
                      if (previewItem.meshUrl && is3DModelUrl(previewItem.meshUrl)) {
                        console.log('✅ Using meshUrl as 3D model:', previewItem.meshUrl);
                        return { url: previewItem.meshUrl, format: previewItem.meshFormat || 'glb' };
                      } else if (previewItem.meshUrl && isVideoUrl(previewItem.meshUrl)) {
                        console.warn('⚠️ meshUrl is a video, skipping:', previewItem.meshUrl);
                      }
                      
                      // THIRD: Check downloadUrl from meshResult
                      const downloadUrl = previewItem.jobData?.meshResult?.downloadUrl;
                      if (downloadUrl && is3DModelUrl(downloadUrl)) {
                        console.log('✅ Using downloadUrl as 3D model:', downloadUrl);
                        return { url: downloadUrl, format: 'glb' };
                      }
                      
                      console.warn('⚠️ No valid 3D model URL found');
                      return null;
                    };
                    
                    // Get the actual 3D model URL
                    const modelData = get3DModelUrl();
                    
                    // ALWAYS show 3D preview if we have a valid 3D model URL (regardless of previewType)
                    // This ensures GLB models are displayed instead of videos
                    const hasValid3D = modelData && modelData.url && modelData.url.trim() !== '';
                    
                    // If we have a valid 3D model but previewType isn't '3d', switch it
                    if (hasValid3D && previewType !== '3d') {
                      console.log('🔄 Auto-switching to 3D preview for GLB model:', modelData.url);
                      setPreviewType('3d');
                      setPreviewItem(prev => ({
                        ...prev,
                        meshUrl: modelData.url,
                        meshFormat: modelData.format,
                        jobData: {
                          ...prev.jobData,
                          meshUrl: modelData.url,
                          model_urls: prev.jobData?.model_urls || prev.jobData?.meshResult?.model_urls
                        }
                      }));
                      // Return loading state while switching
                      return (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-white">Loading 3D Asset...</p>
                          </div>
                        </div>
                      );
                    }

                    if (hasValid3D) {
                      // 3D Preview
                      return (
                        <div className="w-full h-full">
                          <Suspense fallback={
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-white">Loading 3D Asset...</p>
                              </div>
                            </div>
                          }>
                            <AssetViewerWithSkybox
                              assetUrl={modelData.url}
                              skyboxImageUrl={(() => {
                                // Helper to check if URL is a video file
                                const isVideoUrl = (url) => {
                                  if (!url || typeof url !== 'string') return false;
                                  const urlLower = url.toLowerCase();
                                  return urlLower.includes('.mp4') || 
                                         urlLower.includes('output.mp4') || 
                                         urlLower.includes('/output/output.mp4') ||
                                         urlLower.includes('video');
                                };
                                
                                // Helper to check if URL is a 3D model file
                                const is3DModelUrl = (url) => {
                                  if (!url || typeof url !== 'string') return false;
                                  if (isVideoUrl(url)) return false;
                                  const urlLower = url.toLowerCase();
                                  return urlLower.includes('.glb') || 
                                         urlLower.includes('.gltf') || 
                                         urlLower.includes('.fbx') || 
                                         urlLower.includes('.obj') || 
                                         urlLower.includes('.usdz');
                                };
                                
                                // Get skybox URL but exclude video URLs and 3D model URLs
                                const candidates = [
                                  previewItem.file_url,
                                  previewItem.jobData?.skyboxUrl,
                                  previewItem.jobData?.skyboxResult?.fileUrl,
                                  previewItem.jobData?.skyboxResult?.downloadUrl
                                ].filter(Boolean);
                                
                                // Find first valid skybox URL (not video, not 3D model)
                                for (const url of candidates) {
                                  if (url && !isVideoUrl(url) && !is3DModelUrl(url)) {
                                    return url;
                                  }
                                }
                                return undefined; // No valid skybox URL - will use default black skybox
                              })()}
                              assetFormat={modelData.format}
                              className="w-full h-full"
                              autoRotate={true}
                              autoRotateSpeed={0.5}
                              onLoad={(model) => {
                                console.log('✅ 3D asset loaded successfully in preview');
                                console.log('📦 3D model URL:', modelData.url);
                                console.log('📦 Model format:', modelData.format);
                              }}
                              onError={(error) => {
                                console.error('❌ 3D asset loading error:', error);
                                console.error('📦 Failed URL:', modelData.url);
                                console.error('📦 Error details:', error.message);
                                // Don't fallback to skybox - show error message instead
                              }}
                            />
                          </Suspense>
                        </div>
                      );
                    } else {
                      // Helper to check if URL is a video file
                      const isVideoUrl = (url) => {
                        if (!url || typeof url !== 'string') return false;
                        const urlLower = url.toLowerCase();
                        return urlLower.includes('.mp4') || 
                               urlLower.includes('output.mp4') || 
                               urlLower.includes('/output/output.mp4') ||
                               urlLower.includes('video');
                      };
                      
                      // Check if we have a 3D asset but it wasn't detected - try to extract it
                      const modelData = get3DModelUrl();
                      if (modelData && previewItem.metadata?.hasMesh) {
                        // We have a 3D model URL but previewType wasn't set to '3d' - switch to 3D preview
                        console.log('🔄 Found 3D model URL, switching to 3D preview:', modelData.url);
                        setPreviewType('3d');
                        setPreviewItem(prev => ({ 
                          ...prev, 
                          meshUrl: modelData.url, 
                          meshFormat: modelData.format 
                        }));
                        return (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                              <p className="text-white">Loading 3D Asset...</p>
                            </div>
                          </div>
                        );
                      }
                      
                      // Skybox Image Preview with CORS handling
                      let displayFileUrl = previewItem.file_url || 
                                           previewItem.jobData?.skyboxUrl || 
                                           previewItem.jobData?.skyboxResult?.fileUrl ||
                                           previewItem.jobData?.skyboxResult?.downloadUrl ||
                                           null;
                      
                      // Reject video URLs - don't try to display MP4 as image
                      if (displayFileUrl && isVideoUrl(displayFileUrl)) {
                        console.warn('⚠️ Rejected video URL for image preview:', displayFileUrl);
                        displayFileUrl = null;
                      }
                      
                      // If we have a 3D asset but no valid image, show a message instead of trying to load video
                      if (!displayFileUrl && previewItem.metadata?.hasMesh) {
                        return (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <svg className="w-16 h-16 text-emerald-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <p className="text-white text-lg font-semibold mb-2">3D Asset Available</p>
                              <p className="text-gray-400 text-sm mb-4">
                                This item contains a 3D model. The preview should display the 3D asset.
                              </p>
                              {modelData && (
                                <button
                                  onClick={() => {
                                    setPreviewType('3d');
                                    setPreviewItem(prev => ({ 
                                      ...prev, 
                                      meshUrl: modelData.url, 
                                      meshFormat: modelData.format 
                                    }));
                                  }}
                                  className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg border border-sky-500/30 transition-colors"
                                >
                                  Load 3D Model
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Component to handle image loading with proxy fallback
                      const ImagePreview = ({ src, alt }) => {
                        const [imageSrc, setImageSrc] = React.useState(src);
                        const [loadingError, setLoadingError] = React.useState(false);
                        const [currentStrategy, setCurrentStrategy] = React.useState('direct');
                        
                        React.useEffect(() => {
                          setImageSrc(src);
                          setLoadingError(false);
                          setCurrentStrategy('direct');
                        }, [src]);
                        
                        const handleError = async (e) => {
                          // Don't try to load video URLs as images
                          if (isVideoUrl(imageSrc)) {
                            console.warn('⚠️ Attempted to load video URL as image, rejecting:', imageSrc);
                            setLoadingError(true);
                            return;
                          }
                          
                          console.error(`❌ Image failed to load (${currentStrategy}):`, imageSrc);
                          
                          // Try proxy fallback if direct URL failed
                          if (currentStrategy === 'direct' && src && !isVideoUrl(src)) {
                            try {
                              const { getApiBaseUrl } = await import('../utils/apiConfig');
                              const proxyUrl = `${getApiBaseUrl()}/proxy-asset?url=${encodeURIComponent(src)}`;
                              console.log('🔄 Trying proxy URL:', proxyUrl);
                              setImageSrc(proxyUrl);
                              setCurrentStrategy('proxy');
                              setLoadingError(false);
                              return; // Don't show error yet, try proxy first
                            } catch (err) {
                              console.error('❌ Failed to get proxy URL:', err);
                            }
                          }
                          
                          // If proxy also failed or no proxy available, show error
                          setLoadingError(true);
                          e.target.style.display = 'none';
                          const errorDiv = e.target.nextElementSibling;
                          if (errorDiv) {
                            errorDiv.style.display = 'flex';
                          }
                        };
                        
                        if (loadingError) {
                          return (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center">
                                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-400 mb-2">Image failed to load</p>
                                <p className="text-gray-500 text-xs break-all px-4 max-w-md mx-auto">URL: {src}</p>
                                <button
                                  onClick={() => {
                                    setImageSrc(src);
                                    setLoadingError(false);
                                    setCurrentStrategy('direct');
                                  }}
                                  className="mt-4 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg border border-sky-500/30 transition-colors"
                                >
                                  Retry
                                </button>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <>
                            <img
                              src={imageSrc}
                              alt={alt}
                              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                              onError={handleError}
                              onLoad={() => {
                                console.log(`✅ Image loaded successfully (${currentStrategy}):`, imageSrc);
                              }}
                              crossOrigin="anonymous"
                            />
                            <div className="hidden w-full h-full items-center justify-center">
                              <div className="text-center">
                                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-400 mb-2">Image failed to load</p>
                                <p className="text-gray-500 text-xs break-all px-4">URL: {imageSrc}</p>
                              </div>
                            </div>
                          </>
                        );
                      };
                      
                      return (
                        <div className="w-full h-full flex items-center justify-center p-8">
                          {displayFileUrl ? (
                            <ImagePreview src={displayFileUrl} alt={previewItem.title || 'Preview'} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center">
                                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-400 mb-2">No preview image available</p>
                                <p className="text-gray-500 text-sm">Item: {previewItem.title || previewItem.id}</p>
                                {previewItem.jobData && (
                                  <div className="mt-4 text-left text-xs text-gray-500 space-y-1 max-w-md mx-auto">
                                    <p>Has Skybox: {previewItem.jobData.skyboxUrl ? 'Yes' : 'No'}</p>
                                    <p>Has Mesh: {previewItem.jobData.meshUrl ? 'Yes' : 'No'}</p>
                                    {previewItem.jobData.skyboxResult && (
                                      <p>Skybox Result: {previewItem.jobData.skyboxResult.status || 'Unknown'}</p>
                                    )}
                                    {previewItem.jobData.meshResult && (
                                      <p>Mesh Result: {previewItem.jobData.meshResult.status || 'Unknown'}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-700/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {previewItem.variations && previewItem.variations.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span>{previewItem.variations.length} variations</span>
                      </div>
                    )}
                    {previewItem.metadata?.hasMesh && (
                      <div className="flex items-center gap-2 text-sm text-emerald-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>3D Asset Available</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (previewType === '3d' && previewItem.meshUrl) {
                          window.open(previewItem.meshUrl, '_blank');
                        } else if (previewItem.file_url) {
                          downloadImage(previewItem.file_url, `${previewItem.title}.jpg`);
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </button>
                    <button
                      onClick={() => {
                        handleSkyboxClick(previewItem);
                        closePreview();
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default History;