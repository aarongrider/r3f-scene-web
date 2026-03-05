import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 500;
const SPHERE_RADIUS = 1;
const SPRING_K = 200;
const DAMPING = 10;
const AUDIO_FORCE = 1000;

const RANDOMS = Float32Array.from({ length: COUNT * 2 }, () => Math.random());

const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const instances: { position: THREE.Vector3; scale: number }[] = [];
for (let i = 0; i < COUNT; i++) {
  const y = 1 - (i / (COUNT - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = goldenAngle * i;
  instances.push({
    position: new THREE.Vector3(
      Math.cos(theta) * r * SPHERE_RADIUS,
      y * SPHERE_RADIUS,
      Math.sin(theta) * r * SPHERE_RADIUS,
    ),
    scale: 0.03 + RANDOMS[i * 2] * 0.015,
  });
}

const FLOAT_PHASES = Float32Array.from(
  { length: COUNT * 3 },
  () => Math.random() * Math.PI * 2,
);
const FLOAT_FREQS = Float32Array.from(
  { length: COUNT },
  () => 0.3 + Math.random() * 0.4,
);
const FLOAT_AMP = 0.08;

const pos = new Float32Array(COUNT * 3);
const vel = new Float32Array(COUNT * 3);
instances.forEach(({ position }, i) => {
  pos[i * 3] = position.x;
  pos[i * 3 + 1] = position.y;
  pos[i * 3 + 2] = position.z;
});

export function SphereDots() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useRef(new THREE.Object3D());
  const color = useRef(new THREE.Color());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    let audioCtx: AudioContext;
    let stream: MediaStream;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((s) => {
        stream = s;
        audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.1;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        analyserRef.current = analyser;
        audioDataRef.current = new Uint8Array(
          analyser.frequencyBinCount,
        ) as Uint8Array<ArrayBuffer>;
      });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
      analyserRef.current = null;
      audioDataRef.current = null;
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);

    let rms = 0;
    if (analyserRef.current && audioDataRef.current) {
      analyserRef.current.getByteTimeDomainData(audioDataRef.current);
      let sum = 0;
      for (let j = 0; j < audioDataRef.current.length; j++) {
        const v = (audioDataRef.current[j] - 128) / 128;
        sum += v * v;
      }
      rms = Math.sqrt(sum / audioDataRef.current.length);
    }

    for (let i = 0; i < COUNT; i++) {
      const idx = i * 3;
      const t = clock.getElapsedTime() * FLOAT_FREQS[i];
      const ox =
        instances[i].position.x + Math.sin(t + FLOAT_PHASES[i * 3]) * FLOAT_AMP;
      const oy =
        instances[i].position.y +
        Math.sin(t + FLOAT_PHASES[i * 3 + 1]) * FLOAT_AMP;
      const oz =
        instances[i].position.z +
        Math.sin(t + FLOAT_PHASES[i * 3 + 2]) * FLOAT_AMP;
      const cx = pos[idx];
      const cy = pos[idx + 1];
      const cz = pos[idx + 2];

      vel[idx] += (SPRING_K * (ox - cx) - DAMPING * vel[idx]) * dt;
      vel[idx + 1] += (SPRING_K * (oy - cy) - DAMPING * vel[idx + 1]) * dt;
      vel[idx + 2] += (SPRING_K * (oz - cz) - DAMPING * vel[idx + 2]) * dt;

      if (rms > 0.01) {
        const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
        if (len > 0.001) {
          const force = rms * AUDIO_FORCE * dt;
          vel[idx] += (cx / len) * force;
          vel[idx + 1] += (cy / len) * force;
          vel[idx + 2] += (cz / len) * force;
        }
      }

      pos[idx] += vel[idx] * dt;
      pos[idx + 1] += vel[idx + 1] * dt;
      pos[idx + 2] += vel[idx + 2] * dt;

      dummy.current.position.set(pos[idx], pos[idx + 1], pos[idx + 2]);
      dummy.current.scale.setScalar(instances[i].scale);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);

      const brightness = Math.max(
        0.02,
        (pos[idx + 2] + SPHERE_RADIUS) / (2 * SPHERE_RADIUS),
      );
      color.current.setRGB(brightness, brightness, brightness);
      meshRef.current.setColorAt(i, color.current);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor)
      meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[0.5, 10, 10]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}
