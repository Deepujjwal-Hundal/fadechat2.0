import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
  color?: string;
}

const Particles: React.FC<ParticleFieldProps> = ({ count = 200, color = '#00F0FF' }) => {
  const mesh = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const colorCyan = new THREE.Color('#00F0FF');
    const colorMagenta = new THREE.Color('#FF00FF');

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const mixColor = Math.random() > 0.5 ? colorCyan : colorMagenta;
      colors[i * 3] = mixColor.r;
      colors[i * 3 + 1] = mixColor.g;
      colors[i * 3 + 2] = mixColor.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    return { positions, colors, sizes };
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.02;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const FloatingCrystal: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.elapsedTime * 0.3;
      mesh.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={mesh} position={position}>
        <octahedronGeometry args={[0.5, 0]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.8}
          distort={0.2}
          speed={2}
          transparent
          opacity={0.8}
        />
      </mesh>
    </Float>
  );
};

const AnimatedSphere: React.FC = () => {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={mesh} position={[0, 0, -5]}>
        <icosahedronGeometry args={[2, 1]} />
        <meshBasicMaterial
          color="#00F0FF"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
    </Float>
  );
};

interface Scene3DProps {
  variant?: 'particles' | 'crystals' | 'minimal';
  primaryColor?: string;
}

const Scene: React.FC<Scene3DProps> = ({ variant = 'particles', primaryColor = '#00F0FF' }) => {
  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} color={primaryColor} intensity={0.5} />
      <pointLight position={[-10, -10, -10]} color="#FF00FF" intensity={0.3} />
      
      {variant === 'particles' && (
        <>
          <Particles count={150} color={primaryColor} />
          <AnimatedSphere />
        </>
      )}
      
      {variant === 'crystals' && (
        <>
          <FloatingCrystal position={[-2, 1, -3]} color={primaryColor} />
          <FloatingCrystal position={[2, -1, -4]} color="#FF00FF" />
          <FloatingCrystal position={[0, 0.5, -2]} color="#00FF66" />
          <Particles count={80} />
        </>
      )}
      
      {variant === 'minimal' && (
        <Particles count={50} color={primaryColor} />
      )}
    </>
  );
};

export const Background3D: React.FC<Scene3DProps> = ({ variant = 'particles', primaryColor = '#00F0FF' }) => {
  return (
    <div className="absolute inset-0 z-0" data-testid="3d-background">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene variant={variant} primaryColor={primaryColor} />
      </Canvas>
    </div>
  );
};

export default Background3D;
