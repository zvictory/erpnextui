export interface Company {
  name: string;
  default_currency: string;
}

export interface Currency {
  name: string;
  symbol: string;
  symbol_on_right: 0 | 1;
}
