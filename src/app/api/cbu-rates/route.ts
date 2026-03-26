import { NextResponse } from "next/server";

interface CBUEntry {
  Ccy: string;
  Rate: string;
  Nominal: string;
  Date: string;
}

interface CachedRates {
  rates: Record<string, number>;
  date: string;
  fetchedAt: number;
}

let cache: CachedRates | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ rates: cache.rates, date: cache.date });
  }

  try {
    const resp = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/", {
      next: { revalidate: 3600 },
    });

    if (!resp.ok) {
      if (cache) {
        return NextResponse.json({ rates: cache.rates, date: cache.date });
      }
      return NextResponse.json(
        { rates: {}, error: "CBU API returned " + resp.status },
        { status: 502 },
      );
    }

    const entries: CBUEntry[] = await resp.json();
    const rates: Record<string, number> = {};
    let date = "";

    for (const entry of entries) {
      const nominal = parseInt(entry.Nominal, 10) || 1;
      rates[entry.Ccy] = parseFloat(entry.Rate) / nominal;
      if (!date && entry.Date) {
        // CBU date is "DD.MM.YYYY" — convert to "YYYY-MM-DD"
        const [d, m, y] = entry.Date.split(".");
        date = `${y}-${m}-${d}`;
      }
    }

    cache = { rates, date, fetchedAt: Date.now() };
    return NextResponse.json({ rates, date });
  } catch (err) {
    if (cache) {
      return NextResponse.json({ rates: cache.rates, date: cache.date });
    }
    return NextResponse.json(
      { rates: {}, error: err instanceof Error ? err.message : "Failed to fetch CBU rates" },
      { status: 502 },
    );
  }
}
