import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function MinimalGeometry({ position, geometry, color }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <primitive object={geometry} />
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

function GridLines() {
  const linesRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  const lines = useMemo(() => {
    const group = new THREE.Group();
    
    // Horizontal lines
    for (let i = -5; i <= 5; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10, 0, i * 2),
        new THREE.Vector3(10, 0, i * 2),
      ]);
      const material = new THREE.LineBasicMaterial({ 
        color: '#8B5CF6',
        transparent: true,
        opacity: 0.2
      });
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }
    
    // Vertical lines
    for (let i = -5; i <= 5; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i * 2, 0, -10),
        new THREE.Vector3(i * 2, 0, 10),
      ]);
      const material = new THREE.LineBasicMaterial({ 
        color: '#8B5CF6',
        transparent: true,
        opacity: 0.2
      });
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }
    
    return group;
  }, []);

  return (
    <group ref={linesRef}>
      <primitive object={lines} />
    </group>
  );
}

export default function Scene3D() {
  const geometries = useMemo(() => [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.TetrahedronGeometry(1),
    new THREE.OctahedronGeometry(0.8),
  ], []);

  return (
    <div className="absolute inset-0 -z-10 opacity-60">
      <Canvas
        camera={{ position: [0, 5, 15], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        {/* Minimal lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.3} />
        
        {/* Grid lines */}
        <GridLines />
        
        {/* Minimal geometric shapes */}
        <MinimalGeometry
          position={[-3, 1, 0]}
          geometry={geometries[0]}
          color="#8B5CF6"
        />
        <MinimalGeometry
          position={[3, -1, 0]}
          geometry={geometries[1]}
          color="#3B82F6"
        />
        <MinimalGeometry
          position={[0, 2, -3]}
          geometry={geometries[2]}
          color="#EC4899"
        />
        
        {/* Controls */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.2}
        />
      </Canvas>
    </div>
  );
}
