import { describe, it, expect, beforeEach } from "vitest";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { formatDate, formatNumber, formatCurrency, formatInvoiceCurrency } from "@/lib/formatters";

beforeEach(() => {
  // Reset to defaults before each test
  useUISettingsStore.setState({
    dateFormat: "dd MMM yyyy",
    numberFormat: "1,234.56",
  });
});

describe("formatDate", () => {
  it("formats YYYY-MM-DD with default format", () => {
    expect(formatDate("2026-03-05")).toBe("05 Mar 2026");
  });

  it("respects dd/MM/yyyy format", () => {
    useUISettingsStore.setState({ dateFormat: "dd/MM/yyyy" });
    expect(formatDate("2026-03-05")).toBe("05/03/2026");
  });

  it("respects MM/dd/yyyy format", () => {
    useUISettingsStore.setState({ dateFormat: "MM/dd/yyyy" });
    expect(formatDate("2026-03-05")).toBe("03/05/2026");
  });

  it("respects MMM dd, yyyy format", () => {
    useUISettingsStore.setState({ dateFormat: "MMM dd, yyyy" });
    expect(formatDate("2026-03-05")).toBe("Mar 05, 2026");
  });

  it("returns empty string for null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("returns original string on parse failure", () => {
    expect(formatDate("invalid")).toBe("invalid");
  });
});

describe("formatNumber", () => {
  it("formats with en-US separators by default", () => {
    expect(formatNumber(1234.56, 2)).toBe("1,234.56");
  });

  it("formats with de-DE separators", () => {
    useUISettingsStore.setState({ numberFormat: "1.234,56" });
    expect(formatNumber(1234.56, 2)).toBe("1.234,56");
  });

  it("formats with fr-FR separators", () => {
    useUISettingsStore.setState({ numberFormat: "1 234,56" });
    const result = formatNumber(1234.56, 2);
    // fr-FR uses narrow no-break space (U+202F) as group separator
    expect(result.replace(/\s/g, " ")).toBe("1 234,56");
  });
});

describe("formatCurrency", () => {
  it("formats with symbol on left by default", () => {
    expect(formatCurrency(1234.56, "$")).toBe("$ 1,234.56");
  });

  it("formats with symbol on right", () => {
    expect(formatCurrency(1234.56, "EUR", true)).toBe("1,234.56 EUR");
  });
});

describe("formatInvoiceCurrency", () => {
  it("uses currencyInfo when provided", () => {
    expect(formatInvoiceCurrency(1000, "USD", { symbol: "$", onRight: false })).toBe("$1,000.00");
  });

  it("falls back to currency code", () => {
    expect(formatInvoiceCurrency(1000, "USD")).toBe("1,000.00 USD");
  });

  it("returns plain number when no currency info", () => {
    expect(formatInvoiceCurrency(1000)).toBe("1,000.00");
  });
});
