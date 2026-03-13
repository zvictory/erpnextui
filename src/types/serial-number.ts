export interface SerialNumber {
  name: string;
  serial_no: string;
  item_code: string;
  item_name?: string;
  warehouse?: string;
  company: string;
  status: "Active" | "Delivered" | "Expired" | "Inactive";
  custom_imei_1?: string;
  custom_imei_2?: string;
  purchase_document_type?: string;
  purchase_document_no?: string;
  delivery_document_type?: string;
  delivery_document_no?: string;
  [key: string]: unknown;
}

export interface SerialNumberListItem {
  name: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  status: string;
  custom_imei_1: string;
  custom_imei_2: string;
}
