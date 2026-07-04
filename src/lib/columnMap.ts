// Map Arabic + English header variants -> canonical field
export const COLUMN_ALIASES: Record<string, string[]> = {
  clientName: ["client_name", "customer", "customer_name", "اسم العميل", "العميل", "الشركة"],
  clientCode: ["client_code", "code", "كود العميل", "كود"],
  orderDate: ["order_date", "date", "تاريخ الطلب", "التاريخ", "تاريخ"],
  deliveryDate: ["delivery_date", "تاريخ التسليم", "التسليم"],
  invoiceDate: ["invoice_date", "تاريخ الفاتورة"],
  jobOrderNumber: ["job_order_number", "job_order", "order_no", "رقم أمر الشغل", "أمر شغل", "رقم الطلب"],
  invoiceNumber: ["invoice_number", "invoice_no", "رقم الفاتورة", "فاتورة"],
  productName: ["product_name", "product", "item", "اسم المنتج", "المنتج", "الصنف"],
  productCategory: ["product_category", "category", "الفئة", "التصنيف"],
  printingType: ["printing_type", "print_type", "نوع الطباعة"],
  quantity: ["quantity", "qty", "الكمية", "كمية"],
  unitPrice: ["unit_price", "price", "سعر الوحدة", "السعر"],
  totalValue: ["total_value", "total", "amount", "الاجمالي", "الإجمالي", "القيمة"],
  material: ["material", "الخامة"],
  finishing: ["finishing", "التشطيب", "تشطيب"],
  salesperson: ["salesperson", "sales", "المندوب", "مندوب المبيعات"],
  status: ["status", "الحالة"],
  notes: ["notes", "ملاحظات"],
};

export const CANONICAL_FIELDS = Object.keys(COLUMN_ALIASES);

export function normalizeHeader(h: string): string {
  return String(h ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function autoDetectMapping(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const field of CANONICAL_FIELDS) {
    const aliases = COLUMN_ALIASES[field].map(normalizeHeader);
    const found = headers.find((h) => aliases.includes(normalizeHeader(h)));
    if (found) map[field] = found;
  }
  return map;
}

export function parseDate(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // Try dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[,\s]/g, "").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}