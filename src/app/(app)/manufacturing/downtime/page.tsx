import Link from "next/link";
import { Plus, Clock, AlertTriangle } from "lucide-react";
import { startOfMonth, format } from "date-fns";

import { getDowntimeEvents, getDowntimeParetoData } from "@/actions/downtime";
import { getLines } from "@/actions/lines";
import { formatNumber } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DowntimeTable } from "@/components/manufacturing/downtime/downtime-table";
import { DowntimeParetoChart } from "@/components/manufacturing/downtime/pareto-chart";

export default async function DowntimePage() {
  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");

  const [eventsResult, paretoResult, linesResult] = await Promise.all([
    getDowntimeEvents(),
    getDowntimeParetoData({ dateFrom: monthStart, dateTo: todayStr }),
    getLines(),
  ]);

  const events = eventsResult.success ? eventsResult.data : [];
  const paretoData = paretoResult.success ? paretoResult.data : [];
  const lines = linesResult.success
    ? linesResult.data.map((l) => ({ id: l.id, name: l.name }))
    : [];

  // Summary: this month's unplanned hours and event count
  const thisMonthEvents = events.filter((e) => e.date >= monthStart && e.date <= todayStr);
  const totalUnplannedMinutes = thisMonthEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
  const totalUnplannedHours = totalUnplannedMinutes / 60;
  const eventCount = thisMonthEvents.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Downtime Tracking</h1>
          <p className="text-muted-foreground">Monitor and analyze equipment downtime events.</p>
        </div>
        <Button asChild>
          <Link href="/manufacturing/downtime/new">
            <Plus className="mr-2 size-4" />
            New Event
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unplanned Downtime (This Month)</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalUnplannedHours, 1)}h</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(totalUnplannedMinutes)} total minutes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events This Month</CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventCount}</div>
            <p className="text-xs text-muted-foreground">downtime events recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Pareto Chart - Full width */}
      <DowntimeParetoChart data={paretoData} />

      {/* Event Log Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Event Log</h2>
        <DowntimeTable data={events} lines={lines} />
      </div>
    </div>
  );
}
