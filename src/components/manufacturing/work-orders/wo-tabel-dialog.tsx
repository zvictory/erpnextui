"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDirectLaborEmployees, useSaveWorkOrderTabel, useWorkOrderTabel } from "@/hooks/use-costing";
import { useTimesheetStore } from "@/stores/timesheet-store";
import { formatNumber } from "@/lib/formatters";
import type { EmployeeCostInfo, TimesheetEntry } from "@/types/costing";
import type { WorkOrder } from "@/types/manufacturing";

interface WoTabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder;
}

export function WoTabelDialog({ open, onOpenChange, workOrder }: WoTabelDialogProps) {
  const t = useTranslations("costing");
  const tCommon = useTranslations("common");
  const { data: laborEmployees = [] } = useDirectLaborEmployees();
  const { data: existingEntries = [] } = useWorkOrderTabel(workOrder.name);
  const saveTabel = useSaveWorkOrderTabel();

  const store = useTimesheetStore();

  // Load existing entries when dialog opens
  useEffect(() => {
    if (open) {
      store.reset();
      store.setWorkOrder(workOrder.name);
      if (existingEntries.length > 0) {
        for (const entry of existingEntries) {
          store.addEntry({
            name: entry.name,
            date: entry.date,
            employee: entry.employee,
            employee_name: entry.employee_name,
            operation: entry.operation,
            start_time: entry.start_time,
            end_time: entry.end_time,
            hourly_rate: entry.hourly_rate,
          });
        }
        // Mark selected employees
        const empSet = new Set(existingEntries.map((e) => e.employee));
        for (const empId of empSet) {
          if (!store.selectedEmployees.includes(empId)) {
            store.toggleEmployee(empId);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingEntries]);

  const [newEmployee, setNewEmployee] = useState("");

  const handleAddEmployee = (empId: string) => {
    if (!empId) return;
    store.toggleEmployee(empId);
    setNewEmployee("");
  };

  const handleRemoveEmployee = (empId: string) => {
    store.toggleEmployee(empId);
  };

  const handleAddEntry = () => {
    const emp = laborEmployees.find((e) => store.selectedEmployees.includes(e.name));
    if (!emp) return;

    store.addEntry({
      date: format(new Date(), "yyyy-MM-dd"),
      employee: emp.name,
      employee_name: emp.employee_name,
      start_time: "08:00",
      end_time: "17:00",
      hourly_rate: emp.custom_hourly_cost || 0,
    });
  };

  const handleSave = () => {
    saveTabel.mutate(
      {
        work_order: workOrder.name,
        entries: store.entries,
      },
      {
        onSuccess: () => {
          toast.success(t("tabelSaved"));
          onOpenChange(false);
        },
        onError: () => toast.error(tCommon("error")),
      },
    );
  };

  const totals = store.getTotals();

  const selectedEmployeeInfos = laborEmployees.filter((e) =>
    store.selectedEmployees.includes(e.name),
  );

  const availableEmployees = laborEmployees.filter(
    (e) => !store.selectedEmployees.includes(e.name),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workOrder.name} {t("tabel")} — {workOrder.item_name} ({formatNumber(workOrder.qty)})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("add_employee")}</p>
            <div className="flex flex-wrap gap-2">
              {selectedEmployeeInfos.map((emp) => (
                <Badge key={emp.name} variant="secondary" className="gap-1 pr-1">
                  {emp.employee_name} ({formatNumber(emp.custom_hourly_cost)}/{t("perHour")})
                  <button
                    type="button"
                    onClick={() => handleRemoveEmployee(emp.name)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {availableEmployees.length > 0 && (
                <Select value={newEmployee} onValueChange={handleAddEmployee}>
                  <SelectTrigger className="w-[200px] h-7 text-xs">
                    <SelectValue placeholder={`+ ${t("add_employee")}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((emp) => (
                      <SelectItem key={emp.name} value={emp.name}>
                        {emp.employee_name} ({formatNumber(emp.custom_hourly_cost)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Timesheet table */}
          <div>
            <p className="text-sm font-medium mb-2">{t("timesheet_entries")}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{tCommon("date")}</TableHead>
                  <TableHead>{t("employee")}</TableHead>
                  <TableHead>{t("operation")}</TableHead>
                  <TableHead className="w-[90px]">{t("start")}</TableHead>
                  <TableHead className="w-[90px]">{t("end")}</TableHead>
                  <TableHead className="text-right w-[70px]">{t("hours")}</TableHead>
                  <TableHead className="text-right w-[100px]">{t("amount")}</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                      {t("noEntries")}
                    </TableCell>
                  </TableRow>
                ) : (
                  store.entries.map((entry, i) => (
                    <TimesheetRow
                      key={i}
                      entry={entry}
                      index={i}
                      employees={selectedEmployeeInfos}
                      operations={workOrder.operations?.map((op) => op.operation) ?? []}
                    />
                  ))
                )}
              </TableBody>
              {store.entries.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="font-medium">
                      {tCommon("total")}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {totals.hours.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatNumber(totals.amount)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          <Button variant="outline" size="sm" onClick={handleAddEntry} disabled={store.selectedEmployees.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            {t("newEntry")}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saveTabel.isPending || store.entries.length === 0}>
            {saveTabel.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {t("save_and_attach")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TimesheetRow({
  entry,
  index,
  employees,
  operations,
}: {
  entry: TimesheetEntry;
  index: number;
  employees: EmployeeCostInfo[];
  operations: string[];
}) {
  const store = useTimesheetStore();

  return (
    <TableRow>
      <TableCell>
        <Input
          type="date"
          value={entry.date}
          onChange={(e) => store.updateEntry(index, { date: e.target.value })}
          className="h-8 text-xs"
        />
      </TableCell>
      <TableCell>
        <Select
          value={entry.employee}
          onValueChange={(v) => {
            const emp = employees.find((e) => e.name === v);
            if (emp) {
              store.updateEntry(index, {
                employee: emp.name,
                employee_name: emp.employee_name,
                hourly_rate: emp.custom_hourly_cost || 0,
              });
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.name} value={emp.name}>
                {emp.employee_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {operations.length > 0 ? (
          <Select
            value={entry.operation || ""}
            onValueChange={(v) => store.updateEntry(index, { operation: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operations.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={entry.operation || ""}
            onChange={(e) => store.updateEntry(index, { operation: e.target.value })}
            className="h-8 text-xs"
          />
        )}
      </TableCell>
      <TableCell>
        <Input
          type="time"
          value={entry.start_time}
          onChange={(e) => store.updateEntry(index, { start_time: e.target.value })}
          className="h-8 text-xs"
        />
      </TableCell>
      <TableCell>
        <Input
          type="time"
          value={entry.end_time}
          onChange={(e) => store.updateEntry(index, { end_time: e.target.value })}
          className="h-8 text-xs"
        />
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">{entry.hours.toFixed(1)}</TableCell>
      <TableCell className="text-right tabular-nums text-sm font-medium">
        {formatNumber(entry.amount)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => store.removeEntry(index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
