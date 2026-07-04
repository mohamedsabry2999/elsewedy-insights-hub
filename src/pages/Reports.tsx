import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { store } from "@/lib/store";
import {
  clientSummary, insightsForClient, topProducts, reorderStats, byYear,
  totalSales, ordersCount, fmtCurrency, fmtDate, fmtNum, uniqueClients, avgOrderValue, yoyGrowth, topClient,
  executiveNarrative, generateOpportunities, cagr, trendLabel,
} from "@/lib/analytics";
import { Printer, FileText } from "lucide-react";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-base font-bold text-brand-navy num mt-0.5">{value}</div>
    </div>
  );
}

type ReportKind =
  | "client_annual" | "multi_year_growth" | "product_reorder"
  | "lost_products" | "sales_visit" | "executive_summary" | "opportunities";

const REPORTS: { id: ReportKind; label: string }[] = [
  { id: "executive_summary", label: "الملخص التنفيذي" },
  { id: "client_annual", label: "التقرير السنوي للعميل" },
  { id: "multi_year_growth", label: "تقرير النمو متعدد السنوات" },
  { id: "product_reorder", label: "تقرير إعادة طلب المنتجات" },
  { id: "lost_products", label: "تقرير المنتجات المتوقفة" },
  { id: "opportunities", label: "تقرير فرص البيع" },
  { id: "sales_visit", label: "تقرير زيارة مبيعات" },
];

export default function Reports() {
  const clients = store.getClients();
  const tx = store.getTransactions();
  const [kind, setKind] = useState<ReportKind>("executive_summary");
  const [clientId, setClientId] = useState<string>(clients[0]?.id || "");

  const needsClient = kind !== "executive_summary" && kind !== "multi_year_growth" && kind !== "lost_products";
  const client = clients.find((c) => c.id === clientId);

  const body = useMemo(() => renderReport(kind, tx, client?.id), [kind, tx, client?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقارير"
        subtitle="تقارير عربية جاهزة للطباعة والتصدير: سنوية، إعادة طلب، منتجات متوقفة، ملخص تنفيذي."
        actions={
          <Button onClick={() => window.print()} className="bg-brand-navy text-primary-foreground hover:bg-brand-navy/90">
            <Printer className="w-4 h-4 ml-2" /> طباعة / PDF
          </Button>
        }
      />

      <div className="flex gap-3 flex-wrap print:hidden">
        <Select value={kind} onValueChange={(v) => setKind(v as ReportKind)}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>{REPORTS.map((r) => (<SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>))}</SelectContent>
        </Select>
        {needsClient && (
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="اختر عميلًا" /></SelectTrigger>
            <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
          </Select>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-8 print:border-0 print:shadow-none" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div>
            <div className="text-xs text-muted-foreground">Elsewedy Print House</div>
            <div className="font-bold text-brand-navy text-lg">السويدي بيت الطباعة – مركز ذكاء العملاء</div>
          </div>
          <div className="text-xs text-muted-foreground text-left">
            <div className="flex items-center gap-1 justify-end"><FileText className="w-3.5 h-3.5" /> {REPORTS.find((r) => r.id === kind)?.label}</div>
            <div>{new Intl.DateTimeFormat("ar-EG", { dateStyle: "long" }).format(new Date())}</div>
          </div>
        </div>
        {body}
      </div>
    </div>
  );
}

function renderReport(kind: ReportKind, tx: any[], clientId?: string) {
  const _unused = clientId; void _unused;
  switch (kind) {
    case "executive_summary": {
      const y = byYear(tx);
      const narrative = executiveNarrative(tx);
      const opps = generateOpportunities(tx);
      const urgent = opps.filter((o) => o.priority === "عاجل").slice(0, 6);
      const prods = topProducts(tx, 6);
      return (
        <div className="space-y-5 text-sm leading-loose">
          <h2 className="text-xl font-bold text-brand-navy">الملخص التنفيذي للإدارة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="إجمالي المبيعات" value={fmtCurrency(totalSales(tx))} />
            <Kpi label="الطلبات" value={fmtNum(ordersCount(tx))} />
            <Kpi label="العملاء" value={fmtNum(uniqueClients(tx))} />
            <Kpi label="متوسط الطلب" value={fmtCurrency(avgOrderValue(tx))} />
            <Kpi label="نمو سنوي" value={`${yoyGrowth(tx).toFixed(1)}%`} />
            <Kpi label="CAGR" value={cagr(tx) ? `${cagr(tx).toFixed(1)}%` : "—"} />
            <Kpi label="الاتجاه" value={trendLabel(yoyGrowth(tx))} />
            <Kpi label="فرص عاجلة" value={String(opps.filter((o)=>o.priority==="عاجل").length)} />
          </div>
          <ul className="list-disc pr-5 space-y-1.5">{narrative.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div>
            <h3 className="font-semibold mb-2">أداء السنوات:</h3>
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted/50 text-xs"><tr><th className="text-right p-2">السنة</th><th className="text-right p-2">المبيعات</th><th className="text-right p-2">الطلبات</th><th className="text-right p-2">تنوع المنتجات</th></tr></thead>
              <tbody>{y.map((r) => (<tr key={r.year} className="border-t border-border"><td className="p-2">{r.year}</td><td className="p-2 num">{fmtCurrency(r.sales)}</td><td className="p-2 num">{fmtNum(r.orders)}</td><td className="p-2 num">{r.products}</td></tr>))}</tbody>
            </table>
          </div>
          <div>
            <h3 className="font-semibold mb-2">أعلى المنتجات:</h3>
            <ul className="list-disc pr-5 space-y-0.5">
              {prods.map((p) => <li key={p.name}>{p.name} — <span className="num text-muted-foreground">{fmtCurrency(p.revenue)}</span></li>)}
            </ul>
          </div>
          {urgent.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">أهم الفرص العاجلة:</h3>
              <ul className="list-disc pr-5 space-y-1">
                {urgent.map((o, i) => <li key={i}><b>{o.label}</b> — {o.clientName}: {o.action}</li>)}
              </ul>
            </div>
          )}
          <p className="text-muted-foreground border-t border-border pt-3">
            التوصية للإدارة: التركيز على العملاء ذوي الاعتماد المرتفع لتقليل المخاطر، وتوسيع محفظة المنتجات عبر البيع المتقاطع (استيكرات وليبلز وتشطيبات فاخرة Spot UV / Foil Stamping)، مع إعادة تفعيل العملاء المتوقفين خلال الربع القادم.
          </p>
        </div>
      );
    }
    case "client_annual": {
      if (!clientId) return <p>اختر عميلًا.</p>;
      const s = clientSummary(tx, clientId); if (!s) return <p>لا توجد بيانات.</p>;
      const insights = insightsForClient(tx, clientId);
      const products = topProducts(s.tx, 10);
      return (
        <div className="space-y-5 text-sm leading-loose">
          <h2 className="text-xl font-bold text-brand-navy">التقرير السنوي للعميل: {s.tx[0].clientName}</h2>
          <ul className="space-y-1.5 list-disc pr-5">{insights.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div>
            <h3 className="font-semibold mb-2">أفضل المنتجات:</h3>
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted/50 text-xs"><tr><th className="text-right p-2">المنتج</th><th className="text-right p-2">الإيراد</th><th className="text-right p-2">الطلبات</th><th className="text-right p-2">آخر طلب</th></tr></thead>
              <tbody>{products.map((p) => (<tr key={p.name} className="border-t border-border"><td className="p-2">{p.name}</td><td className="p-2 num">{fmtCurrency(p.revenue)}</td><td className="p-2 num">{p.orders}</td><td className="p-2">{fmtDate(p.last)}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      );
    }
    case "multi_year_growth": {
      const y = byYear(tx);
      return (
        <div className="space-y-4 text-sm leading-loose">
          <h2 className="text-xl font-bold text-brand-navy">تقرير النمو متعدد السنوات</h2>
          <p>تحليل المبيعات والطلبات عبر السنوات المتاحة.</p>
          <table className="w-full text-sm border border-border">
            <thead className="bg-muted/50 text-xs"><tr><th className="text-right p-2">السنة</th><th className="text-right p-2">المبيعات</th><th className="text-right p-2">النمو</th><th className="text-right p-2">الطلبات</th></tr></thead>
            <tbody>{y.map((r, i) => {
              const prev = y[i - 1]?.sales || 0;
              const g = prev ? ((r.sales - prev) / prev) * 100 : 0;
              return (<tr key={r.year} className="border-t border-border"><td className="p-2">{r.year}</td><td className="p-2 num">{fmtCurrency(r.sales)}</td><td className={`p-2 num ${g >= 0 ? "text-success" : "text-brand-red"}`}>{i === 0 ? "—" : g.toFixed(1) + "%"}</td><td className="p-2 num">{fmtNum(r.orders)}</td></tr>);
            })}</tbody>
          </table>
        </div>
      );
    }
    case "product_reorder": {
      const arr = clientId ? tx.filter((t) => t.clientId === clientId) : tx;
      const rs = reorderStats(arr).filter((r) => r.avgCycle > 0).sort((a, b) => b.delayDays - a.delayDays).slice(0, 40);
      return (
        <div className="space-y-3 text-sm">
          <h2 className="text-xl font-bold text-brand-navy">تقرير إعادة الطلب للمنتجات</h2>
          <table className="w-full text-sm border border-border">
            <thead className="bg-muted/50 text-xs"><tr><th className="text-right p-2">العميل</th><th className="text-right p-2">المنتج</th><th className="text-right p-2">متوسط الدورة</th><th className="text-right p-2">آخر طلب</th><th className="text-right p-2">الموعد المتوقع</th><th className="text-right p-2">الحالة</th></tr></thead>
            <tbody>{rs.map((r, i) => (<tr key={i} className="border-t border-border"><td className="p-2">{r.clientName}</td><td className="p-2">{r.product}</td><td className="p-2 num">{r.avgCycle} يوم</td><td className="p-2">{fmtDate(r.lastOrder)}</td><td className="p-2">{fmtDate(r.nextExpected)}</td><td className="p-2">{r.status}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }
    case "lost_products": {
      const rs = reorderStats(tx).filter((r) => r.status === "متوقف" && r.orders >= 2);
      return (
        <div className="space-y-3 text-sm">
          <h2 className="text-xl font-bold text-brand-navy">تقرير المنتجات المتوقفة</h2>
          <p>منتجات كان العميل يطلبها بشكل متكرر وتوقف عنها – مرشحة للتفعيل الفوري.</p>
          <table className="w-full text-sm border border-border">
            <thead className="bg-muted/50 text-xs"><tr><th className="text-right p-2">العميل</th><th className="text-right p-2">المنتج</th><th className="text-right p-2">آخر طلب</th><th className="text-right p-2">متوسط الدورة</th><th className="text-right p-2">أيام التأخير</th></tr></thead>
            <tbody>{rs.map((r, i) => (<tr key={i} className="border-t border-border"><td className="p-2">{r.clientName}</td><td className="p-2">{r.product}</td><td className="p-2">{fmtDate(r.lastOrder)}</td><td className="p-2 num">{r.avgCycle}</td><td className="p-2 num text-brand-red">+{r.delayDays}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }
    case "sales_visit": {
      if (!clientId) return <p>اختر عميلًا.</p>;
      const s = clientSummary(tx, clientId); if (!s) return <p>لا توجد بيانات.</p>;
      const insights = insightsForClient(tx, clientId);
      const rs = reorderStats(s.tx).filter((r) => r.status !== "طبيعي").slice(0, 8);
      return (
        <div className="space-y-4 text-sm leading-loose">
          <h2 className="text-xl font-bold text-brand-navy">تقرير زيارة مبيعات: {s.tx[0].clientName}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>إجمالي المبيعات: <b className="num">{fmtCurrency(s.sales)}</b></div>
            <div>عدد الطلبات: <b className="num">{fmtNum(s.orders)}</b></div>
            <div>عدد المنتجات: <b className="num">{s.products}</b></div>
            <div>آخر طلب منذ: <b className="num">{s.daysSince} يوم</b></div>
          </div>
          <div>
            <h3 className="font-semibold mb-1">نقاط للنقاش مع العميل:</h3>
            <ul className="list-disc pr-5 space-y-1">{insights.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          {rs.length > 0 && (
            <div>
              <h3 className="font-semibold mb-1">منتجات تحتاج متابعة:</h3>
              <ul className="list-disc pr-5 space-y-1">
                {rs.map((r, i) => (<li key={i}>{r.product} — {r.status} (آخر طلب {fmtDate(r.lastOrder)})</li>))}
              </ul>
            </div>
          )}
          <p className="text-muted-foreground">اقتراح: عرض عينات مطبوعة على العميل قبل الكميات، وتقديم حلول تشطيبات فاخرة (Spot UV، طباعة ذهبية، لامينيت مطفي).</p>
        </div>
      );
    }
    case "opportunities": {
      const arr = clientId ? tx.filter((t: any) => t.clientId === clientId) : tx;
      const opps = generateOpportunities(arr).slice(0, 60);
      return (
        <div className="space-y-3 text-sm">
          <h2 className="text-xl font-bold text-brand-navy">تقرير فرص البيع والتنبيهات</h2>
          <p>مصنّفة بحسب الأولوية مع الإجراء المقترح لفريق المبيعات.</p>
          <table className="w-full text-sm border border-border">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="text-right p-2">النوع</th>
                <th className="text-right p-2">العميل</th>
                <th className="text-right p-2">المنتج</th>
                <th className="text-right p-2">الأولوية</th>
                <th className="text-right p-2">السبب / التأثير</th>
                <th className="text-right p-2">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {opps.map((o, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="p-2 whitespace-nowrap">{o.label}</td>
                  <td className="p-2">{o.clientName || "—"}</td>
                  <td className="p-2">{o.product || "—"}</td>
                  <td className="p-2">{o.priority}</td>
                  <td className="p-2 text-xs text-muted-foreground">{o.reason} <br /><span className="text-brand-navy">{o.impact}</span></td>
                  <td className="p-2 text-xs">{o.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}