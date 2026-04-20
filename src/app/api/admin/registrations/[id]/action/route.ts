import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdminSession } from "@/lib/admin-auth-check";
import {
  readConfig,
  writeConfig,
  decryptPassword,
  generateReferralCode,
  type TenantConfig,
  type BillingInfo,
} from "@/lib/config-store";
import { registrationActionSchema } from "@/lib/schemas/admin-schemas";
import { getModulesForPlan, createTrialEndsAt } from "@/lib/billing/plans";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = registrationActionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { action, rejectReason } = result.data;
  const config = readConfig();
  const reg = config.registrations.find((r) => r.id === id);

  if (!reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Reject
  if (action === "reject") {
    reg.status = "rejected";
    reg.rejectReason = rejectReason;
    reg.updatedAt = now;
    writeConfig(config);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // Approve — only from pending or failed
  if (reg.status !== "pending" && reg.status !== "failed") {
    return NextResponse.json(
      { error: `Cannot approve registration with status "${reg.status}"` },
      { status: 400 },
    );
  }

  const { provisioningApiUrl, provisioningApiKey, provisioningApiSecret } = config.settings;

  if (!provisioningApiUrl) {
    return NextResponse.json(
      { error: "Provisioning API URL is not configured in settings" },
      { status: 400 },
    );
  }

  // Mark as provisioning
  reg.status = "provisioning";
  reg.provisioningError = undefined;
  reg.updatedAt = now;
  writeConfig(config);

  // Fire-and-forget: provision in background, return immediately.
  // The client polls registrations list to detect completion.
  const password = decryptPassword(reg.encryptedPassword);

  provisionInBackground({
    id,
    companyName: reg.companyName,
    email: reg.email,
    phone: reg.phone,
    country: reg.country,
    currency: reg.currency,
    password,
    provisioningApiUrl,
    provisioningApiKey: provisioningApiKey ?? "",
    provisioningApiSecret: provisioningApiSecret ?? "",
  });

  return NextResponse.json({ ok: true, status: "provisioning" });
}

interface ProvisionParams {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  country: string;
  currency: string;
  password: string;
  provisioningApiUrl: string;
  provisioningApiKey: string;
  provisioningApiSecret: string;
}

function provisionInBackground(params: ProvisionParams) {
  const {
    id,
    companyName,
    password,
    provisioningApiUrl,
    provisioningApiKey,
    provisioningApiSecret,
    ...siteInfo
  } = params;

  // Intentionally not awaited — runs after the response is sent
  void (async () => {
    try {
      const provisionResp = await fetch(provisioningApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${provisioningApiKey}:${provisioningApiSecret}`,
        },
        body: JSON.stringify({
          company_name: companyName,
          email: siteInfo.email,
          password,
          phone: siteInfo.phone,
          country: siteInfo.country,
          currency: siteInfo.currency,
        }),
        signal: AbortSignal.timeout(600_000),
      });

      if (!provisionResp.ok) {
        const errData = await provisionResp.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: string }).error || `Provisioning failed (${provisionResp.status})`,
        );
      }

      const provisionData = (await provisionResp.json()) as {
        site_url: string;
        api_key: string;
        site_name: string;
      };

      const now = new Date().toISOString();

      // Look up registration to get the selected plan
      const regForPlan = readConfig().registrations.find((r) => r.id === id);
      const plan = regForPlan?.plan ?? "starter";
      const billing: BillingInfo = {
        plan,
        status: "trial",
        trialEndsAt: createTrialEndsAt(),
      };

      const tenantId = provisionData.site_name || crypto.randomUUID();
      const tenant: TenantConfig = {
        id: tenantId,
        name: companyName,
        url: provisionData.site_url,
        apiKey: provisionData.api_key,
        enabled: true,
        enabledModuleGroups: getModulesForPlan(plan),
        billing,
        referralCode: generateReferralCode(tenantId),
        createdAt: now,
        updatedAt: now,
      };

      const freshConfig = readConfig();
      freshConfig.tenants.push(tenant);

      const freshReg = freshConfig.registrations.find((r) => r.id === id);
      if (freshReg) {
        freshReg.status = "active";
        freshReg.tenantId = tenant.id;
        freshReg.encryptedPassword = "";
        freshReg.updatedAt = now;
      }

      writeConfig(freshConfig);
      console.log(`[provisioning] ${companyName} (${id}) → active`);
    } catch (err) {
      const freshConfig = readConfig();
      const freshReg = freshConfig.registrations.find((r) => r.id === id);
      if (freshReg) {
        freshReg.status = "failed";
        freshReg.provisioningError =
          err instanceof Error ? err.message : "Unknown provisioning error";
        freshReg.updatedAt = new Date().toISOString();
      }
      writeConfig(freshConfig);
      console.error(`[provisioning] ${companyName} (${id}) → failed:`, err);
    }
  })();
}
