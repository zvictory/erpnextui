"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock } from "lucide-react";
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

/* ─── Blog post data ──────────────────────────────────────────────── */

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
}

const posts: BlogPost[] = [
  {
    slug: "erp-dlya-malogo-biznesa",
    title: "ERP для малого бизнеса: зачем нужна и как выбрать",
    excerpt:
      "Разбираемся, когда малому бизнесу пора переходить с Excel на ERP-систему, какие функции действительно нужны и сколько это стоит.",
    date: "2026-04-01",
    readTime: "7 мин",
    category: "Руководство",
  },
  {
    slug: "erpnext-na-russkom",
    title: "ERPNext на русском языке: полный обзор возможностей",
    excerpt:
      "ERPNext — бесплатная ERP-система с открытым кодом. Рассказываем, как она работает, что умеет и как использовать её на русском языке.",
    date: "2026-03-28",
    readTime: "10 мин",
    category: "Обзор",
  },
  {
    slug: "avtomatizatsiya-sklada",
    title: "Автоматизация склада: от Excel к ERP за 5 дней",
    excerpt:
      "Пошаговое руководство по переходу складского учёта из таблиц в ERP-систему. Реальный опыт производственной компании из Ташкента.",
    date: "2026-03-20",
    readTime: "8 мин",
    category: "Кейс",
  },
];

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <motion.div variants={fadeUp}>
      <Link
        href={`/blog/${post.slug}`}
        className="group block overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 transition-colors hover:border-teal-500/30"
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 font-medium text-teal-400">
              {post.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(post.date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readTime}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-bold text-white transition-colors group-hover:text-teal-400">
            {post.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-400">
            Читать
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function BlogPage() {
  return (
    <>
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pb-12 pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
        >
          <motion.h1 variants={fadeUp} className="text-4xl font-bold text-white sm:text-5xl">
            Блог
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-400">
            Статьи об автоматизации бизнеса, ERP-системах и управлении предприятием
          </motion.p>
        </motion.div>
      </section>

      {/* Posts */}
      <section className="bg-slate-950 py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6"
        >
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="bg-slate-950 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 p-8 sm:p-12"
          >
            <h3 className="text-xl font-bold text-white">
              Готовы попробовать ERP для вашего бизнеса?
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              14 дней бесплатно. Без привязки карты. Настройка за 5 минут.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mt-6">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-600"
              >
                Начать бесплатно
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <FooterSection />
    </>
  );
}
