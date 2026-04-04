const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getApiUrl() {
  return API_URL;
}

export function authHeaders(email: string | undefined | null): HeadersInit {
  if (!email) throw new Error("Sign in required.");
  return {
    "Content-Type": "application/json",
    "X-User-Email": email,
  };
}

export async function apiFetchJson<T>(
  path: string,
  email: string | undefined | null,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(email),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg =
      typeof err.detail === "string"
        ? err.detail
        : Array.isArray(err.detail)
          ? err.detail.map((d: { msg?: string }) => d.msg).join(", ")
          : JSON.stringify(err.detail ?? err);
    throw new Error(msg || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiFetchPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : res.statusText);
  }
  return res.json();
}

/** Normalize analytics payloads whether API returns camelCase or snake_case. */
export function normalizeAnalyticsSummary(raw: Record<string, unknown>) {
  return {
    totalComplaints: Number(raw.totalComplaints ?? raw.total_complaints ?? 0),
    resolvedCount: Number(raw.resolvedCount ?? raw.resolved_count ?? 0),
    resolutionRate: Number(raw.resolutionRate ?? raw.resolution_rate ?? 0),
    avgRiskScore: Number(raw.avgRiskScore ?? raw.avg_risk_score ?? 0),
    highRiskCount: Number(raw.highRiskCount ?? raw.high_risk_count ?? 0),
    complaintsByType: (raw.complaintsByType ?? raw.complaints_by_type ?? {}) as Record<string, number>,
    complaintsByStatus: (raw.complaintsByStatus ?? raw.complaints_by_status ?? {}) as Record<string, number>,
  };
}

export function normalizeTrends(raw: unknown[]): { periodLabel: string; count: number; avgScore: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      periodLabel: String(r.periodLabel ?? r.period_label ?? ""),
      count: Number(r.count ?? 0),
      avgScore: Number(r.avgScore ?? r.avg_score ?? 0),
    };
  });
}

export function normalizeTopBrands(raw: unknown[]) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      brandName: String(r.brandName ?? r.brand_name ?? ""),
      count: Number(r.count ?? 0),
      avgScore: Number(r.avgScore ?? r.avg_score ?? 0),
      resolvedCount: Number(r.resolvedCount ?? r.resolved_count ?? 0),
    };
  });
}

export function normalizeMlHealth(raw: Record<string, unknown>) {
  return {
    modelLoaded: Boolean(raw.modelLoaded ?? raw.model_loaded),
    datasetRows: Number(raw.datasetRows ?? raw.dataset_rows ?? 0),
    featureColumns: (raw.featureColumns ?? raw.feature_columns ?? []) as string[],
  };
}
