"use client";

export function EnvironmentSetup() {
  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.5} />

      {/* Main directional light with shadows */}
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Fill light from opposite side */}
      <directionalLight position={[-10, 10, -5]} intensity={0.3} />

      {/* Sky color */}
      <color attach="background" args={["#f0f0f0"]} />
    </>
  );
}
