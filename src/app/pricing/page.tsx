"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ArrowRight,
  Calculator,
  Package,
  Factory,
  Users,
  ShoppingCart,
  UserCog,
  ShieldCheck,
  Cpu,
  BarChart3,
  ChevronDown,
  Sparkles,
  Zap,
  Crown,
} from "lucide-react";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

/* ─── Motion variants ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─── Types ────────────────────────────────────────────────────────── */

type Currency = "usd" | "uzs";

interface PricingTier {
  name: string;
  nameEn: string;
  icon: typeof Zap;
  price: { usd: number; uzs: number };
  description: string;
  modules: string[];
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

/* ─── Pricing data ─────────────────────────────────────────────────── */

const tiers: PricingTier[] = [
  {
    name: "Старт",
    nameEn: "starter",
    icon: Zap,
    price: { usd: 50, uzs: 650_000 },
    description: "Для малого бизнеса — торговля, услуги, базовый учёт",
    modules: ["Финансы и Бухгалтерия", "Склад и Логистика", "Продажи и Счета", "Закупки"],
    features: [
      "До 5 пользователей",
      "1 склад",
      "Базовые отчёты (P&L, GL, баланс)",
      "Мульти-валюта",
      "Email-поддержка",
    ],
  },
  {
    name: "Про",
    nameEn: "pro",
    icon: Sparkles,
    price: { usd: 120, uzs: 1_550_000 },
    description: "Для растущего бизнеса — производство, CRM, управление персоналом",
    modules: [
      "Всё из тарифа Старт",
      "Производство (BOM, Work Orders, OEE)",
      "CRM и Воронка продаж",
      "HR и Зарплаты",
    ],
    features: [
      "До 20 пользователей",
      "Неограниченные склады",
      "Расширенная аналитика",
      "Мульти-валюта + автокурсы ЦБ",
      "Приоритетная поддержка",
    ],
    highlighted: true,
    badge: "Популярный",
  },
  {
    name: "Бизнес",
    nameEn: "enterprise",
    icon: Crown,
    price: { usd: 200, uzs: 2_600_000 },
    description: "Для предприятий — полный контроль, аналитика, интеграции",
    modules: [
      "Всё из тарифа Про",
      "Factory Twin (3D визуализация)",
      "Контроль Качества",
      "Управление Проектами",
    ],
    features: [
      "Неограниченные пользователи",
      "Неограниченные склады",
      "Дашборды реального времени",
      "API и кастомные интеграции",
      "Выделенная поддержка + Telegram",
    ],
  },
];

/* ─── Feature comparison data ──────────────────────────────────────── */

interface FeatureRow {
  name: string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

const featureCategories: { category: string; icon: typeof Calculator; features: FeatureRow[] }[] = [
  {
    category: "Финансы",
    icon: Calculator,
    features: [
      { name: "Главная книга (GL)", starter: true, pro: true, enterprise: true },
      { name: "P&L и Баланс", starter: true, pro: true, enterprise: true },
      { name: "Мульти-валюта", starter: true, pro: true, enterprise: true },
      { name: "Автокурсы ЦБ", starter: false, pro: true, enterprise: true },
      { name: "Банковская сверка", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Склад",
    icon: Package,
    features: [
      { name: "Мульти-склад", starter: "1 склад", pro: "Без лимита", enterprise: "Без лимита" },
      { name: "Серийные номера", starter: true, pro: true, enterprise: true },
      { name: "Отслеживание партий", starter: false, pro: true, enterprise: true },
      { name: "Stock Ledger", starter: true, pro: true, enterprise: true },
    ],
  },
  {
    category: "Производство",
    icon: Factory,
    features: [
      { name: "BOM (спецификации)", starter: false, pro: true, enterprise: true },
      { name: "Work Orders", starter: false, pro: true, enterprise: true },
      { name: "OEE мониторинг", starter: false, pro: true, enterprise: true },
      { name: "Factory Twin (3D)", starter: false, pro: false, enterprise: true },
      { name: "Energy Logs", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "CRM и Продажи",
    icon: Users,
    features: [
      { name: "Счета и накладные", starter: true, pro: true, enterprise: true },
      { name: "Воронка продаж", starter: false, pro: true, enterprise: true },
      { name: "Клиентская база", starter: true, pro: true, enterprise: true },
      { name: "Аналитика продаж", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Закупки",
    icon: ShoppingCart,
    features: [
      { name: "Заказы поставщикам", starter: true, pro: true, enterprise: true },
      { name: "Landed Cost", starter: false, pro: true, enterprise: true },
      { name: "Автозакупки", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "HR и Кадры",
    icon: UserCog,
    features: [
      { name: "Учёт сотрудников", starter: false, pro: true, enterprise: true },
      { name: "Зарплаты", starter: false, pro: true, enterprise: true },
      { name: "Табели и отпуска", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Дополнительно",
    icon: ShieldCheck,
    features: [
      { name: "Контроль Качества", starter: false, pro: false, enterprise: true },
      { name: "Управление Проектами", starter: false, pro: false, enterprise: true },
      { name: "API интеграции", starter: false, pro: false, enterprise: true },
      { name: "Пользователей", starter: "до 5", pro: "до 20", enterprise: "Без лимита" },
    ],
  },
];

/* ─── FAQ data ─────────────────────────────────────────────────────── */

const faqs = [
  {
    q: "Есть ли бесплатный пробный период?",
    a: "Да, вы получаете 14 дней бесплатного доступа ко всем функциям выбранного тарифа. Карта не требуется.",
  },
  {
    q: "Можно ли сменить тариф позже?",
    a: "Конечно. Вы можете повысить или понизить тариф в любое время. При повышении разница пересчитывается пропорционально.",
  },
  {
    q: "Как происходит оплата?",
    a: "Мы принимаем оплату банковскими картами (Visa, Mastercard) через Stripe, а также через Click и Payme для Узбекистана.",
  },
  {
    q: "Нужен ли мне собственный сервер?",
    a: "Нет. Stable ERP — это облачный сервис. Мы берём на себя хостинг, обновления и резервное копирование данных.",
  },
  {
    q: "Что если мне нужна кастомная настройка?",
    a: "Для тарифа Бизнес доступны кастомные интеграции. Также мы предлагаем услугу внедрения за отдельную плату — настроим систему под ваши процессы за 14 дней.",
  },
  {
    q: "Мои данные в безопасности?",
    a: "Абсолютно. Каждый клиент получает изолированную базу данных. Мы используем шифрование, ежедневные бэкапы и мониторинг 24/7.",
  },
];

/* ─── Format helpers ───────────────────────────────────────────────── */

function formatPrice(amount: number, currency: Currency): string {
  if (currency === "uzs") {
    return amount.toLocaleString("ru-RU");
  }
  return `$${amount}`;
}

function currencyLabel(currency: Currency): string {
  return currency === "uzs" ? "сўм/мес" : "/мес";
}

/* ─── Currency Toggle ──────────────────────────────────────────────── */

function CurrencyToggle({
  currency,
  onChange,
}: {
  currency: Currency;
  onChange: (c: Currency) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-slate-800 p-1">
      <button
        onClick={() => onChange("usd")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          currency === "usd"
            ? "bg-teal-500 text-white shadow-lg"
            : "text-slate-400 hover:text-white"
        }`}
      >
        USD
      </button>
      <button
        onClick={() => onChange("uzs")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          currency === "uzs"
            ? "bg-teal-500 text-white shadow-lg"
            : "text-slate-400 hover:text-white"
        }`}
      >
        UZS
      </button>
    </div>
  );
}

/* ─── Pricing Card ─────────────────────────────────────────────────── */

function PricingCard({ tier, currency }: { tier: PricingTier; currency: Currency }) {
  const Icon = tier.icon;

  return (
    <motion.div
      variants={fadeUp}
      className={`relative flex flex-col rounded-2xl border p-8 ${
        tier.highlighted
          ? "border-teal-500/50 bg-gradient-to-b from-teal-500/10 to-slate-900/50 shadow-lg shadow-teal-500/10"
          : "border-white/10 bg-slate-900/50"
      }`}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-teal-500 px-4 py-1 text-xs font-semibold text-white">
            {tier.badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <div
          className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${
            tier.highlighted ? "bg-teal-500/20 text-teal-400" : "bg-slate-800 text-slate-300"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-bold text-white">{tier.name}</h3>
        <p className="mt-1 text-sm text-slate-400">{tier.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <motion.span
            key={`${tier.nameEn}-${currency}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white"
          >
            {formatPrice(tier.price[currency], currency)}
          </motion.span>
          <span className="text-sm text-slate-400">{currencyLabel(currency)}</span>
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Модули</p>
        <ul className="space-y-2">
          {tier.modules.map((mod) => (
            <li key={mod} className="flex items-start gap-2 text-sm text-slate-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
              {mod}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Возможности
        </p>
        <ul className="space-y-2">
          {tier.features.map((feat) => (
            <li key={feat} className="flex items-start gap-2 text-sm text-slate-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {feat}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            href={`/register?plan=${tier.nameEn}`}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all ${
              tier.highlighted
                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25 hover:bg-teal-600"
                : "border border-white/10 text-white hover:bg-white/5"
            }`}
          >
            Начать бесплатно
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <p className="mt-3 text-center text-xs text-slate-500">14 дней бесплатно, без карты</p>
      </div>
    </motion.div>
  );
}

/* ─── Feature Comparison Table ─────────────────────────────────────── */

function FeatureTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="pb-4 pr-4 text-left text-sm font-semibold text-white">Функция</th>
            <th className="pb-4 px-4 text-center text-sm font-semibold text-white">Старт</th>
            <th className="pb-4 px-4 text-center text-sm font-semibold text-teal-400">Про</th>
            <th className="pb-4 pl-4 text-center text-sm font-semibold text-white">Бизнес</th>
          </tr>
        </thead>
        <tbody>
          {featureCategories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <Fragment key={cat.category}>
                <tr>
                  <td
                    colSpan={4}
                    className="pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    <span className="flex items-center gap-2">
                      <CatIcon className="h-3.5 w-3.5" />
                      {cat.category}
                    </span>
                  </td>
                </tr>
                {cat.features.map((f) => (
                  <tr key={f.name} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-sm text-slate-300">{f.name}</td>
                    <td className="py-3 px-4 text-center">
                      <FeatureCell value={f.starter} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <FeatureCell value={f.pro} />
                    </td>
                    <td className="py-3 pl-4 text-center">
                      <FeatureCell value={f.enterprise} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm text-slate-300">{value}</span>;
  }
  if (value) {
    return <Check className="mx-auto h-4 w-4 text-teal-500" />;
  }
  return <span className="text-sm text-slate-600">—</span>;
}

/* ─── FAQ Section ──────────────────────────────────────────────────── */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-medium text-white">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-slate-400">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────── */

import { Fragment } from "react";

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>("usd");

  return (
    <>
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pb-4 pt-32">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
        >
          <motion.h1 variants={fadeUp} className="text-4xl font-bold text-white sm:text-5xl">
            Тарифы
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-400">
            Выберите план, который подходит вашему бизнесу. 14 дней бесплатно.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex justify-center">
            <CurrencyToggle currency={currency} onChange={setCurrency} />
          </motion.div>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="bg-slate-950 py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-3"
        >
          {tiers.map((tier) => (
            <PricingCard key={tier.nameEn} tier={tier} currency={currency} />
          ))}
        </motion.div>
      </section>

      {/* Services upsell */}
      <section className="bg-slate-950 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 p-8 sm:p-12"
          >
            <div className="text-center">
              <Cpu className="mx-auto h-8 w-8 text-teal-500" />
              <h3 className="mt-4 text-xl font-bold text-white">Нужна помощь с настройкой?</h3>
              <p className="mt-2 text-sm text-slate-400">
                Не хотите настраивать самостоятельно? Мы сделаем это за вас.
              </p>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm font-bold text-teal-400">Быстрый старт — $2,000</div>
                <p className="mt-2 text-sm text-slate-400">
                  Настроим ERP вместе с вами за 7 дней. Импорт данных, обучение команды, 30 дней
                  поддержки.
                </p>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-4"
                >
                  <Link
                    href="/services/quick-start"
                    className="inline-flex items-center gap-1 text-sm font-medium text-teal-400 transition-colors hover:text-teal-300"
                  >
                    Подробнее <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </motion.div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm font-bold text-teal-400">Полный контроль — $6,500</div>
                <p className="mt-2 text-sm text-slate-400">
                  Полная оцифровка бизнеса за 14 дней. Производство, кастомные отчёты, 60 дней
                  поддержки.
                </p>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-4"
                >
                  <Link
                    href="/services/full-control"
                    className="inline-flex items-center gap-1 text-sm font-medium text-teal-400 transition-colors hover:text-teal-300"
                  >
                    Подробнее <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="bg-slate-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-white">Сравнение тарифов</h2>
              <p className="mt-3 text-slate-400">Подробное сравнение возможностей каждого тарифа</p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8"
            >
              <FeatureTable />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-950 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-white">Частые вопросы</h2>
              <p className="mt-3 text-slate-400">
                Ответы на популярные вопросы о тарифах и сервисе
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8"
            >
              {faqs.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white sm:text-4xl">
            Готовы начать?
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-teal-100">
            14 дней бесплатно. Настройка за 5 минут. Без привязки карты.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register?plan=pro"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-teal-700 shadow-lg transition-all hover:bg-teal-50"
              >
                Начать бесплатно
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <motion.a
              href="https://t.me/stableerp"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Задать вопрос в Telegram
            </motion.a>
          </motion.div>
        </motion.div>
      </section>

      <FooterSection />
    </>
  );
}
