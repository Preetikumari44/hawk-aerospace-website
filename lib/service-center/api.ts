"use client";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://43.205.190.95:3000/api";

const TOKEN_KEY = "sc_token_v1";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  try { if (t) window.localStorage.setItem(TOKEN_KEY, t); else window.localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || `Request failed (${res.status})`);
  return (data as any)?.data ?? data;
}

export const scApi = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.message || "Login failed");
    const payload = (data as any)?.data ?? data;
    const role = payload?.user?.role;
    if (role !== "service_center_admin" && role !== "admin" && role !== "super_admin") throw new Error("Not authorized for service centre portal.");
    setToken(payload?.accessToken || payload?.token);
    try { window.localStorage.setItem("sc_user_v1", JSON.stringify(payload?.user)); } catch { /* ignore */ }
    return payload;
  },
  logout: () => { setToken(null); try { window.localStorage.removeItem("sc_user_v1"); } catch { /* ignore */ } },
  dashboard: () => req("/service-centre/dashboard"),
  tickets: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/service-centre/tickets${qs ? `?${qs}` : ""}`);
  },
  ticket: (id: string) => req(`/service-centre/tickets/${id}`),
  assign: (id: string, body: any) => req(`/service-centre/tickets/${id}/assign`, { method: "PATCH", body: JSON.stringify(body) }),
  toolkitReturn: (id: string, code: string) => req(`/service-centre/tickets/${id}/toolkit-return-verify`, { method: "POST", body: JSON.stringify({ code }) }),
  technicians: (city?: string) => req(`/service-centre/technicians${city ? `?city=${encodeURIComponent(city)}` : ""}`),
  centres: () => req("/service-centre/service-centres"),
  toolkits: (serviceCenterId?: string) => req(`/service-centre/toolkits${serviceCenterId ? `?serviceCenterId=${encodeURIComponent(serviceCenterId)}` : ""}`),
  purchaseToolkit: (body: any) => req("/service-centre/toolkits/purchase", { method: "POST", body: JSON.stringify(body) }),
  seed: () => req("/service-centre/service-centres/seed", { method: "POST" }),
};
