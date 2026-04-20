"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PIPE_NETWORK, FACTORY_LAYOUT } from "@/config/factory-layout";

const PARTICLES_PER_PIPE = 8;
const SPEED = 0.15; // curve progress per second
const PARTICLE_RADIUS = 0.07;

function getEquipmentPos(id: string): [number, number, number] {
  const eq = FACTORY_LAYOUT.find((e) => e.id === id);
  if (!eq) return [0, 0, 0];
  const y = eq.type === "pump" ? 0.4 : 0.5;
  return [eq.position[0], y, eq.position[2]];
}

interface FlowParticlesProps {
  activeFlows: Set<string>;
}

export function ProductFlowParticles({ activeFlows }: FlowParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Build curves for all active pipes
  const { curves, totalParticles } = useMemo(() => {
    const activePipes = PIPE_NETWORK.filter((p) => activeFlows.has(p.id));
    const c = activePipes.map((pipe) => {
      const fromPos = getEquipmentPos(pipe.from);
      const toPos = getEquipmentPos(pipe.to);
      const points = [fromPos, ...pipe.waypoints, toPos].map((p) => new THREE.Vector3(...p));
      return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
    });
    return { curves: c, totalParticles: c.length * PARTICLES_PER_PIPE };
  }, [activeFlows]);

  // Track progress for each particle
  const progressRef = useRef<Float32Array>(new Float32Array(0));
  useEffect(() => {
    if (progressRef.current.length !== totalParticles) {
      const arr = new Float32Array(totalParticles);
      for (let i = 0; i < totalParticles; i++) {
        arr[i] = (i % PARTICLES_PER_PIPE) / PARTICLES_PER_PIPE;
      }
      progressRef.current = arr;
    }
  }, [totalParticles]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (!meshRef.current || totalParticles === 0) return;

    const progress = progressRef.current;
    let idx = 0;

    for (let c = 0; c < curves.length; c++) {
      const curve = curves[c];
      for (let p = 0; p < PARTICLES_PER_PIPE; p++) {
        // Advance
        progress[idx] = (progress[idx] + SPEED * delta) % 1;

        // Position on curve
        const point = curve.getPointAt(progress[idx]);
        dummy.position.copy(point);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (totalParticles === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, totalParticles]}
      frustumCulled={false}
    >
      <sphereGeometry args={[PARTICLE_RADIUS, 8, 6]} />
      <meshStandardMaterial
        color="#4ade80"
        emissive="#22c55e"
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
