"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { fadeUp, stagger } from "./motion-variants";

export function CTASection() {
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
          Перестаньте управлять вслепую
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-lg text-teal-100">
          Начните бесплатно за 5 минут.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-teal-700 shadow-lg transition-all hover:bg-teal-50"
            >
              Начать бесплатно
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <Link
            href="/services"
            className="text-sm text-teal-200 transition-colors hover:text-white"
          >
            Или мы настроим за вас — от $2,000
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
