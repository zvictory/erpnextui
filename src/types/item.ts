export interface ItemUOM {
  uom: string;
  conversion_factor: number;
}

export interface Item {
  name: string;
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  standard_rate: number;
  valuation_rate: number;
  is_stock_item: 0 | 1;
  has_serial_no: 0 | 1;
  disabled: 0 | 1;
  uoms?: ItemUOM[];
  [key: string]: unknown;
}

export interface ItemListItem {
  name: string;
  item_code: string;
  item_name: string;
  item_group: string;
  standard_rate: number;
  has_serial_no: 0 | 1;
  disabled: 0 | 1;
}
