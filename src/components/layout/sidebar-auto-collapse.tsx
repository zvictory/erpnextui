"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { useUISettingsStore } from "@/stores/ui-settings-store";

const COLLAPSE_ROUTES = ["/customers", "/vendors"];

function shouldCollapse(pathname: string): boolean {
  return COLLAPSE_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export function SidebarAutoCollapse() {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const autoCollapse = useUISettingsStore((s) => s.autoCollapseSidebar);
  const wasCollapsedByUs = useRef(false);

  useEffect(() => {
    if (!autoCollapse) {
      // If the setting was just turned off and we had collapsed it, restore
      if (wasCollapsedByUs.current) {
        setOpen(true);
        wasCollapsedByUs.current = false;
      }
      return;
    }

    if (shouldCollapse(pathname)) {
      setOpen(false);
      wasCollapsedByUs.current = true;
    } else if (wasCollapsedByUs.current) {
      setOpen(true);
      wasCollapsedByUs.current = false;
    }
  }, [pathname, autoCollapse, setOpen]);

  return null;
}
