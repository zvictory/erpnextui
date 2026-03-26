"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Home, GitBranch, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSidebar } from "@/components/ui/sidebar";
import { FACTORY_LAYOUT } from "@/config/factory-layout";
import { useActiveWorkOrders, useRecentStockEntries } from "@/hooks/use-factory-twin";
import { useCompanyStore } from "@/stores/company-store";
import { useFactoryTwinStore } from "@/stores/factory-twin-store";
import { buildTimeline } from "@/lib/playback/build-timeline";
import { PlaybackModeToggle } from "@/components/digital-twin/panels/PlaybackModeToggle";
import { TimelineControl } from "@/components/digital-twin/panels/TimelineControl";
import { EventLog } from "@/components/digital-twin/panels/EventLog";
import { EquipmentDetail } from "@/components/digital-twin/panels/EquipmentDetail";
import { ViewModeToggle } from "@/components/digital-twin/controls/ViewModeToggle";
import { useFactoryShortcuts } from "@/hooks/use-factory-shortcuts";

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
  const { company } = useCompanyStore();
  const { data: workOrders = [] } = useActiveWorkOrders(company);
  const { data: recentEntries = [] } = useRecentStockEntries(company);
  const { showPipes, showFlow, togglePipes, toggleFlow, mode, snapshot, viewMode } =
    useFactoryTwinStore();
  useFactoryShortcuts();

  // Build timeline when data changes — use a fingerprint to avoid infinite loops
  const timelineKey = `${workOrders.length}-${recentEntries.length}`;
  const prevKeyRef = useRef("");
  useEffect(() => {
    if (timelineKey === prevKeyRef.current) return;
    if (workOrders.length === 0 && recentEntries.length === 0) return;
    prevKeyRef.current = timelineKey;
    const events = buildTimeline(workOrders, recentEntries);
    const now = Date.now();
    const start = events.length > 0 ? events[0].timestamp : now - 2 * 3600_000;
    useFactoryTwinStore.getState().setTimeline(start, now, events);
  }, [timelineKey, workOrders, recentEntries]);

  // Collapse sidebar on mount, restore on unmount
  useEffect(() => {
    setOpen(false);
    return () => setOpen(true);
  }, [setOpen]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar: Home + Mode toggle */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm" asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4 mr-1.5" />
            {t("title")}
          </Link>
        </Button>
        <PlaybackModeToggle />
        <ViewModeToggle />
      </div>

      {/* Playback: Timeline control */}
      {mode === "playback" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(90%,700px)]">
          <TimelineControl />
        </div>
      )}

      {/* Equipment detail panel (right side) */}
      {selectedEquipment && mode === "live" && (
        <div className="absolute top-14 right-3 z-10">
          <EquipmentDetail
            equipment={selectedEquipment}
            workOrder={workOrders.find((w) => w.workstation === selectedEquipment.linkedWorkstation)}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      {/* Playback: Event log */}
      {mode === "playback" && (
        <div className="absolute top-14 right-3 z-10 w-64 bg-black/70 backdrop-blur-sm rounded-lg p-2">
          <div className="text-xs text-white/60 font-semibold mb-1 px-2">Events</div>
          <EventLog />
        </div>
      )}

      {/* Layer toggles */}
      <div className="absolute bottom-4 left-3 z-10 flex flex-col gap-1.5">
        <Button
          variant={showPipes ? "default" : "outline"}
          size="sm"
          className="bg-background/80 backdrop-blur-sm h-8 text-xs"
          onClick={togglePipes}
        >
          <GitBranch className="h-3.5 w-3.5 mr-1" />
          Pipes
        </Button>
        <Button
          variant={showFlow ? "default" : "outline"}
          size="sm"
          className="bg-background/80 backdrop-blur-sm h-8 text-xs"
          onClick={toggleFlow}
          disabled={!showPipes}
        >
          <Droplets className="h-3.5 w-3.5 mr-1" />
          Flow
        </Button>
      </div>

      {/* Status badges */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        {workOrders.length > 0 && (
          <Badge className="bg-green-600/90 text-white backdrop-blur-sm">
            {workOrders.filter((w) => w.status === "In Process").length} active
          </Badge>
        )}
        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
          {FACTORY_LAYOUT.length} {t("equipment")}
        </Badge>
      </div>

      {/* 3D Viewport — full screen */}
      <div className="flex-1">
        <FactoryScene
          selectedEquipment={selectedId}
          onSelectEquipment={setSelectedId}
          workOrders={mode === "live" ? workOrders : []}
          showPipes={showPipes}
          showFlow={showFlow}
          playbackSnapshot={mode === "playback" ? snapshot : null}
          viewMode={viewMode}
        />
      </div>

      {/* Bottom detail panel */}
      {selectedEquipment && (() => {
        const activeWO = workOrders.find((w) => w.workstation === selectedEquipment.linkedWorkstation);
        const relatedEntries = recentEntries.filter(
          (e) => e.from_warehouse === selectedEquipment.linkedWarehouse || e.to_warehouse === selectedEquipment.linkedWarehouse || e.work_order === activeWO?.name,
        );
        return (
          <div className="absolute bottom-0 left-0 right-0 z-10 border-t bg-background/90 backdrop-blur-sm p-4">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg">{selectedEquipment.id}</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="font-medium">{selectedEquipment.label}</span>
                  <Badge variant="outline" className="text-xs">{selectedEquipment.type}</Badge>
                  {activeWO && (
                    <Badge className="bg-green-600 text-white text-xs">
                      {activeWO.status}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {selectedEquipment.linkedWorkstation && (
                    <span>{t("workstation")}: {selectedEquipment.linkedWorkstation}</span>
                  )}
                  {selectedEquipment.linkedWarehouse && (
                    <span>{t("warehouse")}: {selectedEquipment.linkedWarehouse}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                {/* Active Work Order card */}
                {activeWO && (
                  <Card className="flex-1 min-w-[200px] border-green-500/30">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Work Order</p>
                      <p className="text-sm font-mono font-medium">{activeWO.name}</p>
                      <p className="text-sm font-medium mt-1">{activeWO.item_name || activeWO.production_item}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${activeWO.qty > 0 ? (activeWO.produced_qty / activeWO.qty) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono tabular-nums">
                          {activeWO.produced_qty}/{activeWO.qty}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Parameter cards */}
                {selectedEquipment.parameters.map((param) => (
                  <Card key={param.key} className="min-w-[130px]">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{param.label}</p>
                      <p className="text-lg font-bold tabular-nums text-muted-foreground/50">— {param.unit}</p>
                      <p className="text-[10px] text-muted-foreground">{param.min}–{param.max} {param.unit}</p>
                    </CardContent>
                  </Card>
                ))}

                {/* Recent activity */}
                {relatedEntries.length > 0 && (
                  <Card className="min-w-[180px]">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Recent Activity</p>
                      <div className="space-y-1 mt-1">
                        {relatedEntries.slice(0, 3).map((e) => (
                          <div key={e.name} className="text-xs">
                            <span className="font-mono text-muted-foreground">{e.posting_time?.slice(0, 5)}</span>
                            {" "}
                            <span>{e.purpose}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {!activeWO && selectedEquipment.parameters.length === 0 && relatedEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("noParameters")}</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
