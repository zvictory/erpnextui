"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Factory,
  ShoppingCart,
  Truck,
  TrendingUp,
  Clock,
  CheckCircle,
  Quote,
  BarChart3,
  Package,
  Users,
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
  visible: { transition: { staggerChildren: 0.15 } },
};

/* ─── Case Study Data ─────────────────────────────────────────────── */

interface CaseStudy {
  slug: string;
  company: string;
  industry: string;
  industryIcon: typeof Factory;
  location: string;
  challenge: string;
  solution: string;
  quote: string;
  quotePerson: string;
  quoteRole: string;
  metrics: { label: string; value: string; icon: typeof TrendingUp }[];
  modules: string[];
  color: string;
}

const caseStudies: CaseStudy[] = [
  {
    slug: "promac",
    company: "Promac",
    industry: "Производство",
    industryIcon: Factory,
    location: "Ташкент, Узбекистан",
    challenge:
      "Учёт материалов и серийных номеров вёлся в Excel. Отслеживание готовой продукции от сырья до отгрузки занимало часы. Ошибки в остатках приводили к простоям на линии.",
    solution:
      "Внедрили Stable ERP с модулями производства, серийного учёта и складского контроля. Каждая единица продукции отслеживается от приёмки материала до отгрузки клиенту.",
    quote:
      "Раньше мы тратили полдня на сверку остатков. Сейчас всё видно в одном экране — остатки, заказы, готовая продукция.",
    quotePerson: "Руководитель производства",
    quoteRole: "Promac",
    metrics: [
      { label: "Экономия времени на учёте", value: "4 ч/день", icon: Clock },
      { label: "Точность остатков", value: "99%", icon: CheckCircle },
      { label: "Время внедрения", value: "10 дней", icon: TrendingUp },
    ],
    modules: ["Производство", "Серийный учёт", "Склад", "Финансы", "Отчёты"],
    color: "teal",
  },
  {
    slug: "anjan",
    company: "ANJAN",
    industry: "Торговля и дистрибуция",
    industryIcon: ShoppingCart,
    location: "Ташкент, Узбекистан",
    challenge:
      "Управление закупками, продажами и задолженностями клиентов велось через WhatsApp и бумажные записи. Невозможно было быстро узнать дебиторку по конкретному клиенту.",
    solution:
      "Перешли на Stable ERP для полного цикла торговли: от закупки до выставления счёта. Дебиторская и кредиторская задолженность видна в реальном времени.",
    quote: "Больше не звоним бухгалтеру, чтобы узнать, кто сколько должен. Всё на экране телефона.",
    quotePerson: "Директор",
    quoteRole: "ANJAN",
    metrics: [
      { label: "Контроль задолженностей", value: "Онлайн", icon: BarChart3 },
      { label: "Скорость выставления счёта", value: "2 мин", icon: Clock },
      { label: "Время внедрения", value: "7 дней", icon: TrendingUp },
    ],
    modules: ["Продажи", "Закупки", "Финансы", "Отчёты"],
    color: "blue",
  },
  {
    slug: "laza",
    company: "Laza",
    industry: "Логистика и услуги",
    industryIcon: Truck,
    location: "Узбекистан",
    challenge:
      "Компания росла, но финансовый учёт оставался в таблицах. Не было единой системы для отслеживания расходов, доходов и прибыли по направлениям.",
    solution:
      "Запустили Stable ERP для финансового учёта и аналитики. Руководство получило P&L и баланс в реальном времени, без привлечения бухгалтера для каждого отчёта.",
    quote:
      "Мы наконец видим реальную картину бизнеса — не раз в месяц от бухгалтера, а каждый день.",
    quotePerson: "Основатель",
    quoteRole: "Laza",
    metrics: [
      { label: "Время подготовки отчёта", value: "10 сек", icon: Clock },
      { label: "Финансовая прозрачность", value: "100%", icon: CheckCircle },
      { label: "Время внедрения", value: "5 дней", icon: TrendingUp },
    ],
    modules: ["Финансы", "Бухгалтерия", "Отчёты", "Продажи"],
    color: "violet",
  },
];

/* ─── Components ───────────────────────────────────────────────────── */

function CaseStudyCard({ study }: { study: CaseStudy }) {
  const Icon = study.industryIcon;

  return (
    <motion.div
      variants={fadeUp}
      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50"
    >
      {/* Header */}
      <div className="border-b border-white/10 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/20">
            <Icon className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{study.company}</h3>
            <p className="text-sm text-slate-400">
              {study.industry} &middot; {study.location}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
        {study.metrics.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <div key={metric.label} className="p-4 text-center sm:p-6">
              <MetricIcon className="mx-auto h-5 w-5 text-teal-400" />
              <p className="mt-2 text-lg font-bold text-white sm:text-xl">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-400">{metric.label}</p>
            </div>
          );
        })}
      </div>

      {/* Challenge + Solution */}
      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <h4 className="text-sm font-semibold text-red-400">Проблема</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{study.challenge}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-teal-400">Решение</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{study.solution}</p>
        </div>
      </div>

      {/* Quote */}
      <div className="mx-6 mb-6 rounded-xl bg-slate-800/50 p-5 sm:mx-8 sm:mb-8">
        <Quote className="h-5 w-5 text-teal-500/50" />
        <p className="mt-3 text-sm italic leading-relaxed text-slate-300">
          &ldquo;{study.quote}&rdquo;
        </p>
        <p className="mt-3 text-xs text-slate-500">
          {study.quotePerson}, {study.quoteRole}
        </p>
      </div>

      {/* Modules */}
      <div className="border-t border-white/10 px-6 py-4 sm:px-8">
        <p className="mb-2 text-xs font-medium text-slate-500">Используемые модули:</p>
        <div className="flex flex-wrap gap-2">
          {study.modules.map((mod) => (
            <span
              key={mod}
              className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-400"
            >
              {mod}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function CasesPage() {
  return (
    <>
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pb-16 pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-400"
          >
            <Users className="h-4 w-4" />
            Реальные компании, реальные результаты
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl font-bold text-white sm:text-5xl">
            Кейсы клиентов
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-400">
            Как производственные и торговые компании в Узбекистане используют Stable ERP для
            управления бизнесом
          </motion.p>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/10 bg-slate-900/50">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-white/10"
        >
          {[
            { value: "9+", label: "Компаний", icon: Users },
            { value: "3", label: "Отрасли", icon: Package },
            { value: "5 дней", label: "Среднее внедрение", icon: Clock },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <motion.div key={stat.label} variants={fadeUp} className="px-4 py-8 text-center">
                <StatIcon className="mx-auto h-5 w-5 text-teal-400" />
                <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Case Studies */}
      <section className="bg-slate-950 py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mx-auto max-w-4xl space-y-12 px-4 sm:px-6"
        >
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.slug} study={study} />
          ))}
        </motion.div>
      </section>

      {/* CTA */}
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
            Готовы к таким же результатам?
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-teal-100">
            Попробуйте Stable ERP бесплатно 14 дней. Настройка занимает меньше 5 минут.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-teal-700 shadow-lg transition-all hover:bg-teal-50"
              >
                Начать бесплатно
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Посмотреть тарифы
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <FooterSection />
    </>
  );
}
