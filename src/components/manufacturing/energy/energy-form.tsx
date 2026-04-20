"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createEnergyLog } from "@/actions/energy";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// --- Form schema ------------------------------------------------------------

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  electricityKwh: z.number({ error: "Electricity kWh is required" }).min(0, "Must be 0 or greater"),
  gasM3: z.number({ error: "Gas m³ is required" }).min(0, "Must be 0 or greater"),
});

type FormValues = z.infer<typeof formSchema>;

// --- Component --------------------------------------------------------------

interface EnergyFormProps {
  onSuccess?: () => void;
}

export function EnergyForm({ onSuccess }: EnergyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      electricityKwh: undefined,
      gasM3: undefined,
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createEnergyLog(values);

      if (result.success) {
        toast.success("Energy log created successfully.");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/energy");
        }
        form.reset({
          date: format(new Date(), "yyyy-MM-dd"),
          electricityKwh: undefined,
          gasM3: undefined,
        });
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-3">
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
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.value ? format(parseISO(field.value), "dd MMM yyyy") : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
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

          {/* Electricity kWh */}
          <FormField
            control={form.control}
            name="electricityKwh"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Electricity (kWh)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1250"
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

          {/* Gas m³ */}
          <FormField
            control={form.control}
            name="gasM3"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gas (m³)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 58.5"
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
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add Entry
          </Button>
        </div>
      </form>
    </Form>
  );
}
