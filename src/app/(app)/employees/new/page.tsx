"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useCreateEmployee } from "@/hooks/use-employees";
import { useCompanyStore } from "@/stores/company-store";
import { frappe } from "@/lib/frappe-client";

const schema = z.object({
  employee_name: z.string().min(1),
  gender: z.enum(["Male", "Female", "Other"]),
  date_of_joining: z.string().min(1),
  date_of_birth: z.string().min(1),
  department: z.string().optional(),
  designation: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function NewEmployeePage() {
  const t = useTranslations("employees");
  const router = useRouter();
  const { company } = useCompanyStore();
  const createEmployee = useCreateEmployee();

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () =>
      frappe.getList<{ name: string }>("Department", {
        fields: ["name"],
        filters: [["is_group", "=", "0"]],
        orderBy: "name asc",
        limitPageLength: 200,
      }),
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["designations"],
    queryFn: () =>
      frappe.getList<{ name: string }>("Designation", {
        fields: ["name"],
        orderBy: "name asc",
        limitPageLength: 200,
      }),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date_of_joining: todayISO() },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const employee = await createEmployee.mutateAsync({
        ...values,
        status: "Active",
        company,
      });
      toast.success(t("createSuccess"));
      router.push(`/employees/${encodeURIComponent(employee.name)}`);
    } catch {
      toast.error(t("createError"));
    }
  };

  return (
    <PermissionGuard doctype="Employee" action="write">
      <FormPageLayout title={t("newEmployee")} backHref="/employees" maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Employee Name */}
          <div className="space-y-1.5">
            <Label htmlFor="employee_name">
              {t("employeeName")} <span className="text-destructive">*</span>
            </Label>
            <Input id="employee_name" {...register("employee_name")} />
            {errors.employee_name && (
              <p className="text-xs text-destructive">{t("requiredField")}</p>
            )}
          </div>

          {/* Gender | Joining Date | Date of Birth */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>
                {t("gender")} <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("gender")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">{t("male")}</SelectItem>
                      <SelectItem value="Female">{t("female")}</SelectItem>
                      <SelectItem value="Other">{t("other")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="text-xs text-destructive">{t("requiredField")}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date_of_joining">
                {t("dateOfJoining")} <span className="text-destructive">*</span>
              </Label>
              <Input id="date_of_joining" type="date" {...register("date_of_joining")} />
              {errors.date_of_joining && (
                <p className="text-xs text-destructive">{t("requiredField")}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth">
                {t("dateOfBirth")} <span className="text-destructive">*</span>
              </Label>
              <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
              {errors.date_of_birth && (
                <p className="text-xs text-destructive">{t("requiredField")}</p>
              )}
            </div>
          </div>

          {/* Department | Designation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("department")}</Label>
              <Controller
                control={control}
                name="department"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("department")} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.name} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("designation")}</Label>
              <Controller
                control={control}
                name="designation"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("designation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((d) => (
                        <SelectItem key={d.name} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/employees")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? t("creating") : "Save"}
            </Button>
          </div>
        </form>
      </FormPageLayout>
    </PermissionGuard>
  );
}
