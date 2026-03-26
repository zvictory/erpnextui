"use client";

import { use } from "react";
import { TenantForm } from "@/components/admin/tenant-form";

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TenantForm tenantId={id} />;
}
