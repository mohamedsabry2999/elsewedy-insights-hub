import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { store } from "@/lib/store";
import {
  clientSummary, healthScore, clientStatus, byYear, byMonth, topProducts,
  reorderStats, insightsForClient, fmtCurrency, fmtDate, fmtNum, generateAlerts,
} from "@/lib/analytics";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { DollarSign, ShoppingCart, Package, CalendarRange, Sparkles, TrendingUp, Crown } from "lucide-react";

export default function ClientDashboard() {
  const { id } = useParams();
  const tx = store.getTransactions();
  const client = store.getClients().find((c) => c.id === id);
  const summary = useMemo(() => (id ? clientSummary(tx, id) : null), [tx, id]);
  const arr = summary?.tx || [];
  const years = byYear(arr);
  const months = byMonth(arr);
  const products = topProducts(arr, 8);
  const reorders = reorderStats(arr);
  const insights = id ? insightsForClient(tx, id) : [];
  const alerts = generateAlerts(arr);
  const lost = reorders.filter((r) => r.status === "متوقف");

  if (!client || !summary) return <div>العميل غير موجود.</div>;

  const health = healthScore(tx, client.id);
  const status = clientStatus(tx, client.id);
  const topProd = products[0];
  const PIE_COLORS = ["hsl(var(--brand-navy))", "hsl(var(--brand-gold))", "hsl(var(--brand-red))", "hsl(var(--success))", "hsl(var(--muted-foreground))", "hsl(var(--brand-graphite))"];
  const pieData = products.slice(0, 6).map((p) => ({ name: p.name, value: p.revenue }));
  const otherShare = products.slice(6).reduce((s, p) => s + p.revenue, 0);
  if (otherShare > 0) pieData.push({ name: "أخرى", value: otherShare });

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        subtitle={`${client.sector || "قطاع غير محدد"} • كود: ${client.code || "—"}`}
        actions={<StatusBadge status={status} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard label="إجمالي المبيعات" value={fmtCurrency(summary.sales)} icon={DollarSign} />
        <KpiCard label="عدد الطلبات" value={summary.orders} icon={ShoppingCart} />
        <KpiCard label="عدد المنتجات" value={summary.products} icon={Package} tone="gold" />
        <KpiCard label="متوسط الطلب" value={fmtCurrency(summary.aov)} tone="gold" />
        <KpiCard label="النمو السنوي" value={`${summary.growth.toFixed(1)}%`} tone={summary.growth >= 0 ? "success" : "red"} icon={TrendingUp} />
        <KpiCard label="مؤشر الصحة" value={`${health}/100`} tone={health >= 70 ? "success" : health >= 40 ? "gold" : "red"} />
        <KpiCard label="أول تعامل" value={fmtDate(summary.first)} icon={CalendarRange} />
        <KpiCard label="آخر تعامل" value={fmtDate(summary.last)} hint={`منذ ${summary.daysSince} يوم`} />
        <KpiCard label="أعلى سنة" value={summary.bestYear ? String(summary.bestYear.year) : "—"} hint={summary.bestYear ? fmtCurrency(summary.bestYear.sales) : ""} tone="success" />
        <KpiCard label="أضعف سنة" value={summary.worstYear ? String(summary.worstYear.year) : "—"} hint={summary.worstYear ? fmtCurrency(summary.worstYear.sales) : ""} tone="red" />
        <KpiCard label="أعلى منتج مبيعًا" value={topProd?.name || "—"} hint={topProd ? fmtCurrency(topProd.revenue) : ""} icon={Crown} tone="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="المبيعات السنوية">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={years}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} orientation="right" />
              <Tooltip contentStyle={{ direction: "rtl", fontFamily: "Cairo" }} />
              <Bar dataKey="sales" fill="hsl(var(--brand-navy))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
        <div className="lg:col-span-2">
          <Section title="المبيعات الشهرية">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} reversed />
                <YAxis tick={{ fontSize: 11 }} orientation="right" />
                <Tooltip contentStyle={{ direction: "rtl", fontFamily: "Cairo" }} />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--brand-gold))" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="حصة المنتجات من الإيراد">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ direction: "rtl", fontFamily: "Cairo" }} />
              <Legend wrapperStyle={{ fontSize: "11px", direction: "rtl" }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>
        <div className="lg:col-span-2">
        <Section title="أهم المنتجات (بالإيراد والتكرار)">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-right py-2 px-2">المنتج</th>
                <th className="text-right py-2 px-2">الإيراد</th>
                <th className="text-right py-2 px-2">الطلبات</th>
                <th className="text-right py-2 px-2">آخر طلب</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.name} className="border-b border-border/40 last:border-0">
                  <td className="py-2 px-2 font-medium">{p.name}</td>
                  <td className="py-2 px-2"><span className="num">{fmtCurrency(p.revenue)}</span></td>
                  <td className="py-2 px-2"><span className="num">{fmtNum(p.orders)}</span></td>
                  <td className="py-2 px-2 text-muted-foreground">{fmtDate(p.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="آخر الطلبات">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border sticky top-0 bg-card">
                <tr>
                  <th className="text-right py-2 px-2">التاريخ</th>
                  <th className="text-right py-2 px-2">أمر شغل</th>
                  <th className="text-right py-2 px-2">المنتج</th>
                  <th className="text-right py-2 px-2">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {[...arr].sort((a, b) => b.orderDate.localeCompare(a.orderDate)).slice(0, 20).map((t) => (
                  <tr key={t.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2 px-2">{fmtDate(t.orderDate)}</td>
                    <td className="py-2 px-2 text-muted-foreground">{t.jobOrderNumber || "—"}</td>
                    <td className="py-2 px-2">{t.productName}</td>
                    <td className="py-2 px-2"><span className="num">{fmtCurrency(t.totalValue)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="منتجات متوقفة (لم يعد يطلبها العميل)">
          {lost.length === 0 && <p className="text-sm text-muted-foreground">لا توجد منتجات متوقفة حاليًا.</p>}
          <ul className="text-sm space-y-2">
            {lost.map((r, i) => (
              <li key={i} className="flex items-center justify-between border-b border-border/40 pb-2">
                <div>
                  <div className="font-medium">{r.product}</div>
                  <div className="text-xs text-muted-foreground">آخر طلب {fmtDate(r.lastOrder)} • متوسط دورة {r.avgCycle} يوم</div>
                </div>
                <StatusBadge status="متوقف" />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="ملخص وتوصيات مبيعات">
          <ul className="space-y-2 text-sm leading-relaxed">
            {insights.map((s, i) => (
              <li key={i} className="flex gap-2 items-start">
                <Sparkles className="w-4 h-4 text-brand-gold mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          {alerts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">تنبيهات خاصة بالعميل</h4>
              <ul className="text-xs space-y-1.5">
                {alerts.slice(0, 5).map((a, i) => (
                  <li key={i}>• <b>{a.label}:</b> {a.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      </div>

      <div className="text-sm">
        <Link to="/clients" className="text-brand-red hover:underline">→ العودة إلى قائمة العملاء</Link>
      </div>
    </div>
  );
}