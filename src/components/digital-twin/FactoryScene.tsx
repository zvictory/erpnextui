"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { IsometricCamera } from "./scene/IsometricCamera";
import { FactoryFloor } from "./scene/FactoryFloor";
import { EquipmentModel } from "./scene/EquipmentModel";
import { EnvironmentSetup } from "./scene/EnvironmentSetup";
import { FACTORY_LAYOUT } from "@/config/factory-layout";

interface FactorySceneProps {
  onSelectEquipment?: (id: string | null) => void;
  selectedEquipment?: string | null;
}

export function FactoryScene({
  onSelectEquipment,
  selectedEquipment,
}: FactorySceneProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#f0f0f0" }}
      onPointerMissed={() => onSelectEquipment?.(null)}
    >
      <Suspense fallback={null}>
        <EnvironmentSetup />
        <IsometricCamera />
        <FactoryFloor />

        {FACTORY_LAYOUT.map((equipment) => (
          <EquipmentModel
            key={equipment.id}
            equipment={equipment}
            selected={selectedEquipment === equipment.id}
            onClick={onSelectEquipment}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}
