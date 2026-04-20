"use client";

import { useState, useRef } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Equipment } from "@/types/factory-twin";

interface EquipmentModelProps {
  equipment: Equipment;
  selected?: boolean;
  onClick?: (id: string) => void;
}

export function EquipmentModel({ equipment, selected, onClick }: EquipmentModelProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const baseColor = equipment.color || "#888888";

  return (
    <group
      position={equipment.position}
      rotation={equipment.rotation.map((r) => (r * Math.PI) / 180) as [number, number, number]}
      scale={equipment.scale}
    >
      {/* Equipment geometry based on type */}
      {equipment.type === "tank" && (
        <group>
          {/* Tank body — cylinder */}
          <mesh
            ref={meshRef}
            position={[0, 1.5, 0]}
            castShadow
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(equipment.id);
            }}
          >
            <cylinderGeometry args={[1.2, 1.2, 3, 32]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={hovered || selected ? baseColor : "#000000"}
              emissiveIntensity={hovered ? 0.3 : selected ? 0.5 : 0}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          {/* Tank top dome */}
          <mesh position={[0, 3.1, 0]} castShadow>
            <sphereGeometry args={[1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={baseColor} metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Tank base ring */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[1.4, 1.4, 0.1, 32]} />
            <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}

      {equipment.type === "pump" && (
        <group>
          {/* Pump body */}
          <mesh
            position={[0, 0.4, 0]}
            castShadow
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(equipment.id);
            }}
          >
            <boxGeometry args={[1.2, 0.8, 0.8]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={hovered || selected ? baseColor : "#000000"}
              emissiveIntensity={hovered ? 0.3 : selected ? 0.5 : 0}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          {/* Pump motor */}
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
            <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}

      {equipment.type === "line" && (
        <group>
          {/* Conveyor base */}
          <mesh
            position={[0, 0.3, 0]}
            castShadow
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(equipment.id);
            }}
          >
            <boxGeometry args={[8, 0.4, 1.5]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={hovered || selected ? baseColor : "#000000"}
              emissiveIntensity={hovered ? 0.3 : selected ? 0.5 : 0}
              metalness={0.4}
              roughness={0.5}
            />
          </mesh>
          {/* Conveyor legs */}
          {[-3.5, -1.5, 0.5, 2.5].map((x) => (
            <mesh key={x} position={[x, 0.05, 0]}>
              <boxGeometry args={[0.15, 0.1, 1.3]} />
              <meshStandardMaterial color="#555555" metalness={0.8} />
            </mesh>
          ))}
          {/* Conveyor belt surface */}
          <mesh position={[0, 0.52, 0]}>
            <boxGeometry args={[7.8, 0.04, 1.2]} />
            <meshStandardMaterial color="#333333" roughness={0.9} />
          </mesh>
        </group>
      )}

      {equipment.type === "warehouse" && (
        <group>
          {/* Building body */}
          <mesh
            position={[0, 1.5, 0]}
            castShadow
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(equipment.id);
            }}
          >
            <boxGeometry args={[6, 3, 4]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={hovered || selected ? "#ffffff" : "#000000"}
              emissiveIntensity={hovered ? 0.1 : selected ? 0.2 : 0}
              roughness={0.8}
            />
          </mesh>
          {/* Roof */}
          <mesh position={[0, 3.2, 0]} castShadow>
            <boxGeometry args={[6.4, 0.4, 4.4]} />
            <meshStandardMaterial color="#777777" roughness={0.7} />
          </mesh>
          {/* Door */}
          <mesh position={[0, 0.75, 2.01]}>
            <boxGeometry args={[1.5, 1.5, 0.05]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
        </group>
      )}

      {(equipment.type === "compressor" || equipment.type === "generator") && (
        <mesh
          position={[0, 0.5, 0]}
          castShadow
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(equipment.id);
          }}
        >
          <boxGeometry args={[1.5, 1, 1]} />
          <meshStandardMaterial
            color={baseColor}
            emissive={hovered || selected ? baseColor : "#000000"}
            emissiveIntensity={hovered ? 0.3 : selected ? 0.5 : 0}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      )}

      {/* Floating label */}
      <Html
        position={[
          0,
          equipment.type === "tank" ? 4.2 : equipment.type === "warehouse" ? 4 : 1.8,
          0,
        ]}
        center
        distanceFactor={15}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: selected ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.7)",
            color: "white",
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            border: selected ? "1px solid #4a9eff" : "1px solid transparent",
          }}
        >
          <div style={{ fontWeight: "bold" }}>{equipment.id}</div>
          <div style={{ opacity: 0.8, fontSize: "10px" }}>{equipment.label}</div>
        </div>
      </Html>
    </group>
  );
}
