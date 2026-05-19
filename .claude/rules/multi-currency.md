---
description: Rules for multi-currency Journal Entry construction (Dr = Cr invariant)
globs: ["src/**/*.ts", "src/**/*.tsx"]
---

# Multi-Currency Journal Entry Rules

- **Double-entry is an identity, not an approximation.** Total Debit MUST equal Total Credit in company currency. If a frontend payload could submit an imbalanced JE, the bug is in the frontend.

- **Always send explicit `debit` / `credit` (company currency) on every JE Account row** that has `_in_account_currency` set. Do NOT rely on ERPNext to recompute `debit = amount × rate` — for weak currencies (UZS, IDR, VND) and rates with sub-cent significance, the server's `flt(_, precision)` truncates and drops sub-unit amounts (UZS precision = 0, so any fractional residual is lost).

- **Anchor every JE to a single company-currency total.** Pick the leg already in company currency as ground truth. If neither leg is in company currency, convert via the from→company rate fetched at posting date. Use that single `baseTotal` for the cross-currency anchor.

- **Derive per-leg `exchange_rate` from the anchor** as `baseTotal / amount_in_account_currency`. Do not type rates by hand into the payload — they will disagree with the anchor and cause `set_amounts_in_company_currency()` to drift.

- **Use the shared helper.** `anchorJEAccountsInBaseCurrency()` in `src/lib/multi-currency.ts` is the only sanctioned way to finalize multi-currency JE rows before `frappe.createDoc`. New forms must go through it; PRs that hand-roll JE payloads with `_in_account_currency` but no `debit`/`credit` get a -1.

- **Rates: 6 decimal places minimum.** `rateStr` rounds to 6 dp; do not truncate further for display, and never store at 2 dp / 4 dp. 4 dp is insufficient for weak currencies.

- **Don't post FX residuals to "rounding".** If a residual is unavoidable (cross-foreign with rate inconsistency), it MUST be posted to an Exchange Gain/Loss line, per IAS 21 §28 / ASC 830-20-35-1. Today our scope is one-leg-in-company-currency (no residual); cross-foreign with auto-balance is a separate work item.

- **Currency precision is metadata, not a constant.** ERPNext stores precision per currency (`Currency.smallest_currency_fraction_value`). UZS = 0 dp, USD/EUR = 2 dp, BHD/KWD = 3 dp, JPY = 0 dp. The shared helper handles this — don't hardcode 2 dp anywhere.

- **Cancel via the audit log, never edit-and-resubmit.** When a JE is wrong on the ledger, cancel + amend. Editing a submitted JE in place (or rewriting `total_debit`) defeats the audit trail.

- **The user-typed amount is ground truth.** When the user types `25 000 000 сўм`, the ledger must show 25 000 000 — even if the derived foreign-leg amount and the rate would re-multiply to 24 999 996. Anchor on the typed leg.
