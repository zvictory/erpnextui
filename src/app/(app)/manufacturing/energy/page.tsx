import { Plus, Zap, Flame, TrendingUp, Activity, DollarSign } from "lucide-react";

import { getEnergyLogs } from "@/actions/energy";
import { getSettings } from "@/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnergyTable, type EnergyLogRow } from "@/components/manufacturing/energy/energy-table";
import { EnergyChart } from "@/components/manufacturing/energy/energy-chart";
import { EnergyForm } from "@/components/manufacturing/energy/energy-form";

export default async function EnergyPage() {
  const [logsResult, settingsResult] = await Promise.all([
    getEnergyLogs(),
    getSettings(),
  ]);

  const rawLogs = logsResult.success ? logsResult.data : [];
  const settingsData = settingsResult.success ? settingsResult.data : {};

  const electricityPerKg = parseFloat(settingsData["electricity_per_kg"] || "0");
  const gasPerKg = parseFloat(settingsData["gas_per_kg"] || "0");

  // Calculate expected values and variances on the server side using settings
  const tableData: EnergyLogRow[] = rawLogs.map((log) => {
    const weight = log.totalProductionWeightKg ?? 0;
    const expectedElectricity = weight * electricityPerKg;
    const expectedGas = weight * gasPerKg;
    const actualElectricity = log.electricityKwh ?? 0;
    const actualGas = log.gasM3 ?? 0;

    return {
      id: log.id,
      date: log.date,
      electricityKwh: log.electricityKwh,
      gasM3: log.gasM3,
      totalProductionWeightKg: weight,
      expectedElectricity,
      expectedGas,
      electricityVariance: actualElectricity - expectedElectricity,
      gasVariance: actualGas - expectedGas,
    };
  });

  // Chart data
  const chartData = rawLogs.map((log) => ({
    date: log.date,
    electricityKwh: log.electricityKwh,
    gasM3: log.gasM3,
  }));

  // Summary metrics
  const totalElectricity = rawLogs.reduce(
    (sum, l) => sum + (l.electricityKwh ?? 0),
    0
  );
  const totalGas = rawLogs.reduce((sum, l) => sum + (l.gasM3 ?? 0), 0);

  const logCount = rawLogs.length;
  const avgDailyElectricity = logCount > 0 ? totalElectricity / logCount : 0;
  const avgDailyGas = logCount > 0 ? totalGas / logCount : 0;
  const estimatedCost = totalElectricity * 0.12 + totalGas * 0.80; // UZS placeholder

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Energy Tracking</h1>
        <p className="text-muted-foreground">
          Monitor energy consumption and compare against production-based
          targets.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Electricity</CardTitle>
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
              <Zap className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalElectricity.toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
              <span className="text-sm font-normal text-muted-foreground">kWh</span>
            </div>
            <p className="text-xs text-muted-foreground">across {logCount} log{logCount !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gas</CardTitle>
            <div className="rounded-full bg-sky-100 p-2 dark:bg-sky-900/30">
              <Flame className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalGas.toLocaleString("en-US", { maximumFractionDigits: 1 })}{" "}
              <span className="text-sm font-normal text-muted-foreground">m³</span>
            </div>
            <p className="text-xs text-muted-foreground">across {logCount} log{logCount !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Electricity</CardTitle>
            <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/30">
              <TrendingUp className="size-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgDailyElectricity.toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
              <span className="text-sm font-normal text-muted-foreground">kWh</span>
            </div>
            <p className="text-xs text-muted-foreground">per log entry</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Gas</CardTitle>
            <div className="rounded-full bg-cyan-100 p-2 dark:bg-cyan-900/30">
              <Activity className="size-4 text-cyan-600 dark:text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgDailyGas.toLocaleString("en-US", { maximumFractionDigits: 1 })}{" "}
              <span className="text-sm font-normal text-muted-foreground">m³</span>
            </div>
            <p className="text-xs text-muted-foreground">per log entry</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Total Cost</CardTitle>
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/30">
              <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estimatedCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
              <span className="text-sm font-normal text-muted-foreground">UZS</span>
            </div>
            <p className="text-xs text-muted-foreground">0.12/kWh + 0.80/m³</p>
          </CardContent>
        </Card>
      </div>

      {/* Energy Trend Chart */}
      <EnergyChart data={chartData} />

      {/* Add Entry Form */}
      <Card className="border-l-4 border-l-violet-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <div className="rounded-full bg-violet-100 p-1.5 dark:bg-violet-900/30">
              <Plus className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            Add Energy Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnergyForm />
        </CardContent>
      </Card>

      {/* Energy Log Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Energy Log</h2>
        <EnergyTable data={tableData} />
      </div>
    </div>
  );
}
