const API_BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

function get<T>(path: string) {
  return request<T>(path);
}

function post<T>(path: string, body: unknown) {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

function patch<T>(path: string, body?: unknown) {
  return request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
}

// ---------- Types ----------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  manufacturer_part_number: string;
  uom: string;
  min_order_qty: number;
  lead_time_days: number;
  hazmat: boolean;
  country_of_origin: string;
  specs?: Array<{ name: string; value: string; unit?: string }>;
  cross_references?: Array<{ cross_ref_type: string; cross_ref_sku: string; manufacturer?: string }>;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  warehouse_code: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_point: number;
  reorder_qty: number;
  safety_stock: number;
  bin_location: string;
}

export interface Customer {
  id: string;
  external_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  payment_terms: string;
  credit_limit: number;
  credit_used: number;
}

export interface ErpSyncResult {
  status: "synced" | "failed";
  erp_order_no?: string | null;
  connector: string;
  error?: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  order_date: string;
  total_amount: number;
  subtotal: number;
  payment_terms: string;
  lines?: OrderLine[];
  // Present on the order-intake commit response when ERP write-back ran.
  erp?: ErpSyncResult;
}

export interface OrderLine {
  id: string;
  sku: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  total_amount: number;
  valid_until?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  payment_terms: string;
  lead_time_days: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  status: string;
  total_amount: number;
  order_date: string;
  expected_date?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  total_amount: number;
  balance_due: number;
  invoice_date: string;
  due_date: string;
}

export interface RMA {
  id: string;
  rma_number: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  reason: string;
  created_at: string;
}

export interface DashboardMetrics {
  orders_today: number;
  orders_this_month: number;
  revenue_today: number;
  revenue_this_month: number;
  open_orders: number;
  pending_shipments: number;
  open_quotes: number;
  low_stock_items: number;
  open_pos: number;
  pending_invoices: number;
  overdue_invoices: number;
  open_rmas: number;
  top_products: Array<{ sku: string; name: string; total_qty: number; total_revenue: number }>;
  top_customers: Array<{ name: string; company: string; total_revenue: number; order_count: number }>;
  recent_orders: Array<{ order_number: string; status: string; total_amount: number; customer_name: string; order_date: string }>;
}

export interface ReorderAlert {
  product_id: string;
  sku: string;
  product_name: string;
  warehouse_code: string;
  quantity_available: number;
  reorder_point: number;
  reorder_qty: number;
  preferred_supplier?: string;
  supplier_price?: number;
}

export interface ChatResponse {
  success: boolean;
  response?: {
    content: string;
    suggested_actions: string[];
    escalate: boolean;
  };
  message_id?: string;
  error?: string;
}

export interface ChannelMessage {
  id: string;
  from_id: string;
  content: string;
  channel: string;
  message_type: string;
  confidence: number;
  response_content: string | null;
  response_time: number | null;
  timestamp: string;
}

export interface ChannelStats {
  channels: Record<string, {
    message_count: number;
    avg_response_time: number;
    avg_confidence: number;
    last_message_at: string | null;
  }>;
  total_messages: number;
  open_escalations: number;
  total_escalations: number;
}

export interface EscalationTicket {
  id: string;
  customer_id: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSubmission {
  score: number;
  comment?: string;
  page?: string;
  persona?: string;
  contact_email?: string;
  source?: string;
}

export interface LeadSubmission {
  company: string;
  contact_name?: string;
  email: string;
  phone?: string;
  role?: string;
  monthly_order_lines?: number;
  pain_points?: string;
  estimated_annual_savings?: number;
  source?: string;
}

// ---------- Order Intake (the validated wedge) ----------

export type IntakeDisposition = "touchless" | "needs_review" | "unresolved";

export interface IntakeCandidate {
  product_id: string;
  sku: string;
  name: string;
}

export interface IntakeLine {
  id?: string;
  line_number: number;
  raw_text: string;
  extracted_quantity: number;
  resolved_product_id: string | null;
  resolved_sku: string | null;
  resolved_name: string | null;
  unit_price: number | null;
  confidence: number;
  disposition: IntakeDisposition;
  candidates: IntakeCandidate[];
}

export interface IntakeRun {
  id: string;
  source_channel: string;
  raw_text: string;
  customer_id: string | null;
  customer_external_id: string | null;
  status: "parsed" | "committed";
  line_count: number;
  touchless_count: number;
  review_count: number;
  unresolved_count: number;
  touchless_rate: number;
  committed_order_id?: string | null;
  lines: IntakeLine[];
}

export interface TouchlessSummary {
  runs: number;
  total_lines: number;
  touchless_lines: number;
  review_lines: number;
  unresolved_lines: number;
  touchless_rate: number;
  committed_orders: number;
  by_day: Array<{ day: string; lines: number; touchless: number; touchless_rate: number }>;
}

export interface IntakeCommitLine {
  product_id: string;
  quantity: number;
  unit_price?: number;
}

// ---------- API Functions ----------

export const api = {
  // Dashboard
  getDashboard: () => get<DashboardMetrics>("/analytics/dashboard"),
  getSalesSummary: (period: string) => get<Array<{ period: string; order_count: number; revenue: number }>>(`/analytics/sales?period=${period}`),

  // Products
  getProducts: (page = 1, q = "") => get<PaginatedResponse<Product>>(`/products?page=${page}&page_size=20${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  getProduct: (id: string) => get<Product>(`/products/${id}`),
  getCategories: () => get<string[]>("/products/categories"),

  // Inventory
  getInventory: (page = 1) => get<PaginatedResponse<InventoryItem>>(`/inventory?page=${page}&page_size=20`),
  getReorderAlerts: () => get<ReorderAlert[]>("/inventory/reorder-alerts"),

  // Customers
  getCustomers: (page = 1) => get<PaginatedResponse<Customer>>(`/customers?page=${page}&page_size=20`),
  getCustomer: (id: string) => get<Customer>(`/customers/${id}`),

  // Orders — lifecycle actions are POST endpoints on the backend
  getOrders: (page = 1, status = "") => get<PaginatedResponse<Order>>(`/orders?page=${page}&page_size=20${status ? `&status=${status}` : ""}`),
  getOrder: (id: string) => get<Order>(`/orders/${id}`),
  submitOrder: (id: string) => post<Order>(`/orders/${id}/submit`, {}),
  confirmOrder: (id: string) => post<Order>(`/orders/${id}/confirm`, {}),
  shipOrder: (id: string) => post<Order>(`/orders/${id}/ship`, {}),
  deliverOrder: (id: string) => post<Order>(`/orders/${id}/deliver`, {}),
  createOrder: (data: unknown) => post<Order>("/orders", data),

  // Quotes
  getQuotes: (page = 1) => get<PaginatedResponse<Quote>>(`/quotes?page=${page}&page_size=20`),
  getQuote: (id: string) => get<Quote>(`/quotes/${id}`),
  convertQuote: (id: string) => post<Order>(`/quotes/${id}/convert`, {}),

  // Suppliers
  getSuppliers: (page = 1) => get<PaginatedResponse<Supplier>>(`/suppliers?page=${page}&page_size=20`),

  // Purchase Orders
  getPurchaseOrders: (page = 1) => get<PaginatedResponse<PurchaseOrder>>(`/purchase-orders?page=${page}&page_size=20`),
  autoGeneratePOs: () => post<unknown>("/purchase-orders/auto-generate", {}),

  // Invoices
  getInvoices: (page = 1, status = "") => get<PaginatedResponse<Invoice>>(`/invoices?page=${page}&page_size=20${status ? `&status=${status}` : ""}`),
  getARaging: () => get<Record<string, { count: number; balance: number }>>("/invoices/aging"),

  // RMA
  getRMAs: (page = 1) => get<PaginatedResponse<RMA>>(`/rma?page=${page}&page_size=20`),

  // Chat
  sendMessage: (content: string, from_id = "web_user") =>
    fetch("/api/v1/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_id, content, channel: "web" }),
    }).then((r) => r.json() as Promise<ChatResponse>),

  // Pricing
  getPrice: (productId: string, qty = 1) => get<unknown>(`/pricing/${productId}?quantity=${qty}`),
  getPriceTiers: (productId: string) => get<unknown>(`/pricing/${productId}/tiers`),

  // Order intake (the validated wedge)
  parseIntake: (raw_text: string, customer_external_id?: string, source_channel = "web") =>
    post<IntakeRun>("/intake/parse", { raw_text, customer_external_id, source_channel }),
  commitIntake: (runId: string, lines?: IntakeCommitLine[]) =>
    post<Order>(`/intake/${runId}/commit`, lines ? { lines } : {}),
  getTouchlessSummary: () => get<TouchlessSummary>("/intake/touchless-summary"),
  getIntakeRuns: (page = 1) => get<PaginatedResponse<IntakeRun>>(`/intake?page=${page}&page_size=20`),

  // Validation loop
  submitFeedback: (data: FeedbackSubmission) => post<{ id: string }>("/feedback", data),
  submitLead: (data: LeadSubmission) => post<{ id: string; status: string }>("/leads", data),
  updateLeadStatus: (id: string, status: string) =>
    patch<{ id: string; status: string }>(`/leads/${id}/status`, { status }),

  // Channels / Omnichannel
  getChannelStats: () => get<ChannelStats>("/channels/stats"),
  getChannelMessages: (page = 1, channel = "") =>
    get<PaginatedResponse<ChannelMessage>>(`/channels/messages?page=${page}&page_size=20${channel ? `&channel=${channel}` : ""}`),
  getEscalations: (page = 1, status = "") =>
    get<PaginatedResponse<EscalationTicket>>(`/channels/escalations?page=${page}&page_size=20${status ? `&status=${status}` : ""}`),
};

// ---------- Knowledge Graph API (separate base path) ----------

export interface GraphStats {
  nodes: Record<string, number>;
  edges: Record<string, number>;
}

export interface GraphSearchResult {
  results: Record<string, unknown>[];
  total: number;
  query: string;
}

export function getGraphStats() {
  return request<GraphStats>("/graph/stats");
}

export function searchGraphParts(query: string, limit = 20) {
  return request<GraphSearchResult>(`/graph/parts/search/fulltext?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export function getGraphPart(sku: string) {
  return request<Record<string, unknown>>(`/graph/parts/${encodeURIComponent(sku)}`);
}

export function getGraphCrossRefs(sku: string) {
  return request<{ sku: string; cross_references: Record<string, unknown>[] }>(`/graph/parts/${encodeURIComponent(sku)}/cross-refs`);
}

export function getGraphBOM(model: string) {
  return request<{ assembly: string; components: Record<string, unknown>[] }>(`/graph/assemblies/${encodeURIComponent(model)}/bom`);
}
