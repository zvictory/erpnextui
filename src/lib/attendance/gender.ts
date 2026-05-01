export type Gender = "m" | "f";

const FEMALE_SUFFIXES = [
  "oy",
  "gul",
  "bonu",
  "noz",
  "nor",
  "xon",
  "iya",
  "iyya",
  "niso",
  "xola",
  "bibi",
];

const FEMALE_NAMES = new Set([
  "feruza",
  "shaxnoza",
  "nodira",
  "munira",
  "zarina",
  "kamola",
  "marjona",
  "mavluda",
  "saodat",
  "umida",
  "rayhona",
  "rayhon",
  "muhabbat",
  "shahzoda",
  "iroda",
  "sevara",
  "diyora",
  "barno",
  "lola",
  "malika",
  "munisa",
  "gulnora",
  "gulchehra",
  "gulbahor",
  "aziza",
  "mohira",
  "manzura",
  "matluba",
  "muyassar",
  "nargiza",
  "nilufar",
  "yulduz",
  "shoira",
  "shahnoza",
  "zulfiya",
  "ozoda",
  "dilbar",
  "dilrabo",
  "dilnoza",
  "dilfuza",
  "rano",
  "robiya",
  "ruxshona",
  "sayyora",
  "sitora",
  "saida",
  "shahlo",
  "shokira",
  "tursunoy",
  "xolida",
  "zuhra",
  "zebo",
]);

const MALE_SUFFIXES = ["boy", "bek", "bay", "jon", "ulla", "illa"];

export function inferGender(fullName: string): Gender {
  if (!fullName) return "m";
  const first = fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!first) return "m";
  if (FEMALE_NAMES.has(first)) return "f";
  for (const suf of MALE_SUFFIXES) {
    if (first.endsWith(suf)) return "m";
  }
  for (const suf of FEMALE_SUFFIXES) {
    if (first.endsWith(suf)) return "f";
  }
  if (first.endsWith("a")) return "f";
  return "m";
}
