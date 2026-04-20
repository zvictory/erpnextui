"use client";

import { useRef, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEditorStore } from "@/stores/editor-store";

/** Invisible floor plane for raycasting click positions during pipe drawing. */
export function PipeDrawer() {
  const {
    pipeDrawing,
    addPipeWaypoint,
    finishPipeDrawing,
    cancelPipeDrawing: _cancelPipeDrawing,
    equipment,
    activeTool,
  } = useEditorStore();
  const planeRef = useRef<THREE.Mesh>(null);
  const { raycaster: _raycaster, pointer: _pointer, camera: _camera } = useThree();

  // Preview line showing current pipe path
  const previewPoints = useMemo(() => {
    if (!pipeDrawing.active || !pipeDrawing.fromId) return null;
    const fromEq = equipment.find((e) => e.id === pipeDrawing.fromId);
    if (!fromEq) return null;

    const points: THREE.Vector3[] = [
      new THREE.Vector3(fromEq.position[0], 0.5, fromEq.position[2]),
      ...pipeDrawing.waypoints.map((wp) => new THREE.Vector3(wp[0], wp[1], wp[2])),
    ];
    return points;
  }, [pipeDrawing, equipment]);

  if (activeTool !== "pipe") return null;

  const handleClick = (e: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    e.stopPropagation();
    if (!pipeDrawing.active) return;

    // Check if clicking on equipment
    const clickedEqId = getClickedEquipmentId(e.point, equipment);
    if (clickedEqId && clickedEqId !== pipeDrawing.fromId) {
      finishPipeDrawing(clickedEqId);
      return;
    }

    // Add waypoint at floor intersection
    addPipeWaypoint([Math.round(e.point.x * 2) / 2, 0.5, Math.round(e.point.z * 2) / 2]);
  };

  return (
    <>
      {/* Invisible click plane */}
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onClick={handleClick}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Preview line */}
      {previewPoints && previewPoints.length >= 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(previewPoints.flatMap((p) => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineDashedMaterial color="#22c55e" dashSize={0.3} gapSize={0.15} linewidth={1} />
        </line>
      )}

      {/* Waypoint markers */}
      {pipeDrawing.waypoints.map((wp, i) => (
        <mesh key={i} position={[wp[0], wp[1], wp[2]]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </>
  );
}

function getClickedEquipmentId(
  point: THREE.Vector3,
  equipment: { id: string; position: [number, number, number] }[],
): string | null {
  for (const eq of equipment) {
    const dx = point.x - eq.position[0];
    const dz = point.z - eq.position[2];
    if (Math.sqrt(dx * dx + dz * dz) < 2) {
      return eq.id;
    }
  }
  return null;
}
