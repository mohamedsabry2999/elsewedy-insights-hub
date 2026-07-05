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
    <div className="space-y-6 md:space-y-8">
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
        <div className="table-wrap xwide">
          <table className="exec-table">
            <thead>
              <tr>
                <th className="wrap">اسم العميل</th>
                <th>الكود</th>
                <th>القطاع</th>
                <th>آخر طلب</th>
                <th>إجمالي المبيعات</th>
                <th>الطلبات</th>
                <th>النمو</th>
                <th>الصحة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="wrap font-medium max-w-[220px]">
                    <Link to={`/client/${r.id}`} className="text-brand-navy hover:text-brand-red hover:underline">{r.name}</Link>
                  </td>
                  <td className="text-muted-foreground">{r.code || "—"}</td>
                  <td>{r.sector || "—"}</td>
                  <td className="text-muted-foreground">{fmtDate(r.last)}</td>
                  <td><span className="num">{fmtCurrency(r.sales)}</span></td>
                  <td><span className="num">{fmtNum(r.orders)}</span></td>
                  <td className={`${r.growth >= 0 ? "text-success" : "text-brand-red"}`}>
                    <span className="num">{r.growth.toFixed(1)}%</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-14 md:w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                        <div className={`h-full ${r.health >= 70 ? "bg-success" : r.health >= 40 ? "bg-brand-gold" : "bg-brand-red"}`} style={{ width: `${r.health}%` }} />
                      </div>
                      <span className="text-xs num">{r.health}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
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