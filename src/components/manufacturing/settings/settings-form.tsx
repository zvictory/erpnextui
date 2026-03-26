"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { updateSettings } from "@/actions/settings";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// ─── Form schema ────────────────────────────────────────────────────

const formSchema = z.object({
  electricityPerKg: z
    .number({ error: "Required" })
    .min(0, "Must be 0 or greater"),
  gasPerKg: z.number({ error: "Required" }).min(0, "Must be 0 or greater"),
  electricityPrice: z
    .number({ error: "Required" })
    .min(0, "Must be 0 or greater"),
  gasPrice: z.number({ error: "Required" }).min(0, "Must be 0 or greater"),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Types ──────────────────────────────────────────────────────────

interface SettingsFormProps {
  currentSettings: Record<string, string>;
}

// ─── Component ──────────────────────────────────────────────────────

export function SettingsForm({ currentSettings }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      electricityPerKg: Number(currentSettings["electricity_per_kg"] ?? "0.46"),
      gasPerKg: Number(currentSettings["gas_per_kg"] ?? "0.021"),
      electricityPrice: Number(
        currentSettings["electricity_price"] ?? "1000"
      ),
      gasPrice: Number(currentSettings["gas_price"] ?? "900"),
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateSettings({
        electricity_per_kg: String(values.electricityPerKg),
        gas_per_kg: String(values.gasPerKg),
        electricity_price: String(values.electricityPrice),
        gas_price: String(values.gasPrice),
      });

      if (result.success) {
        toast.success("Settings saved successfully.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to save settings.");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Energy Consumption Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Energy Consumption Rates</CardTitle>
              <CardDescription>
                Energy consumed per kilogram of output.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="electricityPerKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Electricity per kg (kWh/kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.46"
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

              <FormField
                control={form.control}
                name="gasPerKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gas per kg (m&#xb3;/kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.021"
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
            </CardContent>
          </Card>

          {/* Energy Prices */}
          <Card>
            <CardHeader>
              <CardTitle>Energy Prices</CardTitle>
              <CardDescription>
                Current energy prices in UZS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="electricityPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Electricity price (UZS/kWh)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="1000"
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

              <FormField
                control={form.control}
                name="gasPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gas price (UZS/m&#xb3;)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="900"
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
            </CardContent>
          </Card>
        </div>

        <div className="flex">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}
