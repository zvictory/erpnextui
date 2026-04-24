"""
Stable ERP — Custom API methods for performance optimization.

Deploy as a Server Script on each ERPNext site, or place in a custom Frappe app:
  custom_app/custom_app/api.py

These methods reduce HTTP round-trips by batching operations server-side.
"""

import frappe


@frappe.whitelist()
def get_bulk_permissions(doctypes):
    """
    Check permissions for multiple doctypes in a single request.
    Replaces 17 doctypes × 7 actions = 119 individual has_permission calls.

    Args:
        doctypes: JSON list of doctype names

    Returns:
        dict mapping doctype -> {read, write, create, delete, submit, cancel, amend}
    """
    import json

    if isinstance(doctypes, str):
        doctypes = json.loads(doctypes)

    actions = ["read", "write", "create", "delete", "submit", "cancel", "amend"]
    result = {}

    for doctype in doctypes:
        perms = {}
        for action in actions:
            try:
                perms[action] = bool(frappe.has_permission(doctype, action))
            except frappe.PermissionError:
                perms[action] = False
        result[doctype] = perms

    return result


@frappe.whitelist()
def get_boot():
    """
    Return everything the Stable UI needs immediately after login:
      - user identity + full_name + language + time_zone
      - companies + default company
      - enabled currencies with symbol info
      - system defaults (currency, date_format, number_format, etc.)
      - bulk permissions for all managed doctypes

    Collapses 5+ parallel round-trips (get_logged_user, User full_name,
    Company list, Currency list, bulk permissions) into a single call.
    """
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(frappe._("Not logged in"), frappe.AuthenticationError)

    user_doc = frappe.get_cached_doc("User", user)

    companies = frappe.get_all(
        "Company",
        fields=["name", "default_currency", "country"],
        order_by="name asc",
    )

    currencies = frappe.get_all(
        "Currency",
        filters={"enabled": 1},
        fields=["name", "symbol", "symbol_on_right"],
        order_by="name asc",
        limit_page_length=500,
    )

    sysdefaults = frappe.defaults.get_defaults() or {}

    managed_doctypes = [
        "Sales Invoice",
        "Purchase Invoice",
        "Payment Entry",
        "Journal Entry",
        "Item",
        "Customer",
        "Supplier",
        "Company",
        "Account",
        "Stock Entry",
        "Delivery Note",
        "Sales Order",
        "Purchase Order",
        "Quotation",
        "Warehouse",
        "Employee",
        "Work Order",
    ]
    actions = ["read", "write", "create", "delete", "submit", "cancel", "amend"]
    permissions = {}
    for doctype in managed_doctypes:
        perms = {}
        for action in actions:
            try:
                perms[action] = bool(frappe.has_permission(doctype, action))
            except frappe.PermissionError:
                perms[action] = False
        permissions[doctype] = perms

    return {
        "user": {
            "name": user_doc.name,
            "email": user_doc.email or user_doc.name,
            "full_name": user_doc.full_name or user_doc.name,
            "language": user_doc.language or sysdefaults.get("lang") or "en",
            "time_zone": user_doc.time_zone or sysdefaults.get("time_zone"),
            "roles": [r.role for r in (user_doc.roles or [])],
        },
        "companies": companies,
        "default_company": sysdefaults.get("company") or (companies[0]["name"] if companies else None),
        "sysdefaults": {
            "currency": sysdefaults.get("currency"),
            "date_format": sysdefaults.get("date_format"),
            "number_format": sysdefaults.get("number_format"),
            "float_precision": sysdefaults.get("float_precision"),
            "currency_precision": sysdefaults.get("currency_precision"),
            "country": sysdefaults.get("country"),
        },
        "currencies": currencies,
        "permissions": permissions,
    }


@frappe.whitelist()
def get_balances_batch(accounts, date):
    """
    Fetch account balances for multiple accounts in a single request.
    Replaces N individual get_balance_on RPC calls.

    Args:
        accounts: JSON list of account names
        date: date string (YYYY-MM-DD)

    Returns:
        dict mapping account_name -> {balance, base_balance}
    """
    import json
    from erpnext.accounts.utils import get_balance_on

    if isinstance(accounts, str):
        accounts = json.loads(accounts)

    result = {}
    for account in accounts:
        try:
            balance = get_balance_on(account=account, date=date)
            base_balance = get_balance_on(
                account=account, date=date, in_account_currency=False
            )
            result[account] = {
                "balance": balance or 0,
                "base_balance": base_balance or 0,
            }
        except Exception:
            result[account] = {"balance": 0, "base_balance": 0}

    return result
