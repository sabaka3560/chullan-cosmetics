import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export function BottleModel() {
  const group = useRef<THREE.Group>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useFrame(() => {
    if (!group.current) return;
    
    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let targetRotZ = 0;
    let targetScale = 1;

    /*
      Layout-aware choreography:
      
      Hero (0-20%):      Text is on the LEFT.  Bottle sits in the RIGHT half.  x ≈ +2.5
      Best Sellers (20-45%): Products are in left 3 cols. Bottle sits in RIGHT gutter.  x ≈ +3.5
      Essentials (45-65%):  Image LEFT, text RIGHT, bottle in CENTER gap.  x ≈ 0
      Lifestyle (65-80%):   Full-bleed. Bottle hides (scale down, push back).
      Footer (80-100%):    Form is on RIGHT. Bottle lands in LEFT gutter.  x ≈ -3
    */

    if (scrollProgress < 0.2) {
      // HERO: Bottle on the right half, large and proud, slightly angled
      const p = scrollProgress / 0.2;
      targetX = THREE.MathUtils.lerp(4.5, 2.5, p);   // Slide in from offscreen right
      targetY = THREE.MathUtils.lerp(-3, 0, p);       // Rise from below
      targetRotY = THREE.MathUtils.lerp(-0.8, -0.3, p); // Angled towards the text
      targetRotX = THREE.MathUtils.lerp(0.2, 0.05, p);
      targetRotZ = THREE.MathUtils.lerp(-0.15, 0.05, p);
      targetScale = THREE.MathUtils.lerp(0.8, 1.1, p);
    } else if (scrollProgress < 0.45) {
      // BEST SELLERS: Bottle in the right gutter, shrunk to product size
      const p = (scrollProgress - 0.2) / 0.25;
      targetX = THREE.MathUtils.lerp(2.5, 3.5, p);
      targetY = THREE.MathUtils.lerp(0, -2.5, p);      // Drop alongside products
      targetRotY = THREE.MathUtils.lerp(-0.3, 0.4, p);  // Rotate to show a different angle
      targetRotX = 0;
      targetRotZ = 0;
      targetScale = THREE.MathUtils.lerp(1.1, 0.6, p);  // Shrink to product-card scale
    } else if (scrollProgress < 0.65) {
      // ESSENTIALS: Bottle in the CENTER gap between image and text
      const p = (scrollProgress - 0.45) / 0.2;
      targetX = THREE.MathUtils.lerp(3.5, 0, p);       // Sweep to center
      targetY = THREE.MathUtils.lerp(-2.5, -1, p);
      targetZ = THREE.MathUtils.lerp(0, 1, p);          // Come forward for prominence
      targetRotY = THREE.MathUtils.lerp(0.4, Math.PI * 0.75, p); // Dramatic rotation
      targetRotX = 0;
      targetRotZ = THREE.MathUtils.lerp(0, -0.08, p);
      targetScale = THREE.MathUtils.lerp(0.6, 0.9, p);  // Grow back slightly
    } else if (scrollProgress < 0.8) {
      // LIFESTYLE STRIP: Bottle fades out of view (push deep back)
      const p = (scrollProgress - 0.65) / 0.15;
      targetX = THREE.MathUtils.lerp(0, -1, p);
      targetY = THREE.MathUtils.lerp(-1, -2, p);
      targetZ = THREE.MathUtils.lerp(1, -4, p);         // Push far behind camera
      targetRotY = THREE.MathUtils.lerp(Math.PI * 0.75, Math.PI, p);
      targetRotX = 0;
      targetRotZ = THREE.MathUtils.lerp(-0.08, 0, p);
      targetScale = THREE.MathUtils.lerp(0.9, 0.3, p);  // Shrink away
    } else {
      // FOOTER: Bottle comes back on the LEFT gutter, facing forward
      const p = (scrollProgress - 0.8) / 0.2;
      targetX = THREE.MathUtils.lerp(-4, -3, p);        // Slide in from far left
      targetY = THREE.MathUtils.lerp(-2, -0.5, p);
      targetZ = THREE.MathUtils.lerp(-4, 0, p);         // Come back to normal depth
      targetRotY = THREE.MathUtils.lerp(Math.PI, Math.PI * 2, p); // Full revolution to face front
      targetRotX = 0;
      targetRotZ = 0;
      targetScale = THREE.MathUtils.lerp(0.3, 0.8, p);  // Grow back
    }

    // Silky smooth damping
    const damp = 0.06;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, damp);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY, damp);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, targetZ, damp);
    
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, damp);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, damp);
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, targetRotZ, damp);

    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, targetScale, damp));
  });

  return (
    <group ref={group}>
      {/* 
        PREMIUM ELLIPTICAL FOUNDATION BOTTLE
        Elegant oval cylinder with frosted glass, silver pump, and matte cap
      */}

      {/* Main Body — Frosted Glass */}
      <mesh position={[0, -0.25, 0]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.8, 0.85, 2.8, 64]} />
        <meshPhysicalMaterial 
          color="#1a1a1a"
          transmission={0.7} 
          opacity={1}
          metalness={0.15}
          roughness={0.3}
          ior={1.5}
          thickness={0.8}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>

      {/* Inner Dark Core (Product visible through glass) */}
      <mesh position={[0, -0.25, 0]} scale={[0.9, 1, 0.6]}>
        <cylinderGeometry args={[0.7, 0.75, 2.6, 64]} />
        <meshStandardMaterial color="#040404" />
      </mesh>

      {/* Silver Pump Base Ring */}
      <mesh position={[0, 1.2, 0]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.5, 0.55, 0.15, 32]} />
        <meshStandardMaterial color="#e8e8e8" metalness={1.0} roughness={0.05} />
      </mesh>
      
      {/* Silver Pump Stem */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.3, 16]} />
        <meshStandardMaterial color="#cccccc" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Pump Head */}
      <mesh position={[0, 1.6, 0]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#dddddd" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Matte Black Cap */}
      <mesh position={[0, 2.0, 0]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.8, 0.8, 0.9, 64]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.05} roughness={0.95} />
      </mesh>

      {/* Cap top lip (subtle ring detail) */}
      <mesh position={[0, 2.45, 0]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.82, 0.8, 0.05, 64]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Logo Text — flush on the front face */}
      <Text
        position={[0, -0.3, 0.601]}
        fontSize={0.18}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.2}
        fontWeight="bold"
      >
        CHULLAN
      </Text>
      
      {/* Product Type */}
      <Text
        position={[0, -0.65, 0.601]}
        fontSize={0.08}
        color="#777777"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.15}
      >
        FOUNDATION
      </Text>
    </group>
  );
}
