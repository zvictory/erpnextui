export type ModuleId = 'finance' | 'warehouse' | 'manufacturing' | 'crm' | 'procurement' | 'hr';

export interface ModuleDef {
  id: ModuleId;
  icon: string;
  title: string;
  description: string;
  href: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'finance',
    icon: 'TrendingUp',
    title: 'Финансы и Бухгалтерия',
    description: 'P&L, Cashflow, мульти-валюта, автоматические проводки и сверки.',
    href: '/services#finance',
  },
  {
    id: 'warehouse',
    icon: 'Warehouse',
    title: 'Склад и Логистика',
    description: 'Мульти-склад, WMS, отслеживание партий и серийных номеров.',
    href: '/services#warehouse',
  },
  {
    id: 'manufacturing',
    icon: 'Factory',
    title: 'Производство',
    description: 'BOM, маршруты, планирование заказов, контроль загрузки линий.',
    href: '/services#manufacturing',
  },
  {
    id: 'crm',
    icon: 'Users',
    title: 'CRM и Продажи',
    description: 'Воронка продаж, IP-телефония, аналитика. От лида до сделки.',
    href: '/services#crm',
  },
  {
    id: 'procurement',
    icon: 'ShoppingCart',
    title: 'Закупки и Снабжение',
    description: 'Landed Cost, автозакупки, учёт фрахта и пошлин.',
    href: '/services#procurement',
  },
  {
    id: 'hr',
    icon: 'UserCheck',
    title: 'HR и Кадры',
    description: 'Управление персоналом, табели, зарплаты, отпуска.',
    href: '/services#hr',
  },
];

export const DEMO_DURATION_MS = 8000;
