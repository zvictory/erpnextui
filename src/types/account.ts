export interface Account {
  name: string;
  account_name: string;
  account_number?: string;
  parent_account?: string;
  company: string;
  root_type: string;
  report_type: string;
  account_type: string;
  is_group: 0 | 1;
  disabled: 0 | 1;
}
