"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAdminLogout } from "@/hooks/use-admin";
import { LogOut, Settings, Server, UserPlus } from "lucide-react";

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const logoutMutation = useAdminLogout();

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSuccess: () => router.replace("/admin/login"),
    });
  }

  const navItems = [
    { href: "/admin", label: "Tenants", icon: Server },
    { href: "/admin/registrations", label: "Registrations", icon: UserPlus },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/admin" className="font-semibold text-lg">
          Stable ERP Admin
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
