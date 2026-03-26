"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { FACTORY_LAYOUT } from "@/config/factory-layout";
import type { Equipment } from "@/types/factory-twin";

/* ── Simple equipment geometry per type ──────────────────────── */

function Tank({ eq, selected, onClick }: { eq: Equipment; selected: boolean; onClick: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const c = eq.color || "#4a9eff";
  return (
    <group position={eq.position} scale={eq.scale}>
      {/* body */}
      <mesh position={[0, 1.5, 0]} castShadow
        onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick(eq.id); }}>
        <cylinderGeometry args={[1.2, 1.2, 3, 32]} />
        <meshStandardMaterial color={c} emissive={hovered || selected ? c : "#000"} emissiveIntensity={hovered ? 0.4 : selected ? 0.6 : 0} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* dome */}
      <mesh position={[0, 3.1, 0]} castShadow>
        <sphereGeometry args={[1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={c} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.1, 32]} />
        <meshStandardMaterial color="#666" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Pump({ eq, selected, onClick }: { eq: Equipment; selected: boolean; onClick: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const c = eq.color || "#ff9f43";
  return (
    <group position={eq.position} scale={eq.scale}>
      <mesh position={[0, 0.4, 0]} castShadow
        onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick(eq.id); }}>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        <meshStandardMaterial color={c} emissive={hovered || selected ? c : "#000"} emissiveIntensity={hovered ? 0.4 : selected ? 0.6 : 0} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Line({ eq, selected, onClick }: { eq: Equipment; selected: boolean; onClick: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const c = eq.color || "#2ed573";
  return (
    <group position={eq.position} scale={eq.scale}>
      <mesh position={[0, 0.3, 0]} castShadow
        onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick(eq.id); }}>
        <boxGeometry args={[8, 0.4, 1.5]} />
        <meshStandardMaterial color={c} emissive={hovered || selected ? c : "#000"} emissiveIntensity={hovered ? 0.4 : selected ? 0.6 : 0} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* belt */}
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[7.8, 0.04, 1.2]} />
        <meshStandardMaterial color="#333" roughness={0.9} />
      </mesh>
      {/* legs */}
      {[-3, -1, 1, 3].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]}>
          <boxGeometry args={[0.15, 0.1, 1.3]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
    </group>
  );
}

function Warehouse({ eq, selected, onClick }: { eq: Equipment; selected: boolean; onClick: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={eq.position} scale={eq.scale}>
      <mesh position={[0, 1.5, 0]} castShadow
        onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick(eq.id); }}>
        <boxGeometry args={[6, 3, 4]} />
        <meshStandardMaterial color="#a4b0be" emissive={hovered || selected ? "#fff" : "#000"} emissiveIntensity={hovered ? 0.15 : selected ? 0.25 : 0} roughness={0.8} />
      </mesh>
      {/* roof */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[6.4, 0.4, 4.4]} />
        <meshStandardMaterial color="#777" roughness={0.7} />
      </mesh>
    </group>
  );
}

function EquipmentRenderer({ eq, selected, onClick }: { eq: Equipment; selected: boolean; onClick: (id: string) => void }) {
  switch (eq.type) {
    case "tank": return <Tank eq={eq} selected={selected} onClick={onClick} />;
    case "pump": return <Pump eq={eq} selected={selected} onClick={onClick} />;
    case "line": return <Line eq={eq} selected={selected} onClick={onClick} />;
    case "warehouse": return <Warehouse eq={eq} selected={selected} onClick={onClick} />;
    default: return null;
  }
}

/* ── Labels as simple sprites ───────────────────────────────── */

function EquipmentLabel({ eq }: { eq: Equipment }) {
  const y = eq.type === "tank" ? 4.5 : eq.type === "warehouse" ? 4.2 : 1.5;
  return (
    <group position={[eq.position[0], y * eq.scale, eq.position[2]]}>
      <sprite scale={[2.5, 0.5, 1]}>
        <spriteMaterial color="#000" opacity={0.6} transparent />
      </sprite>
    </group>
  );
}

/* ── Main scene ─────────────────────────────────────────────── */

interface FactorySceneProps {
  onSelectEquipment?: (id: string | null) => void;
  selectedEquipment?: string | null;
}

export function FactoryScene({ onSelectEquipment, selectedEquipment }: FactorySceneProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div style={{ width: "100%", height: "100%", background: "#e5e7eb" }} />;

  return (
    <Canvas
      shadows
      camera={{ position: [25, 18, 25], fov: 45, near: 0.1, far: 500 }}
      style={{ width: "100%", height: "100%", background: "#e5e7eb" }}
      onPointerMissed={() => onSelectEquipment?.(null)}
    >
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[15, 20, 10]} intensity={1.5} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20}
      />
      <directionalLight position={[-10, 10, -5]} intensity={0.4} />
      <color attach="background" args={["#e5e7eb"]} />

      {/* Controls */}
      <OrbitControls enableDamping dampingFactor={0.1} target={[0, 1, 2]}
        minDistance={8} maxDistance={60} maxPolarAngle={Math.PI / 2.2} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 40]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      {/* Grid lines */}
      <gridHelper args={[50, 50, "#9ca3af", "#d1d5db"]} />

      {/* Equipment */}
      {FACTORY_LAYOUT.map((eq) => (
        <EquipmentRenderer
          key={eq.id}
          eq={eq}
          selected={selectedEquipment === eq.id}
          onClick={(id) => onSelectEquipment?.(id)}
        />
      ))}
    </Canvas>
  );
}
