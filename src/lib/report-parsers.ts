import type {
  ReportColumn,
  PeriodKey,
  AccountRow,
  SalesRow,
  SalesReportData,
  ProfitLossData,
  BalanceSheetData,
  TrialBalanceRow,
  TrialBalanceData,
  CashFlowData,
  AgingRow,
  AgingReportData,
  AgingBucket,
  GLReportRow,
  GLReportData,
} from "@/types/reports";

// Fields that are never period columns
const EXCLUDED_FIELDS = new Set([
  "account",
  "account_name",
  "parent_account",
  "indent",
  "total",
  "has_value",
  "is_group",
  "opening_balance",
  "entity",
  "entity_name",
]);

export function extractPeriodKeys(columns: ReportColumn[]): PeriodKey[] {
  return columns
    .filter(
      (col) =>
        (col.fieldtype === "Currency" || col.fieldtype === "Float") &&
        !EXCLUDED_FIELDS.has(col.fieldname),
    )
    .map((col) => ({ key: col.fieldname, label: col.label }));
}

function normalizeAccountRow(row: Record<string, unknown>): AccountRow {
  return {
    account: String(row.account ?? ""),
    account_name: String(row.account_name ?? row.account ?? ""),
    parent_account: String(row.parent_account ?? ""),
    indent: Number(row.indent ?? 0),
    total: Number(row.total ?? 0),
    has_value: Boolean(row.has_value),
    is_group: Boolean(row.is_group),
    ...row,
  };
}

/** Sum period values across indent-1 (direct child) accounts to avoid double-counting */
function sumPeriodValues(accounts: AccountRow[], periodKey: string): number {
  return accounts
    .filter((a) => a.indent === 1)
    .reduce((sum, a) => sum + Number(a[periodKey] ?? 0), 0);
}

export function parseProfitLoss(
  result: (Record<string, unknown> | unknown[])[],
  columns: ReportColumn[],
): ProfitLossData {
  const periods = extractPeriodKeys(columns);
  const incomeAccounts: AccountRow[] = [];
  const expenseAccounts: AccountRow[] = [];

  let currentSection: "income" | "expense" | null = null;
  let incomeTotal = 0;
  let expenseTotal = 0;
  let netProfitLoss = 0;

  for (const raw of result) {
    // Skip array rows (separator/total rows from ERPNext)
    if (Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;

    const accountName = String(row.account_name ?? row.account ?? "").toLowerCase();
    const indent = Number(row.indent ?? 0);

    // Detect section headers
    if (indent === 0) {
      if (accountName.includes("income") && !accountName.includes("expense")) {
        currentSection = "income";
      } else if (accountName.includes("expense")) {
        currentSection = "expense";
      }

      // Detect total/net rows
      if (accountName.includes("total income")) {
        incomeTotal = Number(row.total ?? 0);
        continue;
      }
      if (accountName.includes("total expense")) {
        expenseTotal = Number(row.total ?? 0);
        continue;
      }
      if (accountName.includes("net profit") || accountName.includes("net loss")) {
        netProfitLoss = Number(row.total ?? 0);
        continue;
      }
    }

    const normalized = normalizeAccountRow(row);
    if (!normalized.has_value && indent > 0) continue;

    if (currentSection === "income") {
      incomeAccounts.push(normalized);
    } else if (currentSection === "expense") {
      expenseAccounts.push(normalized);
    }
  }

  // Build chart data from period sums
  const chartData = periods.map((p) => ({
    period: p.label,
    income: Math.abs(sumPeriodValues(incomeAccounts, p.key)),
    expenses: Math.abs(sumPeriodValues(expenseAccounts, p.key)),
  }));

  return {
    incomeAccounts,
    expenseAccounts,
    incomeTotal: Math.abs(incomeTotal),
    expenseTotal: Math.abs(expenseTotal),
    netProfitLoss,
    periods,
    chartData,
  };
}

export function parseBalanceSheet(
  result: (Record<string, unknown> | unknown[])[],
  columns: ReportColumn[],
): BalanceSheetData {
  const periods = extractPeriodKeys(columns);
  const assetAccounts: AccountRow[] = [];
  const liabilityAccounts: AccountRow[] = [];
  const equityAccounts: AccountRow[] = [];

  let currentSection: "asset" | "liability" | "equity" | null = null;
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const raw of result) {
    if (Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;

    const accountName = String(row.account_name ?? row.account ?? "").toLowerCase();
    const indent = Number(row.indent ?? 0);

    if (indent === 0) {
      if (accountName.includes("asset")) {
        currentSection = "asset";
      } else if (accountName.includes("liabilit")) {
        currentSection = "liability";
      } else if (accountName.includes("equity")) {
        currentSection = "equity";
      }

      // Detect total rows
      if (accountName.includes("total asset")) {
        totalAssets = Math.abs(Number(row.total ?? 0));
        continue;
      }
      if (accountName.includes("total liabilit") || accountName.startsWith("total liability")) {
        totalLiabilities = Math.abs(Number(row.total ?? 0));
        continue;
      }
      if (accountName.includes("total equity") || accountName.includes("total provisional")) {
        totalEquity = Math.abs(Number(row.total ?? 0));
        continue;
      }
    }

    const normalized = normalizeAccountRow(row);
    if (!normalized.has_value && indent > 0) continue;

    if (currentSection === "asset") {
      assetAccounts.push(normalized);
    } else if (currentSection === "liability") {
      liabilityAccounts.push(normalized);
    } else if (currentSection === "equity") {
      equityAccounts.push(normalized);
    }
  }

  const compositionData = [
    { name: "Assets", value: totalAssets },
    { name: "Liabilities", value: totalLiabilities },
    { name: "Equity", value: totalEquity },
  ].filter((d) => d.value > 0);

  return {
    assetAccounts,
    liabilityAccounts,
    equityAccounts,
    totalAssets,
    totalLiabilities,
    totalEquity,
    periods,
    compositionData,
  };
}

export function parseSalesAnalytics(
  result: (Record<string, unknown> | unknown[])[],
  columns: ReportColumn[],
): SalesReportData {
  const periods = extractPeriodKeys(columns);
  const rows: SalesRow[] = [];

  for (const raw of result) {
    if (Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    if (!row.entity) continue;

    rows.push({
      entity: String(row.entity),
      entity_name: String(row.entity_name ?? row.entity),
      total: Number(row.total ?? 0),
      ...row,
    } as SalesRow);
  }

  const totalSales = rows.reduce((sum, r) => sum + r.total, 0);

  // Build chart data by summing all rows per period
  const chartData = periods.map((p) => ({
    period: p.label,
    amount: rows.reduce((sum, r) => sum + Number(r[p.key] ?? 0), 0),
  }));

  return { rows, periods, totalSales, chartData };
}

export function parseTrialBalance(
  result: (Record<string, unknown> | unknown[])[],
): TrialBalanceData {
  const rows: TrialBalanceRow[] = [];
  let totalOpeningDebit = 0;
  let totalOpeningCredit = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let totalClosingDebit = 0;
  let totalClosingCredit = 0;

  for (const raw of result) {
    if (Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    if (!row.account) continue;

    const indent = Number(row.indent ?? 0);
    const tbRow: TrialBalanceRow = {
      account: String(row.account ?? ""),
      account_name: String(row.account_name ?? row.account ?? ""),
      parent_account: String(row.parent_account ?? ""),
      indent,
      opening_debit: Number(row.opening_debit ?? 0),
      opening_credit: Number(row.opening_credit ?? 0),
      debit: Number(row.debit ?? 0),
      credit: Number(row.credit ?? 0),
      closing_debit: Number(row.closing_debit ?? 0),
      closing_credit: Number(row.closing_credit ?? 0),
    };

    rows.push(tbRow);

    // Sum totals from root-level (indent 0) accounts
    if (indent === 0) {
      totalOpeningDebit += tbRow.opening_debit;
      totalOpeningCredit += tbRow.opening_credit;
      totalDebit += tbRow.debit;
      totalCredit += tbRow.credit;
      totalClosingDebit += tbRow.closing_debit;
      totalClosingCredit += tbRow.closing_credit;
    }
  }

  return {
    rows,
    totalOpeningDebit,
    totalOpeningCredit,
    totalDebit,
    totalCredit,
    totalClosingDebit,
    totalClosingCredit,
  };
}

export function parseCashFlow(
  result: (Record<string, unknown> | unknown[])[],
  columns: ReportColumn[],
): CashFlowData {
  const periods = extractPeriodKeys(columns);
  const operatingAccounts: AccountRow[] = [];
  const investingAccounts: AccountRow[] = [];
  const financingAccounts: AccountRow[] = [];

  let currentSection: "operating" | "investing" | "financing" | null = null;
  let totalOperating = 0;
  let totalInvesting = 0;
  let totalFinancing = 0;
  let netCashChange = 0;

  for (const raw of result) {
    if (Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;

    const accountName = String(row.account_name ?? row.account ?? "").toLowerCase();
    const indent = Number(row.indent ?? 0);

    if (indent === 0) {
      if (accountName.includes("operating")) {
        currentSection = "operating";
      } else if (accountName.includes("investing")) {
        currentSection = "investing";
      } else if (accountName.includes("financing")) {
        currentSection = "financing";
      }

      if (accountName.includes("net change") || accountName.includes("net cash")) {
        netCashChange = Number(row.total ?? 0);
        continue;
      }

      // Detect total rows for each section
      if (
        (accountName.includes("total") || accountName.startsWith("net cash from")) &&
        currentSection
      ) {
        if (currentSection === "operating") {
          totalOperating = Number(row.total ?? 0);
        } else if (currentSection === "investing") {
          totalInvesting = Number(row.total ?? 0);
        } else if (currentSection === "financing") {
          totalFinancing = Number(row.total ?? 0);
        }
        continue;
      }
    }

    const normalized = normalizeAccountRow(row);
    if (!normalized.has_value && indent > 0) continue;

    if (currentSection === "operating") {
      operatingAccounts.push(normalized);
    } else if (currentSection === "investing") {
      investingAccounts.push(normalized);
    } else if (currentSection === "financing") {
      financingAccounts.push(normalized);
    }
  }

  return {
    operatingAccounts,
    investingAccounts,
    financingAccounts,
    totalOperating,
    totalInvesting,
    totalFinancing,
    netCashChange,
    periods,
  };
}

export function parseAgingReport(result: (Record<string, unknown> | unknown[])[]): AgingReportData {
  const rows: AgingRow[] = [];
  const bucketTotals = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const bucketCounts = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  let totalOutstanding = 0;

  // Per-currency accumulator
  const currencyMap = new Map<
    string,
    { total: number; bucketTotals: Record<string, number>; bucketCounts: Record<string, number> }
  >();

  function getOrCreateCurrency(currency: string) {
    let entry = currencyMap.get(currency);
    if (!entry) {
      entry = {
        total: 0,
        bucketTotals: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
        bucketCounts: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
      };
      currencyMap.set(currency, entry);
    }
    return entry;
  }

  for (const raw of result) {
    if (Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    if (!row.party) continue;

    const current = Number(row.range1 ?? 0);
    const r1_30 = Number(row.range2 ?? 0);
    const r31_60 = Number(row.range3 ?? 0);
    const r61_90 = Number(row.range4 ?? 0);
    const r90plus = Number(row.range5 ?? 0);
    const outstanding = Number(row.total_outstanding_amount ?? row.outstanding ?? 0);
    const currency = row.currency ? String(row.currency) : undefined;

    const agingRow: AgingRow = {
      party: String(row.party),
      party_name: String(row.party_name ?? row.party),
      total_outstanding: outstanding,
      currency,
      current,
      "1-30": r1_30,
      "31-60": r31_60,
      "61-90": r61_90,
      "90+": r90plus,
    };

    rows.push(agingRow);
    totalOutstanding += outstanding;

    // Accumulate into per-currency breakdown
    if (currency) {
      const ce = getOrCreateCurrency(currency);
      ce.total += outstanding;
      if (current) {
        ce.bucketTotals.current += current;
        ce.bucketCounts.current++;
      }
      if (r1_30) {
        ce.bucketTotals["1-30"] += r1_30;
        ce.bucketCounts["1-30"]++;
      }
      if (r31_60) {
        ce.bucketTotals["31-60"] += r31_60;
        ce.bucketCounts["31-60"]++;
      }
      if (r61_90) {
        ce.bucketTotals["61-90"] += r61_90;
        ce.bucketCounts["61-90"]++;
      }
      if (r90plus) {
        ce.bucketTotals["90+"] += r90plus;
        ce.bucketCounts["90+"]++;
      }
    }

    if (current) {
      bucketTotals.current += current;
      bucketCounts.current++;
    }
    if (r1_30) {
      bucketTotals["1-30"] += r1_30;
      bucketCounts["1-30"]++;
    }
    if (r31_60) {
      bucketTotals["31-60"] += r31_60;
      bucketCounts["31-60"]++;
    }
    if (r61_90) {
      bucketTotals["61-90"] += r61_90;
      bucketCounts["61-90"]++;
    }
    if (r90plus) {
      bucketTotals["90+"] += r90plus;
      bucketCounts["90+"]++;
    }
  }

  const buckets: AgingBucket[] = [
    { label: "Current", amount: bucketTotals.current, count: bucketCounts.current },
    { label: "1-30", amount: bucketTotals["1-30"], count: bucketCounts["1-30"] },
    { label: "31-60", amount: bucketTotals["31-60"], count: bucketCounts["31-60"] },
    { label: "61-90", amount: bucketTotals["61-90"], count: bucketCounts["61-90"] },
    { label: "90+", amount: bucketTotals["90+"], count: bucketCounts["90+"] },
  ];

  // Build currencyBreakdown record
  const currencyBreakdown: Record<string, { total: number; buckets: AgingBucket[] }> = {};
  for (const [currency, entry] of currencyMap) {
    currencyBreakdown[currency] = {
      total: entry.total,
      buckets: [
        { label: "Current", amount: entry.bucketTotals.current, count: entry.bucketCounts.current },
        { label: "1-30", amount: entry.bucketTotals["1-30"], count: entry.bucketCounts["1-30"] },
        { label: "31-60", amount: entry.bucketTotals["31-60"], count: entry.bucketCounts["31-60"] },
        { label: "61-90", amount: entry.bucketTotals["61-90"], count: entry.bucketCounts["61-90"] },
        { label: "90+", amount: entry.bucketTotals["90+"], count: entry.bucketCounts["90+"] },
      ],
    };
  }

  return { rows, buckets, totalOutstanding, currencyBreakdown };
}

export function parseGeneralLedger(result: (Record<string, unknown> | unknown[])[]): GLReportData {
  const rows: GLReportRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;
  let openingBalance = 0;
  let closingBalance = 0;

  for (const raw of result) {
    if (Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;

    const accountName = String(row.account ?? "").toLowerCase();

    // Detect opening/closing/totals rows
    if (accountName.includes("opening") && !row.voucher_no) {
      openingBalance = Number(row.balance ?? 0);
      continue;
    }
    if ((accountName.includes("total") || accountName.includes("closing")) && !row.voucher_no) {
      if (accountName.includes("closing")) {
        closingBalance = Number(row.balance ?? 0);
      }
      totalDebit += Number(row.debit ?? 0);
      totalCredit += Number(row.credit ?? 0);
      continue;
    }

    if (!row.posting_date && !row.voucher_no) continue;

    const glRow: GLReportRow = {
      posting_date: String(row.posting_date ?? ""),
      account: String(row.account ?? ""),
      party_type: row.party_type ? String(row.party_type) : undefined,
      party: row.party ? String(row.party) : undefined,
      debit: Number(row.debit ?? 0),
      credit: Number(row.credit ?? 0),
      balance: Number(row.balance ?? 0),
      voucher_type: String(row.voucher_type ?? ""),
      voucher_no: String(row.voucher_no ?? ""),
      remarks: row.remarks ? String(row.remarks) : undefined,
    };

    rows.push(glRow);
  }

  // If we didn't capture totals from summary rows, compute from data
  if (totalDebit === 0 && totalCredit === 0) {
    totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  }
  if (closingBalance === 0 && rows.length > 0) {
    closingBalance = rows[rows.length - 1].balance;
  }

  return { rows, totalDebit, totalCredit, openingBalance, closingBalance };
}
