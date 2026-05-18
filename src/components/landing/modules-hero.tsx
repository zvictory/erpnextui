"use client";

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Icons from "lucide-react";
import { MODULES, DEMO_DURATION_MS } from "./modules-data";
import { SceneFinance } from "./modules/scene-finance";
import { SceneWarehouse } from "./modules/scene-warehouse";
import { SceneManufacturing } from "./modules/scene-manufacturing";
import { SceneCRM } from "./modules/scene-crm";
import { SceneProcurement } from "./modules/scene-procurement";
import { SceneHR } from "./modules/scene-hr";

const SCENE_COMPONENTS = [
  SceneFinance,
  SceneWarehouse,
  SceneManufacturing,
  SceneCRM,
  SceneProcurement,
  SceneHR,
];

function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerSnapshot() {
  return false;
}

interface ModuleTabProps {
  title: string;
  description: string;
  icon: string;
  isActive: boolean;
  progress: number;
  onClick: () => void;
}

function ModuleTab({ title, description, icon, isActive, progress, onClick }: ModuleTabProps) {
  const IconComponent = Icons[icon as keyof typeof Icons] as
    | React.ComponentType<{ className: string }>
    | undefined;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all ${
        isActive
          ? "border-teal-500 bg-slate-800/50"
          : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
      }`}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          {IconComponent && <IconComponent className="w-5 h-5 flex-shrink-0 text-teal-400" />}
          <h3 className={`font-semibold text-sm ${isActive ? "text-teal-400" : "text-slate-100"}`}>
            {title}
          </h3>
        </div>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-slate-400 mb-3 line-clamp-2"
          >
            {description}
          </motion.p>
        )}
      </div>

      {isActive && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500"
          style={{ width: `${progress}%` }}
        />
      )}
    </motion.button>
  );
}

export function ModulesHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(Date.now());
  const lastIndexRef = useRef(0);

  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    getServerSnapshot,
  );

  const selectTab = useCallback((index: number) => {
    setActiveIndex(index);
    startTimeRef.current = Date.now();
    setProgress(0);
    lastIndexRef.current = index;
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setProgress(50);
      setActiveIndex(0);
      return;
    }

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / DEMO_DURATION_MS) * 100, 100);

      setProgress(newProgress);

      if (newProgress >= 100) {
        const nextIndex = (lastIndexRef.current + 1) % MODULES.length;
        lastIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
        startTimeRef.current = Date.now();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  const SceneComponent = SCENE_COMPONENTS[activeIndex];
  const activeModule = MODULES[activeIndex];

  return (
    <section className="relative overflow-hidden bg-slate-950 py-24">
      <div className="absolute inset-0">
        <div className="absolute -top-40 left-1/3 h-80 w-80 rounded-full bg-teal-900/20 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-80 w-80 rounded-full bg-blue-900/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Все модули для вашего бизнеса
          </h2>
          <p className="text-lg text-slate-400">
            Модульная архитектура — подключайте только то, что нужно
          </p>
        </motion.div>

        {/* Module tabs grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8"
        >
          {MODULES.map((mod, i) => (
            <ModuleTab
              key={mod.id}
              title={mod.title}
              description={mod.description}
              icon={mod.icon}
              isActive={i === activeIndex}
              progress={i === activeIndex ? progress : 0}
              onClick={() => selectTab(i)}
            />
          ))}
        </motion.div>

        {/* Demo area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden min-h-80 p-8"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <SceneComponent progress={progress} />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
