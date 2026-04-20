import { useAuthStore } from "@/stores/auth-store";
import {
  FrappeAPIError,
  type FrappeCallResponse,
  type FrappeDocResponse,
  type FrappeListResponse,
} from "./frappe-types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

async function parseErrorResponse(resp: Response): Promise<FrappeAPIError> {
  const body = await resp.text();
  let message = body;
  let excType: string | undefined;
  let serverMessages: string[] | undefined;

  try {
    const json = JSON.parse(body);
    excType = json.exc_type;

    // Parse _server_messages first — these are the clean, user-facing messages
    if (json._server_messages) {
      try {
        const msgs = JSON.parse(json._server_messages);
        serverMessages = Array.isArray(msgs)
          ? msgs.map((m: string) => {
              try {
                return stripHtml(JSON.parse(m).message || m);
              } catch {
                return stripHtml(m);
              }
            })
          : [stripHtml(msgs)];
      } catch {
        serverMessages = [stripHtml(json._server_messages)];
      }
    }

    // Prefer server_messages over raw exception/traceback
    if (serverMessages?.length) {
      message = serverMessages[0];
    } else if (json.message) {
      message = stripHtml(json.message);
    } else {
      message = excType || "An error occurred";
    }
  } catch {
    // body wasn't JSON
  }

  return new FrappeAPIError(message, resp.status, excType, serverMessages);
}

/** Fetch a fresh CSRF token by loading the Frappe app shell and parsing it out. */
export async function fetchCsrfToken(): Promise<void> {
  const { siteUrl } = useAuthStore.getState();
  if (!siteUrl) return;
  try {
    const resp = await fetch("/api/proxy/app", {
      credentials: "include",
      headers: { "X-Frappe-Site": siteUrl },
    });
    if (!resp.ok) return;
    const html = await resp.text();
    const m = html.match(/csrf_token\s*=\s*"([a-f0-9]+)"/);
    if (m?.[1]) useAuthStore.getState().setCsrfToken(m[1]);
  } catch {
    // silently degrade
  }
}

export async function frappeCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const hasBody = !!options?.body;
  const { siteUrl, csrfToken } = useAuthStore.getState();

  // Route through the local Next.js proxy so CORS is never an issue.
  // The proxy reads X-Frappe-Site to know which Frappe server to call.
  const fullEndpoint = endpoint.startsWith("/") ? `/api/proxy${endpoint}` : endpoint;

  function buildHeaders(token: string | null): Record<string, string> {
    const h: Record<string, string> = {};
    if (hasBody) h["Content-Type"] = "application/json";
    if (token) h["X-Frappe-CSRF-Token"] = token;
    if (siteUrl) h["X-Frappe-Site"] = siteUrl;
    return h;
  }

  const resp = await fetch(fullEndpoint, {
    credentials: "include",
    ...options,
    headers: { ...buildHeaders(csrfToken), ...options?.headers },
  });

  // On CSRF error (Frappe returns 400, not 403), refresh the token and retry once.
  if (resp.status === 400 || resp.status === 403) {
    const bodyText = await resp.text();
    if (bodyText.includes("CSRFTokenError")) {
      await fetchCsrfToken();
      const { csrfToken: newToken } = useAuthStore.getState();
      const retry = await fetch(fullEndpoint, {
        credentials: "include",
        ...options,
        headers: { ...buildHeaders(newToken), ...options?.headers },
      });
      if (!retry.ok) throw await parseErrorResponse(retry);
      return retry.json();
    }
    // Re-parse the already-consumed body as an error
    throw new FrappeAPIError(bodyText, resp.status);
  }

  if (!resp.ok) {
    // ERPNext returns 417 for informational messages (e.g., "Item Price added")
    // when the document IS actually saved. Check if response has valid data.
    if (resp.status === 417) {
      const bodyText = await resp.text();
      try {
        const body = JSON.parse(bodyText);
        if (body.data || body.message) return body;
      } catch {
        // Not valid JSON — fall through to error
      }
      throw new FrappeAPIError(bodyText, resp.status);
    }
    throw await parseErrorResponse(resp);
  }

  return resp.json();
}

interface GetListOptions {
  filters?: unknown[];
  orFilters?: unknown[];
  fields?: (string | Record<string, string>)[];
  orderBy?: string;
  groupBy?: string;
  limitPageLength?: number;
  limitStart?: number;
}

export const frappe = {
  async getList<T>(doctype: string, options?: GetListOptions): Promise<T[]> {
    const params = new URLSearchParams();
    if (options?.filters) {
      params.set("filters", JSON.stringify(options.filters));
    }
    if (options?.orFilters) {
      params.set("or_filters", JSON.stringify(options.orFilters));
    }
    if (options?.fields) {
      params.set("fields", JSON.stringify(options.fields));
    }
    if (options?.orderBy) {
      params.set("order_by", options.orderBy);
    }
    if (options?.groupBy) {
      params.set("group_by", options.groupBy);
    }
    params.set("limit_page_length", String(options?.limitPageLength ?? 100));
    if (options?.limitStart) {
      params.set("limit_start", String(options.limitStart));
    }

    const result = await frappeCall<FrappeListResponse<T>>(
      `/api/resource/${encodeURIComponent(doctype)}?${params}`,
    );
    return result.data;
  },

  async getDoc<T>(doctype: string, name: string): Promise<T> {
    const result = await frappeCall<FrappeDocResponse<T>>(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    );
    return result.data;
  },

  async createDoc<T>(doctype: string, data: Record<string, unknown>): Promise<T> {
    const result = await frappeCall<FrappeDocResponse<T>>(
      `/api/resource/${encodeURIComponent(doctype)}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    return result.data;
  },

  async deleteDoc(doctype: string, name: string): Promise<void> {
    await frappeCall(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  },

  async updateDoc<T>(doctype: string, name: string, data: Record<string, unknown>): Promise<T> {
    const result = await frappeCall<FrappeDocResponse<T>>(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { method: "PUT", body: JSON.stringify(data) },
    );
    return result.data;
  },

  async call<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const result = await frappeCall<FrappeCallResponse<T>>(
      `/api/method/${method}`,
      body ? { method: "POST", body: JSON.stringify(body) } : undefined,
    );
    return result.message;
  },

  async save<T>(doc: Record<string, unknown>): Promise<T> {
    const result = await frappeCall<FrappeCallResponse<T>>("/api/method/frappe.client.save", {
      method: "POST",
      body: JSON.stringify({ doc: JSON.stringify(doc) }),
    });
    return result.message;
  },

  async submit<T>(doc: Record<string, unknown>): Promise<T> {
    const result = await frappeCall<FrappeCallResponse<T>>("/api/method/frappe.client.submit", {
      method: "POST",
      body: JSON.stringify({ doc: JSON.stringify(doc) }),
    });
    return result.message;
  },

  async submitWithRetry<T>(doctype: string, name: string, maxRetries = 2): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const fullDoc = await this.getDoc<T>(doctype, name);
      try {
        return await this.submit<T>(fullDoc as unknown as Record<string, unknown>);
      } catch (error) {
        const isTimestampMismatch =
          error instanceof FrappeAPIError && error.excType === "TimestampMismatchError";
        if (isTimestampMismatch && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 150));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Unreachable");
  },

  async getCount(doctype: string, filters?: unknown[]): Promise<number> {
    return frappe.call<number>("frappe.client.get_count", {
      doctype,
      ...(filters?.length ? { filters } : {}),
    });
  },

  async cancel(doctype: string, name: string): Promise<void> {
    try {
      await frappeCall("/api/method/frappe.client.cancel", {
        method: "POST",
        body: JSON.stringify({ doctype, name }),
      });
    } catch {
      // Fallback to run_doc_method
      await frappeCall("/api/method/run_doc_method", {
        method: "POST",
        body: JSON.stringify({ dt: doctype, dn: name, method: "cancel" }),
      });
    }
  },
};
