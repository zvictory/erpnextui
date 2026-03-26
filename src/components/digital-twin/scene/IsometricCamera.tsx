"use client";

import { useRef } from "react";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";

export function IsometricCamera() {
  const controlsRef = useRef(null);

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[20, 20, 20]}
        zoom={40}
        near={0.1}
        far={1000}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        minZoom={15}
        maxZoom={120}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}
