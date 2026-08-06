import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BOTTLE_HEIGHT,
  createBodyProfile,
  createCapProfile,
  remapProfileUVs,
} from './bottleProfile';
import { createLabelMaps } from './labelTexture';

/** Normalises the model to 2 units tall with its base on y = -1. */
export const BOTTLE_SCALE = 2 / BOTTLE_HEIGHT;

type BottleProps = {
  /** Radians per second of idle rotation. 0 disables it. */
  spin?: number;
  /** Peak amplitude, in radians, of the idle sway. Ignored when `spin` is set. */
  sway?: number;
  /** Label texture width. ~1024 for a card, 2048 for the large stage. */
  textureSize?: number;
  /** Silhouette quality. The silhouette *is* the read on a black object. */
  segments?: number;
};

export function Bottle({ spin = 0, sway = 0.42, textureSize = 1024, segments = 128 }: BottleProps) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);

  const [fontsReady, setFontsReady] = useState(
    () => typeof document === 'undefined' || document.fonts?.status === 'loaded',
  );

  // The label is rasterised with the brand display face. If that font hasn't
  // arrived yet the first bake uses a fallback, so re-bake once it lands.
  useEffect(() => {
    if (fontsReady || typeof document === 'undefined' || !document.fonts) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fontsReady]);

  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const maps = useMemo(
    () => createLabelMaps(textureSize, maxAnisotropy),
    // `fontsReady` is a re-bake trigger, not an unused dependency.
    [textureSize, maxAnisotropy, fontsReady],
  );
  useEffect(() => maps.dispose, [maps]);

  // Lathe emits analytically-correct normals from the profile tangents.
  // Never run computeVertexNormals() on these: the seam ring is duplicated, so
  // averaging would give the two copies different normals and draw a hard seam
  // straight down the back of the bottle.
  const bodyGeometry = useMemo(
    () => remapProfileUVs(new THREE.LatheGeometry(createBodyProfile(), segments)),
    [segments],
  );
  const capGeometry = useMemo(
    () => new THREE.LatheGeometry(createCapProfile(), segments),
    [segments],
  );
  useEffect(
    () => () => {
      bodyGeometry.dispose();
      capGeometry.dispose();
    },
    [bodyGeometry, capGeometry],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    // Clamped because the canvas parks at frameloop="never" when scrolled away.
    // Without this the first delta after resume is the entire pause duration
    // and the bottle snaps to a random angle.
    const dt = Math.min(delta, 1 / 30);

    if (spin) g.rotation.y += dt * spin;
    else if (sway) g.rotation.y = Math.sin(state.clock.elapsedTime * 0.34) * sway;
  });

  return (
    <group ref={group} scale={BOTTLE_SCALE} position={[0, -1, 0]}>
      {/*
        Soft-touch matte black.

        `color` stays pure white because the map carries the albedo — setting
        both to the substrate value would multiply to near #050505 and give a
        dead object.

        `metalness` must be exactly 0. Specular gets tinted toward the albedo as
        metalness rises, so any metalness on a near-black surface turns the
        *reflections themselves* black. That, not the albedo, is the real cause
        of the flat "black hole" look.

        Sheen is what sells rubberised plastic: it's driven by the diffuse IBL,
        so it lifts the grazing edge with a soft halo that carries no reflected
        image. 0.72 roughness is the rubber band — below 0.5 reads as velvet,
        1.0 reads as dust. The colour must be a cool grey, never white.

        The low clearcoat isn't for shine, it's for lobe separation: it samples
        a much lower env mip than the 0.62-rough base, which is what keeps the
        rim highlight crisp on an otherwise soft body.
      */}
      <mesh geometry={bodyGeometry}>
        <meshPhysicalMaterial
          map={maps.albedo}
          roughnessMap={maps.roughness}
          color="#ffffff"
          roughness={0.62}
          metalness={0}
          ior={1.46}
          sheen={1}
          sheenRoughness={0.72}
          sheenColor="#8a8f96"
          clearcoat={0.08}
          clearcoatRoughness={0.3}
        />
      </mesh>

      {/* Cap: a slightly different moulding — a touch darker and rougher. */}
      <mesh geometry={capGeometry}>
        <meshPhysicalMaterial
          color="#1e1e22"
          roughness={0.68}
          metalness={0}
          ior={1.46}
          sheen={1}
          sheenRoughness={0.78}
          sheenColor="#7e838b"
          clearcoat={0.06}
          clearcoatRoughness={0.35}
        />
      </mesh>
    </group>
  );
}
