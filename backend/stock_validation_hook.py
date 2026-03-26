"""
Stock Validation Hook for Sales Invoice

Deploy as a Server Script in ERPNext:
  - Type: DocEvent
  - DocType: Sales Invoice
  - Event: Before Submit

Or add to a custom Frappe app's hooks.py:
  doc_events = {
      "Sales Invoice": {
          "before_submit": "backend.stock_validation_hook.validate_stock_on_submit"
      }
  }
"""

import frappe
from frappe import _


@frappe.whitelist()
def validate_stock_on_submit(doc, method=None):
    """
    Validate that sufficient stock exists for all items before submitting a Sales Invoice.
    Checks actual stock balance at the specified warehouse on the posting date.
    """
    from erpnext.stock.utils import get_stock_balance

    errors = []
    for item in doc.items:
        if not item.warehouse:
            continue

        # Skip non-stock items
        is_stock = frappe.get_cached_value("Item", item.item_code, "is_stock_item")
        if not is_stock:
            continue

        available = get_stock_balance(
            item.item_code,
            item.warehouse,
            doc.posting_date,
            doc.posting_time,
        )

        # Use stock_qty (after UOM conversion) for comparison
        required = item.stock_qty or item.qty
        if available < required:
            errors.append(
                _("{item}: kerak {required}, bor {available}").format(
                    item=item.item_name or item.item_code,
                    required=frappe.format_value(required, "Float"),
                    available=frappe.format_value(available, "Float"),
                )
            )

    if errors:
        frappe.throw(
            "<br>".join(errors),
            title=_("Zaxira yetarli emas"),
            exc=frappe.ValidationError,
        )


# --- Server Script version (paste directly into ERPNext Server Script editor) ---
#
# Script Type: DocEvent
# DocType: Sales Invoice
# Event: Before Submit
#
# Code:
# from erpnext.stock.utils import get_stock_balance
#
# errors = []
# for item in doc.items:
#     if not item.warehouse:
#         continue
#     is_stock = frappe.get_cached_value("Item", item.item_code, "is_stock_item")
#     if not is_stock:
#         continue
#     available = get_stock_balance(item.item_code, item.warehouse, doc.posting_date, doc.posting_time)
#     required = item.stock_qty or item.qty
#     if available < required:
#         errors.append(f"{item.item_name or item.item_code}: kerak {required}, bor {available}")
#
# if errors:
#     frappe.throw("<br>".join(errors), title="Zaxira yetarli emas")
