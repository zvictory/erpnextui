"use client";

import { motion } from "framer-motion";
import { fadeIn, fadeUp, stagger } from "./motion-variants";
import { CountUp } from "./count-up";

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

const stats = [
  { value: 50, suffix: "+", label: "компаний" },
  { value: 8, suffix: "", label: "модулей" },
  { value: 3, suffix: "", label: "страны" },
  { value: 99.8, suffix: "%", label: "uptime", decimals: 1 },
];

export function SocialProofBar() {
  const allLogos = [...clientLogos, ...clientLogos];

  return (
    <section className="overflow-hidden border-y border-slate-100 bg-white py-12">
      {/* Numbers row */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-center gap-8 px-4 sm:gap-12"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp} className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              <CountUp value={stat.value} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
            </div>
            <div className="mt-1 text-xs text-slate-500">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Logos marquee */}
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
