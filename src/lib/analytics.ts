import { Transaction } from "./types";

/* ============ Formatting ============ */
export function fmtNum(n: number, digits = 0): string {
  return new Intl.NumberFormat("ar-EG", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n || 0);
}
export function fmtCurrency(n: number): string { return fmtNum(n, 0) + " ج.م"; }
export function fmtDate(d?: string): string {
  if (!d) return "—";
  try { return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(d)); }
  catch { return d; }
}
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
export const TODAY = () => new Date().toISOString().slice(0, 10);

/* ============ Core aggregates ============ */
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

export function byYear(tx: Transaction[]) {
  const map = new Map<number, Transaction[]>();
  tx.forEach((t) => { if (!map.has(t.year)) map.set(t.year, []); map.get(t.year)!.push(t); });
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([year, arr]) => {
    const sales = totalSales(arr), orders = ordersCount(arr);
    return {
      year, sales, orders,
      products: new Set(arr.map((t) => t.productName)).size,
      aov: orders ? sales / orders : 0,
    };
  });
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

export function cagr(tx: Transaction[]): number {
  const y = byYear(tx).filter((r) => r.sales > 0);
  if (y.length < 3) return 0;
  const first = y[0].sales, last = y[y.length - 1].sales;
  const years = y[y.length - 1].year - y[0].year;
  if (!first || years <= 0) return 0;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

export function trendLabel(growth: number): "نمو قوي" | "نمو مستقر" | "تراجع" | "يحتاج تنشيط" {
  if (growth >= 20) return "نمو قوي";
  if (growth >= 5) return "نمو مستقر";
  if (growth >= -15) return "تراجع";
  return "يحتاج تنشيط";
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

/* ============ Client analytics ============ */
export function clientSummary(tx: Transaction[], clientId: string) {
  const arr = tx.filter((t) => t.clientId === clientId);
  if (!arr.length) return null;
  const sales = totalSales(arr);
  const orders = ordersCount(arr);
  const last = arr.reduce((m, t) => (t.orderDate > m ? t.orderDate : m), "");
  const first = arr.reduce((m, t) => (!m || t.orderDate < m ? t.orderDate : m), "");
  const products = new Set(arr.map((t) => t.productName)).size;
  const growth = yoyGrowth(arr);
  const daysSince = last ? daysBetween(last, TODAY()) : 9999;
  const yrs = byYear(arr);
  const bestYear = yrs.length ? [...yrs].sort((a, b) => b.sales - a.sales)[0] : null;
  const worstYear = yrs.length ? [...yrs].filter((y) => y.sales > 0).sort((a, b) => a.sales - b.sales)[0] : null;
  return {
    sales, orders, last, first, products, growth, daysSince,
    aov: orders ? sales / orders : 0, tx: arr,
    bestYear, worstYear, cagr: cagr(arr),
  };
}

/** Health score: Recency 25 · Frequency 20 · Revenue 20 · Growth 20 · Diversity 15 */
export function healthScore(tx: Transaction[], clientId: string): number {
  const s = clientSummary(tx, clientId);
  if (!s) return 0;
  const recency =
    s.daysSince <= 30 ? 25 :
    s.daysSince <= 60 ? 22 :
    s.daysSince <= 90 ? 18 :
    s.daysSince <= 180 ? 10 :
    s.daysSince <= 365 ? 4 : 0;
  const freq = Math.min(20, Math.round(s.orders / 2));
  const revScore = Math.min(20, Math.round(Math.log10(Math.max(1, s.sales)) * 4));
  const growth =
    s.growth >= 25 ? 20 :
    s.growth >= 10 ? 16 :
    s.growth >= 0 ? 12 :
    s.growth >= -15 ? 6 : 0;
  const diversity = Math.min(15, s.products * 2);
  return Math.min(100, recency + freq + revScore + growth + diversity);
}

export type ClientStatus = "VIP" | "نشط" | "نمو" | "خطر" | "مفقود" | "موسمي" | "منتجات محدودة";
export function clientStatus(tx: Transaction[], clientId: string): ClientStatus {
  const s = clientSummary(tx, clientId);
  if (!s) return "مفقود";
  if (s.daysSince > 365) return "مفقود";
  if (s.daysSince > 180) return "خطر";
  if (s.sales > 500000 && s.growth >= 15) return "VIP";
  if (s.products <= 2) return "منتجات محدودة";
  const months = new Set(s.tx.map((t) => t.month)).size;
  if (months <= 4 && s.orders >= 4) return "موسمي";
  if (s.growth >= 10) return "نمو";
  return "نشط";
}

/* ============ Reorder cycle ============ */
export type ReorderStatus = "طبيعي" | "اقترب موعد المتابعة" | "متأخر" | "متوقف";
export type ReorderRow = {
  clientId: string; clientName: string; product: string;
  firstOrder: string; lastOrder: string; orders: number;
  avgCycle: number; minCycle: number; maxCycle: number;
  nextExpected: string; delayDays: number;
  status: ReorderStatus;
  priority: "عاجل" | "مرتفع" | "متوسط" | "منخفض";
  recommendation: string;
  daysSince: number;
  revenue: number;
};

export function reorderStats(tx: Transaction[]): ReorderRow[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of tx) {
    const k = t.clientId + "||" + t.productName;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }
  const rows: ReorderRow[] = [];
  const today = TODAY();
  for (const [, arr] of groups) {
    arr.sort((a, b) => a.orderDate.localeCompare(b.orderDate));
    const last = arr[arr.length - 1];
    const first = arr[0];
    const revenue = totalSales(arr);
    const daysSince = daysBetween(last.orderDate, today);

    if (arr.length < 2) {
      const status: ReorderStatus = daysSince > 180 ? "متوقف" : "طبيعي";
      rows.push({
        clientId: last.clientId, clientName: last.clientName, product: last.productName,
        firstOrder: first.orderDate, lastOrder: last.orderDate, orders: arr.length,
        avgCycle: 0, minCycle: 0, maxCycle: 0,
        nextExpected: "—", delayDays: 0, status, daysSince, revenue,
        priority: status === "متوقف" ? "متوسط" : "منخفض",
        recommendation: status === "متوقف"
          ? `المنتج طُلب مرة واحدة فقط ولم يعد – فرصة لعرض عينة جديدة أو تشطيب مختلف.`
          : `طلب لأول مرة – راقب دورة إعادة الطلب في الفترة القادمة.`,
      });
      continue;
    }

    const cycles: number[] = [];
    for (let i = 1; i < arr.length; i++) cycles.push(daysBetween(arr[i - 1].orderDate, arr[i].orderDate));
    const avg = Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length);
    const minC = Math.min(...cycles);
    const maxC = Math.max(...cycles);

    const next = new Date(last.orderDate); next.setDate(next.getDate() + avg);
    const nextIso = next.toISOString().slice(0, 10);
    const delay = daysBetween(nextIso, today); // + = overdue

    let status: ReorderStatus;
    if (daysSince > 180 || (avg > 0 && daysSince > avg * 2)) status = "متوقف";
    else if (delay > 0) status = "متأخر";
    else if (delay >= -10) status = "اقترب موعد المتابعة";
    else status = "طبيعي";

    let priority: ReorderRow["priority"] = "منخفض";
    let recommendation = "";
    switch (status) {
      case "متوقف":
        priority = revenue > 100000 ? "عاجل" : "مرتفع";
        recommendation = `العميل توقف عن طلب "${last.productName}" منذ ${daysSince} يوم – نوصي بزيارة عاجلة وعرض عينة أو تشطيب فاخر (Spot UV / Foil) لإعادة تفعيل المنتج.`;
        break;
      case "متأخر":
        priority = delay > avg * 0.5 ? "عاجل" : "مرتفع";
        recommendation = `تأخر ${delay} يوم عن موعد إعادة الطلب – تواصل مباشر مع العميل مع عرض جدولة الإنتاج القادمة.`;
        break;
      case "اقترب موعد المتابعة":
        priority = "متوسط";
        recommendation = `موعد إعادة الطلب خلال ${Math.abs(delay)} يوم – تجهيز عرض سعر واقتراح كميات أعلى.`;
        break;
      case "طبيعي":
        priority = "منخفض";
        recommendation = `الدورة منتظمة (${avg} يوم) – فرصة لعرض منتجات مكملة أو تشطيبات إضافية.`;
        break;
    }

    rows.push({
      clientId: last.clientId, clientName: last.clientName, product: last.productName,
      firstOrder: first.orderDate, lastOrder: last.orderDate, orders: arr.length,
      avgCycle: avg, minCycle: minC, maxCycle: maxC,
      nextExpected: nextIso, delayDays: delay, status, priority,
      recommendation, daysSince, revenue,
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

/* ============ Product intelligence ============ */
export type ProductStatus = "نشط" | "متأخر" | "متوقف" | "جديد" | "موسمي" | "في نمو" | "متراجع";

export function productDetails(tx: Transaction[], productName: string) {
  const arr = tx.filter((t) => t.productName === productName).sort((a, b) => a.orderDate.localeCompare(b.orderDate));
  if (!arr.length) return null;
  const revenue = totalSales(arr);
  const orders = ordersCount(arr);
  const totalQty = arr.reduce((s, t) => s + t.quantity, 0);
  const first = arr[0].orderDate;
  const last = arr[arr.length - 1].orderDate;
  const durs = arr.filter((t) => t.deliveryDate).map((t) => daysBetween(t.orderDate, t.deliveryDate!)).filter((n) => n >= 0 && n < 365);
  const execAvg = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0;

  const cycles: number[] = [];
  for (let i = 1; i < arr.length; i++) cycles.push(daysBetween(arr[i - 1].orderDate, arr[i].orderDate));
  const avgCycle = cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0;
  const minCycle = cycles.length ? Math.min(...cycles) : 0;
  const maxCycle = cycles.length ? Math.max(...cycles) : 0;

  const avgPrice = arr.reduce((s, t) => s + t.unitPrice, 0) / arr.length;
  const firstPrice = arr[0].unitPrice, lastPrice = arr[arr.length - 1].unitPrice;
  const priceChange = firstPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const daysSince = daysBetween(last, TODAY());

  const yr = byYear(arr);
  const lastY = yr[yr.length - 1]?.sales || 0;
  const prevY = yr[yr.length - 2]?.sales || 0;
  const growth = prevY ? ((lastY - prevY) / prevY) * 100 : 0;
  const monthsSpan = new Set(arr.map((t) => t.month)).size;

  let status: ProductStatus;
  if (arr.length === 1 || daysBetween(first, TODAY()) < 120) status = "جديد";
  else if (daysSince > 180 || (avgCycle > 0 && daysSince > avgCycle * 2)) status = "متوقف";
  else if (avgCycle > 0 && daysSince > avgCycle) status = "متأخر";
  else if (monthsSpan <= 4 && arr.length >= 4) status = "موسمي";
  else if (growth >= 20) status = "في نمو";
  else if (growth <= -20) status = "متراجع";
  else status = "نشط";

  return {
    revenue, orders, totalQty, first, last,
    aov: orders ? revenue / orders : 0,
    execAvg, avgCycle, minCycle, maxCycle,
    avgPrice, priceChange, firstPrice, lastPrice,
    daysSince, status, tx: arr, growth,
  };
}

/* ============ Insights (Arabic, no external API) ============ */
const SERVICE_BULLETS = [
  "الطباعة الديجيتال والأوفست",
  "علب التغليف الفاخرة (Folding Carton)",
  "الاستيكرات والليبلز (Metallic & Transparent)",
  "تشطيبات فاخرة: Spot UV، Foil Stamping، Lamination",
  "حلول تغليف متخصصة للأغذية والدواء والكوزميتكس",
  "تقديم عينات قبل الكميات الكبيرة",
];

export function insightsForClient(tx: Transaction[], clientId: string): string[] {
  const s = clientSummary(tx, clientId);
  if (!s) return [];
  const out: string[] = [];
  const yrsCount = new Set(s.tx.map((t) => t.year)).size;
  out.push(`العميل حقق إجمالي مبيعات ${fmtCurrency(s.sales)} خلال ${yrsCount} ${yrsCount === 1 ? "سنة" : "سنوات"} عبر ${fmtNum(s.orders)} طلب و ${s.products} منتج مختلف.`);
  if (s.bestYear) out.push(`أعلى سنة كانت ${s.bestYear.year} بقيمة ${fmtCurrency(s.bestYear.sales)}.`);
  if (s.worstYear && s.worstYear.year !== s.bestYear?.year) out.push(`أضعف سنة كانت ${s.worstYear.year} بقيمة ${fmtCurrency(s.worstYear.sales)}.`);

  const topFreq = [...topProducts(s.tx, 20)].sort((a, b) => b.orders - a.orders)[0];
  const topRev = topProducts(s.tx, 1)[0];
  if (topFreq) out.push(`أكثر منتج تكرارًا هو "${topFreq.name}" بعدد ${topFreq.orders} طلب.`);
  if (topRev && topFreq && topRev.name !== topFreq.name) out.push(`أعلى منتج في المبيعات هو "${topRev.name}" بإيراد ${fmtCurrency(topRev.revenue)}.`);

  const cycles = reorderStats(s.tx).filter((r) => r.avgCycle > 0);
  if (cycles.length) {
    const avg = Math.round(cycles.reduce((a, b) => a + b.avgCycle, 0) / cycles.length);
    out.push(`متوسط إعادة الطلب حوالي ${avg} يوم، وآخر طلب كان منذ ${s.daysSince} يوم مما ${s.daysSince > avg ? "يشير إلى فرصة متابعة مباشرة" : "يعكس انتظام التعامل"}.`);
  } else {
    out.push(`آخر طلب كان منذ ${s.daysSince} يوم.`);
  }

  const lost = cycles.filter((r) => r.status === "متوقف" && r.orders >= 2);
  if (lost.length) out.push(`يوجد ${lost.length} ${lost.length === 1 ? "منتج" : "منتجات"} لم يعد العميل يطلبها – فرصة لإعادة تفعيلها.`);

  if (s.growth < -10) out.push(`تراجعت المبيعات بنسبة ${Math.abs(s.growth).toFixed(1)}% مقارنة بالسنة السابقة – يوصى بزيارة العميل وعرض حلول ترويجية وتشطيبات جديدة.`);
  else if (s.growth > 15) out.push(`نمو قوي بنسبة ${s.growth.toFixed(1)}% – فرصة ممتازة لعرض منتجات مكملة ورفع متوسط قيمة الطلب.`);

  if (topRev && topRev.revenue / s.sales > 0.6) out.push(`يوجد اعتماد مرتفع (${((topRev.revenue / s.sales) * 100).toFixed(0)}%) على منتج "${topRev.name}" – خطر تركّز يجب معالجته عبر البيع المتقاطع.`);

  out.push(`يوصى بالتواصل مع العميل لعرض خدمات السويدي بيت الطباعة: ${SERVICE_BULLETS.slice(0, 4).join("، ")}.`);
  return out;
}

export function executiveNarrative(tx: Transaction[]): string[] {
  const out: string[] = [];
  const y = byYear(tx);
  if (!y.length) return ["لا توجد بيانات بعد. ارفع شيت العملاء لبدء التحليل."];
  const sales = totalSales(tx), orders = ordersCount(tx), clients = uniqueClients(tx);
  const g = yoyGrowth(tx), c = cagr(tx);
  out.push(`إجمالي مبيعات المنصة ${fmtCurrency(sales)} عبر ${fmtNum(orders)} طلب و ${clients} عميل نشط بمتوسط قيمة طلب ${fmtCurrency(avgOrderValue(tx))}.`);
  const bestY = [...y].sort((a, b) => b.sales - a.sales)[0];
  out.push(`أعلى سنة أداءً كانت ${bestY.year} بإيرادات ${fmtCurrency(bestY.sales)}.`);
  out.push(`النمو السنوي الحالي ${g.toFixed(1)}%${c ? ` والنمو المركب (CAGR) ${c.toFixed(1)}%` : ""} – الاتجاه العام: ${trendLabel(g)}.`);
  const tc = topClient(tx);
  if (tc) out.push(`أفضل عميل: ${tc.name} بمبيعات ${fmtCurrency(tc.revenue)}.`);
  const tp = topProducts(tx, 1)[0];
  if (tp) out.push(`المنتج الأعلى مبيعًا: ${tp.name} بإيراد ${fmtCurrency(tp.revenue)}.`);
  const alerts = generateOpportunities(tx);
  const urgent = alerts.filter((a) => a.priority === "عاجل").length;
  out.push(`يوجد ${alerts.length} فرصة بيع نشطة، منها ${urgent} فرصة بأولوية عاجلة تستدعي متابعة فورية.`);
  return out;
}

/* ============ Opportunity engine ============ */
export type OpportunityKind =
  | "reorder" | "lost_product" | "slowdown" | "cross_sell"
  | "upsell" | "seasonal" | "dependency" | "reactivate";

export type Opportunity = {
  kind: OpportunityKind;
  label: string;
  clientId?: string;
  clientName?: string;
  product?: string;
  reason: string;
  impact: string;
  priority: "عاجل" | "مرتفع" | "متوسط" | "منخفض";
  action: string;
  color: "red" | "gold" | "success" | "navy";
};

const MONTH_NAMES_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export function generateOpportunities(tx: Transaction[]): Opportunity[] {
  const out: Opportunity[] = [];
  const cycles = reorderStats(tx);

  for (const r of cycles) {
    if (r.status === "متأخر" || r.status === "اقترب موعد المتابعة") {
      out.push({
        kind: "reorder", label: "متابعة إعادة طلب", color: "gold",
        clientId: r.clientId, clientName: r.clientName, product: r.product,
        reason: `آخر طلب ${fmtDate(r.lastOrder)} • متوسط الدورة ${r.avgCycle} يوم • ${r.delayDays > 0 ? `متأخر ${r.delayDays} يوم` : `الموعد خلال ${Math.abs(r.delayDays)} يوم`}.`,
        impact: `إيراد متوقع ${fmtCurrency(r.revenue / Math.max(1, r.orders))} لكل طلب.`,
        priority: r.priority,
        action: `تواصل مباشر مع العميل وتجهيز عرض سعر للمنتج مع اقتراح كمية أعلى.`,
      });
    }
    if (r.status === "متوقف" && r.orders >= 2) {
      out.push({
        kind: "lost_product", label: "منتج متوقف", color: "red",
        clientId: r.clientId, clientName: r.clientName, product: r.product,
        reason: `العميل توقف عن طلب "${r.product}" منذ ${r.daysSince} يوم (تاريخ آخر طلب ${fmtDate(r.lastOrder)}).`,
        impact: `منتج فقد إيراد إجمالي بلغ ${fmtCurrency(r.revenue)}.`,
        priority: r.revenue > 100000 ? "عاجل" : "مرتفع",
        action: `زيارة عاجلة للعميل، تقديم عينة جديدة، وعرض تشطيب فاخر (Spot UV / Foil) لإعادة تنشيط الطلب.`,
      });
    }
  }

  const clientIds = [...new Set(tx.map((t) => t.clientId))];
  for (const cid of clientIds) {
    const s = clientSummary(tx, cid); if (!s) continue;
    const client = s.tx[0].clientName;

    if (s.growth < -15 && s.growth > -80 && s.daysSince <= 180) out.push({
      kind: "slowdown", label: "تباطؤ نمو", color: "red",
      clientId: cid, clientName: client,
      reason: `تراجعت مبيعات العميل بنسبة ${Math.abs(s.growth).toFixed(1)}% مقارنة بالعام السابق.`,
      impact: `خطر خسارة ${fmtCurrency(Math.abs(s.sales * s.growth / 100))} خلال السنة الحالية.`,
      priority: "مرتفع",
      action: `زيارة مبيعات لفهم أسباب التباطؤ وعرض حزمة أسعار وتشطيبات جديدة.`,
    });

    const topRev = topProducts(s.tx, 1)[0];
    if (topRev && topRev.revenue / s.sales > 0.6) out.push({
      kind: "dependency", label: "اعتماد مرتفع على منتج", color: "gold",
      clientId: cid, clientName: client, product: topRev.name,
      reason: `${((topRev.revenue / s.sales) * 100).toFixed(0)}% من مبيعات العميل تعتمد على "${topRev.name}".`,
      impact: `خطر مرتفع في حال توقّف هذا المنتج – تركّز إيرادي.`,
      priority: "مرتفع",
      action: `اقتراح باقة متكاملة (علب + استيكرات + ليبلز) لتنويع محفظة المنتجات وتقليل المخاطر.`,
    });

    if (s.daysSince > 180 && s.daysSince <= 540) out.push({
      kind: "reactivate", label: "إعادة تنشيط عميل", color: "gold",
      clientId: cid, clientName: client,
      reason: `العميل لم يطلب منذ ${s.daysSince} يوم.`,
      impact: `فرصة استعادة عميل بإيراد سنوي متوسط ${fmtCurrency(s.sales / Math.max(1, new Set(s.tx.map((t) => t.year)).size))}.`,
      priority: s.sales > 200000 ? "عاجل" : "مرتفع",
      action: `حملة إعادة تنشيط: اتصال مباشر، تقديم عينات مجانية، وعرض حزمة تشطيبات فاخرة.`,
    });

    if (s.products <= 3 && s.orders >= 5) {
      const missing = suggestCrossSell(s.tx);
      out.push({
        kind: "cross_sell", label: "بيع متقاطع", color: "success",
        clientId: cid, clientName: client,
        reason: `العميل يعتمد على ${s.products} منتجات فقط رغم تكرار ${s.orders} طلب.`,
        impact: `إمكانية زيادة متوسط قيمة الطلب بنسبة 20-40%.`,
        priority: "متوسط",
        action: missing.length
          ? `اقتراح إضافة: ${missing.join("، ")}.`
          : `عرض حزمة متكاملة (علب تغليف + استيكرات + ليبلز).`,
      });
    }

    if (s.sales > 100000 && topRev) out.push({
      kind: "upsell", label: "بيع أعلى (Upsell)", color: "success",
      clientId: cid, clientName: client, product: topRev.name,
      reason: `العميل يكرر طلب "${topRev.name}" ويمكن رفع قيمته بتشطيبات فاخرة.`,
      impact: `زيادة إيراد المنتج المتوقعة 15-25% مع تشطيب Spot UV أو Foil Stamping.`,
      priority: "متوسط",
      action: `تقديم عينة بتشطيب فاخر وعرض سعر مقارن للتشطيب العادي والفاخر.`,
    });

    // Seasonal
    const monthCounts = new Array(12).fill(0);
    for (const t of s.tx) monthCounts[t.month - 1] += t.totalValue || t.quantity * t.unitPrice;
    const maxM = monthCounts.indexOf(Math.max(...monthCounts));
    const totalM = monthCounts.reduce((a, b) => a + b, 0);
    if (totalM > 0 && monthCounts[maxM] / totalM > 0.28) {
      const today = new Date();
      const daysToPeak = (((maxM - today.getMonth()) + 12) % 12) * 30;
      if (daysToPeak <= 90 && daysToPeak > 0) out.push({
        kind: "seasonal", label: "تذكير موسمي", color: "gold",
        clientId: cid, clientName: client,
        reason: `يتركّز نشاط العميل في شهر ${MONTH_NAMES_AR[maxM]} (~${((monthCounts[maxM] / totalM) * 100).toFixed(0)}% من مبيعاته).`,
        impact: `توقيت مثالي لعرض سعر مسبق قبل موسم الذروة.`,
        priority: "متوسط",
        action: `تجهيز عرض سعر موسمي وحجز طاقة إنتاجية مسبقة قبل ${MONTH_NAMES_AR[maxM]}.`,
      });
    }
  }

  const P = { عاجل: 0, مرتفع: 1, متوسط: 2, منخفض: 3 } as const;
  return out.sort((a, b) => P[a.priority] - P[b.priority]);
}

function suggestCrossSell(arr: Transaction[]): string[] {
  const cats = new Set(arr.map((t) => (t.productCategory || "").toLowerCase()));
  const types = new Set(arr.map((t) => (t.printingType || "").toLowerCase()));
  const missing: string[] = [];
  const has = (needle: string) =>
    [...cats, ...types, ...arr.map((t) => t.productName.toLowerCase())].some((s) => s.includes(needle));
  if (!has("استيكر") && !has("sticker")) missing.push("استيكرات");
  if (!has("ليبل") && !has("label")) missing.push("ليبلز");
  if (!has("تشطيب") && !has("finish") && !has("foil") && !has("uv")) missing.push("تشطيبات فاخرة (Spot UV / Foil)");
  if (!has("علب") && !has("packag") && !has("carton")) missing.push("علب تغليف");
  return missing.slice(0, 2);
}

// Back-compat alias
export const generateAlerts = generateOpportunities;

/* ============ Sector aggregation ============ */
export function bySector(tx: Transaction[], clients: { id: string; sector?: string; name: string }[]) {
  const map = new Map<string, { sector: string; sales: number; orders: number; clients: Set<string> }>();
  const cmap = new Map(clients.map((c) => [c.id, c]));
  for (const t of tx) {
    const c = cmap.get(t.clientId);
    const sector = c?.sector || "غير محدد";
    if (!map.has(sector)) map.set(sector, { sector, sales: 0, orders: 0, clients: new Set() });
    const cur = map.get(sector)!;
    cur.sales += t.totalValue || t.quantity * t.unitPrice;
    cur.orders += 1;
    cur.clients.add(t.clientId);
  }
  return [...map.values()].map((s) => ({ sector: s.sector, sales: s.sales, orders: s.orders, clients: s.clients.size })).sort((a, b) => b.sales - a.sales);
}