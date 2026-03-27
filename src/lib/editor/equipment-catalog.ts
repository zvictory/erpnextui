import type { ParameterConfig } from "@/types/factory-twin";
import type { CatalogCategory, CatalogItem } from "@/types/editor";

// ── Reusable parameter builders ───────────────────────────────

const p = (key: string, label: string, unit: string, min: number, max: number, critical: number): ParameterConfig => ({
  key, label, unit, min, max, critical, source: "erpnext",
});

const temp = (min = -50, max = 100, critical = 110) => p("temperature", "Temperatura", "°C", min, max, critical);
const volume = (max = 5000) => p("volume", "Hajm", "litr", 0, max, max * 1.1);
const fill = () => p("fill_pct", "To'lganlik", "%", 0, 100, 95);
const rpm = (max = 3000) => p("rpm", "Aylanish", "ob/min", 0, max, max * 1.15);
const flow_lh = (max = 5000) => p("flow", "Oqim", "l/soat", 0, max, max * 1.1);
const flow_lm = (max = 200) => p("flow", "Oqim", "l/min", 0, max, max * 1.1);
const flow_kgh = (max = 500) => p("flow", "Oqim", "kg/soat", 0, max, max * 1.1);
const pressure_mpa = (max = 2) => p("pressure", "Bosim", "MPa", 0, max, max * 1.2);
const pressure_bar = (max = 10) => p("pressure", "Bosim", "bar", 0, max, max * 1.2);
const time_min = (max = 120) => p("time", "Vaqt", "min", 0, max, max * 1.1);
const time_h = (max = 24) => p("time", "Vaqt", "soat", 0, max, max * 1.1);
const speed_pcs = (max = 200) => p("speed", "Tezlik", "dona/min", 0, max, max * 1.2);
const speed_m = (max = 20) => p("speed", "Tezlik", "m/min", 0, max, max * 1.2);
const weight = (max = 200) => p("weight", "Og'irlik", "g", 0, max, max * 1.1);
const power = (max = 500) => p("power", "Quvvat", "kW", 0, max, max * 1.1);
const humidity = () => p("humidity", "Namlik", "%", 0, 100, 95);
const sensitivity = () => p("sensitivity", "Sezgirlik", "mm", 0.1, 5, 0.5);
const accuracy = () => p("accuracy", "Aniqlik", "%", 90, 100, 95);
const overrun = () => p("overrun", "Overrun", "%", 20, 150, 160);
const pallets = () => p("pallets", "Palletlar", "dona", 0, 500, 480);

// ── Full ice cream manufacturing catalog ──────────────────────

export const EQUIPMENT_CATALOG: CatalogCategory[] = [
  // ────────────────────────────────────────────────────────────
  // 1. Xom ashyo qabuli va saqlash
  // ────────────────────────────────────────────────────────────
  {
    category: "Xom ashyo qabuli",
    items: [
      {
        type: "tank", subtype: "reception_tank", idPrefix: "RT",
        label: "Qabul tanki", icon: "cylinder",
        defaultColor: "#4a9eff", defaultScale: 1,
        defaultParams: [volume(), temp(2, 10, 15), fill()],
      },
      {
        type: "tank", subtype: "storage_tank", idPrefix: "ST",
        label: "Saqlash tanki", icon: "cylinder",
        defaultColor: "#5fb0ff", defaultScale: 1.1,
        defaultParams: [volume(10000), temp(2, 8, 12), fill()],
      },
      {
        type: "tank", subtype: "sugar_silo", idPrefix: "SL",
        label: "Shakar silosu", icon: "cylinder",
        defaultColor: "#dfe6e9", defaultScale: 1.2,
        defaultParams: [p("weight", "Og'irlik", "kg", 0, 20000, 22000), fill()],
      },
      {
        type: "warehouse", subtype: "cold_storage", idPrefix: "CS",
        label: "Sovuq kamera", icon: "warehouse",
        defaultColor: "#74b9ff", defaultScale: 0.8,
        defaultParams: [temp(-5, 5, 8), humidity(), fill()],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 2. Aralashtirish (Mixing)
  // ────────────────────────────────────────────────────────────
  {
    category: "Aralashtirish",
    items: [
      {
        type: "tank", subtype: "mixing_tank", idPrefix: "MX",
        label: "Smes qozon", icon: "cylinder",
        defaultColor: "#4a9eff", defaultScale: 1,
        defaultParams: [temp(20, 85, 95), rpm(), volume(3000), time_min(60)],
      },
      {
        type: "tank", subtype: "mixing_tank_heated", idPrefix: "MX",
        label: "Issiq smes qozon", icon: "cylinder",
        defaultColor: "#e17055", defaultScale: 1,
        defaultParams: [temp(60, 80, 95), pressure_mpa(0.6), rpm()],
      },
      {
        type: "pump", subtype: "dosing_system", idPrefix: "DS",
        label: "Dozalash tizimi", icon: "gauge",
        defaultColor: "#00cec9", defaultScale: 0.6,
        defaultParams: [flow_kgh(), accuracy()],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 3. Termik ishlov
  // ────────────────────────────────────────────────────────────
  {
    category: "Termik ishlov",
    items: [
      {
        type: "line", subtype: "pasteurizer_plate", idPrefix: "PS",
        label: "Pasterizator (plastinkali)", icon: "thermometer",
        defaultColor: "#e17055", defaultScale: 0.9,
        defaultParams: [
          p("temp_in", "Kirish temp", "°C", 4, 10, 15),
          p("temp_out", "Chiqish temp", "°C", 72, 85, 90),
          flow_lh(5000),
          p("hold_time", "Ushlab turish", "sek", 15, 30, 35),
        ],
      },
      {
        type: "tank", subtype: "pasteurizer_batch", idPrefix: "PS",
        label: "Pasterizator (vannali)", icon: "thermometer",
        defaultColor: "#d63031", defaultScale: 0.9,
        defaultParams: [temp(60, 85, 95), volume(2000), time_min(30)],
      },
      {
        type: "line", subtype: "homogenizer", idPrefix: "HM",
        label: "Gomogenizator", icon: "zap",
        defaultColor: "#6c5ce7", defaultScale: 0.7,
        defaultParams: [pressure_mpa(20), flow_lh(5000), p("stages", "Bosqich", "", 1, 2, 2)],
      },
      {
        type: "line", subtype: "plate_cooler", idPrefix: "CL",
        label: "Sovutgich (plastinkali)", icon: "snowflake",
        defaultColor: "#0984e3", defaultScale: 0.7,
        defaultParams: [
          p("temp_in", "Kirish temp", "°C", 72, 85, 90),
          p("temp_out", "Chiqish temp", "°C", 2, 4, 6),
          flow_lh(5000),
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 4. Yetilish (Aging)
  // ────────────────────────────────────────────────────────────
  {
    category: "Yetilish",
    items: [
      {
        type: "tank", subtype: "aging_tank", idPrefix: "AG",
        label: "Yetilish tanki", icon: "clock",
        defaultColor: "#81ecec", defaultScale: 1.1,
        defaultParams: [temp(2, 4, 6), volume(5000), time_h(24), rpm(60)],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 5. Muzlatish (Freezing)
  // ────────────────────────────────────────────────────────────
  {
    category: "Muzlatish",
    items: [
      {
        type: "line", subtype: "continuous_freezer", idPrefix: "CF",
        label: "Continuous Freezer", icon: "snowflake",
        defaultColor: "#00b894", defaultScale: 1,
        defaultParams: [
          p("temp_in", "Kirish temp", "°C", 2, 4, 6),
          p("temp_out", "Chiqish temp", "°C", -7, -5, -3),
          flow_lh(3000),
          overrun(),
        ],
      },
      {
        type: "tank", subtype: "batch_freezer", idPrefix: "BF",
        label: "Batch Freezer", icon: "snowflake",
        defaultColor: "#55efc4", defaultScale: 0.8,
        defaultParams: [temp(-10, -5, 0), volume(200), time_min(30)],
      },
      {
        type: "pump", subtype: "fruit_feeder", idPrefix: "FD",
        label: "Meva dozatori", icon: "cherry",
        defaultColor: "#e84393", defaultScale: 0.5,
        defaultParams: [flow_kgh(200)],
      },
      {
        type: "pump", subtype: "ripple_pump", idPrefix: "RP",
        label: "Ripple pump (sos)", icon: "droplets",
        defaultColor: "#d63031", defaultScale: 0.5,
        defaultParams: [flow_lh(100), pressure_bar(5)],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 6. Shakllantirish (Forming & Filling)
  // ────────────────────────────────────────────────────────────
  {
    category: "Shakllantirish",
    items: [
      {
        type: "line", subtype: "extrusion_line", idPrefix: "EX",
        label: "Ekstruziya liniyasi", icon: "arrow-right",
        defaultColor: "#2ed573", defaultScale: 1,
        defaultParams: [speed_pcs(120), temp(-8, -5, -3)],
      },
      {
        type: "line", subtype: "filling_machine", idPrefix: "FL",
        label: "To'ldirish mashinasi", icon: "cup-soda",
        defaultColor: "#2ed573", defaultScale: 0.8,
        defaultParams: [speed_pcs(150), p("volume_ml", "Hajm", "ml", 50, 500, 550), accuracy()],
      },
      {
        type: "line", subtype: "cone_line", idPrefix: "CN",
        label: "Kulokli liniyasi", icon: "cone",
        defaultColor: "#ffeaa7", defaultScale: 1,
        defaultParams: [speed_pcs(100)],
      },
      {
        type: "line", subtype: "stick_bar_line", idPrefix: "SK",
        label: "Stikli liniyasi", icon: "popsicle",
        defaultColor: "#fdcb6e", defaultScale: 1,
        defaultParams: [speed_pcs(200), weight(80)],
      },
      {
        type: "line", subtype: "sandwich_line", idPrefix: "SB",
        label: "Sendvich liniyasi", icon: "sandwich",
        defaultColor: "#e17055", defaultScale: 1,
        defaultParams: [speed_pcs(80)],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 7. Qotirish (Hardening)
  // ────────────────────────────────────────────────────────────
  {
    category: "Qotirish",
    items: [
      {
        type: "line", subtype: "hardening_tunnel", idPrefix: "HT",
        label: "Hardening tunnel", icon: "wind",
        defaultColor: "#636e72", defaultScale: 1.2,
        defaultParams: [temp(-45, -35, -30), time_min(160), speed_m(5)],
      },
      {
        type: "warehouse", subtype: "blast_freezer", idPrefix: "HT",
        label: "Blast freezer", icon: "snowflake",
        defaultColor: "#2d3436", defaultScale: 0.9,
        defaultParams: [temp(-40, -35, -30), p("air_speed", "Havo tezligi", "m/s", 2, 8, 10)],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 8. Qadoqlash (Packaging)
  // ────────────────────────────────────────────────────────────
  {
    category: "Qadoqlash",
    items: [
      {
        type: "line", subtype: "packaging_machine", idPrefix: "PK",
        label: "Qadoqlash mashinasi", icon: "package",
        defaultColor: "#a55eea", defaultScale: 0.8,
        defaultParams: [speed_pcs(200)],
      },
      {
        type: "line", subtype: "box_packer", idPrefix: "BX",
        label: "Kartonga joylashtirish", icon: "box",
        defaultColor: "#a55eea", defaultScale: 0.7,
        defaultParams: [p("speed_box", "Tezlik", "quti/min", 0, 30, 35)],
      },
      {
        type: "line", subtype: "labeler", idPrefix: "LB",
        label: "Etiketlash", icon: "tag",
        defaultColor: "#a55eea", defaultScale: 0.5,
        defaultParams: [speed_pcs(300)],
      },
      {
        type: "line", subtype: "date_printer", idPrefix: "DT",
        label: "Sana bosish (Ink-jet)", icon: "printer",
        defaultColor: "#a55eea", defaultScale: 0.4,
        defaultParams: [speed_pcs(400)],
      },
      {
        type: "line", subtype: "metal_detector", idPrefix: "MW",
        label: "Metall detektor", icon: "scan",
        defaultColor: "#ff7675", defaultScale: 0.5,
        defaultParams: [sensitivity()],
      },
      {
        type: "line", subtype: "check_weigher", idPrefix: "WG",
        label: "Tortish nazorati", icon: "scale",
        defaultColor: "#ff7675", defaultScale: 0.5,
        defaultParams: [weight(), p("tolerance", "Toleransiya", "±g", 0.5, 5, 6)],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 9. Skladlar va jo'natish
  // ────────────────────────────────────────────────────────────
  {
    category: "Skladlar",
    items: [
      {
        type: "warehouse", subtype: "cold_warehouse", idPrefix: "WH",
        label: "Sovuq sklad (-25°C)", icon: "warehouse",
        defaultColor: "#778ca3", defaultScale: 1.4,
        defaultParams: [temp(-30, -25, -20), fill(), pallets()],
      },
      {
        type: "warehouse", subtype: "semi_warehouse", idPrefix: "WH",
        label: "Yarim tayyor sklad", icon: "warehouse",
        defaultColor: "#a4b0be", defaultScale: 0.9,
        defaultParams: [temp(-5, 4, 8), fill()],
      },
      {
        type: "warehouse", subtype: "raw_warehouse", idPrefix: "WH",
        label: "Xom ashyo sklad", icon: "warehouse",
        defaultColor: "#c49b66", defaultScale: 1.3,
        defaultParams: [temp(0, 10, 15), fill()],
      },
      {
        type: "warehouse", subtype: "mid_warehouse", idPrefix: "WH",
        label: "Oraliq sklad", icon: "warehouse",
        defaultColor: "#a4b0be", defaultScale: 0.7,
        defaultParams: [temp(-10, 0, 5)],
      },
      {
        type: "warehouse", subtype: "loading_dock", idPrefix: "DK",
        label: "Yuklash rampa", icon: "truck",
        defaultColor: "#636e72", defaultScale: 0.8,
        defaultParams: [],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 10. Yordamchi uskunalar
  // ────────────────────────────────────────────────────────────
  {
    category: "Yordamchi",
    items: [
      {
        type: "pump", subtype: "pump_centrifugal", idPrefix: "PM",
        label: "Nasos (markazdan qochma)", icon: "fan",
        defaultColor: "#ff9f43", defaultScale: 0.6,
        defaultParams: [flow_lm(), rpm(), pressure_bar(6)],
      },
      {
        type: "pump", subtype: "pump_peristaltic", idPrefix: "PM",
        label: "Nasos (peristaltik)", icon: "fan",
        defaultColor: "#ff9f43", defaultScale: 0.5,
        defaultParams: [flow_lm(50), rpm(600)],
      },
      {
        type: "pump", subtype: "auto_valve", idPrefix: "VL",
        label: "Klapan (avtomatik)", icon: "toggle-right",
        defaultColor: "#b2bec3", defaultScale: 0.3,
        defaultParams: [],
      },
      {
        type: "line", subtype: "heat_exchanger", idPrefix: "HX",
        label: "Issiqlik almashtirgich", icon: "thermometer",
        defaultColor: "#e17055", defaultScale: 0.6,
        defaultParams: [
          p("temp_in", "Kirish temp", "°C", 0, 85, 90),
          p("temp_out", "Chiqish temp", "°C", 0, 85, 90),
          flow_lh(5000),
        ],
      },
      {
        type: "compressor", subtype: "compressor", idPrefix: "CP",
        label: "Kompressor", icon: "gauge",
        defaultColor: "#636e72", defaultScale: 0.8,
        defaultParams: [pressure_mpa(2), temp(-40, 40, 50), power()],
      },
      {
        type: "tank", subtype: "steam_boiler", idPrefix: "BL",
        label: "Bug' qozoni", icon: "flame",
        defaultColor: "#d63031", defaultScale: 1,
        defaultParams: [pressure_bar(10), temp(100, 180, 200), p("water_level", "Suv sathi", "%", 0, 100, 95)],
      },
      {
        type: "line", subtype: "cip_system", idPrefix: "CIP",
        label: "CIP tizimi", icon: "droplets",
        defaultColor: "#00cec9", defaultScale: 0.8,
        defaultParams: [temp(40, 85, 95), time_min(60)],
      },
      {
        type: "generator", subtype: "generator", idPrefix: "GN",
        label: "Generator", icon: "zap",
        defaultColor: "#fdcb6e", defaultScale: 0.8,
        defaultParams: [power(), p("fuel", "Yoqilg'i", "%", 0, 100, 15)],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 11. Transport (Conveyor)
  // ────────────────────────────────────────────────────────────
  {
    category: "Transport",
    items: [
      {
        type: "line", subtype: "belt_conveyor", idPrefix: "CV",
        label: "Tasma konveyer", icon: "arrow-right",
        defaultColor: "#636e72", defaultScale: 1,
        defaultParams: [speed_m(), p("length", "Uzunlik", "m", 1, 30, 35)],
      },
      {
        type: "line", subtype: "roller_conveyor", idPrefix: "CV",
        label: "Rolikli konveyer", icon: "arrow-right",
        defaultColor: "#636e72", defaultScale: 0.9,
        defaultParams: [speed_m()],
      },
      {
        type: "line", subtype: "spiral_conveyor", idPrefix: "CV",
        label: "Spiral konveyer", icon: "arrow-up-circle",
        defaultColor: "#636e72", defaultScale: 1.2,
        defaultParams: [speed_m(10), p("height", "Balandlik", "m", 2, 12, 15)],
      },
      {
        type: "line", subtype: "sanitary_pipe", idPrefix: "PP",
        label: "Sanitarli quvur", icon: "git-branch",
        defaultColor: "#dfe6e9", defaultScale: 0.3,
        defaultParams: [p("diameter", "Diametr", "mm", 25, 100, 120)],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // 12. Sifat nazorati
  // ────────────────────────────────────────────────────────────
  {
    category: "Sifat nazorati",
    items: [
      {
        type: "line", subtype: "lab_bench", idPrefix: "QC",
        label: "Laboratoriya stoli", icon: "flask-conical",
        defaultColor: "#dfe6e9", defaultScale: 0.6,
        defaultParams: [],
      },
      {
        type: "pump", subtype: "temp_sensor", idPrefix: "QC",
        label: "Temperatura sensori", icon: "thermometer",
        defaultColor: "#e17055", defaultScale: 0.2,
        defaultParams: [temp(-50, 100, 110)],
      },
      {
        type: "pump", subtype: "pressure_sensor", idPrefix: "QC",
        label: "Bosim sensori", icon: "gauge",
        defaultColor: "#0984e3", defaultScale: 0.2,
        defaultParams: [pressure_mpa(5)],
      },
      {
        type: "pump", subtype: "flow_sensor", idPrefix: "QC",
        label: "Oqim sensori", icon: "activity",
        defaultColor: "#00b894", defaultScale: 0.2,
        defaultParams: [flow_lm(500)],
      },
    ],
  },
];

/** Lookup a CatalogItem by its subtype */
export function findCatalogItem(subtype: string): CatalogItem | undefined {
  for (const cat of EQUIPMENT_CATALOG) {
    const item = cat.items.find((i) => i.subtype === subtype);
    if (item) return item;
  }
  return undefined;
}
