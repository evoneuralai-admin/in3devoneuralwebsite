import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { 
  OrbitControls, 
  Environment, 
  useGLTF, 
  Float, 
  Text,
  PresentationControls,
  ContactShadows,
  Sphere,
  Html,
  useProgress,
  Stars,
  Sky,
  shaderMaterial
} from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { 
  Vector3, 
  Mesh, 
  SphereGeometry, 
  ShaderMaterial, 
  BackSide, 
  TextureLoader,
  EquirectangularReflectionMapping,
  sRGBEncoding,
  LinearEncoding
} from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaExpand, 
  FaCompress, 
  FaPlay, 
  FaPause, 
  FaVolumeMute, 
  FaVolumeUp,
  FaCog,
  FaEye,
  FaDownload,
  FaShareAlt
} from 'react-icons/fa';

// Skybox Panorama Shader Material
const SkyboxMaterial = shaderMaterial(
  {
    map: null,
    opacity: 1.0,
    brightness: 1.0,
    contrast: 1.0,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform sampler2D map;
    uniform float opacity;
    uniform float brightness;
    uniform float contrast;
    varying vec2 vUv;
    
    void main() {
      vec4 texColor = texture2D(map, vUv);
      
      // Apply brightness and contrast
      texColor.rgb = ((texColor.rgb - 0.5) * contrast + 0.5) * brightness;
      
      gl_FragColor = vec4(texColor.rgb, opacity);
    }
  `
);

extend({ SkyboxMaterial });

// Loading Component
function Loader() {
  const { progress } = useProgress();
  
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-black/80 rounded-lg backdrop-blur-sm">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-white text-lg font-medium">
          Loading Virtual Environment... {Math.round(progress)}%
        </div>
      </div>
    </Html>
  );
}

// Skybox Sphere Component
function SkyboxSphere({ skyboxUrl, settings }: { skyboxUrl: string; settings: any }) {
  console.log('🌅 [DEBUG] SkyboxSphere component rendering with:', {
    skyboxUrl: skyboxUrl?.substring(0, 50) + (skyboxUrl?.length > 50 ? '...' : ''),
    hasUrl: !!skyboxUrl,
    settings: {
      opacity: settings.opacity,
      brightness: settings.brightness,
      contrast: settings.contrast
    }
  });

  const meshRef = useRef<Mesh>(null);
  const [texture, setTexture] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!skyboxUrl) {
      console.log('🚫 [DEBUG] SkyboxSphere: No skyboxUrl provided');
      return;
    }

    console.log('🔄 [DEBUG] SkyboxSphere: Loading texture from URL:', skyboxUrl);
    const loader = new TextureLoader();
    setIsLoading(true);
    
    const loadStart = Date.now();
    loader.load(
      skyboxUrl,
      (loadedTexture) => {
        const loadDuration = Date.now() - loadStart;
        console.log('✅ [DEBUG] SkyboxSphere: Texture loaded successfully in', loadDuration + 'ms');
        console.log('✅ [DEBUG] Texture details:', {
          width: loadedTexture.image?.width,
          height: loadedTexture.image?.height,
          format: loadedTexture.format,
          type: loadedTexture.type
        });

        loadedTexture.mapping = EquirectangularReflectionMapping;
        loadedTexture.encoding = sRGBEncoding;
        loadedTexture.flipY = false;
        setTexture(loadedTexture);
        setIsLoading(false);
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log('📊 [DEBUG] SkyboxSphere: Texture loading progress:', Math.round(percent) + '%');
      },
      (error) => {
        const loadDuration = Date.now() - loadStart;
        console.error('❌ [DEBUG] SkyboxSphere: Failed to load texture in', loadDuration + 'ms:', error);
        console.error('❌ [DEBUG] Failed URL:', skyboxUrl);
        console.error('❌ [DEBUG] Error details:', {
          message: error.message,
          type: error.type || 'Unknown',
          target: error.target
        });
        setIsLoading(false);
      }
    );
  }, [skyboxUrl]);

  if (isLoading) {
    console.log('⏳ [DEBUG] SkyboxSphere: Still loading texture...');
    return <Loader />;
  }

  if (!texture) {
    console.log('❌ [DEBUG] SkyboxSphere: No texture available for rendering');
    return <Loader />;
  }

  console.log('🎨 [DEBUG] SkyboxSphere: Rendering skybox sphere with texture');
  return (
    <Sphere ref={meshRef} args={[50, 32, 16]} scale={[-1, 1, 1]}>
      <skyboxMaterial 
        map={texture} 
        side={BackSide}
        opacity={settings.opacity}
        brightness={settings.brightness}
        contrast={settings.contrast}
      />
    </Sphere>
  );
}

// 3D Model Component
function Model3D({ modelUrl, position, scale, autoRotate }: any) {
  console.log('🎯 [DEBUG] Model3D component rendering with:', {
    modelUrl: modelUrl?.substring(0, 50) + (modelUrl?.length > 50 ? '...' : ''),
    hasUrl: !!modelUrl,
    position,
    scale,
    autoRotate
  });

  const meshRef = useRef();
  const [model, setModel] = useState(null);
  
  useFrame((state) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  useEffect(() => {
    if (!modelUrl) {
      console.log('🚫 [DEBUG] Model3D: No modelUrl provided');
      return;
    }

    console.log('🔄 [DEBUG] Model3D: Loading 3D model from URL:', modelUrl);
    const loader = new GLTFLoader();
    const loadStart = Date.now();
    
    loader.load(
      modelUrl,
      (gltf) => {
        const loadDuration = Date.now() - loadStart;
        console.log('✅ [DEBUG] Model3D: Model loaded successfully in', loadDuration + 'ms');
        console.log('✅ [DEBUG] Model details:', {
          animations: gltf.animations?.length || 0,
          scenes: gltf.scenes?.length || 0,
          nodes: gltf.scene?.children?.length || 0,
          hasTextures: !!gltf.scene?.traverse
        });

        // Optimize model
        let meshCount = 0;
        let materialCount = 0;
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            meshCount++;
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (child.material) {
              materialCount++;
            }
          }
        });

        console.log('🔧 [DEBUG] Model optimization completed:', {
          meshes: meshCount,
          materials: materialCount
        });

        setModel(gltf.scene);
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log('📊 [DEBUG] Model3D: Loading progress:', Math.round(percent) + '%');
      },
      (error) => {
        const loadDuration = Date.now() - loadStart;
        console.error('❌ [DEBUG] Model3D: Failed to load model in', loadDuration + 'ms:', error);
        console.error('❌ [DEBUG] Failed URL:', modelUrl);
        console.error('❌ [DEBUG] Error details:', {
          message: error.message,
          type: error.type || 'Unknown'
        });
      }
    );
  }, [modelUrl]);

  if (!model) {
    console.log('⏳ [DEBUG] Model3D: No model available for rendering');
    return null;
  }

  console.log('🎨 [DEBUG] Model3D: Rendering 3D model');
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.2}>
      <primitive 
        ref={meshRef}
        object={model}
        position={position}
        scale={scale}
      />
    </Float>
  );
}

// Interactive Ground
function InteractiveGround() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[100, 100, 100, 100]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          transparent
          opacity={0.3}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      <ContactShadows 
        opacity={0.3} 
        scale={20} 
        blur={2} 
        far={2.5} 
        resolution={512} 
        color="#000000"
        position={[0, -1.99, 0]}
      />
    </>
  );
}

// Ambient Particles
function AmbientParticles() {
  const pointsRef = useRef();
  const particleCount = 1000;
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 40 - 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return positions;
  }, []);
  
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attachObject={['attributes', 'position']}
          count={particleCount}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#4f46e5" transparent opacity={0.6} />
    </points>
  );
}

// Camera Controller
function CameraController({ mode, target }: { mode: string; target?: Vector3 }) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (mode === 'orbit' && target) {
      camera.lookAt(target);
    }
  });
  
  return null;
}

// UI Controls Component
function VirtualEnvironmentControls({ 
  onFullscreen, 
  isFullscreen, 
  settings, 
  onSettingsChange,
  onExport,
  onShare 
}: any) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-50 space-y-2">
      {/* Control Buttons */}
      <div className="flex flex-col space-y-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 bg-black/70 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-all"
        >
          <FaCog className="w-5 h-5" />
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onFullscreen}
          className="p-3 bg-black/70 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-all"
        >
          {isFullscreen ? <FaCompress className="w-5 h-5" /> : <FaExpand className="w-5 h-5" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onExport}
          className="p-3 bg-black/70 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-all"
        >
          <FaDownload className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShare}
          className="p-3 bg-black/70 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-all"
        >
          <FaShareAlt className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="bg-black/80 backdrop-blur-sm rounded-lg p-4 space-y-4 min-w-[300px]"
          >
            <h3 className="text-white font-semibold text-lg mb-3">Environment Settings</h3>
            
            {/* Skybox Settings */}
            <div className="space-y-3">
              <label className="text-white text-sm font-medium">Skybox Brightness</label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={settings.brightness}
                onChange={(e) => onSettingsChange('brightness', parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              
              <label className="text-white text-sm font-medium">Skybox Contrast</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.contrast}
                onChange={(e) => onSettingsChange('contrast', parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              
              <label className="text-white text-sm font-medium">Environment Opacity</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={settings.opacity}
                onChange={(e) => onSettingsChange('opacity', parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Model Settings */}
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoRotate}
                  onChange={(e) => onSettingsChange('autoRotate', e.target.checked)}
                  className="accent-blue-500"
                />
                <span className="text-white text-sm">Auto-rotate models</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.showParticles}
                  onChange={(e) => onSettingsChange('showParticles', e.target.checked)}
                  className="accent-blue-500"
                />
                <span className="text-white text-sm">Show ambient particles</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main VirtualEnvironment3D Component
interface VirtualEnvironment3DProps {
  skyboxUrl?: string;
  meshAssets?: Array<{
    url: string;
    position?: [number, number, number];
    scale?: [number, number, number];
    name?: string;
  }>;
  className?: string;
  onExport?: () => void;
  onShare?: () => void;
}

export const VirtualEnvironment3D: React.FC<VirtualEnvironment3DProps> = ({
  skyboxUrl,
  meshAssets = [],
  className = '',
  onExport,
  onShare
}) => {
  console.log('🌍 [DEBUG] VirtualEnvironment3D component rendering with:', {
    skyboxUrl: skyboxUrl?.substring(0, 50) + (skyboxUrl?.length > 50 ? '...' : ''),
    hasSkyboxUrl: !!skyboxUrl,
    meshAssetsCount: meshAssets.length,
    meshAssets: meshAssets.map((asset, index) => ({
      index,
      url: asset?.url?.substring(0, 50) + (asset?.url?.length > 50 ? '...' : ''),
      hasUrl: !!asset?.url,
      position: asset?.position,
      scale: asset?.scale,
      name: asset?.name
    })),
    className
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState({
    brightness: 1.0,
    contrast: 1.0,
    opacity: 1.0,
    autoRotate: true,
    showParticles: true
  });

  console.log('⚙️ [DEBUG] VirtualEnvironment3D settings:', settings);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSettingsChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    // Export screenshot or 3D scene
    onExport?.();
  };

  const handleShare = () => {
    // Share virtual environment
    onShare?.();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-[600px] rounded-lg overflow-hidden bg-gradient-to-b from-gray-900 to-black ${className}`}
    >
      <Canvas
        shadows
        camera={{ 
          position: [0, 5, 10], 
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
      >
        <Suspense fallback={<Loader />}>
          {/* Skybox Environment */}
          {skyboxUrl && (
            <SkyboxSphere skyboxUrl={skyboxUrl} settings={settings} />
          )}

          {/* Lighting */}
          <ambientLight intensity={0.2} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={0.8} 
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight position={[-10, -10, -5]} intensity={0.3} color="#4f46e5" />

          {/* 3D Models */}
          {meshAssets.map((asset, index) => (
            <Model3D
              key={index}
              modelUrl={asset.url}
              position={asset.position || [0, 0, 0]}
              scale={asset.scale || [1, 1, 1]}
              autoRotate={settings.autoRotate}
            />
          ))}

          {/* Interactive Ground */}
          <InteractiveGround />

          {/* Ambient Particles */}
          {settings.showParticles && <AmbientParticles />}

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={30}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            autoRotate={false}
            autoRotateSpeed={0.5}
            dampingFactor={0.05}
            enableDamping={true}
          />

          {/* Camera Controller */}
          <CameraController mode="orbit" />
        </Suspense>
      </Canvas>

      {/* UI Controls */}
      <VirtualEnvironmentControls
        onFullscreen={handleFullscreen}
        isFullscreen={isFullscreen}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onExport={handleExport}
        onShare={handleShare}
      />

      {/* Info Panel */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white max-w-sm">
        <h3 className="font-semibold text-lg mb-2">Virtual Environment</h3>
        <p className="text-sm text-gray-300 mb-2">
          Immerse yourself in this AI-generated 3D environment. Use mouse to navigate, scroll to zoom.
        </p>
        <div className="flex items-center space-x-4 text-xs text-gray-400">
          <span>Skybox: {skyboxUrl ? '✓' : '✗'}</span>
          <span>Models: {meshAssets.length}</span>
        </div>
      </div>
    </div>
  );
};

export default VirtualEnvironment3D; 