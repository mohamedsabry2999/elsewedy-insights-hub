import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { store } from "@/lib/store";
import { productDetails, byMonth, fmtCurrency, fmtDate, fmtNum } from "@/lib/analytics";
import { Search } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function ProductIntelligence() {
  const tx = store.getTransactions();
  const products = useMemo(() => [...new Set(tx.map((t) => t.productName))].sort(), [tx]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string>(products[0] || "");
  const filtered = products.filter((p) => p.includes(q));
  const d = selected ? productDetails(tx, selected) : null;
  const series = d ? byMonth(d.tx).map((m) => ({ month: m.month, sales: m.sales, orders: m.orders })) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ذكاء المنتجات"
        subtitle="تحليل دورة حياة المنتج: تكرار الطلب، مدى الدورة، حركة السعر، والحالة (نشط، متأخر، متوقف، جديد، موسمي، في نمو، متراجع)."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Section title={`المنتجات (${products.length})`}>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="pr-9 h-9" />
          </div>
          <div className="max-h-[550px] overflow-y-auto text-sm space-y-0.5">
            {filtered.length === 0 && <p className="text-muted-foreground text-xs p-2">لا نتائج.</p>}
            {filtered.map((p) => (
              <button key={p}
                className={`w-full text-right px-3 py-2 rounded-md text-sm ${selected === p ? "bg-brand-navy text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setSelected(p)}>
                {p}
              </button>
            ))}
          </div>
        </Section>

        <div className="lg:col-span-3 space-y-6">
          {d && selected ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-bold text-brand-navy">{selected}</h2>
                <StatusBadge status={d.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="أول طلب" value={fmtDate(d.first)} />
                <KpiCard label="آخر طلب" value={fmtDate(d.last)} hint={`منذ ${d.daysSince} يوم`} />
                <KpiCard label="عدد الطلبات" value={d.orders} />
                <KpiCard label="إجمالي الكمية" value={fmtNum(d.totalQty)} />
                <KpiCard label="إجمالي الإيراد" value={fmtCurrency(d.revenue)} tone="gold" />
                <KpiCard label="متوسط قيمة الطلب" value={fmtCurrency(d.aov)} />
                <KpiCard label="متوسط سعر الوحدة" value={fmtCurrency(d.avgPrice)} />
                <KpiCard label="تغير السعر" value={`${d.priceChange.toFixed(1)}%`} tone={d.priceChange >= 0 ? "success" : "red"} />
                <KpiCard label="متوسط زمن التنفيذ" value={`${d.execAvg} يوم`} tone="gold" />
                <KpiCard label="متوسط دورة إعادة الطلب" value={`${d.avgCycle} يوم`} />
                <KpiCard label="أقصر فترة بين طلبين" value={d.minCycle ? `${d.minCycle} يوم` : "—"} />
                <KpiCard label="أطول فترة بين طلبين" value={d.maxCycle ? `${d.maxCycle} يوم` : "—"} />
              </div>

              <Section title="تطور المنتج عبر الشهور">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} reversed />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} orientation="right" />
                    <YAxis yAxisId="right" tick={{ fontSize: 11 }} orientation="left" />
                    <Tooltip contentStyle={{ direction: "rtl", fontFamily: "Cairo" }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sales" name="المبيعات" fill="hsl(var(--brand-gold))" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="orders" name="عدد الطلبات" stroke="hsl(var(--brand-navy))" strokeWidth={2.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Section>

              <Section title="سجل الطلبات">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b border-border sticky top-0 bg-card">
                      <tr>
                        <th className="text-right py-2 px-2">التاريخ</th>
                        <th className="text-right py-2 px-2">العميل</th>
                        <th className="text-right py-2 px-2">الكمية</th>
                        <th className="text-right py-2 px-2">السعر</th>
                        <th className="text-right py-2 px-2">الإجمالي</th>
                        <th className="text-right py-2 px-2">التسليم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...d.tx].reverse().map((t) => (
                        <tr key={t.id} className="border-b border-border/40">
                          <td className="py-2 px-2">{fmtDate(t.orderDate)}</td>
                          <td className="py-2 px-2">{t.clientName}</td>
                          <td className="py-2 px-2 num">{fmtNum(t.quantity)}</td>
                          <td className="py-2 px-2 num">{fmtCurrency(t.unitPrice)}</td>
                          <td className="py-2 px-2 num">{fmtCurrency(t.totalValue)}</td>
                          <td className="py-2 px-2 text-muted-foreground">{fmtDate(t.deliveryDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">اختر منتجًا لعرض تفاصيله.</p>
          )}
        </div>
      </div>
    </div>
  );
}