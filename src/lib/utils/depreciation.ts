import { differenceInMonths } from "date-fns";
import type { Asset, DepreciationInfo } from "@/types/asset";

/**
 * Straight-line monthly depreciation.
 * depreciable = purchaseCost - salvageValue
 * monthly = depreciable / (usefulLifeYears × 12)
 */
export function monthlyDepreciationStraightLine(
  purchaseCost: number,
  salvageValue: number,
  usefulLifeYears: number,
): number {
  const totalMonths = usefulLifeYears * 12;
  if (totalMonths <= 0) return 0;
  const depreciable = purchaseCost - salvageValue;
  return depreciable / totalMonths;
}

/**
 * Declining-balance annual depreciation rate.
 * rate = 1 - (salvage / cost)^(1/years)
 * Monthly portion = rate × currentBookValue / 12
 */
export function monthlyDepreciationDecliningBalance(
  currentBookValue: number,
  salvageValue: number,
  purchaseCost: number,
  usefulLifeYears: number,
): number {
  if (usefulLifeYears <= 0 || purchaseCost <= 0) return 0;
  const safeSalvage = Math.max(salvageValue, 1); // avoid ln(0)
  const annualRate = 1 - Math.pow(safeSalvage / purchaseCost, 1 / usefulLifeYears);
  return (annualRate * currentBookValue) / 12;
}

/**
 * Full depreciation info for an asset as of a given date.
 */
export function calculateDepreciation(asset: Asset, asOfDate?: Date): DepreciationInfo {
  const now = asOfDate ?? new Date();
  const purchaseDate = new Date(asset.purchaseDate);
  const salvage = asset.salvageValue ?? 0;
  const totalMonths = asset.usefulLifeYears * 12;
  const monthsUsed = Math.max(0, differenceInMonths(now, purchaseDate));
  const effectiveMonths = Math.min(monthsUsed, totalMonths);

  let monthlyDep: number;
  let accumulatedDepreciation: number;

  if (asset.depreciationMethod === "declining_balance") {
    // For declining balance, we iterate month-by-month
    let bookValue = asset.purchaseCost;
    accumulatedDepreciation = 0;
    monthlyDep = 0;
    for (let m = 0; m < effectiveMonths; m++) {
      monthlyDep = monthlyDepreciationDecliningBalance(
        bookValue,
        salvage,
        asset.purchaseCost,
        asset.usefulLifeYears,
      );
      accumulatedDepreciation += monthlyDep;
      bookValue = Math.max(asset.purchaseCost - accumulatedDepreciation, salvage);
    }
  } else {
    // Straight-line (default)
    monthlyDep = monthlyDepreciationStraightLine(
      asset.purchaseCost,
      salvage,
      asset.usefulLifeYears,
    );
    accumulatedDepreciation = monthlyDep * effectiveMonths;
  }

  const bookValue = Math.max(asset.purchaseCost - accumulatedDepreciation, salvage);
  const percentDepreciated = totalMonths > 0 ? (effectiveMonths / totalMonths) * 100 : 0;

  return {
    monthlyDepreciation: monthlyDep,
    accumulatedDepreciation,
    bookValue,
    monthsUsed: effectiveMonths,
    totalMonths,
    percentDepreciated: Math.min(percentDepreciated, 100),
  };
}
