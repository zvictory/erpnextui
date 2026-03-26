import { type NextRequest } from "next/server";

interface CBUEntry {
  Ccy: string;
  Rate: string;
  Nominal: string;
  Date: string;
}

interface FrappeListResponse {
  data: Array<{ name: string; date: string; from_currency: string }>;
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

function generateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function fetchCBURates(date: string): Promise<Map<string, number> | null> {
  try {
    const resp = await fetch(`https://cbu.uz/uz/arkhiv-kursov-valyut/json/all/${date}/`);
    if (!resp.ok) return null;
    const entries: CBUEntry[] = await resp.json();
    if (!entries.length) return null;
    const rates = new Map<string, number>();
    for (const entry of entries) {
      const nominal = parseInt(entry.Nominal, 10) || 1;
      rates.set(entry.Ccy, parseFloat(entry.Rate) / nominal);
    }
    return rates;
  } catch {
    return null;
  }
}

// Process items with concurrency limit
async function parallel<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  async function next(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return results;
}

export async function POST(req: NextRequest) {
  const {
    siteUrl,
    currencies,
    fromDate,
    toDate,
    sid,
    csrfToken: bodyToken,
  } = (await req.json()) as {
    siteUrl: string;
    currencies: string[];
    fromDate: string;
    toDate: string;
    sid?: string;
    csrfToken?: string;
  };

  if (!siteUrl || !currencies?.length || !fromDate || !toDate) {
    return new Response(
      JSON.stringify({ error: "siteUrl, currencies, fromDate, and toDate are required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Accept auth from body (for curl) or headers (for browser)
  const cookie = sid ? `sid=${sid}` : req.headers.get("cookie") || "";
  const csrfToken = bodyToken || req.headers.get("x-frappe-csrf-token") || "";

  // Stream progress as newline-delimited JSON
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      // Step 1: Fetch existing records
      const existingSet = new Set<string>();
      try {
        const params = new URLSearchParams({
          filters: JSON.stringify([
            ["date", ">=", fromDate],
            ["date", "<=", toDate],
            ["to_currency", "=", "UZS"],
            ["from_currency", "in", currencies],
          ]),
          fields: JSON.stringify(["date", "from_currency"]),
          limit_page_length: "0",
        });
        const resp = await proxyFrappe(
          siteUrl,
          "GET",
          `api/resource/Currency Exchange?${params}`,
          undefined,
          cookie,
          csrfToken,
        );
        if (resp.ok) {
          const data = (await resp.json()) as FrappeListResponse;
          for (const rec of data.data) existingSet.add(`${rec.date}|${rec.from_currency}`);
          send({ status: "info", message: `Found ${existingSet.size} existing records to skip` });
        }
      } catch {
        send({
          status: "warn",
          message: "Could not check existing records, may get duplicate errors",
        });
      }

      const dates = generateDates(fromDate, toDate);
      send({
        status: "info",
        message: `Processing ${dates.length} days for ${currencies.join(", ")}`,
      });

      let totalSynced = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      let lastError = "";

      // Step 2: Process dates in batches of 5 (CBU fetches)
      const BATCH_SIZE = 5;
      for (let batchStart = 0; batchStart < dates.length; batchStart += BATCH_SIZE) {
        const dateBatch = dates.slice(batchStart, batchStart + BATCH_SIZE);

        // Fetch CBU rates for this batch of dates in parallel
        const rateResults = await Promise.all(dateBatch.map((d) => fetchCBURates(d)));

        // Collect all create tasks for this batch
        const createTasks: Array<{ date: string; currency: string; rate: number }> = [];

        for (let i = 0; i < dateBatch.length; i++) {
          const date = dateBatch[i];
          const rates = rateResults[i];
          if (!rates) {
            totalSkipped += currencies.length;
            continue;
          }
          for (const currency of currencies) {
            if (existingSet.has(`${date}|${currency}`)) {
              totalSkipped++;
              continue;
            }
            const rate = rates.get(currency);
            if (!rate) {
              totalSkipped++;
              continue;
            }
            createTasks.push({ date, currency, rate });
          }
        }

        // Write to ERPNext with concurrency of 5
        if (createTasks.length > 0) {
          await parallel(createTasks, 5, async (task) => {
            try {
              const resp = await proxyFrappe(
                siteUrl,
                "POST",
                "api/resource/Currency Exchange",
                {
                  date: task.date,
                  from_currency: task.currency,
                  to_currency: "UZS",
                  exchange_rate: task.rate,
                  for_buying: 1,
                  for_selling: 1,
                },
                cookie,
                csrfToken,
              );
              if (resp.ok) {
                totalSynced++;
              } else {
                const errText = await resp.text().catch(() => "");
                if (!lastError) lastError = `${resp.status}: ${errText.slice(0, 300)}`;
                totalErrors++;
              }
            } catch {
              totalErrors++;
            }
          });
        }

        send({
          status: "progress",
          processed: Math.min(batchStart + BATCH_SIZE, dates.length),
          total: dates.length,
          synced: totalSynced,
          skipped: totalSkipped,
          errors: totalErrors,
        });
      }

      send({
        status: "done",
        totalDays: dates.length,
        totalSynced,
        totalSkipped,
        totalErrors,
        lastError,
        fromDate,
        toDate,
        currencies,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
