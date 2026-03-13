// Server-only module — reads/writes data/config.json with atomic writes + mtime cache

import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface TenantConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  enabledModuleGroups?: string[];
  createdAt: string;
  updatedAt: string;
}

export type RegistrationStatus =
  | "pending"
  | "approved"
  | "provisioning"
  | "active"
  | "rejected"
  | "failed";

export interface RegistrationRequest {
  id: string;
  companyName: string;
  email: string;
  encryptedPassword: string;
  phone: string;
  country: string;
  currency: string;
  status: RegistrationStatus;
  rejectReason?: string;
  provisioningError?: string;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSettings {
  appName: string;
  tenantCacheTtlMs: number;
  provisioningApiUrl?: string;
  provisioningApiKey?: string;
  provisioningApiSecret?: string;
}

export interface PlatformConfig {
  version: 1;
  superuser: {
    passwordHash: string;
  };
  tenants: TenantConfig[];
  registrations: RegistrationRequest[];
  settings: PlatformSettings;
}

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

const DEFAULT_SETTINGS: PlatformSettings = {
  appName: "Stable ERP",
  tenantCacheTtlMs: 300_000,
};

// Mtime-based cache to avoid redundant disk reads
let cached: { config: PlatformConfig; mtimeMs: number } | null = null;

function ensureDataDir() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_PATH);
}

export function isSetupComplete(): boolean {
  if (!configExists()) return false;
  const config = readConfig();
  return !!config.superuser.passwordHash;
}

export function readConfig(): PlatformConfig {
  if (!configExists()) {
    return {
      version: 1,
      superuser: { passwordHash: "" },
      tenants: [],
      registrations: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  try {
    const stat = fs.statSync(CONFIG_PATH);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.config;
    }

    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw) as PlatformConfig;
    // Backward compat: ensure registrations array exists
    if (!config.registrations) config.registrations = [];
    cached = { config, mtimeMs: stat.mtimeMs };
    return config;
  } catch {
    return {
      version: 1,
      superuser: { passwordHash: "" },
      tenants: [],
      registrations: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }
}

export function writeConfig(config: PlatformConfig): void {
  ensureDataDir();
  const data = JSON.stringify(config, null, 2);
  // Atomic write: write to temp file, then rename
  const tmpPath = CONFIG_PATH + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
  fs.writeFileSync(tmpPath, data, "utf-8");
  fs.renameSync(tmpPath, CONFIG_PATH);
  // Invalidate cache so next read picks up the new mtime
  cached = null;
}

// Convenience helpers

export function getTenants(): TenantConfig[] {
  return readConfig().tenants;
}

export function getTenant(id: string): TenantConfig | undefined {
  return readConfig().tenants.find((t) => t.id === id);
}

export function getSettings(): PlatformSettings {
  return readConfig().settings;
}

export function maskApiKey(key: string): string {
  if (key.length <= 6) return "***";
  return "***..." + key.slice(-3);
}

// Registration helpers

export function getRegistrations(): RegistrationRequest[] {
  return readConfig().registrations;
}

export function getRegistration(id: string): RegistrationRequest | undefined {
  return readConfig().registrations.find((r) => r.id === id);
}

// AES-256-GCM password encryption/decryption
// Uses REGISTRATION_SECRET env var, stores "iv:authTag:ciphertext" as hex

function deriveKey(): Buffer {
  const secret = process.env.REGISTRATION_SECRET;
  if (!secret) throw new Error("REGISTRATION_SECRET env var is not set");
  return crypto.scryptSync(secret, "stable-erp-salt", 32);
}

export function encryptPassword(password: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptPassword(encrypted: string): string {
  const key = deriveKey();
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}
