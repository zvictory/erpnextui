"use client";

import { Grid } from "@react-three/drei";

export function FactoryFloor() {
  return (
    <>
      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Grid overlay */}
      <Grid
        position={[0, 0, 0]}
        args={[40, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#d0d0d0"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#b0b0b0"
        fadeDistance={50}
        infiniteGrid={false}
      />
    </>
  );
}
