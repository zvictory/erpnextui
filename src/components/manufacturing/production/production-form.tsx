"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Gauge } from "lucide-react";
import { toast } from "sonner";

import { createProductionRun, updateProductionRun } from "@/actions/production";
import { calculateRunMetrics } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Types ------------------------------------------------------------------

interface ProductOption {
  id: number;
  code: string;
  name: string;
  unit: string | null;
  nominalSpeed: number;
  weightKg: number | null;
  piecesPerBox: number | null;
}

interface LineOption {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number | null;
}

interface ProductionFormProps {
  products: ProductOption[];
  lines: LineOption[];
  initialData?: {
    id: number;
    date: string;
    shift: string | null;
    lineId: number | null;
    productId: number | null;
    actualOutput: number;
    totalHours: number;
    plannedStopHours: number | null;
  };
}

// --- Form schema ------------------------------------------------------------

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  shift: z.string().optional(),
  lineId: z.number({ error: "Production line is required" }).int().positive(),
  productId: z.number({ error: "Product is required" }).int().positive(),
  actualOutput: z
    .number({ error: "Actual output is required" })
    .int()
    .positive({ error: "Must be greater than 0" }),
  totalHours: z
    .number({ error: "Total hours is required" })
    .positive({ error: "Must be greater than 0" }),
  plannedStopHours: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

// --- No-shift sentinel ------------------------------------------------------

const NO_SHIFT = "__none__";

// --- Component --------------------------------------------------------------

export function ProductionForm({ products, lines, initialData }: ProductionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [productOpen, setProductOpen] = useState(false);

  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date ?? format(new Date(), "yyyy-MM-dd"),
      shift: initialData?.shift ?? undefined,
      lineId: initialData?.lineId ?? undefined,
      productId: initialData?.productId ?? undefined,
      actualOutput: initialData?.actualOutput ?? undefined,
      totalHours: initialData?.totalHours ?? undefined,
      plannedStopHours: initialData?.plannedStopHours ?? 0,
    },
  });

  const watchedProductId = form.watch("productId");
  const watchedTotalHours = form.watch("totalHours");
  const watchedActualOutput = form.watch("actualOutput");
  const watchedPlannedStopHours = form.watch("plannedStopHours");

  const selectedProduct = products.find((p) => p.id === watchedProductId);

  // Calculate preview metrics
  const previewMetrics =
    selectedProduct && watchedTotalHours && watchedActualOutput
      ? calculateRunMetrics({
          actualOutput: watchedActualOutput,
          totalHours: watchedTotalHours,
          plannedStopHours: watchedPlannedStopHours ?? 0,
          nominalSpeed: selectedProduct.nominalSpeed,
        })
      : null;

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const submitData = {
        ...values,
        shift: values.shift || undefined,
      };

      const result = isEditing
        ? await updateProductionRun(initialData!.id, submitData)
        : await createProductionRun(submitData);

      if (result.success) {
        toast.success(
          isEditing
            ? "Production run updated successfully."
            : "Production run created successfully.",
        );
        router.push("/production");
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

          {/* Shift */}
          <FormField
            control={form.control}
            name="shift"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shift (optional)</FormLabel>
                <Select
                  value={field.value ?? NO_SHIFT}
                  onValueChange={(val) => field.onChange(val === NO_SHIFT ? undefined : val)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_SHIFT}>No shift</SelectItem>
                    <SelectItem value="A">Shift A</SelectItem>
                    <SelectItem value="B">Shift B</SelectItem>
                    <SelectItem value="C">Shift C</SelectItem>
                  </SelectContent>
                </Select>
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

          {/* Product (searchable combobox) */}
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product</FormLabel>
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productOpen}
                        className={cn(
                          "w-full justify-between font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value
                          ? (() => {
                              const product = products.find((p) => p.id === field.value);
                              return product
                                ? `${product.code} - ${product.name}`
                                : "Select product";
                            })()
                          : "Select product"}
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.code} ${product.name}`}
                              onSelect={() => {
                                field.onChange(product.id);
                                setProductOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 size-4",
                                  field.value === product.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{product.code}</span>
                                <span className="text-xs text-muted-foreground">
                                  {product.name}
                                </span>
                              </div>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {formatNumber(product.nominalSpeed)}/hr
                              </span>
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

          {/* Actual Output */}
          <FormField
            control={form.control}
            name="actualOutput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actual Output</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 12000"
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

          {/* Total Hours */}
          <FormField
            control={form.control}
            name="totalHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 8"
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

          {/* Planned Stop Hours */}
          <FormField
            control={form.control}
            name="plannedStopHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Planned Stop Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.25"
                    placeholder="0"
                    {...field}
                    value={field.value ?? 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === "" ? 0 : Number(val));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Product Preview Card */}
        {selectedProduct && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Gauge className="size-4" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">Nominal Speed</span>
                  <p className="font-medium">
                    {formatNumber(selectedProduct.nominalSpeed)} {selectedProduct.unit ?? "pcs"}/hr
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Unit</span>
                  <p className="font-medium">{selectedProduct.unit ?? "pcs"}</p>
                </div>
                {watchedTotalHours ? (
                  <div>
                    <span className="text-muted-foreground">Planned Output</span>
                    <p className="font-medium">
                      {formatNumber(
                        selectedProduct.nominalSpeed *
                          (watchedTotalHours - (watchedPlannedStopHours ?? 0)),
                      )}
                    </p>
                  </div>
                ) : null}
                {previewMetrics ? (
                  <div>
                    <span className="text-muted-foreground">Productivity</span>
                    <p
                      className={cn(
                        "font-medium",
                        previewMetrics.productivity >= 0.9
                          ? "text-green-600"
                          : previewMetrics.productivity >= 0.8
                            ? "text-yellow-600"
                            : "text-red-600",
                      )}
                    >
                      {formatNumber(previewMetrics.productivity * 100, 1)}%
                    </p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? "Update Run" : "Create Run"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/production")}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
