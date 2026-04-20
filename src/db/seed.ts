import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// ─── Database connection ─────────────────────────────────────────────
const dbPath = path.join(process.cwd(), "oee-dashboard.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

// ─── Load seed data ──────────────────────────────────────────────────
const seedDataPath = path.join(process.cwd(), "seed-data.json");
const seedData = JSON.parse(fs.readFileSync(seedDataPath, "utf-8"));

// ─── Category assignment for stop codes ──────────────────────────────
function categorizeStopCode(code: string, nameUz: string): string | null {
  const lower = nameUz.toLowerCase();

  // Freezer-related
  if (
    lower.includes("frezer") ||
    lower.includes("muzla") ||
    lower.includes("sovut") ||
    lower.includes("marazelnik") ||
    lower.includes("gradus")
  ) {
    return "freezer";
  }

  // Packaging-related
  if (
    lower.includes("upakovka") ||
    lower.includes("etiket") ||
    lower.includes("pichoq") ||
    lower.includes("dazmol") ||
    lower.includes("qadoqlash")
  ) {
    return "packaging";
  }

  // Electrical / power
  if (
    lower.includes("elektr") ||
    lower.includes("motor") ||
    lower.includes("kompressor") ||
    lower.includes("sensor") ||
    lower.includes("panel") ||
    lower.includes("kuyish")
  ) {
    return "electrical";
  }

  // Supply / material issues
  if (
    lower.includes("yoqligi") ||
    lower.includes("yetishmovchiligi") ||
    lower.includes("suv") ||
    lower.includes("havo") ||
    lower.includes("smes") ||
    lower.includes("kalsiy") ||
    lower.includes("sut")
  ) {
    return "supply";
  }

  // Skara (tunnel freezer)
  if (lower.includes("skara")) {
    return "freezer";
  }

  // Mechanical / general
  if (
    lower.includes("nasos") ||
    lower.includes("val") ||
    lower.includes("remen") ||
    lower.includes("podshipnik") ||
    lower.includes("shilang") ||
    lower.includes("spiral") ||
    lower.includes("sep") ||
    lower.includes("vakuum") ||
    lower.includes("vanna")
  ) {
    return "mechanical";
  }

  // Rojok (cone) specific
  if (lower.includes("rojok") || lower.includes("dazator")) {
    return "mechanical";
  }

  // Other equipment
  if (
    lower.includes("cho'pak") ||
    lower.includes("malatok") ||
    lower.includes("robot") ||
    lower.includes("shokolad") ||
    lower.includes("tent") ||
    lower.includes("anjan")
  ) {
    return "other";
  }

  return null;
}

// ─── Seed function ───────────────────────────────────────────────────
async function seed() {
  console.log("Seeding database...\n");

  // Clear tables in reverse dependency order
  console.log("Clearing existing data...");
  db.delete(schema.productionRuns).run();
  db.delete(schema.downtimeEvents).run();
  db.delete(schema.energyLogs).run();
  db.delete(schema.stopCodes).run();
  db.delete(schema.products).run();
  db.delete(schema.productionLines).run();
  db.delete(schema.settings).run();
  console.log("  Done.\n");

  // ── 1. Production Lines ──────────────────────────────────────────
  const lines = [
    { name: "Bo'lim №1", description: "Ice cream sticks line 1", sortOrder: 1 },
    { name: "Bo'lim №2", description: "Ice cream sticks line 2", sortOrder: 2 },
    { name: "Bo'lim №3", description: "Ice cream sticks line 3", sortOrder: 3 },
    { name: "Bo'lim №5", description: "Ice cream sticks line 5", sortOrder: 4 },
    { name: "Rajok liniya", description: "Cone ice cream line", sortOrder: 5 },
    { name: "Anjan liniya", description: "Anjan bulk ice cream line", sortOrder: 6 },
  ];

  console.log("Seeding production lines...");
  for (const line of lines) {
    db.insert(schema.productionLines).values(line).run();
  }
  console.log(`  Inserted ${lines.length} production lines.\n`);

  // ── 2. Products ──────────────────────────────────────────────────
  console.log("Seeding products...");
  const productsData = seedData.products as Array<{
    code: string;
    name: string;
    unit: string;
    nominal_speed: number;
    weight_kg: number;
    pieces_per_box: number;
  }>;

  for (const p of productsData) {
    db.insert(schema.products)
      .values({
        code: p.code,
        name: p.name,
        unit: p.unit || null,
        nominalSpeed: p.nominal_speed,
        weightKg: p.weight_kg || null,
        piecesPerBox: p.pieces_per_box || null,
      })
      .run();
  }
  console.log(`  Inserted ${productsData.length} products.\n`);

  // ── 3. Stop Codes ────────────────────────────────────────────────
  console.log("Seeding stop codes...");
  const rstCodes = seedData.rstCodes as Array<{
    code: string;
    name_uz: string;
  }>;

  for (const rst of rstCodes) {
    const category = categorizeStopCode(rst.code, rst.name_uz);
    db.insert(schema.stopCodes)
      .values({
        code: rst.code,
        nameUz: rst.name_uz,
        category,
      })
      .run();
  }
  console.log(`  Inserted ${rstCodes.length} stop codes.\n`);

  // ── 4. Settings ──────────────────────────────────────────────────
  console.log("Seeding settings...");
  const settingsData = [
    { key: "electricity_per_kg", value: "0.46" },
    { key: "gas_per_kg", value: "0.021" },
    { key: "electricity_price", value: "1000" },
    { key: "gas_price", value: "900" },
  ];

  for (const s of settingsData) {
    db.insert(schema.settings).values(s).run();
  }
  console.log(`  Inserted ${settingsData.length} settings.\n`);

  // ── 5b. Energy Logs ─────────────────────────────────────────────
  console.log("Seeding energy logs...");
  const energyData = seedData.energyLogs as Array<{
    date: string;
    electricity_kwh: number;
    gas_m3: number;
  }>;

  for (const e of energyData) {
    db.insert(schema.energyLogs)
      .values({
        date: e.date,
        electricityKwh: e.electricity_kwh,
        gasM3: e.gas_m3,
      })
      .run();
  }
  console.log(`  Inserted ${energyData.length} energy logs.\n`);

  // ── 5. Production Runs ───────────────────────────────────────────
  console.log("Seeding production runs...");

  // Build lookup maps for line names -> id and product codes -> id
  const allLines = db.select().from(schema.productionLines).all();
  const lineMap = new Map(allLines.map((l) => [l.name, l.id]));

  const allProducts = db.select().from(schema.products).all();
  const productMap = new Map(allProducts.map((p) => [p.code, p.id]));

  const runsData = seedData.runs as Array<{
    date: string;
    line: string;
    product_code: string;
    actual_output: number;
    total_hours: number;
    planned_stop_hours: number;
  }>;

  let insertedRuns = 0;
  let skippedRuns = 0;

  for (const run of runsData) {
    const lineId = lineMap.get(run.line);
    const productId = productMap.get(run.product_code);

    if (!lineId) {
      console.warn(`  WARNING: Line not found: "${run.line}" — skipping run.`);
      skippedRuns++;
      continue;
    }
    if (!productId) {
      console.warn(`  WARNING: Product not found: "${run.product_code}" — skipping run.`);
      skippedRuns++;
      continue;
    }

    db.insert(schema.productionRuns)
      .values({
        date: run.date,
        lineId,
        productId,
        actualOutput: run.actual_output,
        totalHours: run.total_hours,
        plannedStopHours: run.planned_stop_hours,
      })
      .run();
    insertedRuns++;
  }

  console.log(`  Inserted ${insertedRuns} production runs.`);
  if (skippedRuns > 0) {
    console.log(`  Skipped ${skippedRuns} runs due to missing references.`);
  }
  console.log();

  // ── Summary ──────────────────────────────────────────────────────
  console.log("=== Seed Summary ===");
  const counts = {
    production_lines: db.select().from(schema.productionLines).all().length,
    products: db.select().from(schema.products).all().length,
    stop_codes: db.select().from(schema.stopCodes).all().length,
    settings: db.select().from(schema.settings).all().length,
    production_runs: db.select().from(schema.productionRuns).all().length,
    downtime_events: db.select().from(schema.downtimeEvents).all().length,
    energy_logs: db.select().from(schema.energyLogs).all().length,
  };

  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count} rows`);
  }

  console.log("\nSeed completed successfully!");
  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  sqlite.close();
  process.exit(1);
});
