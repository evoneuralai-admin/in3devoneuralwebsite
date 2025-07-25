import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaExpand, FaCompress } from 'react-icons/fa';
import { PromptPanel } from './PromptPanel';
import { VirtualEnvironment3D } from './VirtualEnvironment3D';
import { EnhancedPreviewScene } from './EnhancedPreviewScene';
import { useGenerate } from '../hooks/useGenerate';

interface UnifiedPromptInterfaceProps {
  onBack?: () => void;
  className?: string;
}

export const UnifiedPromptInterface: React.FC<UnifiedPromptInterfaceProps> = ({
  onBack,
  className = ''
}) => {
  const { currentJob, progress, isGenerating } = useGenerate();
  const [currentView, setCurrentView] = useState<'prompt' | 'generating' | 'preview'>('prompt');
  const [generatedJobId, setGeneratedJobId] = useState<string | null>(null);
  const [isFullPreview, setIsFullPreview] = useState(false);

  // Track generation progress and switch views
  useEffect(() => {
    if (isGenerating && currentView === 'prompt') {
      setCurrentView('generating');
    } else if (!isGenerating && currentJob && progress?.overallProgress === 100) {
      setCurrentView('preview');
      setGeneratedJobId(currentJob.id);
    }
  }, [isGenerating, currentJob, progress, currentView]);

  const handleAssetsGenerated = (jobId: string) => {
    setGeneratedJobId(jobId);
    setCurrentView('preview');
  };

  const handleBackToPrompt = () => {
    setCurrentView('prompt');
    setGeneratedJobId(null);
    setIsFullPreview(false);
  };

  const handleGenerationStart = () => {
    setCurrentView('generating');
  };

  // Real-time 3D preview during generation
  const getPreviewAssets = () => {
    if (!currentJob || !progress) return { skyboxUrl: undefined, meshAssets: [] };

    const assets = [];
    let skyboxUrl = undefined;

    // Add completed skybox
    if (progress.skyboxProgress === 100 && currentJob.results?.skybox?.fileUrl) {
      skyboxUrl = currentJob.results.skybox.fileUrl;
    }

    // Add completed mesh assets
    if (progress.meshProgress === 100 && currentJob.results?.mesh?.fileUrl) {
      assets.push({
        url: currentJob.results.mesh.fileUrl,
        position: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        name: 'Generated 3D Model'
      });
    }

    return { skyboxUrl, meshAssets: assets };
  };

  if (currentView === 'preview' && generatedJobId && isFullPreview) {
    return (
      <EnhancedPreviewScene
        jobId={generatedJobId}
        onBack={() => setIsFullPreview(false)}
        onClose={onBack}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${className}`}>
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
              <h1 className="text-2xl font-bold">AI 3D Environment Generator</h1>
              <p className="text-gray-400 text-sm">
                Create immersive 3D environments with AI-powered skybox and mesh generation
              </p>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-2">
            {currentView === 'preview' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsFullPreview(!isFullPreview)}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title={isFullPreview ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullPreview ? <FaCompress className="w-5 h-5" /> : <FaExpand className="w-5 h-5" />}
              </motion.button>
            )}
            
            {currentView !== 'prompt' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToPrompt}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                New Generation
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentView === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Prompt Panel */}
              <div className="space-y-6">
                <PromptPanel
                  onAssetsGenerated={handleAssetsGenerated}
                  onGenerationStart={handleGenerationStart}
                  className="h-full"
                />
              </div>

              {/* Preview Area */}
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">3D Preview</h2>
                  <div className="bg-gray-700 rounded-lg h-[400px] flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="w-16 h-16 mx-auto mb-4 opacity-50">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium">Ready to Generate</p>
                      <p className="text-sm">Your 3D environment will appear here</p>
                    </div>
                  </div>
                </div>

                {/* Generation Tips */}
                <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-6 border border-blue-700/50">
                  <h3 className="text-lg font-semibold mb-3 text-blue-100">💡 Pro Tips</h3>
                  <ul className="space-y-2 text-sm text-blue-200">
                    <li>• Be descriptive with your prompts for better results</li>
                    <li>• Combine skybox and mesh generation for immersive environments</li>
                    <li>• Use negative prompts to avoid unwanted elements</li>
                    <li>• Higher quality settings take longer but produce better results</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Generation Progress */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Generation Progress</h2>
                  
                  {progress && (
                    <div className="space-y-6">
                      {/* Overall Progress */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Overall Progress</span>
                          <span className="text-blue-400">{Math.round(progress.overallProgress || 0)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progress.overallProgress || 0}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-400">{progress.message}</p>
                      </div>

                      {/* Individual Progress */}
                      {progress.skyboxProgress !== undefined && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Skybox Generation</span>
                            <span className="text-green-400">{Math.round(progress.skyboxProgress)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.skyboxProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {progress.meshProgress !== undefined && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>3D Model Generation</span>
                            <span className="text-orange-400">{Math.round(progress.meshProgress)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.meshProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Generation Details */}
                  {currentJob && (
                    <div className="mt-6 pt-6 border-t border-gray-700 space-y-2 text-sm text-gray-400">
                      <div><strong>Prompt:</strong> {currentJob.prompt}</div>
                      <div><strong>Started:</strong> {new Date(currentJob.createdAt).toLocaleString()}</div>
                      <div><strong>Job ID:</strong> {currentJob.id}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live 3D Preview */}
              <div className="lg:col-span-2">
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold">Live Preview</h2>
                    <p className="text-sm text-gray-400">Assets will appear as they complete</p>
                  </div>
                  
                  <VirtualEnvironment3D
                    {...getPreviewAssets()}
                    className="h-[500px]"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'preview' && generatedJobId && !isFullPreview && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <EnhancedPreviewScene
                jobId={generatedJobId}
                onBack={handleBackToPrompt}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UnifiedPromptInterface; 