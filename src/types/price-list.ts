export interface PriceList {
  name: string;
  price_list_name: string;
  currency: string;
  selling: 0 | 1;
  buying: 0 | 1;
  enabled: 0 | 1;
}

export interface PriceListListItem {
  name: string;
  price_list_name: string;
  currency: string;
  selling: 0 | 1;
  buying: 0 | 1;
  enabled: 0 | 1;
}

export interface ItemPrice {
  name: string;
  item_code: string;
  item_name: string;
  price_list: string;
  price_list_rate: number;
  currency: string;
  uom: string;
  selling: 0 | 1;
  buying: 0 | 1;
  valid_from?: string;
  valid_upto?: string;
  min_qty?: number;
  customer?: string;
  supplier?: string;
  batch_no?: string;
  packing_unit?: number;
}
