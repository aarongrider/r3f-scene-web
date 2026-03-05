import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { SphereDots } from "./scenes/SphereDots";
import { SunriseFromSpace } from "./scenes/SunriseFromSpace";

const SCENES = [
  { id: "sphere-dots", label: "Sphere Dots" },
  { id: "sunrise", label: "Sunrise" },
] as const;

type SceneId = (typeof SCENES)[number]["id"];

const CAMERA: Record<SceneId, [number, number, number]> = {
  "sphere-dots": [0, 0, 7],
  "sunrise": [0, 0, 1],
};

export default function App() {
  const [active, setActive] = useState<SceneId>("sphere-dots");

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
      }}
    >
      <nav style={navStyle}>
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            onClick={() => setActive(scene.id)}
            style={btnStyle(active === scene.id)}
          >
            {scene.label}
          </button>
        ))}
      </nav>

      <Canvas camera={{ position: CAMERA[active] }} gl={{ antialias: true }}>
        {active === "sphere-dots" && <SphereDots />}
        {active === "sunrise" && <SunriseFromSpace />}
        <OrbitControls />
      </Canvas>
    </div>
  );
}

const navStyle: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,
  display: "flex",
  gap: 8,
};

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 16px",
    background: active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}`,
    borderRadius: 20,
    color: active ? "#fff" : "rgba(255,255,255,0.5)",
    fontSize: 13,
    letterSpacing: "0.04em",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s",
  };
}
