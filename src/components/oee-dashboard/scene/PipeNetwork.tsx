"use client";

import { useMemo } from "react";
import { PipeSegment } from "./PipeSegment";
import { PIPE_NETWORK, FACTORY_LAYOUT } from "@/config/factory-layout";

interface PipeNetworkProps {
  activeFlows?: Set<string>;
}

/** Look up equipment position by ID */
function getEquipmentPos(id: string): [number, number, number] {
  const eq = FACTORY_LAYOUT.find((e) => e.id === id);
  if (!eq) return [0, 0, 0];
  // Connect at base height (Y=0.5) for tanks, Y=0.4 for pumps, Y=0.5 for line/warehouse
  const y = eq.type === "pump" ? 0.4 : 0.5;
  return [eq.position[0], y, eq.position[2]];
}

export function PipeNetwork({ activeFlows }: PipeNetworkProps) {
  const pipes = useMemo(() => {
    return PIPE_NETWORK.map((pipe) => {
      const fromPos = getEquipmentPos(pipe.from);
      const toPos = getEquipmentPos(pipe.to);
      const allPoints: [number, number, number][] = [fromPos, ...pipe.waypoints, toPos];
      return { ...pipe, allPoints };
    });
  }, []);

  return (
    <group>
      {pipes.map((pipe) => (
        <PipeSegment
          key={pipe.id}
          points={pipe.allPoints}
          color={pipe.color}
          radius={pipe.radius}
          active={activeFlows?.has(pipe.id)}
        />
      ))}
    </group>
  );
}
