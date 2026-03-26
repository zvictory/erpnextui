"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, animate, AnimatePresence } from "framer-motion";
import {
  Calculator,
  Package,
  Factory,
  Users,
  ShoppingCart,
  UserCog,
  FolderKanban,
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
  TrendingUp,
  Activity,
  BarChart3,
  CheckCircle,
  Scale,
  Zap,
  Star,
  CircleDollarSign,
  Cpu,
  Gauge,
  ClipboardCheck,
  Layers,
  GitBranch,
  ArrowUpRight,
  DollarSign,
  PieChart,
  Truck,
  Bell,
} from "lucide-react";

/* ─── Motion variants ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const fadeDown = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerSlow = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const slideLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const slideRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

/* ─── Counter component ────────────────────────────────────────────── */

function CountUp({
  value,
  prefix = "",
  suffix = "",
  duration = 2,
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        if (decimals > 0) {
          setDisplay(v.toFixed(decimals));
        } else {
          setDisplay(Math.round(v).toLocaleString("ru-RU"));
        }
      },
    });
    return controls.stop;
  }, [isInView, value, duration, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ─── Sparkline SVG ────────────────────────────────────────────────── */

function Sparkline({
  data,
  color = "currentColor",
  className = "",
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 64;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`${className}`} fill="none">
      <polyline
        points={points}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Data ─────────────────────────────────────────────────────────── */

const modules = [
  {
    icon: Calculator,
    title: "Финансы и Бухгалтерия",
    description: "P&L, Cashflow, мульти-валюта, автоматические проводки и сверки.",
    color: "bg-teal-500/10 text-teal-500",
    stat: "99.8%",
    statLabel: "Точность",
    statIcon: Gauge,
  },
  {
    icon: Package,
    title: "Склад и Логистика",
    description: "Мульти-склад, WMS, отслеживание партий и серийных номеров.",
    color: "bg-blue-500/10 text-blue-500",
    stat: "85%",
    statLabel: "Заполненность",
    statIcon: Layers,
  },
  {
    icon: Factory,
    title: "Производство",
    description: "BOM, маршруты, планирование заказов, контроль загрузки линий.",
    color: "bg-orange-500/10 text-orange-500",
    stat: "92%",
    statLabel: "Загрузка",
    statIcon: Cpu,
  },
  {
    icon: Users,
    title: "CRM и Продажи",
    description: "Воронка продаж, IP-телефония, аналитика. От лида до сделки.",
    color: "bg-purple-500/10 text-purple-500",
    stat: "$450K",
    statLabel: "Pipeline",
    statIcon: CircleDollarSign,
  },
  {
    icon: ShoppingCart,
    title: "Закупки и Снабжение",
    description: "Landed Cost, автозакупки, учёт фрахта и пошлин.",
    color: "bg-emerald-500/10 text-emerald-500",
    stat: "-18%",
    statLabel: "Экономия",
    statIcon: PieChart,
  },
  {
    icon: UserCog,
    title: "HR и Кадры",
    description: "Управление персоналом, табели, зарплаты, отпуска.",
    color: "bg-rose-500/10 text-rose-500",
    stat: "324",
    statLabel: "Сотрудников",
    statIcon: Users,
  },
  {
    icon: FolderKanban,
    title: "Управление Проектами",
    description: "Kanban, Gantt-диаграммы, учёт времени и бюджетов.",
    color: "bg-amber-500/10 text-amber-500",
    stat: "12",
    statLabel: "Проектов",
    statIcon: GitBranch,
  },
  {
    icon: ShieldCheck,
    title: "Контроль Качества",
    description: "Стандарты, инспекции, сертификация, отслеживание дефектов.",
    color: "bg-cyan-500/10 text-cyan-500",
    stat: "100%",
    statLabel: "Инспекция",
    statIcon: ClipboardCheck,
  },
];

const heroStats = [
  {
    value: 1245,
    label: "Активных заказов",
    change: "+12%",
    icon: Activity,
    spark: [20, 25, 22, 30, 28, 35, 32, 40, 38, 45],
  },
  {
    value: 94.2,
    label: "Эффективность",
    change: "Оптимизация",
    icon: TrendingUp,
    spark: [60, 65, 63, 70, 72, 75, 80, 78, 85, 94],
    suffix: "%",
    decimals: 1,
  },
  {
    value: 15,
    label: "Рост производительности",
    change: "Линия A",
    icon: BarChart3,
    spark: [5, 6, 7, 8, 9, 10, 11, 12, 13, 15],
    prefix: "+",
    suffix: "%",
  },
  {
    value: 0,
    label: "Критических ошибок",
    change: "Всё стабильно",
    icon: ShieldCheck,
    spark: [3, 2, 1, 2, 1, 0, 1, 0, 0, 0],
  },
];

const kpis = [
  {
    numericValue: 124500,
    prefix: "+$",
    label: "Чистая Прибыль",
    change: "+12.5% к прошлому месяцу",
    positive: true,
    icon: DollarSign,
  },
  {
    numericValue: 45200,
    prefix: "$",
    label: "Дебиторская Задолженность",
    change: "3 клиента — требует внимания",
    positive: false,
    icon: Bell,
  },
  {
    numericValue: 94,
    prefix: "",
    suffix: "%",
    label: "Эффективность Цеха",
    change: "Цель: 90%",
    positive: true,
    icon: Gauge,
  },
];

const activityItems = [
  { text: "Заказ #4092 отгружен", time: "2 мин назад", icon: Truck, color: "text-emerald-400" },
  {
    text: "Оплата от OOO 'TexSnab'",
    time: "15 мин назад",
    icon: DollarSign,
    color: "text-teal-400",
  },
  { text: "Новый лид: Global Trade", time: "1 ч назад", icon: Users, color: "text-purple-400" },
  {
    text: "Инвентаризация завершена",
    time: "2 ч назад",
    icon: ClipboardCheck,
    color: "text-blue-400",
  },
  { text: "Сбой на линии B2 устранён", time: "3 ч назад", icon: Factory, color: "text-amber-400" },
];

const testimonials = [
  {
    name: "Азиз Рахимов",
    role: "CEO, SilkRoad Logistics",
    quote:
      "Мы пробовали 1С и Odoo, но только Stable ERP смогли адаптировать систему под наши сложные процессы таможенной очистки.",
    initials: "АР",
  },
  {
    name: "Елена Смирнова",
    role: "Директор Производства",
    quote:
      "Визуализация производства помогла нам сократить простои на 20% за первый месяц. Интерфейс просто космический.",
    initials: "ЕС",
  },
  {
    name: "Рустам Алиев",
    role: "Менеджер Снабжения",
    quote:
      "Отличная поддержка. Внедрили модуль Landed Cost именно так, как требовали наши бухгалтеры. Теперь считаем себестоимость до копейки.",
    initials: "РА",
  },
];

const clientLogos = [
  "UzProm Invest",
  "SilkRoad Logistics",
  "Tashkent Textile Group",
  "Fergana AgroExport",
  "StroyStandart CIS",
  "TransAsia Trade",
  "Samarkand Polymers",
  "Global Tech Sergeli",
];

// Revenue chart SVG path data
const revenueData = [120, 100, 110, 80, 90, 60, 70, 40, 50, 25, 35, 15];
const expenseData = [110, 105, 100, 95, 88, 82, 78, 72, 68, 60, 55, 50];

function chartPath(data: number[], w: number, h: number, padY = 10): string {
  const max = Math.max(...data, ...expenseData);
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = padY + (v / max) * (h - padY * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function chartArea(data: number[], w: number, h: number, padY = 10): string {
  const path = chartPath(data, w, h, padY);
  return `${path} L${w},${h} L0,${h} Z`;
}

/* ─── Navigation ───────────────────────────────────────────────────── */

function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { label: "Модули", href: "#modules" },
    { label: "Аналитика", href: "#analytics" },
    { label: "Отзывы", href: "#testimonials" },
    { label: "Контакты", href: "#contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 z-50 w-full border-b transition-colors duration-300 ${
        scrolled
          ? "border-white/10 bg-slate-950/90 backdrop-blur-lg"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: 12 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500"
          >
            <Scale className="h-4 w-4 text-white" />
          </motion.div>
          <span className="text-lg font-bold text-white">Stable ERP</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="https://app.erpstable.com/login"
            className="text-sm text-slate-300 transition-colors hover:text-white"
          >
            Войти
          </Link>
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
          >
            Обсудить проект
          </motion.a>
        </div>

        <button
          className="text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-white/10 bg-slate-950 md:hidden"
          >
            <div className="flex flex-col gap-3 px-4 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-300 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
                <Link
                  href="https://app.erpstable.com/login"
                  className="text-sm text-slate-300 hover:text-white"
                >
                  Войти
                </Link>
                <a
                  href="#contact"
                  className="rounded-lg bg-teal-500 px-4 py-2 text-center text-sm font-medium text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Обсудить проект
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 pb-20 pt-32">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent" />
      {/* Animated gradient orb */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-1/4 top-1/4 h-96 w-96 rounded-full bg-teal-500/5 blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -20, 30, 0],
          y: [0, 30, -20, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/4 bottom-1/4 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl"
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerSlow}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            variants={fadeDown}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-400"
          >
            <Zap className="h-3.5 w-3.5" />
            ERP-система нового поколения
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Кастомная ERP-система{" "}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              для вашего бизнеса
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 text-lg text-slate-300 sm:text-xl">
            Полный контроль от закупки до отгрузки. Управление финансами, производством, складом и
            продажами — всё в одной системе.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-600 hover:shadow-teal-500/40"
            >
              Рассчитать стоимость
              <ArrowRight className="h-4 w-4" />
            </motion.a>
            <motion.a
              href="#modules"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Как это работает
            </motion.a>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {heroStats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
              className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <stat.icon className="h-4 w-4 text-teal-400" />
                  <span className="text-xs text-slate-400">{stat.label}</span>
                </div>
                <Sparkline data={stat.spark} color="rgb(45, 212, 191)" className="h-6 w-12" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                <CountUp
                  value={stat.value}
                  prefix={stat.prefix ?? ""}
                  suffix={stat.suffix ?? ""}
                  decimals={stat.decimals ?? 0}
                />
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                <ArrowUpRight className="h-3 w-3" />
                {stat.change}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Client Logos — Marquee ───────────────────────────────────────── */

function ClientLogosSection() {
  const allLogos = [...clientLogos, ...clientLogos];

  return (
    <section className="overflow-hidden border-y border-slate-100 bg-white py-12">
      <motion.p
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        className="text-center text-sm font-medium text-slate-500"
      >
        Нам доверяют ведущие предприятия региона
      </motion.p>
      <div className="relative mt-8">
        <div className="absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-white to-transparent" />
        <div
          className="flex w-max items-center gap-16"
          style={{ animation: "marquee 30s linear infinite" }}
        >
          {allLogos.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="whitespace-nowrap text-base font-semibold tracking-wide text-slate-300"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Modules ──────────────────────────────────────────────────────── */

function ModulesSection() {
  return (
    <section id="modules" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Инструменты промышленного уровня
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-600">
            Модульная архитектура — подключайте только то, что нужно вашему бизнесу
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {modules.map((mod) => (
            <motion.div
              key={mod.title}
              variants={fadeUp}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              className="group cursor-default rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:border-teal-200 hover:shadow-xl hover:shadow-teal-500/5"
            >
              <div className="flex items-start justify-between">
                <div className={`inline-flex rounded-xl p-3 ${mod.color}`}>
                  <mod.icon className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600">
                  <mod.statIcon className="h-3 w-3" />
                  <span className="font-medium">{mod.stat}</span>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{mod.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{mod.description}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
                Подробнее <ArrowRight className="h-3 w-3" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Analytics / Command Center ───────────────────────────────────── */

function AnalyticsSection() {
  const chartW = 400;
  const chartH = 160;

  return (
    <section id="analytics" className="bg-slate-950 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white sm:text-4xl">
            Все показатели бизнеса на одной ладони
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-400">
            Контролируйте Cashflow, маржинальность и статус производства в реальном времени
          </motion.p>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="mt-16 grid gap-6 lg:grid-cols-3"
        >
          {kpis.map((kpi) => (
            <motion.div
              key={kpi.label}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">{kpi.label}</div>
                <div
                  className={`rounded-lg p-2 ${kpi.positive ? "bg-emerald-500/10" : "bg-amber-500/10"}`}
                >
                  <kpi.icon
                    className={`h-4 w-4 ${kpi.positive ? "text-emerald-400" : "text-amber-400"}`}
                  />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold text-white">
                <CountUp value={kpi.numericValue} prefix={kpi.prefix} suffix={kpi.suffix ?? ""} />
              </div>
              <div
                className={`mt-2 flex items-center gap-1 text-sm ${kpi.positive ? "text-emerald-400" : "text-amber-400"}`}
              >
                {kpi.positive && <ArrowUpRight className="h-3.5 w-3.5" />}
                {kpi.change}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* SVG Area Chart */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Динамика Выручки и Расходов</div>
                <div className="mt-0.5 text-xs text-slate-500">Q1 2026</div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  <span className="text-slate-400">Выручка</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="text-slate-400">Расходы</span>
                </div>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="mt-6 h-44 w-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(45,212,191)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="rgb(45,212,191)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(192,132,252)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="rgb(192,132,252)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((p) => (
                <line
                  key={p}
                  x1="0"
                  y1={chartH * p}
                  x2={chartW}
                  y2={chartH * p}
                  stroke="white"
                  strokeOpacity="0.05"
                />
              ))}
              {/* Area fills */}
              <motion.path
                d={chartArea(revenueData, chartW, chartH)}
                fill="url(#revGrad)"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
                viewport={{ once: true }}
              />
              <motion.path
                d={chartArea(expenseData, chartW, chartH)}
                fill="url(#expGrad)"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.7 }}
                viewport={{ once: true }}
              />
              {/* Lines */}
              <motion.path
                d={chartPath(revenueData, chartW, chartH)}
                fill="none"
                stroke="rgb(45,212,191)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                viewport={{ once: true }}
              />
              <motion.path
                d={chartPath(expenseData, chartW, chartH)}
                fill="none"
                stroke="rgb(192,132,252)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 4"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
                viewport={{ once: true }}
              />
            </svg>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>Янв</span>
              <span>Фев</span>
              <span>Мар</span>
              <span>Апр</span>
            </div>
          </motion.div>

          {/* Donut + Activity feed */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-6 lg:col-span-2"
          >
            {/* Efficiency donut */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="text-sm font-medium text-white">Эффективность</div>
              <div className="mt-4 flex items-center gap-6">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="rgb(30,41,59)"
                    strokeWidth="3"
                  />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="rgb(45,212,191)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 100" }}
                    whileInView={{ strokeDasharray: "94 100" }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    viewport={{ once: true }}
                  />
                </svg>
                <div>
                  <div className="text-3xl font-bold text-white">
                    <CountUp value={94} suffix="%" />
                  </div>
                  <div className="text-xs text-emerald-400">Цель: 90%</div>
                </div>
              </div>
            </motion.div>

            {/* Activity feed */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white">Активность</div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  LIVE
                </div>
              </div>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
                className="mt-5 space-y-3"
              >
                {activityItems.map((item, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-white/10 p-1.5">
                      <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white">{item.text}</div>
                      <div className="text-xs text-slate-500">{item.time}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Comparison ───────────────────────────────────────────────────── */

function ComparisonSection() {
  const problems = [
    "Ручной перенос данных между системами",
    "Ошибки при вводе данных",
    "Невозможность получить отчёт в реальном времени",
    "Высокая стоимость поддержки нескольких систем",
  ];
  const solutions = [
    "Автоматическая синхронизация всех данных",
    "Единый источник правды для всех отделов",
    "Отчёты и аналитика в реальном времени",
    "Одна система — одна стоимость поддержки",
  ];

  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto max-w-2xl text-center text-3xl font-bold text-slate-900 sm:text-4xl"
        >
          Стандартные решения vs Stable&nbsp;ERP
        </motion.h2>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideLeft}
            className="rounded-2xl border border-red-200 bg-white p-8"
          >
            <div className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              Проблема
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Фрагментированные данные</h3>
            <p className="mt-3 leading-relaxed text-slate-600">
              Потеря информации между системами, ручной ввод, дублирование данных и ошибки. Каждый
              отдел работает в своей программе.
            </p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="mt-6 space-y-3"
            >
              {problems.map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <X className="h-4 w-4 shrink-0 text-red-500" />
                  {item}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideRight}
            className="rounded-2xl border border-teal-200 bg-white p-8"
          >
            <div className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-700">
              Решение
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Единая Экосистема</h3>
            <p className="mt-3 leading-relaxed text-slate-600">
              Бесшовный поток данных от станка до финансового отчёта. Все модули работают в единой
              системе — изменение в одном месте мгновенно отражается везде.
            </p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="mt-6 space-y-3"
            >
              {solutions.map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <CheckCircle className="h-4 w-4 shrink-0 text-teal-500" />
                  {item}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─────────────────────────────────────────────────── */

function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-slate-950 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto max-w-2xl text-center text-3xl font-bold text-white sm:text-4xl"
        >
          Нам доверяют лидеры индустрии
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="mt-16 grid gap-8 md:grid-cols-3"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-sm font-medium text-teal-400">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA ──────────────────────────────────────────────────────────── */

function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 to-teal-800 py-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl"
      />
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white sm:text-4xl">
          Готовы автоматизировать бизнес?
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-lg text-teal-100">
          Расскажите о ваших процессах — мы подберём оптимальную конфигурацию системы
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-teal-700 shadow-lg transition-all hover:bg-teal-50"
          >
            Обсудить проект
            <ArrowRight className="h-4 w-4" />
          </motion.a>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Попробовать бесплатно
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── Footer ───────────────────────────────────────────────────────── */

function FooterSection() {
  return (
    <footer id="contact" className="bg-slate-950 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid gap-12 md:grid-cols-4"
        >
          <motion.div variants={fadeUp} className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500">
                <Scale className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Stable ERP</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Разработка надёжных ERP-систем для бизнеса. Автоматизируйте процессы и увеличивайте
              прибыль вместе с нами.
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h3 className="text-sm font-semibold text-white">Контакты</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>Ташкент, Узбекистан</p>
              <p>Бизнес-центр «TechnoPlaza»</p>
              <p>+998 (90) 123-45-67</p>
              <p>info@stableerp.com</p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h3 className="text-sm font-semibold text-white">Компания</h3>
            <div className="mt-4 space-y-3">
              {[
                { label: "Модули", href: "#modules" },
                { label: "Аналитика", href: "#analytics" },
                { label: "Отзывы", href: "#testimonials" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-slate-400 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h3 className="text-sm font-semibold text-white">Ресурсы</h3>
            <div className="mt-4 space-y-3">
              <Link
                href="https://app.erpstable.com/login"
                className="block text-sm text-slate-400 transition-colors hover:text-white"
              >
                Войти в систему
              </Link>
            </div>
          </motion.div>
        </motion.div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Stable ERP. Все права защищены.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300">
              Политика конфиденциальности
            </a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300">
              Условия использования
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <Navigation />
      <HeroSection />
      <ClientLogosSection />
      <ModulesSection />
      <AnalyticsSection />
      <ComparisonSection />
      <TestimonialsSection />
      <CTASection />
      <FooterSection />
    </>
  );
}
