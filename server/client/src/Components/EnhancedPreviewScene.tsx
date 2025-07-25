import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaDownload, FaShareAlt, FaExpand, FaEye } from 'react-icons/fa';
import { VirtualEnvironment3D } from './VirtualEnvironment3D';
import { useGenerate } from '../hooks/useGenerate';
import { useAuth } from '../contexts/AuthContext';

interface EnhancedPreviewSceneProps {
  jobId: string;
  onBack?: () => void;
  onClose?: () => void;
}

interface GeneratedAsset {
  type: 'skybox' | 'mesh';
  url: string;
  thumbnailUrl?: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
}

export const EnhancedPreviewScene: React.FC<EnhancedPreviewSceneProps> = ({
  jobId,
  onBack,
  onClose
}) => {
  const { user } = useAuth();
  const { currentJob, progress, downloadAsset } = useGenerate();
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [selectedView, setSelectedView] = useState<'combined' | 'skybox' | 'mesh'>('combined');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Extract assets from current job and progress
  useEffect(() => {
    if (!currentJob && !progress) return;

    const extractedAssets: GeneratedAsset[] = [];

    // Add skybox asset
    if (progress?.skyboxProgress !== undefined) {
      extractedAssets.push({
        type: 'skybox',
        url: currentJob?.results?.skybox?.fileUrl || '',
        thumbnailUrl: currentJob?.results?.skybox?.thumbnailUrl,
        name: 'AI Generated Skybox',
        status: progress.skyboxProgress === 100 ? 'completed' : 
               progress.skyboxProgress > 0 ? 'processing' : 'pending',
        progress: progress.skyboxProgress
      });
    }

    // Add mesh asset
    if (progress?.meshProgress !== undefined) {
      extractedAssets.push({
        type: 'mesh',
        url: currentJob?.results?.mesh?.fileUrl || '',
        thumbnailUrl: currentJob?.results?.mesh?.thumbnailUrl,
        name: 'AI Generated 3D Model',
        status: progress.meshProgress === 100 ? 'completed' : 
               progress.meshProgress > 0 ? 'processing' : 'pending',
        progress: progress.meshProgress
      });
    }

    setAssets(extractedAssets);
  }, [currentJob, progress]);

  const completedAssets = assets.filter(asset => asset.status === 'completed' && asset.url);
  const skyboxAsset = completedAssets.find(asset => asset.type === 'skybox');
  const meshAssets = completedAssets.filter(asset => asset.type === 'mesh');

  const handleDownload = async (assetType: 'skybox' | 'mesh') => {
    try {
      await downloadAsset(jobId, assetType);
    } catch (error) {
      console.error(`Download failed for ${assetType}:`, error);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/preview/${jobId}`;
    if (navigator.share) {
      navigator.share({
        title: 'AI Generated 3D Environment',
        text: 'Check out this amazing AI-generated 3D environment!',
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = 'Share link copied to clipboard!';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    }
  };

  const handleExport = () => {
    // Export the current view as an image
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `ai-environment-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  if (!currentJob && assets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FaArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            <div>
              <h1 className="text-2xl font-bold">AI Generated Environment</h1>
              <p className="text-gray-400 text-sm">
                Job ID: {jobId} • Generated {assets.length} assets
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Selector */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              {[
                { id: 'combined', label: 'Combined', icon: '🌍' },
                { id: 'skybox', label: 'Skybox', icon: '🌅' },
                { id: 'mesh', label: '3D Model', icon: '🎯' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedView(mode.id as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedView === mode.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-2">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FaShareAlt className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              className="p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <FaDownload className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 3D Viewport */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              {completedAssets.length > 0 ? (
                <VirtualEnvironment3D
                  skyboxUrl={selectedView !== 'mesh' ? skyboxAsset?.url : undefined}
                  meshAssets={
                    selectedView !== 'skybox' 
                      ? meshAssets.map((asset, index) => ({
                          url: asset.url,
                          position: [0, 0, 0] as [number, number, number],
                          scale: [1, 1, 1] as [number, number, number],
                          name: asset.name
                        }))
                      : []
                  }
                  className="h-[600px]"
                  onExport={handleExport}
                  onShare={handleShare}
                />
              ) : (
                <div className="h-[600px] flex items-center justify-center bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Generating your environment...</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Overall progress: {Math.round(progress?.overallProgress || 0)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Asset Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold">Generated Assets</h2>

              {/* Progress Overview */}
              {progress && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{Math.round(progress.overallProgress || 0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.overallProgress || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400">{progress.message}</p>
                </div>
              )}

              {/* Asset List */}
              <div className="space-y-4">
                {assets.map((asset, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-700 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{asset.name}</h3>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        asset.status === 'completed' ? 'bg-green-600 text-white' :
                        asset.status === 'processing' ? 'bg-yellow-600 text-white' :
                        asset.status === 'pending' ? 'bg-gray-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {asset.status}
                      </div>
                    </div>

                    {asset.status === 'processing' && asset.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{Math.round(asset.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${asset.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {asset.status === 'completed' && asset.url && (
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDownload(asset.type)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Download
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedView(asset.type === 'skybox' ? 'skybox' : 'mesh')}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
                        >
                          <FaEye className="w-4 h-4" />
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Generation Info */}
              {currentJob && (
                <div className="border-t border-gray-700 pt-4 space-y-2 text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(currentJob.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prompt:</span>
                    <span className="text-right max-w-32 truncate">{currentJob.prompt}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPreviewScene; 