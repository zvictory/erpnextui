/* eslint-disable no-console */
/**
 * One-time ERPNext setup for the Costing Module.
 *
 * Creates custom fields on Employee, Work Order, and Workstation,
 * plus the "Work Order Timesheet" DocType used by the tabel dialog.
 *
 * Usage:
 *   npx tsx scripts/setup-costing-fields.ts --tenant=<tenant-id>
 *
 * Safe to re-run — skips fields/doctypes that already exist.
 */

import { getTenant } from "@/lib/config-store";

// ── Helpers ─────────────────────────────────────────────────

interface ErpResponse {
  data?: Record<string, unknown>;
  message?: unknown;
  exc_type?: string;
}

async function erpPost(
  tenantUrl: string,
  apiKey: string,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<ErpResponse> {
  const url = `${tenantUrl.replace(/\/$/, "")}${endpoint}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  return (await resp.json()) as ErpResponse;
}

async function erpGet(
  tenantUrl: string,
  apiKey: string,
  endpoint: string,
): Promise<ErpResponse> {
  const url = `${tenantUrl.replace(/\/$/, "")}${endpoint}`;
  const resp = await fetch(url, {
    headers: { Authorization: `token ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (resp.status === 404) return { exc_type: "DoesNotExistError" };
  return (await resp.json()) as ErpResponse;
}

async function fieldExists(
  tenantUrl: string,
  apiKey: string,
  dt: string,
  fieldname: string,
): Promise<boolean> {
  const params = new URLSearchParams({
    filters: JSON.stringify([
      ["dt", "=", dt],
      ["fieldname", "=", fieldname],
    ]),
    limit_page_length: "1",
  });
  const resp = await erpGet(
    tenantUrl,
    apiKey,
    `/api/resource/Custom Field?${params}`,
  );
  const data = resp.data as unknown;
  return Array.isArray(data) && data.length > 0;
}

async function doctypeExists(
  tenantUrl: string,
  apiKey: string,
  name: string,
): Promise<boolean> {
  const resp = await erpGet(
    tenantUrl,
    apiKey,
    `/api/resource/DocType/${encodeURIComponent(name)}`,
  );
  return resp.exc_type !== "DoesNotExistError" && !!resp.data;
}

async function createCustomField(
  tenantUrl: string,
  apiKey: string,
  field: {
    dt: string;
    fieldname: string;
    fieldtype: string;
    label: string;
    insert_after?: string;
    options?: string;
    default?: string;
    read_only?: number;
    description?: string;
  },
): Promise<void> {
  const exists = await fieldExists(tenantUrl, apiKey, field.dt, field.fieldname);
  if (exists) {
    console.log(`  ~ ${field.dt}.${field.fieldname}: already exists, skipping`);
    return;
  }

  const resp = await erpPost(tenantUrl, apiKey, "/api/resource/Custom Field", field);
  if (resp.data) {
    console.log(`  + ${field.dt}.${field.fieldname}: created`);
  } else {
    console.error(`  ! ${field.dt}.${field.fieldname}: failed`, resp);
  }
}

// ── Custom Field Definitions ────────────────────────────────

const EMPLOYEE_FIELDS = [
  {
    dt: "Employee",
    fieldname: "custom_costing_section",
    fieldtype: "Section Break",
    label: "Costing",
    insert_after: "salary_mode",
  },
  {
    dt: "Employee",
    fieldname: "custom_monthly_salary",
    fieldtype: "Currency",
    label: "Monthly Salary (Gross)",
    insert_after: "custom_costing_section",
    description: "Oylik ish haqi (gross)",
  },
  {
    dt: "Employee",
    fieldname: "custom_standard_hours",
    fieldtype: "Int",
    label: "Standard Monthly Hours",
    insert_after: "custom_monthly_salary",
    default: "176",
    description: "22 ish kuni x 8 soat = 176",
  },
  {
    dt: "Employee",
    fieldname: "custom_column_break_costing",
    fieldtype: "Column Break",
    label: "",
    insert_after: "custom_standard_hours",
  },
  {
    dt: "Employee",
    fieldname: "custom_hourly_cost",
    fieldtype: "Currency",
    label: "Hourly Cost",
    insert_after: "custom_column_break_costing",
    read_only: 1,
    description: "Auto: monthly_salary / standard_hours",
  },
  {
    dt: "Employee",
    fieldname: "custom_cost_classification",
    fieldtype: "Select",
    label: "Cost Classification",
    insert_after: "custom_hourly_cost",
    options: "\nDirect Labor\nPeriod Cost",
    default: "Direct Labor",
  },
  {
    dt: "Employee",
    fieldname: "custom_default_workstation",
    fieldtype: "Link",
    label: "Default Workstation",
    insert_after: "custom_cost_classification",
    options: "Workstation",
  },
];

const WORK_ORDER_FIELDS = [
  {
    dt: "Work Order",
    fieldname: "custom_labor_section",
    fieldtype: "Section Break",
    label: "Labor Costing",
    insert_after: "total_operating_cost",
  },
  {
    dt: "Work Order",
    fieldname: "custom_total_labor_cost",
    fieldtype: "Currency",
    label: "Total Labor Cost",
    insert_after: "custom_labor_section",
    read_only: 1,
    description: "Sum of timesheet entries",
  },
  {
    dt: "Work Order",
    fieldname: "custom_labor_hours",
    fieldtype: "Float",
    label: "Total Labor Hours",
    insert_after: "custom_total_labor_cost",
    read_only: 1,
    description: "Sum of timesheet hours",
  },
];

const WORKSTATION_FIELDS = [
  {
    dt: "Workstation",
    fieldname: "custom_power_kw",
    fieldtype: "Float",
    label: "Power (kW)",
    insert_after: "hour_rate_electricity",
    description: "Rated power consumption in kilowatts for energy cost allocation",
  },
];

// ── Work Order Timesheet DocType ────────────────────────────

const WO_TIMESHEET_DOCTYPE = {
  doctype: "DocType",
  name: "Work Order Timesheet",
  module: "Manufacturing",
  naming_rule: "Expression (old style)",
  autoname: "WOT-.#####",
  is_submittable: 0,
  custom: 1,
  fields: [
    {
      fieldname: "work_order",
      fieldtype: "Link",
      label: "Work Order",
      options: "Work Order",
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: "date",
      fieldtype: "Date",
      label: "Date",
      reqd: 1,
      in_list_view: 1,
      default: "Today",
    },
    {
      fieldname: "column_break_1",
      fieldtype: "Column Break",
    },
    {
      fieldname: "employee",
      fieldtype: "Link",
      label: "Employee",
      options: "Employee",
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: "employee_name",
      fieldtype: "Data",
      label: "Employee Name",
      fetch_from: "employee.employee_name",
      read_only: 1,
      in_list_view: 1,
    },
    {
      fieldname: "section_break_time",
      fieldtype: "Section Break",
      label: "Time",
    },
    {
      fieldname: "operation",
      fieldtype: "Link",
      label: "Operation",
      options: "Operation",
    },
    {
      fieldname: "start_time",
      fieldtype: "Time",
      label: "Start Time",
      reqd: 1,
    },
    {
      fieldname: "end_time",
      fieldtype: "Time",
      label: "End Time",
      reqd: 1,
    },
    {
      fieldname: "column_break_2",
      fieldtype: "Column Break",
    },
    {
      fieldname: "hours",
      fieldtype: "Float",
      label: "Hours",
      read_only: 1,
      in_list_view: 1,
      description: "Auto: end_time - start_time",
    },
    {
      fieldname: "hourly_rate",
      fieldtype: "Currency",
      label: "Hourly Rate",
      fetch_from: "employee.custom_hourly_cost",
      read_only: 1,
    },
    {
      fieldname: "amount",
      fieldtype: "Currency",
      label: "Amount",
      read_only: 1,
      in_list_view: 1,
      description: "Auto: hours x hourly_rate",
    },
  ],
  permissions: [
    { role: "Manufacturing User", read: 1, write: 1, create: 1, delete: 1 },
    { role: "Manufacturing Manager", read: 1, write: 1, create: 1, delete: 1 },
    { role: "System Manager", read: 1, write: 1, create: 1, delete: 1 },
  ],
};

// ── Main ────────────────────────────────────────────────────

async function setupCostingFields(tenantId: string) {
  const tenant = getTenant(tenantId);
  if (!tenant) {
    console.error(`Tenant not found: ${tenantId}`);
    process.exit(1);
  }

  const { url, apiKey } = tenant;
  console.log(`Setting up costing fields on ${url} ...\n`);

  // 1. Employee custom fields
  console.log("── Employee custom fields ──");
  for (const field of EMPLOYEE_FIELDS) {
    await createCustomField(url, apiKey, field);
  }

  // 2. Work Order custom fields
  console.log("\n── Work Order custom fields ──");
  for (const field of WORK_ORDER_FIELDS) {
    await createCustomField(url, apiKey, field);
  }

  // 3. Workstation custom fields
  console.log("\n── Workstation custom fields ──");
  for (const field of WORKSTATION_FIELDS) {
    await createCustomField(url, apiKey, field);
  }

  // 4. Work Order Timesheet DocType
  console.log("\n── Work Order Timesheet DocType ──");
  const dtExists = await doctypeExists(url, apiKey, "Work Order Timesheet");
  if (dtExists) {
    console.log("  ~ Work Order Timesheet: already exists, skipping");
  } else {
    const resp = await erpPost(url, apiKey, "/api/resource/DocType", WO_TIMESHEET_DOCTYPE);
    if (resp.data) {
      console.log("  + Work Order Timesheet: created");
    } else {
      console.error("  ! Work Order Timesheet: failed to create", resp);
    }
  }

  console.log("\nDone. Custom fields and DocType are ready.");
  console.log("Verify in ERPNext: Customize Form > Employee / Work Order");
}

const tenantArg = process.argv.find((a) => a.startsWith("--tenant="))?.split("=")[1];
if (!tenantArg) {
  console.error("Usage: npx tsx scripts/setup-costing-fields.ts --tenant=<tenant-id>");
  process.exit(1);
}

setupCostingFields(tenantArg).catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
