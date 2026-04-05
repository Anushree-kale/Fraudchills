// lib/api.ts  — typed fetch layer for Fraudchills backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://fraudchills.onrender.com";

/** Browser calls go through same-origin BFF to avoid CORS and to attach session safely. */
function resolveApiBase(): string {
  if (typeof window !== "undefined") return "/api/bff";
  return API_URL;
}

export function getApiUrl() {
  return API_URL;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export function authHeaders(email: string | undefined | null): HeadersInit {
  if (!email) throw new Error("Sign in required.");
  return {
    "Content-Type": "application/json",
    "X-User-Email": email,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
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

/** Headers for authenticated BFF calls from the browser (never call the public API URL from the client). */
function bffJsonHeaders(email: string, init?: RequestInit): Headers {
  const h = new Headers(init?.headers ?? undefined);
  h.set("Content-Type", "application/json");
  h.set("X-User-Email", email);
  return h;
}

export async function apiFetchJson<T>(
  path: string,
  email: string | undefined | null,
  init?: RequestInit
): Promise<T> {
  if (typeof window !== "undefined") {
    if (!email) throw new Error("Sign in required.");
    const res = await fetch(`${resolveApiBase()}${path}`, {
      ...init,
      credentials: "include",
      headers: bffJsonHeaders(email, init),
    });
    return handleResponse<T>(res);
  }
  if (!email) throw new Error("Sign in required.");
  const serverHeaders = new Headers(init?.headers ?? undefined);
  serverHeaders.set("Content-Type", "application/json");
  serverHeaders.set("X-User-Email", email);
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: serverHeaders,
  });
  return handleResponse<T>(res);
}

export async function apiFetchPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    ...init,
    credentials: typeof window !== "undefined" ? "include" : init?.credentials,
  });
  return handleResponse<T>(res);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Complaint {
  id: string;
  caseNumber: string;
  type: string;
  details: string;
  platform?: string;
  orderId?: string;
  amount: number;
  brandName: string;
  proofUrls: string[];
  externalLinks: string[];
  imageUrl?: string;
  status: string;
  score: number;
  deadline?: string;
  userId: string;
  upvotesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintCreate {
  type: string;
  details: string;
  platform?: string;
  orderId?: string;
  amount: number;
  brandName: string;
  proofUrls?: string[];
  externalLinks?: string[];
  imageUrl?: string;
}

export interface ComplaintEvent {
  id: string;
  complaintId: string;
  eventType: string;
  note?: string;
  createdAt: string;
}

export interface ComplaintSLA {
  complaintId: string;
  createdAt: string;
  deadline?: string;
  now: string;
  totalHoursOpen: number;
  hoursRemaining?: number;
  breached: boolean;
  progressPct: number;
}

export interface BrandSummary {
  brandName: string;
  totalComplaints: number;
  avgRiskScore: number;
  riskLabel: string;
}

export interface BrandProfile extends BrandSummary {
  resolvedComplaints: number;
  resolutionRate: number;
  fraudTypeBreakdown: Record<string, number>;
  recentComplaints: Complaint[];
  isVerified: boolean;
  resolutionScore: number;
  unverifiedWarning: boolean;
}

export interface AnalyticsSummary {
  totalComplaints: number;
  resolvedCount: number;
  resolutionRate: number;
  avgRiskScore: number;
  highRiskCount: number;
  complaintsByType: Record<string, number>;
  complaintsByStatus: Record<string, number>;
}

export interface TrendData {
  periodLabel: string;
  count: number;
  avgScore: number;
}

export interface TopBrand {
  brandName: string;
  count: number;
  avgScore: number;
  resolvedCount: number;
}

export interface FraudCategory {
  type: string;
  percentage: number;
}

export interface MlHealth {
  modelLoaded: boolean;
  datasetRows: number;
  featureColumns: string[];
}

export interface FraudPredictResult {
  riskScore: number;
  flagged: boolean;
  reason: string;
}

export interface ActiveCase {
  caseId: string;
  /** UUID for API routes (/complaints/:id, timeline, etc.) */
  complaintId: string;
  title: string;
  amount: number;
  status: string;
}

export interface ActiveCasesPage {
  items: ActiveCase[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardSummary {
  activeCases: number;
  resolvedCases: number;
  amountAtRisk: number;
  riskScore: number;
}

// ── Normalizers (snake_case ↔ camelCase safety) ───────────────────────────────

export function normalizeAnalyticsSummary(raw: Record<string, unknown>): AnalyticsSummary {
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

export function normalizeTrends(raw: unknown[]): TrendData[] {
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

export function normalizeTopBrands(raw: unknown[]): TopBrand[] {
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

export function normalizeMlHealth(raw: Record<string, unknown>): MlHealth {
  return {
    modelLoaded: Boolean(raw.modelLoaded ?? raw.model_loaded),
    datasetRows: Number(raw.datasetRows ?? raw.dataset_rows ?? 0),
    featureColumns: (raw.featureColumns ?? raw.feature_columns ?? []) as string[],
  };
}

export function normalizeFraudPredict(raw: Record<string, unknown>): FraudPredictResult {
  return {
    riskScore: Number(raw.riskScore ?? raw.risk_score ?? 0),
    flagged: Boolean(raw.flagged),
    reason: String(raw.reason ?? ""),
  };
}

// ── Complaints API ────────────────────────────────────────────────────────────

export interface ComplaintsFilter {
  q?: string;
  brand?: string;
  type?: string;
  status?: string;
  risk?: string;
  skip?: number;
  limit?: number;
}

export async function fetchComplaints(filters: ComplaintsFilter = {}): Promise<Complaint[]> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.risk) params.set("risk", filters.risk);
  if (filters.skip != null) params.set("skip", String(filters.skip));
  if (filters.limit != null) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return apiFetchPublic<Complaint[]>(`/complaints${qs ? `?${qs}` : ""}`);
}

export async function fetchTrendingComplaints(): Promise<Complaint[]> {
  return apiFetchPublic<Complaint[]>("/complaints/trending");
}

export async function fetchComplaint(id: string): Promise<Complaint> {
  return apiFetchPublic<Complaint>(`/complaints/${id}`);
}

export async function fetchComplaintTimeline(id: string): Promise<ComplaintEvent[]> {
  return apiFetchPublic<ComplaintEvent[]>(`/complaints/${id}/timeline`);
}

export async function fetchComplaintSLA(id: string): Promise<ComplaintSLA> {
  return apiFetchPublic<ComplaintSLA>(`/complaints/${id}/sla`);
}

export async function createComplaint(
  payload: ComplaintCreate,
  email: string
): Promise<Complaint> {
  return apiFetchJson<Complaint>("/complaints", email, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function upvoteComplaint(id: string, email: string): Promise<{ message: string; upvotes: number }> {
  return apiFetchJson(`/complaints/${id}/upvote`, email, { method: "POST" });
}

// ── Brands API ────────────────────────────────────────────────────────────────

export async function fetchBrands(skip = 0, limit = 20): Promise<BrandSummary[]> {
  return apiFetchPublic<BrandSummary[]>(`/brands?skip=${skip}&limit=${limit}`);
}

export async function fetchBrand(name: string): Promise<BrandProfile> {
  return apiFetchPublic<BrandProfile>(`/brands/${encodeURIComponent(name)}`);
}

export async function claimBrand(
  payload: { name: string; website?: string; gstNumber?: string; verificationDocUrl?: string },
  email: string
): Promise<{ message: string }> {
  return apiFetchJson("/brands/claim", email, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Analytics API ─────────────────────────────────────────────────────────────

export async function fetchAnalyticsSummary(email: string): Promise<AnalyticsSummary> {
  const raw = await apiFetchJson<Record<string, unknown>>("/analytics/summary", email);
  return normalizeAnalyticsSummary(raw);
}

export async function fetchTrends(
  email: string,
  period: "week" | "month" = "month",
  limit = 12
): Promise<TrendData[]> {
  const raw = await apiFetchJson<unknown[]>(
    `/analytics/trends?period=${period}&limit=${limit}`,
    email
  );
  return normalizeTrends(raw);
}

export async function fetchTopBrands(email: string): Promise<TopBrand[]> {
  const raw = await apiFetchJson<unknown[]>("/analytics/top-brands", email);
  return normalizeTopBrands(raw);
}

export async function fetchFraudCategories(email: string): Promise<FraudCategory[]> {
  return apiFetchJson<FraudCategory[]>("/analytics/fraud-categories", email);
}

export async function fetchMlHealth(): Promise<MlHealth> {
  const raw = await apiFetchPublic<Record<string, unknown>>("/analytics/health");
  return normalizeMlHealth(raw);
}

export async function predictFraud(
  email: string,
  payload: {
    amount?: number;
    ipAddress?: string;
    deviceFingerprint?: string;
    cardLast4?: string;
    numOrdersLast24h?: number;
    complaintId?: string | null;
  }
): Promise<FraudPredictResult> {
  const body = {
    amount: payload.amount ?? 0,
    ip_address: payload.ipAddress ?? "",
    device_fingerprint: payload.deviceFingerprint ?? "",
    card_last4: payload.cardLast4 ?? "",
    num_orders_last_24h: payload.numOrdersLast24h ?? 0,
    complaint_id: payload.complaintId ?? null,
  };
  const raw = await apiFetchJson<Record<string, unknown>>("/predict-fraud", email, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeFraudPredict(raw);
}

// ── Cases API ────────────────────────────────────────────────────────────────

export interface CasesFilter {
  page?: number;
  pageSize?: number;
  status?: string;
  q?: string;
}

function normalizeActiveCasesPage(raw: Record<string, unknown>): ActiveCasesPage {
  const itemsRaw = raw.items as unknown[] | undefined;
  const items: ActiveCase[] = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          caseId: String(r.caseId ?? r.case_id ?? ""),
          complaintId: String(r.complaintId ?? r.complaint_id ?? ""),
          title: String(r.title ?? ""),
          amount: Number(r.amount ?? 0),
          status: String(r.status ?? ""),
        };
      })
    : [];
  return {
    items,
    total: Number(raw.total ?? 0),
    page: Number(raw.page ?? 1),
    pageSize: Number(raw.pageSize ?? raw.page_size ?? 20),
  };
}

export async function fetchActiveCases(
  email: string,
  filters: CasesFilter = {}
): Promise<ActiveCasesPage> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("page_size", String(filters.pageSize));
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  const raw = await apiFetchJson<Record<string, unknown>>(
    `/cases/active${qs ? `?${qs}` : ""}`,
    email
  );
  return normalizeActiveCasesPage(raw);
}

// ── Dashboard API ─────────────────────────────────────────────────────────────

export async function fetchDashboardSummary(email: string): Promise<DashboardSummary> {
  const raw = await apiFetchJson<Record<string, unknown>>("/dashboard/summary", email);
  return {
    activeCases: Number(raw.activeCases ?? raw.active_cases ?? 0),
    resolvedCases: Number(raw.resolvedCases ?? raw.resolved_cases ?? 0),
    amountAtRisk: Number(raw.amountAtRisk ?? raw.amount_at_risk ?? 0),
    riskScore: Number(raw.riskScore ?? raw.risk_score ?? 0),
  };
}

// ── Upload API ────────────────────────────────────────────────────────────────

export async function uploadFile(file: File, email: string): Promise<{ fileUrl: string }> {
  if (!email) throw new Error("Sign in required.");
  const formData = new FormData();
  formData.append("file", file);
  const base = typeof window !== "undefined" ? "/api/bff" : API_URL;
  // Multipart: do not set Content-Type (browser sets boundary). Always send who is uploading.
  const res = await fetch(`${base}/upload`, {
    method: "POST",
    credentials: typeof window !== "undefined" ? "include" : undefined,
    headers: { "X-User-Email": email },
    body: formData,
  });
  return handleResponse<{ fileUrl: string }>(res);
}