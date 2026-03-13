/**
 * Shared demo / fallback data for all back-office pages.
 * Used when the API backend is unreachable so the UI still renders
 * a realistic preview instead of an error screen.
 */

import type {
  DashboardMetrics,
  Product,
  InventoryItem,
  Order,
  Quote,
  PurchaseOrder,
  Supplier,
  Invoice,
  RMA,
  ChannelStats,
  ChannelMessage,
  EscalationTicket,
  ReorderAlert,
} from "./api";

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export const DEMO_DASHBOARD_METRICS: DashboardMetrics = {
  revenue_today: 47850,
  orders_today: 23,
  open_orders: 38,
  revenue_this_month: 342800,
  orders_this_month: 187,
  pending_shipments: 12,
  open_quotes: 9,
  low_stock_items: 8,
  open_pos: 5,
  pending_invoices: 14,
  overdue_invoices: 3,
  open_rmas: 2,
  top_products: [
    { sku: "BRG-SKF-6205-2Z", name: "SKF 6205-2Z Shielded Ball Bearing", total_qty: 342, total_revenue: 8208 },
    { sku: "BLT-GATES-B68", name: "Gates Hi-Power II V-Belt B68", total_qty: 215, total_revenue: 6450 },
    { sku: "MOT-WEG-W22-5HP", name: "WEG W22 5HP 3-Phase Motor", total_qty: 18, total_revenue: 12600 },
    { sku: "FST-M10X30-88", name: "M10x30 Hex Bolt Grade 8.8 Zinc", total_qty: 4800, total_revenue: 3840 },
    { sku: "LUB-MOBIL-SHC630", name: "Mobil SHC 630 Synthetic Lubricant", total_qty: 96, total_revenue: 5280 },
    { sku: "BRG-NSK-6204DDU", name: "NSK 6204DDU Sealed Ball Bearing", total_qty: 280, total_revenue: 5880 },
    { sku: "SEL-NOK-TC3552", name: "NOK TC 35x52x8 Oil Seal", total_qty: 520, total_revenue: 4160 },
    { sku: "BRG-SKF-6204-2RS", name: "SKF 6204-2RS Sealed Ball Bearing", total_qty: 310, total_revenue: 6510 },
  ],
  top_customers: [
    { name: "John Mitchell", company: "Acme Manufacturing", total_revenue: 84500, order_count: 34 },
    { name: "Sarah Chen", company: "Midwest Industrial Services", total_revenue: 62300, order_count: 28 },
    { name: "Robert Garcia", company: "Pacific Equipment & Supply", total_revenue: 51200, order_count: 22 },
    { name: "Karen Williams", company: "Southern Machine Works", total_revenue: 43800, order_count: 19 },
    { name: "David Kim", company: "Delta Processing Corp", total_revenue: 38900, order_count: 16 },
  ],
  recent_orders: [
    { order_number: "ORD-2026-1047", status: "delivered", total_amount: 4250.00, customer_name: "Acme Manufacturing", order_date: "2026-03-12" },
    { order_number: "ORD-2026-1046", status: "shipped", total_amount: 8720.50, customer_name: "Pacific Equipment & Supply", order_date: "2026-03-11" },
    { order_number: "ORD-2026-1045", status: "confirmed", total_amount: 1895.00, customer_name: "Delta Processing Corp", order_date: "2026-03-11" },
    { order_number: "ORD-2026-1044", status: "submitted", total_amount: 12340.00, customer_name: "Midwest Industrial Services", order_date: "2026-03-10" },
    { order_number: "ORD-2026-1043", status: "draft", total_amount: 3560.75, customer_name: "Southern Machine Works", order_date: "2026-03-10" },
    { order_number: "ORD-2026-1042", status: "shipped", total_amount: 6890.00, customer_name: "Apex Industrial Solutions", order_date: "2026-03-09" },
    { order_number: "ORD-2026-1041", status: "confirmed", total_amount: 2475.25, customer_name: "Great Lakes MRO", order_date: "2026-03-08" },
    { order_number: "ORD-2026-1040", status: "delivered", total_amount: 15200.00, customer_name: "Coastal Fabricators Inc", order_date: "2026-03-07" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Sales Summary (daily trend, 14 days)                               */
/* ------------------------------------------------------------------ */

export const DEMO_SALES_SUMMARY: Array<{ period: string; order_count: number; revenue: number }> = [
  { period: "Feb 28", order_count: 14, revenue: 18200 },
  { period: "Mar 01", order_count: 17, revenue: 22400 },
  { period: "Mar 02", order_count: 12, revenue: 15800 },
  { period: "Mar 03", order_count: 19, revenue: 26100 },
  { period: "Mar 04", order_count: 22, revenue: 29500 },
  { period: "Mar 05", order_count: 16, revenue: 21300 },
  { period: "Mar 06", order_count: 24, revenue: 31700 },
  { period: "Mar 07", order_count: 20, revenue: 27800 },
  { period: "Mar 08", order_count: 18, revenue: 23600 },
  { period: "Mar 09", order_count: 25, revenue: 34200 },
  { period: "Mar 10", order_count: 21, revenue: 28900 },
  { period: "Mar 11", order_count: 23, revenue: 30500 },
  { period: "Mar 12", order_count: 19, revenue: 25700 },
  { period: "Mar 13", order_count: 23, revenue: 47850 },
];

/* ------------------------------------------------------------------ */
/*  Products                                                           */
/* ------------------------------------------------------------------ */

export const DEMO_PRODUCTS: Product[] = [
  { id: "p1", sku: "BRG-SKF-6204-2RS", name: "SKF 6204-2RS Sealed Ball Bearing", description: "Deep groove ball bearing, sealed, 20x47x14mm", manufacturer: "SKF", category: "Bearings", subcategory: "Ball Bearings", manufacturer_part_number: "6204-2RS1", uom: "EA", min_order_qty: 1, lead_time_days: 3, hazmat: false, country_of_origin: "SE" },
  { id: "p2", sku: "BRG-SKF-6205-2Z", name: "SKF 6205-2Z Shielded Ball Bearing", description: "Deep groove ball bearing, shielded, 25x52x15mm", manufacturer: "SKF", category: "Bearings", subcategory: "Ball Bearings", manufacturer_part_number: "6205-2Z", uom: "EA", min_order_qty: 1, lead_time_days: 3, hazmat: false, country_of_origin: "SE" },
  { id: "p3", sku: "BRG-NSK-6204DDU", name: "NSK 6204DDU Sealed Ball Bearing", description: "Deep groove ball bearing, contact seal, 20x47x14mm", manufacturer: "NSK", category: "Bearings", subcategory: "Ball Bearings", manufacturer_part_number: "6204DDU", uom: "EA", min_order_qty: 1, lead_time_days: 5, hazmat: false, country_of_origin: "JP" },
  { id: "p4", sku: "BRG-FAG-22210E1", name: "FAG 22210-E1 Spherical Roller Bearing", description: "Spherical roller bearing, 50x90x23mm, dynamic load 104kN", manufacturer: "FAG", category: "Bearings", subcategory: "Roller Bearings", manufacturer_part_number: "22210-E1-XL", uom: "EA", min_order_qty: 1, lead_time_days: 7, hazmat: false, country_of_origin: "DE" },
  { id: "p5", sku: "BRG-TMK-SET401", name: "Timken SET401 Tapered Roller Bearing", description: "Tapered roller bearing set, cone & cup", manufacturer: "Timken", category: "Bearings", subcategory: "Roller Bearings", manufacturer_part_number: "SET401", uom: "SET", min_order_qty: 1, lead_time_days: 5, hazmat: false, country_of_origin: "US" },
  { id: "p6", sku: "BLT-GATES-B68", name: "Gates Hi-Power II V-Belt B68", description: "Classical V-belt, B cross section, 71 inch outside length", manufacturer: "Gates", category: "Power Transmission", subcategory: "V-Belts", manufacturer_part_number: "B68", uom: "EA", min_order_qty: 1, lead_time_days: 2, hazmat: false, country_of_origin: "US" },
  { id: "p7", sku: "BLT-GATES-5M-1500", name: "Gates PowerGrip HTD 5M-1500 Timing Belt", description: "HTD timing belt, 5mm pitch, 1500mm length, 15mm wide", manufacturer: "Gates", category: "Power Transmission", subcategory: "Timing Belts", manufacturer_part_number: "5M1500-15", uom: "EA", min_order_qty: 1, lead_time_days: 4, hazmat: false, country_of_origin: "US" },
  { id: "p8", sku: "FST-M10X30-88", name: "M10x30 Hex Bolt Grade 8.8 Zinc", description: "Hex head cap screw, M10-1.5 x 30mm, grade 8.8, zinc plated", manufacturer: "Parker", category: "Fasteners", subcategory: "Hex Bolts", manufacturer_part_number: "HCS-M10-30-88-ZN", uom: "PK/50", min_order_qty: 1, lead_time_days: 1, hazmat: false, country_of_origin: "TW" },
  { id: "p9", sku: "FST-M8X25-109", name: "M8x25 Socket Head Cap Screw 10.9", description: "Socket head cap screw, M8-1.25 x 25mm, grade 10.9, black oxide", manufacturer: "Parker", category: "Fasteners", subcategory: "Socket Screws", manufacturer_part_number: "SHCS-M8-25-109-BO", uom: "PK/100", min_order_qty: 1, lead_time_days: 1, hazmat: false, country_of_origin: "TW" },
  { id: "p10", sku: "LUB-MOBIL-SHC630", name: "Mobil SHC 630 Synthetic Lubricant", description: "Premium synthetic bearing & gear oil, ISO VG 220, 5-gallon pail", manufacturer: "Mobil", category: "Lubricants", subcategory: "Synthetic Oils", manufacturer_part_number: "SHC-630-5GAL", uom: "PAL", min_order_qty: 1, lead_time_days: 3, hazmat: false, country_of_origin: "US" },
  { id: "p11", sku: "LUB-MOBIL-DTE26", name: "Mobil DTE 26 Hydraulic Oil", description: "Anti-wear hydraulic oil, ISO VG 68, 55-gallon drum", manufacturer: "Mobil", category: "Lubricants", subcategory: "Hydraulic Oils", manufacturer_part_number: "DTE-26-55DR", uom: "DRM", min_order_qty: 1, lead_time_days: 5, hazmat: false, country_of_origin: "US" },
  { id: "p12", sku: "SEL-NOK-TC3552", name: "NOK TC 35x52x8 Oil Seal", description: "Radial shaft seal, TC type, 35mm ID x 52mm OD x 8mm width, nitrile", manufacturer: "Garlock", category: "Seals & Gaskets", subcategory: "Oil Seals", manufacturer_part_number: "TC-35-52-8-NBR", uom: "EA", min_order_qty: 5, lead_time_days: 3, hazmat: false, country_of_origin: "JP" },
  { id: "p13", sku: "GSK-GRLK-3200", name: "Garlock 3200 Compressed Sheet Gasket", description: "Non-asbestos compressed sheet gasket, 1/16\" thick, 24x24 sheet", manufacturer: "Garlock", category: "Seals & Gaskets", subcategory: "Sheet Gaskets", manufacturer_part_number: "3200-116-2424", uom: "SHT", min_order_qty: 1, lead_time_days: 4, hazmat: false, country_of_origin: "US" },
  { id: "p14", sku: "MOT-WEG-W22-5HP", name: "WEG W22 5HP 3-Phase Motor", description: "TEFC 3-phase induction motor, 5HP, 1750RPM, 184T frame, 208-230/460V", manufacturer: "WEG", category: "Motors", subcategory: "AC Motors", manufacturer_part_number: "W22-05-184T", uom: "EA", min_order_qty: 1, lead_time_days: 10, hazmat: false, country_of_origin: "BR" },
  { id: "p15", sku: "MOT-WEG-W22-10HP", name: "WEG W22 10HP 3-Phase Motor", description: "TEFC 3-phase induction motor, 10HP, 1760RPM, 215T frame, 208-230/460V", manufacturer: "WEG", category: "Motors", subcategory: "AC Motors", manufacturer_part_number: "W22-10-215T", uom: "EA", min_order_qty: 1, lead_time_days: 14, hazmat: false, country_of_origin: "BR" },
  { id: "p16", sku: "BRG-SKF-7206BEP", name: "SKF 7206 BEP Angular Contact Bearing", description: "Angular contact ball bearing, 40-degree contact angle, 30x62x16mm", manufacturer: "SKF", category: "Bearings", subcategory: "Angular Contact", manufacturer_part_number: "7206-BEP", uom: "EA", min_order_qty: 1, lead_time_days: 5, hazmat: false, country_of_origin: "SE" },
  { id: "p17", sku: "SEL-PRK-OR325", name: "Parker O-Ring 325 Buna-N", description: "O-Ring, AS568-325, 1-5/8\" ID x 2\" OD, 70A durometer Buna-N", manufacturer: "Parker", category: "Seals & Gaskets", subcategory: "O-Rings", manufacturer_part_number: "2-325-N674-70", uom: "PK/10", min_order_qty: 1, lead_time_days: 2, hazmat: false, country_of_origin: "US" },
  { id: "p18", sku: "BLT-GATES-8VP2120", name: "Gates Super HC PowerBand 8VP2120", description: "Banded V-belt, 8V section, 212\" effective length, 8 ribs", manufacturer: "Gates", category: "Power Transmission", subcategory: "Banded Belts", manufacturer_part_number: "8VP2120", uom: "EA", min_order_qty: 1, lead_time_days: 7, hazmat: false, country_of_origin: "US" },
];

/* ------------------------------------------------------------------ */
/*  Inventory                                                          */
/* ------------------------------------------------------------------ */

export const DEMO_INVENTORY: InventoryItem[] = [
  { id: "inv1", product_id: "p1", sku: "BRG-SKF-6204-2RS", product_name: "SKF 6204-2RS Sealed Ball Bearing", warehouse_code: "MAIN", quantity_on_hand: 245, quantity_reserved: 30, quantity_available: 215, reorder_point: 100, reorder_qty: 200, safety_stock: 50, bin_location: "A-12-03" },
  { id: "inv2", product_id: "p2", sku: "BRG-SKF-6205-2Z", product_name: "SKF 6205-2Z Shielded Ball Bearing", warehouse_code: "MAIN", quantity_on_hand: 180, quantity_reserved: 45, quantity_available: 135, reorder_point: 80, reorder_qty: 150, safety_stock: 40, bin_location: "A-12-04" },
  { id: "inv3", product_id: "p3", sku: "BRG-NSK-6204DDU", product_name: "NSK 6204DDU Sealed Ball Bearing", warehouse_code: "EAST", quantity_on_hand: 55, quantity_reserved: 20, quantity_available: 35, reorder_point: 60, reorder_qty: 120, safety_stock: 30, bin_location: "B-05-01" },
  { id: "inv4", product_id: "p6", sku: "BLT-GATES-B68", product_name: "Gates Hi-Power II V-Belt B68", warehouse_code: "MAIN", quantity_on_hand: 320, quantity_reserved: 15, quantity_available: 305, reorder_point: 100, reorder_qty: 200, safety_stock: 50, bin_location: "C-03-02" },
  { id: "inv5", product_id: "p8", sku: "FST-M10X30-88", product_name: "M10x30 Hex Bolt Grade 8.8 Zinc", warehouse_code: "MAIN", quantity_on_hand: 4200, quantity_reserved: 600, quantity_available: 3600, reorder_point: 2000, reorder_qty: 5000, safety_stock: 1000, bin_location: "D-01-01" },
  { id: "inv6", product_id: "p10", sku: "LUB-MOBIL-SHC630", product_name: "Mobil SHC 630 Synthetic Lubricant", warehouse_code: "MAIN", quantity_on_hand: 28, quantity_reserved: 4, quantity_available: 24, reorder_point: 15, reorder_qty: 30, safety_stock: 8, bin_location: "E-02-01" },
  { id: "inv7", product_id: "p12", sku: "SEL-NOK-TC3552", product_name: "NOK TC 35x52x8 Oil Seal", warehouse_code: "WEST", quantity_on_hand: 150, quantity_reserved: 25, quantity_available: 125, reorder_point: 80, reorder_qty: 200, safety_stock: 40, bin_location: "B-08-03" },
  { id: "inv8", product_id: "p14", sku: "MOT-WEG-W22-5HP", product_name: "WEG W22 5HP 3-Phase Motor", warehouse_code: "MAIN", quantity_on_hand: 6, quantity_reserved: 2, quantity_available: 4, reorder_point: 5, reorder_qty: 10, safety_stock: 2, bin_location: "F-01-01" },
  { id: "inv9", product_id: "p9", sku: "FST-M8X25-109", product_name: "M8x25 Socket Head Cap Screw 10.9", warehouse_code: "EAST", quantity_on_hand: 1800, quantity_reserved: 200, quantity_available: 1600, reorder_point: 1500, reorder_qty: 3000, safety_stock: 500, bin_location: "D-02-03" },
  { id: "inv10", product_id: "p13", sku: "GSK-GRLK-3200", product_name: "Garlock 3200 Compressed Sheet Gasket", warehouse_code: "MAIN", quantity_on_hand: 18, quantity_reserved: 3, quantity_available: 15, reorder_point: 20, reorder_qty: 40, safety_stock: 10, bin_location: "B-10-02" },
  { id: "inv11", product_id: "p4", sku: "BRG-FAG-22210E1", product_name: "FAG 22210-E1 Spherical Roller Bearing", warehouse_code: "MAIN", quantity_on_hand: 22, quantity_reserved: 5, quantity_available: 17, reorder_point: 20, reorder_qty: 40, safety_stock: 10, bin_location: "A-14-01" },
  { id: "inv12", product_id: "p7", sku: "BLT-GATES-5M-1500", product_name: "Gates PowerGrip HTD 5M-1500 Timing Belt", warehouse_code: "WEST", quantity_on_hand: 45, quantity_reserved: 10, quantity_available: 35, reorder_point: 25, reorder_qty: 50, safety_stock: 12, bin_location: "C-05-01" },
  { id: "inv13", product_id: "p15", sku: "MOT-WEG-W22-10HP", product_name: "WEG W22 10HP 3-Phase Motor", warehouse_code: "MAIN", quantity_on_hand: 2, quantity_reserved: 1, quantity_available: 1, reorder_point: 3, reorder_qty: 5, safety_stock: 1, bin_location: "F-01-02" },
  { id: "inv14", product_id: "p11", sku: "LUB-MOBIL-DTE26", product_name: "Mobil DTE 26 Hydraulic Oil", warehouse_code: "EAST", quantity_on_hand: 8, quantity_reserved: 2, quantity_available: 6, reorder_point: 10, reorder_qty: 20, safety_stock: 4, bin_location: "E-04-01" },
  { id: "inv15", product_id: "p5", sku: "BRG-TMK-SET401", product_name: "Timken SET401 Tapered Roller Bearing", warehouse_code: "MAIN", quantity_on_hand: 65, quantity_reserved: 8, quantity_available: 57, reorder_point: 30, reorder_qty: 60, safety_stock: 15, bin_location: "A-15-02" },
];

/* Reorder alerts — items below reorder point */
export const DEMO_REORDER_ALERTS: ReorderAlert[] = DEMO_INVENTORY
  .filter((i) => i.quantity_available <= i.reorder_point)
  .map((i) => ({
    product_id: i.product_id,
    sku: i.sku,
    product_name: i.product_name,
    warehouse_code: i.warehouse_code,
    quantity_available: i.quantity_available,
    reorder_point: i.reorder_point,
    reorder_qty: i.reorder_qty,
    preferred_supplier: i.sku.startsWith("BRG-SKF") ? "SKF USA Inc" : i.sku.startsWith("BRG-NSK") ? "NSK Americas" : i.sku.startsWith("MOT") ? "WEG Electric Corp" : i.sku.startsWith("LUB") ? "ExxonMobil" : i.sku.startsWith("GSK") ? "Garlock Sealing Technologies" : undefined,
    supplier_price: i.sku.startsWith("MOT-WEG-W22-10") ? 485.00 : i.sku.startsWith("MOT-WEG-W22-5") ? 280.00 : i.sku.startsWith("BRG") ? 12.50 : i.sku.startsWith("LUB") ? 42.00 : i.sku.startsWith("GSK") ? 28.50 : undefined,
  }));

/* ------------------------------------------------------------------ */
/*  Orders                                                             */
/* ------------------------------------------------------------------ */

export const DEMO_ORDERS: Order[] = [
  { id: "o1", order_number: "ORD-2026-1047", customer_id: "c1", customer_name: "Acme Manufacturing", status: "delivered", total_amount: 4250.00, subtotal: 3920.00, payment_terms: "Net 30", order_date: "2026-03-12" },
  { id: "o2", order_number: "ORD-2026-1046", customer_id: "c3", customer_name: "Pacific Equipment & Supply", status: "shipped", total_amount: 8720.50, subtotal: 8050.00, payment_terms: "Net 30", order_date: "2026-03-11" },
  { id: "o3", order_number: "ORD-2026-1045", customer_id: "c5", customer_name: "Delta Processing Corp", status: "confirmed", total_amount: 1895.00, subtotal: 1750.00, payment_terms: "Net 15", order_date: "2026-03-11" },
  { id: "o4", order_number: "ORD-2026-1044", customer_id: "c2", customer_name: "Midwest Industrial Services", status: "submitted", total_amount: 12340.00, subtotal: 11400.00, payment_terms: "Net 30", order_date: "2026-03-10" },
  { id: "o5", order_number: "ORD-2026-1043", customer_id: "c4", customer_name: "Southern Machine Works", status: "draft", total_amount: 3560.75, subtotal: 3290.00, payment_terms: "Net 30", order_date: "2026-03-10" },
  { id: "o6", order_number: "ORD-2026-1042", customer_id: "c6", customer_name: "Apex Industrial Solutions", status: "shipped", total_amount: 6890.00, subtotal: 6360.00, payment_terms: "Net 45", order_date: "2026-03-09" },
  { id: "o7", order_number: "ORD-2026-1041", customer_id: "c7", customer_name: "Great Lakes MRO", status: "confirmed", total_amount: 2475.25, subtotal: 2285.00, payment_terms: "Net 30", order_date: "2026-03-08" },
  { id: "o8", order_number: "ORD-2026-1040", customer_id: "c8", customer_name: "Coastal Fabricators Inc", status: "delivered", total_amount: 15200.00, subtotal: 14030.00, payment_terms: "Net 60", order_date: "2026-03-07" },
  { id: "o9", order_number: "ORD-2026-1039", customer_id: "c9", customer_name: "Mountain States Supply", status: "cancelled", total_amount: 980.00, subtotal: 905.00, payment_terms: "Net 30", order_date: "2026-03-06" },
  { id: "o10", order_number: "ORD-2026-1038", customer_id: "c10", customer_name: "Rodriguez Machining Co", status: "delivered", total_amount: 5640.00, subtotal: 5210.00, payment_terms: "Net 30", order_date: "2026-03-05" },
  { id: "o11", order_number: "ORD-2026-1037", customer_id: "c1", customer_name: "Acme Manufacturing", status: "shipped", total_amount: 9150.00, subtotal: 8450.00, payment_terms: "Net 30", order_date: "2026-03-04" },
  { id: "o12", order_number: "ORD-2026-1036", customer_id: "c2", customer_name: "Midwest Industrial Services", status: "delivered", total_amount: 3280.00, subtotal: 3030.00, payment_terms: "Net 30", order_date: "2026-03-03" },
];

/* ------------------------------------------------------------------ */
/*  Quotes                                                             */
/* ------------------------------------------------------------------ */

export const DEMO_QUOTES: Quote[] = [
  { id: "q1", quote_number: "QT-2026-0089", customer_id: "c1", customer_name: "Acme Manufacturing", status: "sent", total_amount: 7850.00, valid_until: "2026-04-12", created_at: "2026-03-12" },
  { id: "q2", quote_number: "QT-2026-0088", customer_id: "c3", customer_name: "Pacific Equipment & Supply", status: "accepted", total_amount: 14200.00, valid_until: "2026-04-10", created_at: "2026-03-10" },
  { id: "q3", quote_number: "QT-2026-0087", customer_id: "c6", customer_name: "Apex Industrial Solutions", status: "draft", total_amount: 3450.00, valid_until: "2026-04-09", created_at: "2026-03-09" },
  { id: "q4", quote_number: "QT-2026-0086", customer_id: "c7", customer_name: "Great Lakes MRO", status: "sent", total_amount: 5620.00, valid_until: "2026-04-08", created_at: "2026-03-08" },
  { id: "q5", quote_number: "QT-2026-0085", customer_id: "c8", customer_name: "Coastal Fabricators Inc", status: "expired", total_amount: 9300.00, valid_until: "2026-03-01", created_at: "2026-02-15" },
  { id: "q6", quote_number: "QT-2026-0084", customer_id: "c4", customer_name: "Southern Machine Works", status: "accepted", total_amount: 2180.00, valid_until: "2026-04-05", created_at: "2026-03-05" },
  { id: "q7", quote_number: "QT-2026-0083", customer_id: "c10", customer_name: "Rodriguez Machining Co", status: "sent", total_amount: 6740.00, valid_until: "2026-04-03", created_at: "2026-03-03" },
  { id: "q8", quote_number: "QT-2026-0082", customer_id: "c5", customer_name: "Delta Processing Corp", status: "draft", total_amount: 1890.00, valid_until: "2026-04-01", created_at: "2026-03-01" },
];

/* ------------------------------------------------------------------ */
/*  Procurement                                                        */
/* ------------------------------------------------------------------ */

export const DEMO_PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "po1", po_number: "PO-2026-0312", supplier_id: "s1", supplier_name: "SKF USA Inc", status: "submitted", total_amount: 4850.00, order_date: "2026-03-12", expected_date: "2026-03-19" },
  { id: "po2", po_number: "PO-2026-0310", supplier_id: "s2", supplier_name: "Gates Corporation", status: "confirmed", total_amount: 2340.00, order_date: "2026-03-10", expected_date: "2026-03-17" },
  { id: "po3", po_number: "PO-2026-0308", supplier_id: "s3", supplier_name: "NSK Americas Inc", status: "shipped", total_amount: 6720.00, order_date: "2026-03-08", expected_date: "2026-03-15" },
  { id: "po4", po_number: "PO-2026-0305", supplier_id: "s4", supplier_name: "ExxonMobil Lubricants", status: "delivered", total_amount: 3180.00, order_date: "2026-03-05", expected_date: "2026-03-12" },
  { id: "po5", po_number: "PO-2026-0303", supplier_id: "s5", supplier_name: "WEG Electric Corp", status: "confirmed", total_amount: 12400.00, order_date: "2026-03-03", expected_date: "2026-03-17" },
  { id: "po6", po_number: "PO-2026-0301", supplier_id: "s6", supplier_name: "Garlock Sealing Technologies", status: "delivered", total_amount: 1850.00, order_date: "2026-03-01", expected_date: "2026-03-08" },
  { id: "po7", po_number: "PO-2026-0228", supplier_id: "s1", supplier_name: "SKF USA Inc", status: "delivered", total_amount: 8900.00, order_date: "2026-02-28", expected_date: "2026-03-07" },
  { id: "po8", po_number: "PO-2026-0225", supplier_id: "s2", supplier_name: "Gates Corporation", status: "cancelled", total_amount: 1560.00, order_date: "2026-02-25", expected_date: "2026-03-04" },
];

export const DEMO_SUPPLIERS: Supplier[] = [
  { id: "s1", supplier_code: "SUP-SKF", name: "SKF USA Inc", contact_name: "James Anderson", email: "orders@skfusa.com", phone: "+1-267-436-6000", payment_terms: "Net 30", lead_time_days: 5 },
  { id: "s2", supplier_code: "SUP-GATES", name: "Gates Corporation", contact_name: "Linda Martinez", email: "industrial@gates.com", phone: "+1-303-744-1911", payment_terms: "Net 30", lead_time_days: 4 },
  { id: "s3", supplier_code: "SUP-NSK", name: "NSK Americas Inc", contact_name: "Hiroshi Tanaka", email: "sales@nskamericas.com", phone: "+1-734-913-7500", payment_terms: "Net 45", lead_time_days: 7 },
  { id: "s4", supplier_code: "SUP-MOBIL", name: "ExxonMobil Lubricants", contact_name: "Michael Roberts", email: "lubricants@exxonmobil.com", phone: "+1-800-662-4525", payment_terms: "Net 30", lead_time_days: 5 },
  { id: "s5", supplier_code: "SUP-WEG", name: "WEG Electric Corp", contact_name: "Carlos Silva", email: "motors@weg.net", phone: "+1-770-349-2685", payment_terms: "Net 45", lead_time_days: 14 },
  { id: "s6", supplier_code: "SUP-GRLK", name: "Garlock Sealing Technologies", contact_name: "Patricia Young", email: "seals@garlock.com", phone: "+1-315-597-4811", payment_terms: "Net 30", lead_time_days: 5 },
];

/* ------------------------------------------------------------------ */
/*  Invoices                                                           */
/* ------------------------------------------------------------------ */

export const DEMO_INVOICES: Invoice[] = [
  { id: "i1", invoice_number: "INV-2026-0520", customer_id: "c1", customer_name: "Acme Manufacturing", status: "sent", total_amount: 4250.00, balance_due: 4250.00, invoice_date: "2026-03-12", due_date: "2026-04-11" },
  { id: "i2", invoice_number: "INV-2026-0519", customer_id: "c8", customer_name: "Coastal Fabricators Inc", status: "paid", total_amount: 15200.00, balance_due: 0, invoice_date: "2026-03-07", due_date: "2026-05-06" },
  { id: "i3", invoice_number: "INV-2026-0518", customer_id: "c2", customer_name: "Midwest Industrial Services", status: "sent", total_amount: 8720.50, balance_due: 8720.50, invoice_date: "2026-03-11", due_date: "2026-04-10" },
  { id: "i4", invoice_number: "INV-2026-0517", customer_id: "c6", customer_name: "Apex Industrial Solutions", status: "paid", total_amount: 6890.00, balance_due: 0, invoice_date: "2026-03-09", due_date: "2026-04-23" },
  { id: "i5", invoice_number: "INV-2026-0516", customer_id: "c10", customer_name: "Rodriguez Machining Co", status: "overdue", total_amount: 5640.00, balance_due: 5640.00, invoice_date: "2026-02-01", due_date: "2026-03-03" },
  { id: "i6", invoice_number: "INV-2026-0515", customer_id: "c3", customer_name: "Pacific Equipment & Supply", status: "sent", total_amount: 3280.00, balance_due: 3280.00, invoice_date: "2026-03-05", due_date: "2026-04-04" },
  { id: "i7", invoice_number: "INV-2026-0514", customer_id: "c4", customer_name: "Southern Machine Works", status: "draft", total_amount: 2475.25, balance_due: 2475.25, invoice_date: "2026-03-08", due_date: "2026-04-07" },
  { id: "i8", invoice_number: "INV-2026-0513", customer_id: "c7", customer_name: "Great Lakes MRO", status: "overdue", total_amount: 9150.00, balance_due: 9150.00, invoice_date: "2026-01-15", due_date: "2026-02-14" },
  { id: "i9", invoice_number: "INV-2026-0512", customer_id: "c5", customer_name: "Delta Processing Corp", status: "paid", total_amount: 1895.00, balance_due: 0, invoice_date: "2026-03-03", due_date: "2026-03-18" },
  { id: "i10", invoice_number: "INV-2026-0511", customer_id: "c9", customer_name: "Mountain States Supply", status: "void", total_amount: 980.00, balance_due: 0, invoice_date: "2026-03-01", due_date: "2026-03-31" },
];

export const DEMO_AR_AGING: Record<string, { count: number; balance: number }> = {
  current: { count: 4, balance: 16250.50 },
  "1-30": { count: 3, balance: 9755.25 },
  "31-60": { count: 2, balance: 5640.00 },
  "61-90": { count: 1, balance: 9150.00 },
  "90+": { count: 0, balance: 0 },
};

/* ------------------------------------------------------------------ */
/*  RMA                                                                */
/* ------------------------------------------------------------------ */

export const DEMO_RMAS: RMA[] = [
  { id: "r1", rma_number: "RMA-2026-0042", customer_id: "c1", customer_name: "Acme Manufacturing", status: "pending", reason: "Bearing failure within warranty period - excessive noise after 200 hours of operation", created_at: "2026-03-11" },
  { id: "r2", rma_number: "RMA-2026-0041", customer_id: "c5", customer_name: "Delta Processing Corp", status: "approved", reason: "Wrong part shipped - ordered 6205-2Z, received 6204-2RS", created_at: "2026-03-08" },
  { id: "r3", rma_number: "RMA-2026-0040", customer_id: "c3", customer_name: "Pacific Equipment & Supply", status: "received", reason: "Motor DOA - unit does not start, possible winding fault", created_at: "2026-03-05" },
  { id: "r4", rma_number: "RMA-2026-0039", customer_id: "c7", customer_name: "Great Lakes MRO", status: "refunded", reason: "Duplicate order placed in error - customer requests full refund", created_at: "2026-03-02" },
  { id: "r5", rma_number: "RMA-2026-0038", customer_id: "c10", customer_name: "Rodriguez Machining Co", status: "pending", reason: "Belt broke after 2 weeks - suspected manufacturing defect", created_at: "2026-02-28" },
];

/* ------------------------------------------------------------------ */
/*  Channels / Omnichannel                                             */
/* ------------------------------------------------------------------ */

export const DEMO_CHANNEL_STATS: ChannelStats = {
  total_messages: 1247,
  open_escalations: 4,
  total_escalations: 18,
  channels: {
    whatsapp: { message_count: 482, avg_response_time: 1.8, avg_confidence: 0.92, last_message_at: "2026-03-13T14:22:00Z" },
    email: { message_count: 385, avg_response_time: 12.5, avg_confidence: 0.88, last_message_at: "2026-03-13T13:45:00Z" },
    sms: { message_count: 198, avg_response_time: 2.1, avg_confidence: 0.90, last_message_at: "2026-03-13T12:30:00Z" },
    web: { message_count: 182, avg_response_time: 0.9, avg_confidence: 0.94, last_message_at: "2026-03-13T14:10:00Z" },
  },
};

export const DEMO_CHANNEL_MESSAGES: ChannelMessage[] = [
  { id: "m1", from_id: "acme-mfg-01", content: "Need a quote for 50x SKF 6205-2Z bearings, delivery to our Houston plant", channel: "whatsapp", message_type: "quote_request", confidence: 0.95, response_content: null, response_time: 1.2, timestamp: "2026-03-13T14:22:00Z" },
  { id: "m2", from_id: "delta-proc@email.com", content: "Following up on PO-2026-0305 - when is the expected delivery?", channel: "email", message_type: "order_inquiry", confidence: 0.91, response_content: null, response_time: 8.4, timestamp: "2026-03-13T13:45:00Z" },
  { id: "m3", from_id: "+1-555-0142", content: "Check stock on Mobil SHC 630 5-gal pails", channel: "sms", message_type: "stock_check", confidence: 0.93, response_content: null, response_time: 1.5, timestamp: "2026-03-13T12:30:00Z" },
  { id: "m4", from_id: "web-visitor-8847", content: "Do you carry NSK angular contact bearings for CNC spindles?", channel: "web", message_type: "product_inquiry", confidence: 0.87, response_content: null, response_time: 0.8, timestamp: "2026-03-13T11:15:00Z" },
  { id: "m5", from_id: "coastal-fab-02", content: "Our invoice INV-2026-0519 shows paid but we need a receipt copy", channel: "whatsapp", message_type: "billing_inquiry", confidence: 0.89, response_content: null, response_time: 2.1, timestamp: "2026-03-12T16:40:00Z" },
  { id: "m6", from_id: "great-lakes@mro.com", content: "Need to set up a return for order ORD-2026-1041 - wrong belt size", channel: "email", message_type: "return_request", confidence: 0.94, response_content: null, response_time: 15.3, timestamp: "2026-03-12T14:20:00Z" },
  { id: "m7", from_id: "+1-555-0198", content: "What is lead time for WEG 10HP motors?", channel: "sms", message_type: "product_inquiry", confidence: 0.92, response_content: null, response_time: 1.8, timestamp: "2026-03-12T10:05:00Z" },
  { id: "m8", from_id: "web-visitor-8901", content: "I placed order ORD-2026-1046 yesterday - is tracking available yet?", channel: "web", message_type: "order_inquiry", confidence: 0.96, response_content: null, response_time: 0.6, timestamp: "2026-03-12T09:30:00Z" },
];

export const DEMO_ESCALATION_TICKETS: EscalationTicket[] = [
  { id: "e1", customer_id: "Acme Manufacturing", subject: "Recurring bearing failure in production line 4", description: null, priority: "high", status: "open", assigned_to: "Mike Torres", created_at: "2026-03-12T10:30:00Z", updated_at: "2026-03-12T14:15:00Z" },
  { id: "e2", customer_id: "Great Lakes MRO", subject: "Dispute on invoice INV-2026-0513 - overdue balance", description: null, priority: "medium", status: "in_progress", assigned_to: "Sarah Chen", created_at: "2026-03-11T09:00:00Z", updated_at: "2026-03-12T11:30:00Z" },
  { id: "e3", customer_id: "Rodriguez Machining Co", subject: "Defective belt batch - warranty claim for BLT-GATES-B68", description: null, priority: "high", status: "open", assigned_to: "Mike Torres", created_at: "2026-03-10T14:20:00Z", updated_at: "2026-03-11T09:45:00Z" },
  { id: "e4", customer_id: "Pacific Equipment & Supply", subject: "Motor DOA - urgent replacement needed for plant shutdown", description: null, priority: "critical", status: "in_progress", assigned_to: "James Rivera", created_at: "2026-03-09T08:15:00Z", updated_at: "2026-03-10T16:00:00Z" },
  { id: "e5", customer_id: "Delta Processing Corp", subject: "Pricing discrepancy on bulk fastener order", description: null, priority: "low", status: "resolved", assigned_to: "Sarah Chen", created_at: "2026-03-07T11:00:00Z", updated_at: "2026-03-09T13:20:00Z" },
  { id: "e6", customer_id: "Midwest Industrial Services", subject: "Shipping damage claim for order ORD-2026-1037", description: null, priority: "medium", status: "open", assigned_to: null, created_at: "2026-03-06T15:45:00Z", updated_at: "2026-03-07T08:30:00Z" },
];
