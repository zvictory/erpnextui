"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FACTORY_LAYOUT } from "@/config/factory-layout";

// Dynamic import — R3F Canvas cannot SSR
const FactoryScene = dynamic(
  () =>
    import("@/components/digital-twin/FactoryScene").then((mod) => ({
      default: mod.FactoryScene,
    })),
  { ssr: false },
);

export default function FactoryPage() {
  const t = useTranslations("factory");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEquipment = FACTORY_LAYOUT.find((e) => e.id === selectedId);

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)] -m-4 md:-m-6 overflow-hidden">
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <FactoryScene
          selectedEquipment={selectedId}
          onSelectEquipment={setSelectedId}
        />

        {/* Title overlay */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <h1 className="text-lg font-semibold text-foreground/80 bg-background/70 backdrop-blur-sm rounded-md px-3 py-1.5">
            {t("title")}
          </h1>
        </div>

        {/* Equipment count badge */}
        <div className="absolute top-4 right-4 pointer-events-none">
          <Badge variant="secondary" className="bg-background/70 backdrop-blur-sm">
            {FACTORY_LAYOUT.length} {t("equipment")}
          </Badge>
        </div>
      </div>

      {/* Bottom detail panel — shows when equipment selected */}
      {selectedEquipment && (
        <div className="border-t bg-background p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{selectedEquipment.id}</span>
                <span className="text-muted-foreground">—</span>
                <span className="font-medium">{selectedEquipment.label}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedEquipment.type}
                </Badge>
              </div>
              {selectedEquipment.linkedWorkstation && (
                <span className="text-xs text-muted-foreground">
                  {t("workstation")}: {selectedEquipment.linkedWorkstation}
                </span>
              )}
              {selectedEquipment.linkedWarehouse && (
                <span className="text-xs text-muted-foreground">
                  {t("warehouse")}: {selectedEquipment.linkedWarehouse}
                </span>
              )}
            </div>
            {selectedEquipment.parameters.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {selectedEquipment.parameters.map((param) => (
                  <Card key={param.key} className="flex-1 min-w-[140px]">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{param.label}</p>
                      <p className="text-lg font-bold tabular-nums text-muted-foreground/50">
                        — {param.unit}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {param.min}–{param.max} {param.unit}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {selectedEquipment.parameters.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noParameters")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
