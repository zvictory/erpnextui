"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FormPageLayoutProps {
  title: string;
  backHref: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function FormPageLayout({
  title,
  backHref,
  children,
  maxWidth = "max-w-5xl",
}: FormPageLayoutProps) {
  return (
    <div className={`mx-auto ${maxWidth} space-y-4`}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="sr-only">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
