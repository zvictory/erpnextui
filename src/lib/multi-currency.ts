import { frappe } from "./frappe-client";
import { FrappeAPIError } from "./frappe-types";

interface CompanyDoc {
  name: string;
  enable_multi_currency: 0 | 1;
}

/**
 * Checks if the given currencies require multi-currency, and if so,
 * auto-enables the flag on the Company doc.
 *
 * Returns true if multi-currency is needed, false otherwise.
 */
export async function ensureMultiCurrencyEnabled(
  companyName: string,
  accountCurrencies: string[],
): Promise<boolean> {
  const unique = [...new Set(accountCurrencies.filter(Boolean))];
  if (unique.length <= 1) return false;

  const company = await frappe.getDoc<CompanyDoc>("Company", companyName);
  if (company.enable_multi_currency === 1) return true;

  try {
    await frappe.updateDoc("Company", companyName, { enable_multi_currency: 1 });
  } catch (err) {
    if (err instanceof FrappeAPIError && err.status === 403) {
      throw new Error(
        "Multi-currency is not enabled for this company. Please contact an administrator to enable it in ERPNext (Company Settings).",
      );
    }
    throw err;
  }

  return true;
}
