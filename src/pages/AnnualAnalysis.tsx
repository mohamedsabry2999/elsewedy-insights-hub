import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import KpiCard from "@/components/KpiCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { store } from "@/lib/store";
import { totalSales, ordersCount, byMonth, topProducts, fmtCurrency, fmtNum } from "@/lib/analytics";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function AnnualAnalysis() {
  const clients = store.getClients();
  const tx = store.getTransactions();
  const years = [...new Set(tx.map((t) => t.year))].sort();
  const [clientId, setClientId] = useState<string>(clients[0]?.id || "");
  const [year, setYear] = useState<number>(years[years.length - 1] || new Date().getFullYear());

  const arr = useMemo(() => tx.filter((t) => t.clientId === clientId && t.year === year), [tx, clientId, year]);
  const prev = useMemo(() => tx.filter((t) => t.clientId === clientId && t.year === year - 1), [tx, clientId, year]);

  const sales = totalSales(arr), orders = ordersCount(arr);
  const prevSales = totalSales(prev);
  const growth = prevSales ? ((sales - prevSales) / prevSales) * 100 : 0;
  const months = byMonth(arr, year);
  const withMonthName = MONTHS_AR.map((m, i) => {
    const found = months.find((x) => x.month.endsWith(String(i + 1).padStart(2, "0")));
    return { name: m, sales: found?.sales || 0, orders: found?.orders || 0 };
  });
  const best = [...withMonthName].sort((a, b) => b.sales - a.sales)[0];
  const worst = [...withMonthName].filter((x) => x.sales > 0).sort((a, b) => a.sales - b.sales)[0];
  const products = topProducts(arr, 10);
  const prevProducts = new Set(prev.map((t) => t.productName));
  const currentProducts = new Set(arr.map((t) => t.productName));
  const newProducts = [...currentProducts].filter((p) => !prevProducts.has(p));
  const disappearedProducts = [...prevProducts].filter((p) => !currentProducts.has(p));

  return (
    <div className="space-y-6">
      <PageHeader title="التحليل السنوي" subtitle="أداء العميل خلال سنة كاملة مع المقارنة بالسنة السابقة." />

      <div className="flex gap-3 flex-wrap">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="اختر عميلًا" /></SelectTrigger>
          <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(+v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="السنة" /></SelectTrigger>
          <SelectContent>{years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label={`مبيعات ${year}`} value={fmtCurrency(sales)} />
        <KpiCard label="عدد الطلبات" value={orders} />
        <KpiCard label="عدد المنتجات" value={currentProducts.size} tone="gold" />
        <KpiCard label="أفضل شهر" value={best?.name || "—"} hint={best ? fmtCurrency(best.sales) : ""} tone="success" />
        <KpiCard label="أضعف شهر" value={worst?.name || "—"} hint={worst ? fmtCurrency(worst.sales) : ""} tone="red" />
      </div>

      <Section title={`المبيعات الشهرية ${year}`}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={withMonthName}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} reversed />
            <YAxis tick={{ fontSize: 11 }} orientation="right" />
            <Tooltip contentStyle={{ direction: "rtl", fontFamily: "Cairo" }} />
            <Bar dataKey="sales" fill="hsl(var(--brand-navy))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="أهم المنتجات">
          <ul className="text-sm space-y-1">
            {products.map((p) => (
              <li key={p.name} className="flex justify-between border-b border-border/40 py-1.5">
                <span className="truncate">{p.name}</span>
                <span className="num text-muted-foreground">{fmtCurrency(p.revenue)}</span>
              </li>
            ))}
            {!products.length && <li className="text-muted-foreground">لا توجد بيانات.</li>}
          </ul>
        </Section>
        <Section title="منتجات جديدة هذا العام">
          <ul className="text-sm space-y-1">
            {newProducts.map((p) => <li key={p} className="p-1.5 rounded bg-success/10 text-success">{p}</li>)}
            {!newProducts.length && <li className="text-muted-foreground">لا يوجد.</li>}
          </ul>
        </Section>
        <Section title="منتجات اختفت مقارنة بالعام السابق">
          <ul className="text-sm space-y-1">
            {disappearedProducts.map((p) => <li key={p} className="p-1.5 rounded bg-brand-red/10 text-brand-red">{p}</li>)}
            {!disappearedProducts.length && <li className="text-muted-foreground">لا يوجد.</li>}
          </ul>
        </Section>
      </div>

      <Section title={`مقارنة ${year - 1} مقابل ${year}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">{year - 1}</div>
            <div className="num text-lg font-bold">{fmtCurrency(prevSales)}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">{year}</div>
            <div className="num text-lg font-bold">{fmtCurrency(sales)}</div>
          </div>
          <div className={`p-4 rounded-lg ${growth >= 0 ? "bg-success/10 text-success" : "bg-brand-red/10 text-brand-red"}`}>
            <div className="text-xs opacity-80">نسبة التغير</div>
            <div className="num text-lg font-bold">{growth.toFixed(1)}%</div>
          </div>
        </div>
      </Section>
    </div>
  );
}