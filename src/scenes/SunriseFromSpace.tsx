import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float t = uTime;

    vec3 col = vec3(0.022, 0.020, 0.020);

    // --- Horizon glow ---
    // Vertical falloff: only the bottom ~40% gets any warmth
    float vertFall = pow(max(0.0, 1.0 - uv.y / 0.40), 2.2);

    // Horizontal radial: centered, wide soft bloom
    float dx = uv.x - 0.5;
    float radial = exp(-dx * dx * 3.8);

    float glow = vertFall * radial;

    // Slow subtle pulse on the bloom width and intensity
    float pulse = 1.0 + sin(t * 0.13) * 0.06 + sin(t * 0.07) * 0.04;
    glow *= pulse;

    // Warm horizon color: deep amber → bright orange at y=0
    // Two layers: a broad warm base + a tighter bright core right at the bottom
    vec3 warmBase   = vec3(0.55, 0.20, 0.03);
    vec3 brightCore = vec3(0.95, 0.50, 0.06);

    // Core is extra tight at the very bottom
    float coreFall  = pow(max(0.0, 1.0 - uv.y / 0.14), 3.0);
    float coreRadial = exp(-dx * dx * 5.5);

    col += warmBase   * glow * 0.85;
    col += brightCore * coreFall * coreRadial * pulse;

    // Very subtle cool-dark vignette at the top corners
    float vignette = 1.0 - smoothstep(0.5, 1.4, length((uv - vec2(0.5, 0.5)) * vec2(1.0, 0.6)));
    col *= 0.85 + vignette * 0.15;

    // Slow, almost imperceptible color drift
    float drift = sin(t * 0.09) * 0.008;
    col.r += drift * (1.0 - uv.y);
    col.g += drift * 0.3 * (1.0 - uv.y);

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Gradient() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export function SunriseFromSpace() {
  return (
    <>
      <Gradient />
      <EffectComposer>
        <Noise
          premultiply
          blendFunction={BlendFunction.SOFT_LIGHT}
          opacity={1}
        />
      </EffectComposer>
    </>
  );
}
