import { BackSide } from 'three';
import { Environment, Lightformer } from '@react-three/drei';

/**
 * Studio rig for a matte black bottle on a white page.
 *
 * The governing fact: on a near-black dielectric the diffuse term carries
 * almost no information — albedo is ~2% linear, so lit diffuse lands in the toe
 * of the tone curve and renders as mud. The shape is read entirely from the
 * *specular* response to the environment. So this rig is designed around what
 * the specular lobe sees, and everything is aimed at pushing those values above
 * ~0.10 linear where the tone mapper reproduces them one-to-one.
 *
 * Which is also why the shell is dark. Matte black on white is not a light-tent
 * shot; it's a dark studio with a big overhead scrim and narrow strip boxes
 * raking from behind. A bright ambient shell would grey the body up until it
 * had no contrast left against the page.
 *
 * Baked once into a small cube target, so it costs nothing per frame.
 * `frames={1}` matters: with `Infinity`, every frame flags the cube map for
 * PMREM regeneration and re-runs the whole mip chain.
 */

type StudioProps = {
  /** 512 keeps the ~4°-wide rim strips defined at the clearcoat's mip level. */
  resolution?: number;
};

export function Studio({ resolution = 512 }: StudioProps) {
  return (
    <Environment resolution={resolution} frames={1} environmentIntensity={1}>
      {/* Ambient shell. Stops surfaces facing away from every panel reflecting
          literal zero, without lifting the body off the page. Must stay dark. */}
      <mesh scale={60}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#15161b" side={BackSide} toneMapped={false} />
      </mesh>

      {/* Key: a large overhead scrim, forward of the subject. Gives the body its
          top-to-bottom gradient and the wide sheet highlight across the
          shoulder. Slightly warm — the warm-key / cool-rim split is the cheapest
          single thing that makes a render read as photography. */}
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#fff4e8"
        scale={[12, 10, 1]}
        position={[0, 7, 3.5]}
      />

      {/* Rim strips. Placed at ~124° and ~116° off the camera axis: a light at
          azimuth θ puts its highlight at screen offset R·sin(θ/2), so these land
          at 88% and 85% of the way to the silhouette — near the edge, but not
          on it, where the strip would vanish into the terminator.

          Narrow is the whole point. A wide panel here washes into a grey
          gradient instead of drawing a separating line. They're deliberately
          asymmetric: matched left/right rims are the loudest CGI tell there is. */}
      <Lightformer
        form="rect"
        intensity={9}
        color="#eaf1ff"
        scale={[0.3, 6, 1]}
        position={[-3.4, 0.3, -2.3]}
      />
      <Lightformer
        form="rect"
        intensity={6}
        color="#e6eeff"
        scale={[0.24, 5.4, 1]}
        position={[3.9, -0.1, -1.9]}
      />

      {/* Floor bounce — stands in for the white seamless. Lifts the lower third
          out of the tone curve's toe so the base doesn't dissolve into the page. */}
      <Lightformer
        form="rect"
        intensity={0.85}
        color="#ffffff"
        scale={[7, 2.5, 1]}
        position={[0, -3, 4]}
      />

      {/* Cap catchlight: the one small glint that says "physical object".
          Kept small and off-centre. */}
      <Lightformer
        form="circle"
        intensity={5}
        color="#ffffff"
        scale={1.1}
        position={[-2.2, 4, 2.6]}
      />

      {/* Top-back strip — draws the crown of the cap instead of letting the
          silhouette swallow it. */}
      <Lightformer
        form="rect"
        intensity={4}
        color="#f2f6ff"
        scale={[3.2, 0.32, 1]}
        position={[0, 3.2, -3.2]}
      />
    </Environment>
  );
}
