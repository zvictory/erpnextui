"""
ERPNext Transaction Backup — Export all transactions as CSV files.

Deploy: scp to server, run via bench execute.

Usage:
    cd /opt/bench/frappe-bench
    bench --site anjan.erpstable.com execute erpnext.export_transactions.export_all
"""

import frappe
import csv
import os
from datetime import datetime


DOCTYPES = [
    {
        "parent": "Sales Invoice",
        "child": "Sales Invoice Item",
        "fields": [
            "name", "customer", "customer_name", "posting_date", "due_date",
            "currency", "conversion_rate", "total", "net_total", "grand_total",
            "outstanding_amount", "additional_discount_percentage", "discount_amount",
            "status", "docstatus", "is_return", "return_against", "debit_to",
        ],
        "order_by": "posting_date asc",
    },
    {
        "parent": "Purchase Invoice",
        "child": "Purchase Invoice Item",
        "fields": [
            "name", "supplier", "supplier_name", "posting_date", "due_date",
            "currency", "conversion_rate", "total", "net_total", "grand_total",
            "outstanding_amount", "status", "docstatus", "is_return", "credit_to",
        ],
        "order_by": "posting_date asc",
    },
    {
        "parent": "Payment Entry",
        "child": "Payment Entry Reference",
        "fields": [
            "name", "payment_type", "party_type", "party", "party_name",
            "posting_date", "paid_amount", "received_amount", "paid_from",
            "paid_to", "paid_from_account_currency", "paid_to_account_currency",
            "source_exchange_rate", "target_exchange_rate",
            "reference_no", "reference_date", "docstatus",
        ],
        "order_by": "posting_date asc",
    },
    {
        "parent": "Journal Entry",
        "child": "Journal Entry Account",
        "fields": [
            "name", "voucher_type", "posting_date", "total_debit", "total_credit",
            "user_remark", "cheque_no", "cheque_date", "multi_currency", "docstatus",
        ],
        "order_by": "posting_date asc",
    },
    {
        "parent": "Stock Entry",
        "child": "Stock Entry Detail",
        "fields": [
            "name", "purpose", "stock_entry_type", "posting_date", "posting_time",
            "from_warehouse", "to_warehouse", "work_order", "docstatus",
        ],
        "order_by": "posting_date asc",
    },
    {
        "parent": "Stock Reconciliation",
        "child": "Stock Reconciliation Item",
        "fields": [
            "name", "posting_date", "posting_time", "purpose", "docstatus",
        ],
        "order_by": "posting_date asc",
    },
    {
        "parent": "Delivery Note",
        "child": "Delivery Note Item",
        "fields": [
            "name", "customer", "customer_name", "posting_date", "docstatus",
        ],
        "order_by": "posting_date asc",
    },
    {
        "parent": "Purchase Order",
        "child": "Purchase Order Item",
        "fields": [
            "name", "supplier", "supplier_name", "transaction_date",
            "grand_total", "status", "docstatus",
        ],
        "order_by": "transaction_date asc",
    },
    {
        "parent": "Sales Order",
        "child": "Sales Order Item",
        "fields": [
            "name", "customer", "customer_name", "transaction_date",
            "grand_total", "status", "docstatus",
        ],
        "order_by": "transaction_date asc",
    },
    {
        "parent": "Quotation",
        "child": "Quotation Item",
        "fields": [
            "name", "party_name", "transaction_date",
            "grand_total", "status", "docstatus",
        ],
        "order_by": "transaction_date asc",
    },
]


def write_csv(filepath, data, fields):
    """Write a list of dicts to CSV."""
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in data:
            writer.writerow(row)


def get_child_fields(child_dt):
    """Get all data fields from a child doctype meta."""
    allowed = {
        "Data", "Link", "Currency", "Float", "Int", "Date", "Datetime",
        "Small Text", "Long Text", "Text", "Check", "Select", "Read Only",
    }
    meta = frappe.get_meta(child_dt)
    fields = []
    for f in meta.fields:
        if f.fieldtype in allowed:
            fields.append(f.fieldname)
    return ["name", "parent", "idx"] + [f for f in fields if f not in ("name", "parent", "idx")]


def export_all():
    """Export all transaction doctypes to CSV files."""
    output_dir = f"/tmp/anjan-backup-{datetime.now().strftime('%Y-%m-%d')}"
    os.makedirs(output_dir, exist_ok=True)

    summary = []

    for dt_config in DOCTYPES:
        parent_dt = dt_config["parent"]
        child_dt = dt_config["child"]
        fields = dt_config["fields"]
        order_by = dt_config["order_by"]

        # Export parent docs
        try:
            data = frappe.get_all(
                parent_dt,
                fields=fields,
                limit_page_length=0,
                order_by=order_by,
            )
            fname = parent_dt.replace(" ", "_")
            write_csv(f"{output_dir}/{fname}.csv", data, fields)
        except Exception as e:
            data = []
            print(f"  ERROR exporting {parent_dt}: {e}")

        # Export child items
        try:
            child_fields = get_child_fields(child_dt)
            child_data = frappe.get_all(
                child_dt,
                fields=child_fields,
                limit_page_length=0,
                order_by="parent asc, idx asc",
            )
            cfname = child_dt.replace(" ", "_")
            write_csv(f"{output_dir}/{cfname}.csv", child_data, child_fields)
        except Exception as e:
            child_data = []
            print(f"  ERROR exporting {child_dt}: {e}")

        # Count by docstatus
        submitted = len([d for d in data if d.get("docstatus") == 1])
        draft = len([d for d in data if d.get("docstatus") == 0])
        cancelled = len([d for d in data if d.get("docstatus") == 2])

        summary.append({
            "doctype": parent_dt,
            "total": len(data),
            "submitted": submitted,
            "draft": draft,
            "cancelled": cancelled,
            "child_rows": len(child_data),
        })

        print(f"  {parent_dt}: {len(data)} docs ({submitted} submitted, {draft} draft, {cancelled} cancelled), {len(child_data)} child rows")

    # Write summary
    write_csv(
        f"{output_dir}/_SUMMARY.csv",
        summary,
        ["doctype", "total", "submitted", "draft", "cancelled", "child_rows"],
    )

    print(f"\n{'='*60}")
    print(f"BACKUP COMPLETE: {output_dir}")
    print(f"{'='*60}")
    for s in summary:
        print(f"  {s['doctype']:30s}  {s['total']:5d} docs  ({s['submitted']} submitted)")
    print(f"{'='*60}")
