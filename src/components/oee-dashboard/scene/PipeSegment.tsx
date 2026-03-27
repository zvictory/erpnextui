"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface PipeSegmentProps {
  points: [number, number, number][];
  color?: string;
  radius?: number;
  active?: boolean;
}

export function PipeSegment({ points, color = "#888888", radius = 0.08, active }: PipeSegmentProps) {
  const { geometry } = useMemo(() => {
    const vectors = points.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.5);
    const geo = new THREE.TubeGeometry(curve, 64, radius, 8, false);
    return { geometry: geo, curve };
  }, [points, radius]);

  const pipeColor = active ? "#22c55e" : color;

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color={pipeColor}
        metalness={0.7}
        roughness={0.25}
        emissive={active ? "#22c55e" : "#000000"}
        emissiveIntensity={active ? 0.3 : 0}
      />
    </mesh>
  );
}
