"use client";

import Link from "next/link";
import { BarChart3, Boxes, Factory, Moon, Scale, Sun, Users, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

type CollageTile = {
  icon: LucideIcon;
  labelKey: "warehouse" | "dashboard" | "factory" | "team";
  className: string;
};

const COLLAGE_TILES: CollageTile[] = [
  {
    icon: Boxes,
    labelKey: "warehouse",
    className: "bg-gradient-to-br from-slate-800 to-slate-900 text-teal-300",
  },
  {
    icon: BarChart3,
    labelKey: "dashboard",
    className: "bg-gradient-to-br from-emerald-700 to-teal-800 text-emerald-100",
  },
  {
    icon: Factory,
    labelKey: "factory",
    className: "bg-gradient-to-br from-slate-700 to-slate-800 text-emerald-300",
  },
  {
    icon: Users,
    labelKey: "team",
    className: "bg-gradient-to-br from-teal-700 to-emerald-800 text-teal-100",
  },
];

const SPRING = { type: "spring" as const, stiffness: 220, damping: 26 };

const collageGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const collageTileVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: SPRING },
};

export default function LoginPage() {
  const t = useTranslations("auth.signIn");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left collage panel (hidden on <lg) */}
      <aside className="relative hidden overflow-hidden lg:flex lg:w-3/5">
        <motion.div
          className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-3 p-6"
          variants={collageGridVariants}
          initial="hidden"
          animate="visible"
        >
          <CollageTileCard tile={COLLAGE_TILES[0]} label={t(`tile.${COLLAGE_TILES[0].labelKey}`)} />
          <CollageStat
            value={t("stat1Value")}
            label={t("stat1Label")}
            className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white"
          />
          <CollageTileCard tile={COLLAGE_TILES[1]} label={t(`tile.${COLLAGE_TILES[1].labelKey}`)} />
          <CollageStat
            value={t("stat2Value")}
            label={t("stat2Label")}
            className="bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
          />
          <CollageTileCard tile={COLLAGE_TILES[2]} label={t(`tile.${COLLAGE_TILES[2].labelKey}`)} />
          <CollageTileCard tile={COLLAGE_TILES[3]} label={t(`tile.${COLLAGE_TILES[3].labelKey}`)} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.55 }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-10 pt-24"
        >
          <div className="pointer-events-auto max-w-md">
            <Link href="https://erpstable.com" className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500">
                <Scale className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Stable ERP</span>
            </Link>
            <h1 className="mt-5 text-3xl font-bold leading-tight text-white">
              {t("brandTitle")}{" "}
              <motion.span
                className="bg-[length:200%_100%] bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 6, ease: "linear", repeat: Infinity }}
              >
                {t("brandHighlight")}
              </motion.span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{t("brandSubtitle")}</p>
          </div>
        </motion.div>
      </aside>

      {/* Right form panel */}
      <section className="relative flex w-full items-center justify-center p-6 sm:p-10 lg:w-2/5">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          {process.env.NEXT_PUBLIC_PILOT === "1" && (
            <span className="inline-flex h-5 items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Beta
            </span>
          )}
          <LanguageSwitcher variant="outline" />
          <motion.button
            type="button"
            onClick={toggleTheme}
            aria-label={t("themeToggle")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9, rotate: 15 }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isDark ? "sun" : "moon"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>

        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SPRING}
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Link href="https://erpstable.com" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scale className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold">Stable ERP</span>
            </Link>
          </div>
          <LoginForm />
        </motion.div>
      </section>
    </div>
  );
}

function CollageTileCard({ tile, label }: { tile: CollageTile; label: string }) {
  const Icon = tile.icon;
  return (
    <motion.div
      variants={collageTileVariants}
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { type: "spring", stiffness: 320, damping: 22 },
      }}
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-lg shadow-black/10 ${tile.className}`}
      aria-hidden="true"
    >
      <Icon className="h-8 w-8 opacity-90" strokeWidth={1.5} />
      <span className="text-sm font-medium leading-tight opacity-90">{label}</span>
    </motion.div>
  );
}

function CollageStat({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className: string;
}) {
  return (
    <motion.div
      variants={collageTileVariants}
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { type: "spring", stiffness: 320, damping: 22 },
      }}
      className={`flex flex-col justify-between rounded-2xl p-5 shadow-lg shadow-black/10 ${className}`}
      aria-hidden="true"
    >
      <span className="text-3xl font-bold leading-none sm:text-4xl">{value}</span>
      <span className="text-sm font-medium leading-tight opacity-90">{label}</span>
    </motion.div>
  );
}
