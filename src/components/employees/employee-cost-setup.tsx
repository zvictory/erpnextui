"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeeCostInfo, useUpdateEmployeeCost } from "@/hooks/use-costing";
import { useWorkstationList } from "@/hooks/use-manufacturing";
import { formatNumber } from "@/lib/formatters";

interface EmployeeCostSetupProps {
  employeeId: string;
}

export function EmployeeCostSetup({ employeeId }: EmployeeCostSetupProps) {
  const t = useTranslations("costing");
  const tCommon = useTranslations("common");
  const { data: costInfo, isLoading } = useEmployeeCostInfo(employeeId);
  const { data: workstations = [] } = useWorkstationList(1, "", "workstation_name asc");
  const updateCost = useUpdateEmployeeCost();

  const [monthlySalary, setMonthlySalary] = useState(0);
  const [standardHours, setStandardHours] = useState(176);
  const [classification, setClassification] = useState<"Direct Labor" | "Period Cost">(
    "Direct Labor",
  );
  const [defaultWorkstation, setDefaultWorkstation] = useState("");

  useEffect(() => {
    if (costInfo) {
      setMonthlySalary(costInfo.custom_monthly_salary || 0);
      setStandardHours(costInfo.custom_standard_hours || 176);
      setClassification(costInfo.custom_cost_classification || "Direct Labor");
      setDefaultWorkstation(costInfo.custom_default_workstation || "");
    }
  }, [costInfo]);

  const hourlyCost = standardHours > 0 ? Math.round(monthlySalary / standardHours) : 0;

  const handleSave = () => {
    updateCost.mutate(
      {
        employeeId,
        monthly_salary: monthlySalary,
        standard_hours: standardHours,
        cost_classification: classification,
        default_workstation: defaultWorkstation || undefined,
      },
      {
        onSuccess: () => toast.success(t("costSaved")),
        onError: () => toast.error(tCommon("error")),
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("costSetupTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("monthly_salary")}</Label>
            <NumberInput value={monthlySalary} onChange={setMonthlySalary} min={0} />
          </div>

          <div className="space-y-2">
            <Label>{t("standard_hours")}</Label>
            <NumberInput value={standardHours} onChange={setStandardHours} min={1} max={744} />
            <p className="text-xs text-muted-foreground">{t("standardHoursHint")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("hourly_cost")}</Label>
            <Input value={formatNumber(hourlyCost)} readOnly className="bg-muted tabular-nums" />
            {monthlySalary > 0 && standardHours > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatNumber(monthlySalary)} / {standardHours} = {formatNumber(hourlyCost)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("cost_classification")}</Label>
            <Select
              value={classification}
              onValueChange={(v) => setClassification(v as "Direct Labor" | "Period Cost")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Direct Labor">{t("direct_labor")}</SelectItem>
                <SelectItem value="Period Cost">{t("period_cost")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>{t("default_workstation")}</Label>
            <Select value={defaultWorkstation} onValueChange={setDefaultWorkstation}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectWorkstation")} />
              </SelectTrigger>
              <SelectContent>
                {workstations.map((ws) => (
                  <SelectItem key={ws.name} value={ws.name}>
                    {ws.workstation_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={handleSave} disabled={updateCost.isPending}>
            {updateCost.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {tCommon("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
