import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { store } from "@/lib/store";
import { totalSales, ordersCount, avgOrderValue, cagr, trendLabel, fmtCurrency, fmtNum } from "@/lib/analytics";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function GrowthAnalysis() {
  const clients = store.getClients();
  const tx = store.getTransactions();
  const [clientId, setClientId] = useState<string>("__all__");
  const arr = clientId === "__all__" ? tx : tx.filter((t) => t.clientId === clientId);

  const years = [...new Set(arr.map((t) => t.year))].sort();
  const rows = years.map((y) => {
    const yr = arr.filter((t) => t.year === y);
    const sales = totalSales(yr);
    const orders = ordersCount(yr);
    return {
      year: y, sales, orders,
      products: new Set(yr.map((t) => t.productName)).size,
      aov: avgOrderValue(yr),
    };
  });
  const withGrowth = rows.map((r, i) => {
    const prev = rows[i - 1];
    return {
      ...r,
      salesGrowth: prev && prev.sales ? ((r.sales - prev.sales) / prev.sales) * 100 : 0,
      ordersGrowth: prev && prev.orders ? ((r.orders - prev.orders) / prev.orders) * 100 : 0,
      productsGrowth: prev && prev.products ? ((r.products - prev.products) / prev.products) * 100 : 0,
      aovGrowth: prev && prev.aov ? ((r.aov - prev.aov) / prev.aov) * 100 : 0,
    };
  });
  const lastGrowth = withGrowth[withGrowth.length - 1]?.salesGrowth ?? 0;
  const trend = trendLabel(lastGrowth);
  const cagrPct = cagr(arr);

  return (
    <div className="space-y-6">
      <PageHeader title="تحليل النمو" subtitle="مقارنة الأداء عبر السنوات: مبيعات، طلبات، تنوع منتجات، ومتوسط قيمة الطلب." />

      <div className="flex items-center gap-3">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">كل العملاء</SelectItem>
            {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <span className={`text-xs px-3 py-1.5 rounded-full border ${lastGrowth >= 0 ? "text-success border-success/40 bg-success/10" : "text-brand-red border-brand-red/40 bg-brand-red/10"}`}>
          الاتجاه: {trend}
        </span>
        {cagrPct !== 0 && (
          <span className="text-xs px-3 py-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/10 text-brand-gold">
            CAGR: {cagrPct.toFixed(1)}%
          </span>
        )}
      </div>

      <Section title="اتجاه المبيعات السنوي">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={withGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} orientation="right" />
            <Tooltip contentStyle={{ direction: "rtl", fontFamily: "Cairo" }} />
            <Legend />
            <Line dataKey="sales" name="المبيعات" stroke="hsl(var(--brand-navy))" strokeWidth={2.5} />
            <Line dataKey="orders" name="الطلبات" stroke="hsl(var(--brand-gold))" strokeWidth={2.5} yAxisId={0} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="جدول النمو السنوي">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-right py-2 px-2">السنة</th>
                <th className="text-right py-2 px-2">المبيعات</th>
                <th className="text-right py-2 px-2">نمو المبيعات</th>
                <th className="text-right py-2 px-2">الطلبات</th>
                <th className="text-right py-2 px-2">نمو الطلبات</th>
                <th className="text-right py-2 px-2">تنوع المنتجات</th>
                <th className="text-right py-2 px-2">نمو التنوع</th>
                <th className="text-right py-2 px-2">متوسط الطلب</th>
                <th className="text-right py-2 px-2">نمو المتوسط</th>
              </tr>
            </thead>
            <tbody>
              {withGrowth.map((r) => (
                <tr key={r.year} className="border-b border-border/40">
                  <td className="py-2 px-2 font-medium">{r.year}</td>
                  <td className="py-2 px-2 num">{fmtCurrency(r.sales)}</td>
                  <td className={`py-2 px-2 num ${r.salesGrowth >= 0 ? "text-success" : "text-brand-red"}`}>{r.salesGrowth.toFixed(1)}%</td>
                  <td className="py-2 px-2 num">{fmtNum(r.orders)}</td>
                  <td className={`py-2 px-2 num ${r.ordersGrowth >= 0 ? "text-success" : "text-brand-red"}`}>{r.ordersGrowth.toFixed(1)}%</td>
                  <td className="py-2 px-2 num">{r.products}</td>
                  <td className={`py-2 px-2 num ${r.productsGrowth >= 0 ? "text-success" : "text-brand-red"}`}>{r.productsGrowth.toFixed(1)}%</td>
                  <td className="py-2 px-2 num">{fmtCurrency(r.aov)}</td>
                  <td className={`py-2 px-2 num ${r.aovGrowth >= 0 ? "text-success" : "text-brand-red"}`}>{r.aovGrowth.toFixed(1)}%</td>
                </tr>
              ))}
              {withGrowth.length === 0 && <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">لا توجد بيانات كافية.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}