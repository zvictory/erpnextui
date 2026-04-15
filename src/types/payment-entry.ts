export interface OutstandingInvoice {
  name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  base_grand_total: number;
  outstanding_amount: number;
  currency?: string;
}

export interface PaymentReference {
  reference_doctype: "Sales Invoice" | "Purchase Invoice";
  reference_name: string;
  total_amount: number;
  outstanding_amount: number;
  allocated_amount: number;
}

export interface PaymentEntryListItem {
  name: string;
  payment_type: "Receive" | "Pay" | "Internal Transfer";
  posting_date: string;
  party_type: "Customer" | "Supplier";
  party: string;
  party_name: string;
  paid_amount: number;
  received_amount: number;
  paid_from: string;
  paid_to: string;
  paid_from_account_currency?: string;
  paid_to_account_currency?: string;
  status: string;
  docstatus: 0 | 1 | 2;
}

export interface PaymentEntry extends PaymentEntryListItem {
  company: string;
  mode_of_payment?: string;
  reference_no?: string;
  reference_date?: string;
  remarks?: string;
  references: PaymentReference[];
  [key: string]: unknown;
}
