import { Transaction } from "./types";

export function fmtNum(n: number, digits = 0): string {
  return new Intl.NumberFormat("ar-EG", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n || 0);
}
export function fmtCurrency(n: number): string {
  return fmtNum(n, 0) + " ج.م";
}
export function fmtDate(d?: string): string {
  if (!d) return "—";
  try { return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(d)); }
  catch { return d; }
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function totalSales(tx: Transaction[]): number {
  return tx.reduce((s, t) => s + (t.totalValue || t.quantity * t.unitPrice || 0), 0);
}

export function ordersCount(tx: Transaction[]): number {
  const set = new Set<string>();
  let anon = 0;
  for (const t of tx) {
    if (t.jobOrderNumber) set.add(t.clientId + "|" + t.jobOrderNumber);
    else anon++;
  }
  return set.size + anon;
}

export function avgOrderValue(tx: Transaction[]): number {
  const oc = ordersCount(tx);
  return oc ? totalSales(tx) / oc : 0;
}

export function uniqueClients(tx: Transaction[]): number {
  return new Set(tx.map((t) => t.clientId)).size;
}

export function byYear(tx: Transaction[]): { year: number; sales: number; orders: number }[] {
  const map = new Map<number, Transaction[]>();
  tx.forEach((t) => { if (!map.has(t.year)) map.set(t.year, []); map.get(t.year)!.push(t); });
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([year, arr]) => ({
    year, sales: totalSales(arr), orders: ordersCount(arr),
  }));
}

export function byMonth(tx: Transaction[], year?: number) {
  const arr = year ? tx.filter((t) => t.year === year) : tx;
  const buckets: Record<string, Transaction[]> = {};
  arr.forEach((t) => {
    const k = `${t.year}-${String(t.month).padStart(2, "0")}`;
    (buckets[k] ||= []).push(t);
  });
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ month: k, sales: totalSales(v), orders: ordersCount(v) }));
}

export function topProducts(tx: Transaction[], limit = 10) {
  const map = new Map<string, { revenue: number; qty: number; orders: Set<string>; last: string }>();
  for (const t of tx) {
    const cur = map.get(t.productName) || { revenue: 0, qty: 0, orders: new Set(), last: "" };
    cur.revenue += t.totalValue || t.quantity * t.unitPrice;
    cur.qty += t.quantity;
    cur.orders.add(t.jobOrderNumber || t.id);
    if (!cur.last || t.orderDate > cur.last) cur.last = t.orderDate;
    map.set(t.productName, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, revenue: v.revenue, qty: v.qty, orders: v.orders.size, last: v.last }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function yoyGrowth(tx: Transaction[]): number {
  const y = byYear(tx);
  if (y.length < 2) return 0;
  const cur = y[y.length - 1].sales, prev = y[y.length - 2].sales;
  return prev ? ((cur - prev) / prev) * 100 : 0;
}

export function topClient(tx: Transaction[]) {
  const map = new Map<string, { name: string; revenue: number }>();
  for (const t of tx) {
    const cur = map.get(t.clientId) || { name: t.clientName, revenue: 0 };
    cur.revenue += t.totalValue || t.quantity * t.unitPrice;
    map.set(t.clientId, cur);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)[0];
}

export function clientSummary(tx: Transaction[], clientId: string) {
  const arr = tx.filter((t) => t.clientId === clientId);
  if (!arr.length) return null;
  const sales = totalSales(arr);
  const orders = ordersCount(arr);
  const last = arr.reduce((m, t) => (t.orderDate > m ? t.orderDate : m), "");
  const first = arr.reduce((m, t) => (!m || t.orderDate < m ? t.orderDate : m), "");
  const products = new Set(arr.map((t) => t.productName)).size;
  const growth = yoyGrowth(arr);
  const daysSince = last ? daysBetween(last, new Date().toISOString().slice(0, 10)) : 9999;
  return { sales, orders, last, first, products, growth, daysSince, aov: orders ? sales / orders : 0, tx: arr };
}

export function healthScore(tx: Transaction[], clientId: string): number {
  const s = clientSummary(tx, clientId);
  if (!s) return 0;
  // Recency (30), Frequency (20), Revenue (20), Growth (15), Diversity (15)
  const recency = s.daysSince <= 30 ? 30 : s.daysSince <= 90 ? 22 : s.daysSince <= 180 ? 12 : s.daysSince <= 365 ? 5 : 0;
  const freq = Math.min(20, s.orders / 3);
  const revScore = Math.min(20, Math.log10(Math.max(1, s.sales)) * 4);
  const growth = s.growth >= 20 ? 15 : s.growth >= 0 ? 10 : s.growth >= -20 ? 5 : 0;
  const diversity = Math.min(15, s.products * 2);
  return Math.round(recency + freq + revScore + growth + diversity);
}

export type ClientStatus = "VIP" | "نمو" | "خطر" | "مفقود" | "موسمي" | "منتجات محدودة";
export function clientStatus(tx: Transaction[], clientId: string): ClientStatus {
  const s = clientSummary(tx, clientId);
  if (!s) return "مفقود";
  if (s.daysSince > 365) return "مفقود";
  if (s.daysSince > 180) return "خطر";
  if (s.products <= 2) return "منتجات محدودة";
  if (s.growth >= 20 && s.sales > 100000) return "VIP";
  if (s.growth >= 10) return "نمو";
  const months = new Set(s.tx.map((t) => t.month)).size;
  if (months <= 4) return "موسمي";
  return "نمو";
}

// Reorder cycle per (client, product)
export function reorderStats(tx: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const t of tx) {
    const k = t.clientId + "||" + t.productName;
    (groups.get(k) || groups.set(k, []).get(k)!).push(t);
  }
  const rows: {
    clientId: string; clientName: string; product: string;
    lastOrder: string; orders: number; avgCycle: number;
    nextExpected: string; delayDays: number;
    status: "طبيعي" | "اقترب موعد المتابعة" | "متأخر" | "متوقف";
  }[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const [k, arr] of groups) {
    arr.sort((a, b) => a.orderDate.localeCompare(b.orderDate));
    if (arr.length < 2) {
      const last = arr[arr.length - 1];
      rows.push({
        clientId: last.clientId, clientName: last.clientName, product: last.productName,
        lastOrder: last.orderDate, orders: arr.length, avgCycle: 0,
        nextExpected: "—", delayDays: 0, status: "طبيعي",
      });
      continue;
    }
    let sum = 0, n = 0;
    for (let i = 1; i < arr.length; i++) { sum += daysBetween(arr[i - 1].orderDate, arr[i].orderDate); n++; }
    const avg = Math.round(sum / n);
    const last = arr[arr.length - 1];
    const next = new Date(last.orderDate); next.setDate(next.getDate() + avg);
    const nextIso = next.toISOString().slice(0, 10);
    const delay = daysBetween(nextIso, today);
    let status: "طبيعي" | "اقترب موعد المتابعة" | "متأخر" | "متوقف" = "طبيعي";
    if (delay > avg * 2) status = "متوقف";
    else if (delay > 0) status = "متأخر";
    else if (delay > -Math.max(7, avg * 0.2)) status = "اقترب موعد المتابعة";
    rows.push({
      clientId: last.clientId, clientName: last.clientName, product: last.productName,
      lastOrder: last.orderDate, orders: arr.length, avgCycle: avg,
      nextExpected: nextIso, delayDays: delay, status,
    });
  }
  return rows;
}

export function executionDurationAvg(tx: Transaction[]): number {
  const durations = tx
    .filter((t) => t.deliveryDate)
    .map((t) => daysBetween(t.orderDate, t.deliveryDate!))
    .filter((n) => n >= 0 && n < 365);
  if (!durations.length) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

export function productDetails(tx: Transaction[], productName: string) {
  const arr = tx.filter((t) => t.productName === productName).sort((a, b) => a.orderDate.localeCompare(b.orderDate));
  if (!arr.length) return null;
  const revenue = totalSales(arr);
  const orders = ordersCount(arr);
  const first = arr[0].orderDate;
  const last = arr[arr.length - 1].orderDate;
  const durs = arr.filter((t) => t.deliveryDate).map((t) => daysBetween(t.orderDate, t.deliveryDate!));
  const execAvg = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0;
  const cycles: number[] = [];
  for (let i = 1; i < arr.length; i++) cycles.push(daysBetween(arr[i - 1].orderDate, arr[i].orderDate));
  const avgCycle = cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0;
  const firstPrice = arr[0].unitPrice, lastPrice = arr[arr.length - 1].unitPrice;
  const priceChange = firstPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const daysSince = daysBetween(last, new Date().toISOString().slice(0, 10));
  const status = daysSince <= avgCycle ? "نشط" : daysSince <= avgCycle * 2 ? "متباطئ" : "متوقف";
  return { revenue, orders, first, last, aov: orders ? revenue / orders : 0, execAvg, avgCycle, priceChange, status, tx: arr };
}

export function insightsForClient(tx: Transaction[], clientId: string): string[] {
  const s = clientSummary(tx, clientId);
  if (!s) return [];
  const out: string[] = [];
  out.push(`العميل حقق إجمالي مبيعات ${fmtCurrency(s.sales)} عبر ${fmtNum(s.orders)} طلب و ${s.products} منتج.`);
  const yrs = byYear(s.tx);
  if (yrs.length) {
    const best = [...yrs].sort((a, b) => b.sales - a.sales)[0];
    out.push(`أعلى سنة كانت ${best.year} بإجمالي ${fmtCurrency(best.sales)}.`);
  }
  const top = topProducts(s.tx, 1)[0];
  if (top) out.push(`أكثر منتج تكرارًا هو "${top.name}" بإيراد ${fmtCurrency(top.revenue)}.`);
  const cycles = reorderStats(s.tx).filter((r) => r.avgCycle > 0);
  if (cycles.length) {
    const avg = Math.round(cycles.reduce((a, b) => a + b.avgCycle, 0) / cycles.length);
    out.push(`متوسط إعادة الطلب حوالي ${avg} يوم.`);
  }
  out.push(`آخر طلب كان منذ ${s.daysSince} يوم.`);
  if (s.growth < 0) out.push(`المبيعات تراجعت بنسبة ${Math.abs(s.growth).toFixed(1)}% مقارنة بالسنة السابقة – يوصى بزيارة العميل وعرض حلول ترويجية.`);
  else if (s.growth > 0) out.push(`المبيعات نمت بنسبة ${s.growth.toFixed(1)}% – فرصة لعرض منتجات إضافية أو تشطيبات فاخرة.`);
  out.push(`يوصى بالتواصل بخصوص خدمات السويدي بيت الطباعة: الطباعة الديجيتال، الأوفست، علب التغليف، الاستيكرات والليبلز، والتشطيبات الفاخرة.`);
  return out;
}

export function generateAlerts(tx: Transaction[]) {
  type Alert = { kind: string; label: string; color: string; clientId?: string; clientName?: string; product?: string; detail: string; };
  const alerts: Alert[] = [];
  const cycles = reorderStats(tx);
  for (const r of cycles) {
    if (r.status === "متأخر" || r.status === "اقترب موعد المتابعة") {
      alerts.push({
        kind: "reorder", label: "متابعة إعادة طلب", color: "gold",
        clientId: r.clientId, clientName: r.clientName, product: r.product,
        detail: `آخر طلب ${fmtDate(r.lastOrder)} • متوسط الدورة ${r.avgCycle} يوم • ${r.delayDays > 0 ? `متأخر ${r.delayDays} يوم` : "اقترب الموعد"}.`,
      });
    }
    if (r.status === "متوقف" && r.orders >= 2) {
      alerts.push({
        kind: "lost_product", label: "منتج متوقف", color: "red",
        clientId: r.clientId, clientName: r.clientName, product: r.product,
        detail: `العميل توقف عن طلب "${r.product}" منذ ${fmtDate(r.lastOrder)}.`,
      });
    }
  }
  // Growth slowdown per client
  const clientIds = [...new Set(tx.map((t) => t.clientId))];
  for (const cid of clientIds) {
    const s = clientSummary(tx, cid); if (!s) continue;
    if (s.growth < -15) alerts.push({
      kind: "slowdown", label: "تباطؤ نمو", color: "red",
      clientId: cid, clientName: s.tx[0].clientName,
      detail: `تراجع المبيعات ${Math.abs(s.growth).toFixed(1)}% مقارنة بالعام السابق.`,
    });
    // High dependency
    const top = topProducts(s.tx, 1)[0];
    if (top && top.revenue / s.sales > 0.6) alerts.push({
      kind: "dependency", label: "اعتماد مرتفع على منتج", color: "gold",
      clientId: cid, clientName: s.tx[0].clientName, product: top.name,
      detail: `${((top.revenue / s.sales) * 100).toFixed(0)}% من مبيعات العميل تعتمد على "${top.name}" – فرصة للبيع المتقاطع.`,
    });
    // Reactivation
    if (s.daysSince > 180 && s.daysSince <= 365) alerts.push({
      kind: "reactivate", label: "إعادة تنشيط", color: "gold",
      clientId: cid, clientName: s.tx[0].clientName,
      detail: `العميل لم يطلب منذ ${s.daysSince} يوم – ننصح بحملة إعادة تنشيط.`,
    });
    // Upsell / cross-sell
    if (s.products <= 3 && s.orders >= 5) alerts.push({
      kind: "cross_sell", label: "بيع متقاطع", color: "success",
      clientId: cid, clientName: s.tx[0].clientName,
      detail: `العميل يعتمد على ${s.products} منتجات فقط – فرصة لعرض علب التغليف الفاخرة والاستيكرات.`,
    });
  }
  // Seasonal reminder – for clients concentrated in specific months
  return alerts;
}