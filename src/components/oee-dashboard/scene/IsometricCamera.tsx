"use client";

import { OrbitControls } from "@react-three/drei";

export function IsometricCamera() {
  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.1}
      minDistance={10}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2.2}
      target={[0, 0, 2]}
    />
  );
}
