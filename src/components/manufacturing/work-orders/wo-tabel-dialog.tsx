"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Loader2, Trash2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import {
  useDirectLaborEmployees,
  useSaveWorkOrderTabel,
  useWorkOrderTabel,
} from "@/hooks/use-costing";
import { useTimesheetStore } from "@/stores/timesheet-store";
import { formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { EmployeeCostInfo } from "@/types/costing";
import type { WorkOrder } from "@/types/manufacturing";

const EMPTY_ENTRIES: never[] = [];
const DEFAULT_HOURS = 8;
const TIME_PLACEHOLDER = "00:00";

interface WoTabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder;
}

export function WoTabelDialog({ open, onOpenChange, workOrder }: WoTabelDialogProps) {
  const t = useTranslations("costing");
  const tCommon = useTranslations("common");
  const { data: laborEmployees = [] } = useDirectLaborEmployees();
  const { data: existingEntries = EMPTY_ENTRIES } = useWorkOrderTabel(workOrder.name);
  const saveTabel = useSaveWorkOrderTabel();

  const store = useTimesheetStore();

  const [dialogDate, setDialogDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Load existing entries when dialog opens
  useEffect(() => {
    if (!open) return;
    store.reset();
    store.setWorkOrder(workOrder.name);
    if (existingEntries.length > 0) {
      // Use the first row's date as the dialog's date anchor
      setDialogDate(existingEntries[0].date || format(new Date(), "yyyy-MM-dd"));
      for (const entry of existingEntries) {
        store.addEntry({
          name: entry.name,
          date: entry.date,
          employee: entry.employee,
          employee_name: entry.employee_name,
          operation: entry.operation,
          start_time: entry.start_time || TIME_PLACEHOLDER,
          end_time: entry.end_time || TIME_PLACEHOLDER,
          hours: entry.hours,
          hourly_rate: entry.hourly_rate,
        });
      }
    } else {
      setDialogDate(format(new Date(), "yyyy-MM-dd"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingEntries]);

  const operations = workOrder.operations?.map((op) => op.operation) ?? [];
  const defaultOperation = operations[0] ?? undefined;

  const handleAddRow = (employeeId: string) => {
    const emp = laborEmployees.find((e) => e.name === employeeId);
    if (!emp) return;
    store.addEntry({
      date: dialogDate,
      employee: emp.name,
      employee_name: emp.employee_name,
      operation: defaultOperation,
      start_time: TIME_PLACEHOLDER,
      end_time: TIME_PLACEHOLDER,
      hours: DEFAULT_HOURS,
      hourly_rate: emp.custom_hourly_cost || 0,
    });
  };

  const handleQuickAddAll = () => {
    const already = new Set(store.entries.map((e) => e.employee));
    for (const emp of laborEmployees) {
      if (already.has(emp.name)) continue;
      store.addEntry({
        date: dialogDate,
        employee: emp.name,
        employee_name: emp.employee_name,
        operation: defaultOperation,
        start_time: TIME_PLACEHOLDER,
        end_time: TIME_PLACEHOLDER,
        hours: DEFAULT_HOURS,
        hourly_rate: emp.custom_hourly_cost || 0,
      });
    }
  };

  const handleDateChange = (value: string) => {
    if (!value) return;
    setDialogDate(value);
    store.setDateForAll(value);
  };

  const handleSave = () => {
    // Guard: each row must have an employee + positive hours
    const valid = store.entries.filter((e) => e.employee && e.hours > 0);
    if (valid.length === 0) {
      toast.error(tCommon("error"));
      return;
    }
    saveTabel.mutate(
      {
        work_order: workOrder.name,
        entries: valid.map((e) => ({
          ...e,
          start_time: TIME_PLACEHOLDER,
          end_time: TIME_PLACEHOLDER,
        })),
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
  const usedEmployees = new Set(store.entries.map((e) => e.employee));
  const availableEmployees = laborEmployees.filter((e) => !usedEmployees.has(e.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workOrder.name} {t("tabel")} — {workOrder.item_name} ({formatNumber(workOrder.qty)})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dialog-level date */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" htmlFor="tabel-date">
              {t("date")}
            </label>
            <Input
              id="tabel-date"
              type="date"
              value={dialogDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-8 w-[160px] text-xs"
            />
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickAddAll}
              disabled={availableEmployees.length === 0}
            >
              <Users className="h-4 w-4 mr-1" />
              {t("quickAddAllDirectLabor")}
            </Button>
          </div>

          {/* Entries table */}
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("employee")}</TableHead>
                  {operations.length > 0 && <TableHead>{t("operation")}</TableHead>}
                  <TableHead className="text-right w-[90px]">{t("hours")}</TableHead>
                  <TableHead className="text-right w-[110px]">{t("rate")}</TableHead>
                  <TableHead className="text-right w-[120px]">{t("cost")}</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.entries.map((entry, i) => (
                  <HoursRow
                    key={entry.name ?? `new-${i}`}
                    index={i}
                    operations={operations}
                  />
                ))}
                <GhostRow
                  onPick={handleAddRow}
                  available={availableEmployees}
                  operationsCount={operations.length}
                />
              </TableBody>
              {store.entries.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={operations.length > 0 ? 2 : 1} className="font-medium">
                      {tCommon("total")}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {totals.hours.toFixed(1)}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatNumber(totals.amount)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveTabel.isPending || store.entries.length === 0}
          >
            {saveTabel.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {t("save_and_attach")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HoursRow({ index, operations }: { index: number; operations: string[] }) {
  const store = useTimesheetStore();
  const entry = store.entries[index];
  if (!entry) return null;

  return (
    <TableRow>
      <TableCell className="text-sm font-medium">{entry.employee_name}</TableCell>
      {operations.length > 0 && (
        <TableCell>
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
        </TableCell>
      )}
      <TableCell>
        <Input
          type="number"
          inputMode="decimal"
          step={0.25}
          min={0}
          max={24}
          value={entry.hours}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) store.updateHours(index, Math.max(0, Math.min(24, n)));
          }}
          className="h-8 text-xs text-right tabular-nums"
        />
      </TableCell>
      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
        {formatNumber(entry.hourly_rate)}
      </TableCell>
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

function GhostRow({
  onPick,
  available,
  operationsCount,
}: {
  onPick: (employeeId: string) => void;
  available: EmployeeCostInfo[];
  operationsCount: number;
}) {
  const t = useTranslations("costing");
  const [open, setOpen] = useState(false);

  if (available.length === 0) return null;

  return (
    <TableRow className="bg-muted/20">
      <TableCell>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("h-8 w-full justify-between text-xs text-muted-foreground")}
            >
              + {t("selectEmployee")}
              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Command>
              <CommandInput placeholder={t("selectEmployee")} className="h-9" />
              <CommandList>
                <CommandEmpty>{t("noEntries")}</CommandEmpty>
                <CommandGroup>
                  {available.map((emp) => (
                    <CommandItem
                      key={emp.name}
                      value={`${emp.employee_name} ${emp.name}`}
                      onSelect={() => {
                        onPick(emp.name);
                        setOpen(false);
                      }}
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      <span className="flex-1">{emp.employee_name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatNumber(emp.custom_hourly_cost)}/{t("perHour")}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </TableCell>
      {/* empty cells to match layout */}
      {operationsCount > 0 && <TableCell />}
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell />
    </TableRow>
  );
}
