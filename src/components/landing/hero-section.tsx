"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { fadeUp, fadeDown, staggerSlow } from "./motion-variants";
import { HeroDemo } from "./hero-demo";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 pb-20 pt-32">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent" />

      {/* Animated gradient orbs */}
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
        className="absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl"
      />

      {/* Cross-pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left column — text content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerSlow}
          >
            <motion.div
              variants={fadeDown}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-400"
            >
              <Zap className="h-3.5 w-3.5" />
              14 дней бесплатно — без карты
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Вы управляете бизнесом{" "}
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                вслепую
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-slate-300 sm:text-xl">
              Stable&nbsp;ERP показывает прибыль, склад и долги в реальном времени — на русском языке.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-600 hover:shadow-teal-500/40"
                >
                  Начать бесплатно
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right column — app demo */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: { opacity: 1, scale: 1, transition: { delay: 0.2 } },
            }}
            className="hidden lg:flex lg:justify-end"
          >
            <HeroDemo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
