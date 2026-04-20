"use client";

import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { useEditorStore } from "@/stores/editor-store";
import { PipeDrawer } from "./PipeDrawer";
import type { Equipment } from "@/types/factory-twin";

/* ── Reuse equipment geometry from FactoryScene ─────────────── */

function TankGeom({
  eq,
  selected,
  onClick,
}: {
  eq: Equipment;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const c = eq.color || "#4a9eff";
  return (
    <group scale={eq.scale}>
      <mesh
        position={[0, 1.5, 0]}
        castShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <cylinderGeometry args={[1.2, 1.2, 3, 32]} />
        <meshStandardMaterial
          color={c}
          emissive={hovered || selected ? c : "#000"}
          emissiveIntensity={hovered ? 0.4 : selected ? 0.6 : 0}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <sphereGeometry args={[1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={c} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.1, 32]} />
        <meshStandardMaterial color="#666" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function LineGeom({
  eq,
  selected,
  onClick,
}: {
  eq: Equipment;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const c = eq.color || "#2ed573";
  return (
    <group scale={eq.scale}>
      <mesh
        position={[0, 0.3, 0]}
        castShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[8, 0.4, 1.5]} />
        <meshStandardMaterial
          color={c}
          emissive={hovered || selected ? c : "#000"}
          emissiveIntensity={hovered ? 0.4 : selected ? 0.6 : 0}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[7.8, 0.04, 1.2]} />
        <meshStandardMaterial color="#333" roughness={0.9} />
      </mesh>
    </group>
  );
}

function WarehouseGeom({
  eq,
  selected,
  onClick,
}: {
  eq: Equipment;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const c = eq.color || "#a4b0be";
  return (
    <group scale={eq.scale}>
      <mesh
        position={[0, 1.5, 0]}
        castShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[6, 3, 4]} />
        <meshStandardMaterial
          color={c}
          emissive={hovered || selected ? "#fff" : "#000"}
          emissiveIntensity={hovered ? 0.15 : selected ? 0.25 : 0}
          roughness={0.8}
        />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[6.4, 0.4, 4.4]} />
        <meshStandardMaterial color="#777" roughness={0.7} />
      </mesh>
    </group>
  );
}

function PumpGeom({
  eq,
  selected,
  onClick,
}: {
  eq: Equipment;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const c = eq.color || "#ff9f43";
  return (
    <group scale={eq.scale}>
      <mesh
        position={[0, 0.4, 0]}
        castShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        <meshStandardMaterial
          color={c}
          emissive={hovered || selected ? c : "#000"}
          emissiveIntensity={hovered ? 0.4 : selected ? 0.6 : 0}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function EquipmentGeom({
  eq,
  selected,
  onClick,
}: {
  eq: Equipment;
  selected: boolean;
  onClick: () => void;
}) {
  switch (eq.type) {
    case "tank":
      return <TankGeom eq={eq} selected={selected} onClick={onClick} />;
    case "line":
      return <LineGeom eq={eq} selected={selected} onClick={onClick} />;
    case "warehouse":
      return <WarehouseGeom eq={eq} selected={selected} onClick={onClick} />;
    case "pump":
    case "compressor":
    case "generator":
      return <PumpGeom eq={eq} selected={selected} onClick={onClick} />;
    default:
      return null;
  }
}

/* ── Label overlay ─────────────────────────────────────────── */

function EditorLabel({ eq }: { eq: Equipment }) {
  const y = eq.type === "tank" ? 4.2 : eq.type === "warehouse" ? 4 : 1.6;
  return (
    <Html
      position={[eq.position[0], y * eq.scale, eq.position[2]]}
      center
      distanceFactor={20}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div className="bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap">
        {eq.id}
      </div>
    </Html>
  );
}

/* ── Draggable Equipment Wrapper ───────────────────────────── */

function DraggableEquipment({ eq }: { eq: Equipment }) {
  const { activeTool, selectedIds, selectEquipment, moveEquipment, startPipeDrawing } =
    useEditorStore();
  const groupRef = useRef<THREE.Group>(null);
  const [groupNode, setGroupNode] = useState<THREE.Group | null>(null);
  const isSelected = selectedIds.includes(eq.id);
  const showTransform =
    isSelected && (activeTool === "move" || activeTool === "rotate" || activeTool === "scale");
  const transformMode =
    activeTool === "move" ? "translate" : activeTool === "rotate" ? "rotate" : "scale";

  const callbackRef = useCallback((node: THREE.Group | null) => {
    (groupRef as React.MutableRefObject<THREE.Group | null>).current = node;
    setGroupNode(node);
  }, []);

  const handleClick = useCallback(() => {
    if (activeTool === "pipe") {
      const { pipeDrawing } = useEditorStore.getState();
      if (!pipeDrawing.active) {
        startPipeDrawing(eq.id);
      } else {
        useEditorStore.getState().finishPipeDrawing(eq.id);
      }
      return;
    }
    if (activeTool === "delete") {
      useEditorStore.getState().deleteEquipment(eq.id);
      return;
    }
    selectEquipment(eq.id);
  }, [eq.id, activeTool, selectEquipment, startPipeDrawing]);

  const handleTransformChange = useCallback(() => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    moveEquipment(eq.id, [pos.x, pos.y, pos.z]);
  }, [eq.id, moveEquipment]);

  return (
    <>
      <group ref={callbackRef} position={eq.position}>
        <EquipmentGeom eq={eq} selected={isSelected} onClick={handleClick} />
      </group>
      <EditorLabel eq={eq} />
      {showTransform && groupNode && (
        <TransformControls
          object={groupNode}
          mode={transformMode}
          onMouseUp={handleTransformChange}
          translationSnap={1}
          rotationSnap={Math.PI / 12}
          scaleSnap={0.1}
          size={0.6}
        />
      )}
    </>
  );
}

/* ── Pipe visualization (simplified for editor) ────────────── */

function EditorPipes() {
  const { pipes, equipment, selectedIds } = useEditorStore();

  return (
    <>
      {pipes.map((pipe) => {
        const fromEq = equipment.find((e) => e.id === pipe.from);
        const toEq = equipment.find((e) => e.id === pipe.to);
        if (!fromEq || !toEq) return null;

        const isSelected = selectedIds.includes(pipe.id);
        const points = [
          new THREE.Vector3(fromEq.position[0], 0.5, fromEq.position[2]),
          ...pipe.waypoints.map((wp) => new THREE.Vector3(wp[0], wp[1], wp[2])),
          new THREE.Vector3(toEq.position[0], 0.5, toEq.position[2]),
        ];

        if (points.length < 2) return null;
        const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
        const tubeGeom = new THREE.TubeGeometry(curve, 32, pipe.radius ?? 0.08, 8, false);

        return (
          <mesh
            key={pipe.id}
            geometry={tubeGeom}
            onClick={(e) => {
              e.stopPropagation();
              useEditorStore.getState().selectEquipment(pipe.id);
            }}
          >
            <meshStandardMaterial
              color={isSelected ? "#60a5fa" : pipe.color || "#888888"}
              emissive={isSelected ? "#60a5fa" : "#000"}
              emissiveIntensity={isSelected ? 0.3 : 0}
              metalness={0.4}
              roughness={0.6}
            />
          </mesh>
        );
      })}
    </>
  );
}

/* ── Main Editor Canvas ────────────────────────────────────── */

export function EditorCanvas() {
  const { equipment, showGrid, clearSelection } = useEditorStore();
  // useSyncExternalStore gives false on server (SSR), true on client — no effect needed
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900" />;

  return (
    <Canvas
      shadows
      camera={{ position: [28, 22, 28], fov: 45, near: 0.1, far: 500 }}
      style={{ width: "100%", height: "100%" }}
      onPointerMissed={() => clearSelection()}
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <directionalLight position={[-10, 10, -5]} intensity={0.4} />
      <color attach="background" args={["#e5e7eb"]} />

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        target={[0, 0, 1]}
        minDistance={8}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={0.2}
      />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>

      {/* Grid */}
      {showGrid && <gridHelper args={[60, 60, "#9ca3af", "#d1d5db"]} />}

      {/* Equipment */}
      {equipment.map((eq) => (
        <DraggableEquipment key={eq.id} eq={eq} />
      ))}

      {/* Pipes */}
      <EditorPipes />

      {/* Pipe drawer overlay */}
      <PipeDrawer />
    </Canvas>
  );
}
