import { describe, it, expect } from "vitest";
import {
  BUILTIN_CAPABILITIES,
  getBuiltinCapability,
  listBuiltinCapabilities,
} from "@/lib/permissions/capabilities";

const VALID_SCOPE_DIMS = new Set([null, "line", "warehouse", "company"]);
const VALID_MODULES = new Set([
  "platform",
  "manufacturing",
  "sales",
  "purchases",
  "stock",
]);

describe("BUILTIN_CAPABILITIES catalog", () => {
  it("exposes every entry with a consistent shape", () => {
    for (const [id, def] of Object.entries(BUILTIN_CAPABILITIES)) {
      expect(def.labelKey, `${id} should have a labelKey`).toBe(`cap.${id}`);
      expect(VALID_MODULES.has(def.module), `${id} module ${def.module} unknown`).toBe(true);
      expect(
        VALID_SCOPE_DIMS.has(def.scopeDim),
        `${id} scopeDim ${String(def.scopeDim)} invalid`,
      ).toBe(true);
    }
  });

  it("listBuiltinCapabilities returns one entry per key", () => {
    const listed = listBuiltinCapabilities();
    expect(listed).toHaveLength(Object.keys(BUILTIN_CAPABILITIES).length);
    expect(new Set(listed.map((c) => c.id)).size).toBe(listed.length);
  });

  it("getBuiltinCapability returns the same def as direct lookup", () => {
    expect(getBuiltinCapability("production.read")).toBe(
      BUILTIN_CAPABILITIES["production.read"],
    );
    expect(getBuiltinCapability("unknown.capability")).toBeUndefined();
  });

  it("snapshot pins the full catalog so changes are deliberate", () => {
    const ids = Object.keys(BUILTIN_CAPABILITIES).sort();
    expect(ids).toMatchInlineSnapshot(`
      [
        "dashboard.read",
        "downtime.read",
        "downtime.write",
        "energy.read",
        "energy.write",
        "lines.manage",
        "platform.admin",
        "product.read",
        "product.write",
        "production.create",
        "production.read",
        "production.submit",
        "production.update",
        "purchase_invoice.create",
        "purchase_invoice.read",
        "sales_invoice.create",
        "sales_invoice.read",
        "sales_invoice.submit",
        "settings.read",
        "settings.write",
        "stock_entry.create",
        "warehouse.manage",
        "warehouse.read",
      ]
    `);
  });
});
