"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Menu, X } from "lucide-react";

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { label: "Модули", href: "/#modules" },
    { label: "Тарифы", href: "/pricing" },
    { label: "Услуги", href: "/services" },
    { label: "Кейсы", href: "/cases" },
    { label: "Блог", href: "/blog" },
    { label: "Отзывы", href: "/#testimonials" },
    { label: "Вопросы", href: "/#faq" },
    { label: "Контакты", href: "/#contact" },
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
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm text-slate-300 transition-colors hover:text-white">
            Войти
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/register"
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
            >
              Попробовать бесплатно
            </Link>
          </motion.div>
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
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-300 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
                <Link href="/login" className="text-sm text-slate-300 hover:text-white">
                  Войти
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-teal-500 px-4 py-2 text-center text-sm font-medium text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Попробовать бесплатно
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
