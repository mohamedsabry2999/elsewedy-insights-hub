import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { store } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { clientSummary, healthScore, clientStatus, fmtCurrency, fmtDate, fmtNum } from "@/lib/analytics";
import { Search } from "lucide-react";

export default function Clients() {
  const clients = store.getClients();
  const tx = store.getTransactions();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return clients.map((c) => {
      const s = clientSummary(tx, c.id);
      return {
        ...c,
        sales: s?.sales ?? 0,
        orders: s?.orders ?? 0,
        last: s?.last,
        growth: s?.growth ?? 0,
        health: healthScore(tx, c.id),
        status: clientStatus(tx, c.id),
      };
    }).filter((r) => !q || r.name.includes(q) || (r.code || "").includes(q))
      .sort((a, b) => b.sales - a.sales);
  }, [clients, tx, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="العملاء"
        subtitle="قاعدة عملاء بيت الطباعة مع مؤشرات الأداء والحالة."
        actions={
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الكود..." className="pr-9 w-72" />
          </div>
        }
      />
      <Section title={`قائمة العملاء (${rows.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-right py-2 px-2">اسم العميل</th>
                <th className="text-right py-2 px-2">الكود</th>
                <th className="text-right py-2 px-2">القطاع</th>
                <th className="text-right py-2 px-2">آخر طلب</th>
                <th className="text-right py-2 px-2">إجمالي المبيعات</th>
                <th className="text-right py-2 px-2">الطلبات</th>
                <th className="text-right py-2 px-2">النمو</th>
                <th className="text-right py-2 px-2">الصحة</th>
                <th className="text-right py-2 px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="py-2 px-2 font-medium">
                    <Link to={`/client/${r.id}`} className="text-brand-navy hover:text-brand-red hover:underline">{r.name}</Link>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{r.code || "—"}</td>
                  <td className="py-2 px-2">{r.sector || "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground">{fmtDate(r.last)}</td>
                  <td className="py-2 px-2"><span className="num">{fmtCurrency(r.sales)}</span></td>
                  <td className="py-2 px-2"><span className="num">{fmtNum(r.orders)}</span></td>
                  <td className={`py-2 px-2 ${r.growth >= 0 ? "text-success" : "text-brand-red"}`}>
                    <span className="num">{r.growth.toFixed(1)}%</span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${r.health >= 70 ? "bg-success" : r.health >= 40 ? "bg-brand-gold" : "bg-brand-red"}`} style={{ width: `${r.health}%` }} />
                      </div>
                      <span className="text-xs num">{r.health}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">لا يوجد عملاء مطابقون.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}