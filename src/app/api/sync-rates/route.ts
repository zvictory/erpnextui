import { type NextRequest, NextResponse } from "next/server";

const CBU_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/";

interface CBUEntry {
  Ccy: string;
  Rate: string;
  Nominal: string;
  Date: string;
}

interface FrappeListResponse {
  data: Array<{ name: string }>;
}

async function proxyFrappe(
  siteUrl: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  cookie?: string,
  csrfToken?: string,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  if (csrfToken) headers["X-Frappe-CSRF-Token"] = csrfToken;
  if (body) headers["Content-Type"] = "application/json";

  return fetch(`${siteUrl}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const CBU_HISTORICAL_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/all/";

export async function POST(req: NextRequest) {
  const { siteUrl, currencies, date: requestedDate } = (await req.json()) as {
    siteUrl: string;
    currencies: string[];
    date?: string; // YYYY-MM-DD — if provided, fetch historical CBU rates for that date
  };

  if (!siteUrl || !currencies?.length) {
    return NextResponse.json({ error: "siteUrl and currencies required" }, { status: 400 });
  }

  // Forward auth from the browser
  const cookie = req.headers.get("cookie") || "";
  const csrfToken = req.headers.get("x-frappe-csrf-token") || "";

  // Use historical endpoint for past dates, current endpoint for today
  const today = new Date().toISOString().slice(0, 10);
  const useHistorical = requestedDate && requestedDate !== today;
  const fetchUrl = useHistorical ? `${CBU_HISTORICAL_URL}${requestedDate}/` : CBU_URL;

  // Fetch CBU rates
  let cbuEntries: CBUEntry[];
  try {
    const resp = await fetch(fetchUrl);
    if (!resp.ok) {
      return NextResponse.json({ error: "CBU API error" }, { status: 502 });
    }
    cbuEntries = await resp.json();
  } catch {
    return NextResponse.json({ error: "Failed to fetch CBU rates" }, { status: 502 });
  }

  // Build rate map: currency code -> rate per 1 unit
  // Use requestedDate as the record date (so exact-date ERPNext queries find it).
  // If CBU returns nothing (holiday/weekend), rateMap stays empty → all currencies skipped.
  const rateMap = new Map<string, number>();
  let cbuDate = requestedDate ?? "";
  for (const entry of cbuEntries) {
    const nominal = parseInt(entry.Nominal, 10) || 1;
    rateMap.set(entry.Ccy, Math.round((parseFloat(entry.Rate) / nominal) * 1e6) / 1e6);
    // Parse date from entry only when no requestedDate (today's sync)
    if (!requestedDate && !cbuDate && entry.Date) {
      const [d, m, y] = entry.Date.split(".");
      cbuDate = `${y}-${m}-${d}`;
    }
  }

  if (!cbuDate) {
    return NextResponse.json({ error: "Could not determine CBU date" }, { status: 502 });
  }

  const synced: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const currency of currencies) {
    const rate = rateMap.get(currency);
    if (!rate) {
      skipped.push(currency);
      continue;
    }

    try {
      // Check if record already exists for today
      const checkParams = new URLSearchParams({
        filters: JSON.stringify([
          ["date", "=", cbuDate],
          ["from_currency", "=", currency],
          ["to_currency", "=", "UZS"],
        ]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "1",
      });

      const checkResp = await proxyFrappe(
        siteUrl,
        "GET",
        `api/resource/Currency Exchange?${checkParams}`,
        undefined,
        cookie,
        csrfToken,
      );

      if (checkResp.ok) {
        const checkData = (await checkResp.json()) as FrappeListResponse;
        if (checkData.data.length > 0) {
          skipped.push(currency);
          continue;
        }
      }

      // Create Currency Exchange record
      const createResp = await proxyFrappe(
        siteUrl,
        "POST",
        "api/resource/Currency Exchange",
        {
          date: cbuDate,
          from_currency: currency,
          to_currency: "UZS",
          exchange_rate: rate,
          for_buying: 1,
          for_selling: 1,
        },
        cookie,
        csrfToken,
      );

      if (createResp.ok) {
        synced.push(currency);
      } else {
        const errBody = await createResp.text();
        errors.push(`${currency}: ${createResp.status} ${errBody.slice(0, 200)}`);
      }
    } catch (err) {
      errors.push(`${currency}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ synced, skipped, errors, date: cbuDate });
}
