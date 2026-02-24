import { useAuthStore } from "@/stores/auth-store";
import {
  FrappeAPIError,
  type FrappeCallResponse,
  type FrappeDocResponse,
  type FrappeListResponse,
} from "./frappe-types";

function getAuthHeaders(hasBody: boolean): Record<string, string> {
  const { apiKey, apiSecret, csrfToken } = useAuthStore.getState();
  const headers: Record<string, string> = {};

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (apiKey && apiSecret) {
    headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
  }

  if (csrfToken) {
    headers["X-Frappe-CSRF-Token"] = csrfToken;
  }

  return headers;
}

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

export async function frappeCall<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const hasBody = !!options?.body;
  const resp = await fetch(endpoint, {
    credentials: "include",
    ...options,
    headers: {
      ...getAuthHeaders(hasBody),
      ...options?.headers,
    },
  });

  if (!resp.ok) {
    throw await parseErrorResponse(resp);
  }

  return resp.json();
}

interface GetListOptions {
  filters?: unknown[];
  fields?: string[];
  orderBy?: string;
  limitPageLength?: number;
}

export const frappe = {
  async getList<T>(
    doctype: string,
    options?: GetListOptions,
  ): Promise<T[]> {
    const params = new URLSearchParams();
    if (options?.filters) {
      params.set("filters", JSON.stringify(options.filters));
    }
    if (options?.fields) {
      params.set("fields", JSON.stringify(options.fields));
    }
    if (options?.orderBy) {
      params.set("order_by", options.orderBy);
    }
    params.set(
      "limit_page_length",
      String(options?.limitPageLength ?? 0),
    );

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
    await frappeCall(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
  },

  async call<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const result = await frappeCall<FrappeCallResponse<T>>(
      `/api/method/${method}`,
      body
        ? { method: "POST", body: JSON.stringify(body) }
        : undefined,
    );
    return result.message;
  },

  async save<T>(doc: Record<string, unknown>): Promise<T> {
    const result = await frappeCall<FrappeCallResponse<T>>(
      "/api/method/frappe.client.save",
      {
        method: "POST",
        body: JSON.stringify({ doc: JSON.stringify(doc) }),
      },
    );
    return result.message;
  },

  async submit<T>(doc: Record<string, unknown>): Promise<T> {
    const result = await frappeCall<FrappeCallResponse<T>>(
      "/api/method/frappe.client.submit",
      {
        method: "POST",
        body: JSON.stringify({ doc: JSON.stringify(doc) }),
      },
    );
    return result.message;
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
