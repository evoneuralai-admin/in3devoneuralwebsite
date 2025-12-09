import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useProgress, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { getApiBaseUrl } from '../utils/apiConfig';

interface AssetViewerWithSkyboxProps {
  assetUrl: string;
  skyboxImageUrl?: string;
  assetFormat?: 'glb' | 'usdz' | 'obj' | 'fbx';
  className?: string;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  onLoad?: (model: any) => void;
  onError?: (error: Error) => void;
}

// Loading component
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center space-y-4 p-6 bg-black/80 rounded-xl backdrop-blur-md">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-white text-sm font-medium">Loading 3D Asset... {Math.round(progress)}%</div>
      </div>
    </Html>
  );
}

// Skybox sphere component with CORS handling
function SkyboxSphere({ imageUrl }: { imageUrl: string }) {
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!imageUrl) return;

    const loadTexture = async () => {
      try {
        const loader = new THREE.TextureLoader();
        
        // Try different loading strategies for skybox textures
        const apiBaseUrl = getApiBaseUrl();
        const strategies = [
          // Strategy 1: Direct loading (skyboxes usually work fine)
          () => imageUrl,
          // Strategy 2: Proxy if direct fails (use correct API base URL)
          () => `${apiBaseUrl}/proxy-asset?url=${encodeURIComponent(imageUrl)}`
        ];

        let loadedTexture: THREE.Texture | null = null;
        let lastError: Error | null = null;

        for (const strategy of strategies) {
          try {
            const url = strategy();
            console.log('🔄 Loading skybox texture via:', url);
            
            loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
              loader.load(
                url,
                (texture) => {
                  // Configure texture
                  texture.mapping = THREE.EquirectangularReflectionMapping;
                  texture.colorSpace = THREE.SRGBColorSpace;
                  texture.minFilter = THREE.LinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  texture.generateMipmaps = false;
                  resolve(texture);
                },
                undefined,
                (error) => reject(error)
              );
            });

            console.log('✅ Skybox texture loaded successfully');
            break;
          } catch (err) {
            console.warn('⚠️ Skybox loading strategy failed:', err);
            lastError = err instanceof Error ? err : new Error('Unknown error');
          }
        }

        if (loadedTexture) {
          setTexture(loadedTexture);
          setError(null);
        } else {
          throw lastError || new Error('All skybox loading strategies failed');
        }
      } catch (err) {
        console.error('Failed to load skybox texture:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      }
    };

    loadTexture();
  }, [imageUrl]);

  if (error) {
    // Fallback to black skybox on error
    return (
      <mesh>
        <sphereGeometry args={[500, 64, 64]} />
        <meshBasicMaterial color="#000000" side={THREE.BackSide} />
      </mesh>
    );
  }

  if (!texture) {
    // Show loading state
    return (
      <mesh>
        <sphereGeometry args={[500, 64, 64]} />
        <meshBasicMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
    );
  }

  return (
    <Sphere args={[500, 64, 64]} scale={[-1, 1, 1]}>
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </Sphere>
  );
}

// 3D Asset component
function AssetModel({ 
  assetUrl, 
  autoRotate = false, 
  autoRotateSpeed = 1,
  onLoad, 
  onError 
}: { 
  assetUrl: string; 
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  onLoad?: (model: any) => void; 
  onError?: (error: Error) => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [gltf, setGltf] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const loaderRef = useRef<{ gltfLoader: GLTFLoader; dracoLoader: DRACOLoader } | null>(null);

  // Auto-rotation animation
  useFrame((_state, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * autoRotateSpeed;
    }
  });

  React.useEffect(() => {
    if (!assetUrl) return;

    // Validate that the URL is a 3D model file, not a video
    const urlLower = assetUrl.toLowerCase();
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const isVideo = videoExtensions.some(ext => urlLower.includes(ext)) || 
                    urlLower.includes('/output/output.mp4') ||
                    urlLower.includes('/output.mp4') ||
                    urlLower.includes('output.mp4') ||
                    urlLower.includes('video');
    
    if (isVideo) {
      console.error('❌ AssetViewerWithSkybox: URL is a video file, not a 3D model:', assetUrl);
      setError('Invalid asset URL: video files cannot be loaded as 3D models');
      setIsLoading(false);
      onError?.(new Error('URL is a video file, not a 3D model'));
      return;
    }
    
    // Additional check: ensure it's actually a 3D model file
    const modelExtensions = ['.glb', '.gltf', '.fbx', '.obj', '.usdz', '.dae'];
    const isModelFile = modelExtensions.some(ext => urlLower.includes(ext));
    if (!isVideo && !isModelFile) {
      console.warn('⚠️ AssetViewerWithSkybox: URL does not appear to be a 3D model file:', assetUrl);
    }

    const loadModel = async () => {
      setIsLoading(true);
      setError(null);
      setGltf(null);

      try {
        if (!loaderRef.current) {
          const gltfLoader = new GLTFLoader();
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath('/draco/');
          gltfLoader.setDRACOLoader(dracoLoader);
          loaderRef.current = { gltfLoader, dracoLoader };
        }

        // Try multiple loading strategies - prioritize proxy first (direct will fail due to CORS)
        const apiBaseUrl = getApiBaseUrl();
        const proxyUrl = `${apiBaseUrl}/proxy-asset?url=${encodeURIComponent(assetUrl)}`;
        
        // Always prepare production proxy as fallback (use asia-south1 region matching database location)
        const isLocalhost = apiBaseUrl.includes('localhost');
        const productionProxyUrl = `https://asia-south1-in3devoneuralai.cloudfunctions.net/api/proxy-asset?url=${encodeURIComponent(assetUrl)}`;
        
        console.log('🔄 Loading 3D model:', {
          originalUrl: assetUrl,
          proxyUrl: proxyUrl,
          productionProxyUrl: productionProxyUrl,
          apiBaseUrl: apiBaseUrl,
          isLocalhost: isLocalhost
        });
        
        const strategies = [
          // Strategy 1: Local/current proxy first (if available)
          () => proxyUrl,
          // Strategy 2: Production proxy (always try as fallback)
          () => productionProxyUrl,
          // Strategy 3: Direct URL (will likely fail due to CORS, but try anyway)
          () => assetUrl
        ];

        let loadedGltf = null;
        let lastError = null;

        for (const strategy of strategies) {
          try {
            const url = strategy();
            console.log('🔄 Trying to load 3D model from:', url);
            
            // Use appropriate timeout for proxy (15 seconds) vs direct URL (30 seconds)
            // Production proxy may take longer due to cold starts
            const isProxy = url.includes('/proxy-asset');
            const isProductionProxy = url.includes('cloudfunctions.net');
            const timeoutDuration = isProxy 
              ? (isProductionProxy ? 30000 : 10000) // 30s for production, 10s for localhost
              : 30000; // 30s for direct URL
            
            loadedGltf = await new Promise<any>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error(`3D model loading timeout after ${timeoutDuration / 1000} seconds`));
              }, timeoutDuration);
              
              loaderRef.current!.gltfLoader.load(
                url,
                (gltf) => {
                  clearTimeout(timeout);
                  console.log('✅ 3D model loaded successfully from:', url);
                  resolve(gltf);
                },
                (progress) => {
                  if (progress.lengthComputable) {
                    const percent = (progress.loaded / progress.total) * 100;
                    console.log(`📦 Loading progress: ${percent.toFixed(1)}%`);
                  }
                },
                (error) => {
                  clearTimeout(timeout);
                  console.error('❌ GLTFLoader error:', error);
                  
                  // Check if it's a connection error (proxy not available)
                  const errorMessage = (error instanceof Error ? error.message : String(error)) || '';
                  const isConnectionError = errorMessage.includes('Failed to fetch') || 
                                           errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                                           errorMessage.includes('NetworkError');
                  
                  if (isConnectionError && isProxy) {
                    console.warn('⚠️ Proxy unavailable, will try next strategy');
                  }
                  
                  reject(error);
                }
              );
            });
            
            if (loadedGltf) {
              console.log('✅ Successfully loaded 3D model');
              break;
            }
          } catch (err) {
            lastError = err;
            const errorMessage = err instanceof Error ? err.message : String(err);
            
            // If it's a connection error with proxy, log and continue
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
              console.warn('⚠️ Connection failed, trying next strategy:', errorMessage);
            } else {
              console.warn('⚠️ Load strategy failed:', err);
            }
            // Continue to next strategy
          }
        }

        if (!loadedGltf) {
          throw lastError || new Error('All loading strategies failed');
        }

        // Optimize the model
        loadedGltf.scene.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.needsUpdate = true;
              child.material.side = THREE.DoubleSide;
            }
          }
        });

        // Auto-scale and center
        const box = new THREE.Box3().setFromObject(loadedGltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        loadedGltf.scene.scale.setScalar(scale);

        const center = box.getCenter(new THREE.Vector3());
        loadedGltf.scene.position.sub(center.multiplyScalar(scale));

        setGltf(loadedGltf);
        setIsLoading(false);
        onLoad?.(loadedGltf);
      } catch (err) {
        console.error('Model loading failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    loadModel();
  }, [assetUrl, onLoad, onError]);

  React.useEffect(() => {
    return () => {
      if (loaderRef.current?.dracoLoader) {
        loaderRef.current.dracoLoader.dispose();
      }
    };
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  if (error || !gltf) {
    return (
      <Html center>
        <div className="bg-red-900/80 px-4 py-3 rounded-lg text-red-200 text-sm">
          ⚠️ {error || 'Failed to load 3D model'}
        </div>
      </Html>
    );
  }

  return (
    <primitive 
      ref={meshRef}
      object={gltf.scene} 
      scale={1}
      position={[0, 0, 0]}
    />
  );
}

// Main component
export const AssetViewerWithSkybox: React.FC<AssetViewerWithSkyboxProps> = ({
  assetUrl,
  skyboxImageUrl,
  assetFormat = 'glb', // Reserved for future format-specific handling
  className = '',
  autoRotate = false,
  autoRotateSpeed = 1,
  onLoad,
  onError
}) => {
  // Suppress unused warning - assetFormat is part of the API for future use
  void assetFormat;
  return (
    <div className={`relative w-full h-full min-h-[400px] ${className}`}>
      <Canvas
        camera={{ 
          position: [0, 0, 5], 
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        shadows
        gl={{ 
          antialias: true, 
          alpha: false,
          preserveDrawingBuffer: true
        }}
      >
        <Suspense fallback={<Loader />}>
          {/* Skybox background */}
          {skyboxImageUrl ? (
            <SkyboxSphere imageUrl={skyboxImageUrl} />
          ) : (
            <mesh>
              <sphereGeometry args={[500, 64, 64]} />
              <meshBasicMaterial color="#000000" side={THREE.BackSide} />
            </mesh>
          )}

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, 5, -10]} intensity={0.5} />
          <hemisphereLight intensity={0.3} groundColor="#080820" />

          {/* 3D Asset */}
          {assetUrl && (
            <AssetModel 
              assetUrl={assetUrl} 
              autoRotate={autoRotate}
              autoRotateSpeed={autoRotateSpeed}
              onLoad={onLoad} 
              onError={onError} 
            />
          )}

          {/* Ground plane for shadows */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -2, 0]}
            receiveShadow
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#1a1a1a" transparent opacity={0.3} />
          </mesh>

          {/* Contact shadows */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -1.99, 0]}
            receiveShadow
          >
            <planeGeometry args={[100, 100]} />
            <shadowMaterial transparent opacity={0.2} />
          </mesh>
        </Suspense>

        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={20}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed * 0.5}
          dampingFactor={0.05}
          enableDamping={true}
        />
      </Canvas>
    </div>
  );
};

export default AssetViewerWithSkybox;

