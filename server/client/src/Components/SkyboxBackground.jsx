import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

const SkyboxBackground = ({ imageUrl }) => {
  if (!imageUrl) return null;
  return (
    <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} style={{ width: '100vw', height: '100vh' }}>
        <Environment files={imageUrl} background />
      </Canvas>
    </div>
  );
};

export default SkyboxBackground; 