export interface Warehouse {
  name: string;
  warehouse_name: string;
  company: string;
  is_group: 0 | 1;
  parent_warehouse?: string;
  [key: string]: unknown;
}

export interface WarehouseListItem {
  name: string;
  warehouse_name: string;
  company: string;
  is_group: 0 | 1;
}
