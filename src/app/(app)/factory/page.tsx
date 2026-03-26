"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSidebar } from "@/components/ui/sidebar";
import { FACTORY_LAYOUT } from "@/config/factory-layout";

// Dynamic import — R3F Canvas cannot SSR
const FactoryScene = dynamic(
  () =>
    import("@/components/digital-twin/FactoryScene").then((mod) => ({
      default: mod.FactoryScene,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-900 text-muted-foreground">
        Loading 3D scene...
      </div>
    ),
  },
);

export default function FactoryPage() {
  const t = useTranslations("factory");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEquipment = FACTORY_LAYOUT.find((e) => e.id === selectedId);
  const { setOpen } = useSidebar();

  // Collapse sidebar on mount, restore on unmount
  useEffect(() => {
    setOpen(false);
    return () => setOpen(true);
  }, [setOpen]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Home button overlay */}
      <div className="absolute top-3 left-3 z-10">
        <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm" asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4 mr-1.5" />
            {t("title")}
          </Link>
        </Button>
      </div>

      {/* Equipment count */}
      <div className="absolute top-3 right-3 z-10">
        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
          {FACTORY_LAYOUT.length} {t("equipment")}
        </Badge>
      </div>

      {/* 3D Viewport — full screen */}
      <div className="flex-1">
        <FactoryScene
          selectedEquipment={selectedId}
          onSelectEquipment={setSelectedId}
        />
      </div>

      {/* Bottom detail panel */}
      {selectedEquipment && (
        <div className="absolute bottom-0 left-0 right-0 z-10 border-t bg-background/90 backdrop-blur-sm p-4">
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
            {selectedEquipment.parameters.length > 0 ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">{t("noParameters")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
