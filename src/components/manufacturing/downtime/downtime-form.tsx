"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createDowntimeEvent } from "@/actions/downtime";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// --- Types ------------------------------------------------------------------

interface StopCodeOption {
  id: number;
  code: string;
  nameUz: string;
  category: string | null;
}

interface LineOption {
  id: number;
  name: string;
}

interface DowntimeFormProps {
  lines: LineOption[];
  stopCodes: StopCodeOption[];
}

// --- Form schema ------------------------------------------------------------

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  lineId: z.number({ error: "Production line is required" }).int().positive(),
  stopCodeId: z.number({ error: "Stop code is required" }).int().positive(),
  durationMinutes: z
    .number({ error: "Duration is required" })
    .int()
    .positive({ error: "Must be greater than 0" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// --- Component --------------------------------------------------------------

export function DowntimeForm({ lines, stopCodes }: DowntimeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stopCodeOpen, setStopCodeOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      lineId: undefined,
      stopCodeId: undefined,
      durationMinutes: undefined,
      notes: "",
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createDowntimeEvent({
        ...values,
        notes: values.notes || undefined,
      });

      if (result.success) {
        toast.success("Downtime event created successfully.");
        router.push("/downtime");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.value
                          ? format(parseISO(field.value), "dd MMM yyyy")
                          : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        field.value ? parseISO(field.value) : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(format(date, "yyyy-MM-dd"));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Production Line */}
          <FormField
            control={form.control}
            name="lineId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Production Line</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(val) => field.onChange(Number(val))}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select line" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lines.map((line) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Stop Code (searchable combobox) */}
          <FormField
            control={form.control}
            name="stopCodeId"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Stop Code</FormLabel>
                <Popover open={stopCodeOpen} onOpenChange={setStopCodeOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={stopCodeOpen}
                        className={cn(
                          "w-full justify-between font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? (() => {
                              const sc = stopCodes.find(
                                (s) => s.id === field.value
                              );
                              return sc
                                ? `${sc.code} - ${sc.nameUz}`
                                : "Select stop code";
                            })()
                          : "Select stop code"}
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search stop codes..." />
                      <CommandList>
                        <CommandEmpty>No stop code found.</CommandEmpty>
                        <CommandGroup>
                          {stopCodes.map((sc) => (
                            <CommandItem
                              key={sc.id}
                              value={`${sc.code} ${sc.nameUz}`}
                              onSelect={() => {
                                field.onChange(sc.id);
                                setStopCodeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 size-4",
                                  field.value === sc.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium font-mono">
                                  {sc.code}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {sc.nameUz}
                                </span>
                              </div>
                              {sc.category && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {sc.category}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Duration */}
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 30"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === "" ? undefined : Number(val));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional details..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create Event
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/downtime")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
