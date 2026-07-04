import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { store } from "@/lib/store";
import { reorderStats, fmtDate, fmtCurrency, fmtNum } from "@/lib/analytics";
import { Search, ArrowUpDown } from "lucide-react";

type SortKey = "priority" | "delay" | "revenue" | "lastOrder";

export default function ReorderCycle() {
  const tx = store.getTransactions();
  const stats = useMemo(() => reorderStats(tx), [tx]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("الكل");
  const [sortKey, setSortKey] = useState<SortKey>("priority");

  const P = { عاجل: 0, مرتفع: 1, متوسط: 2, منخفض: 3 } as const;

  const rows = stats
    .filter((r) => !q || r.clientName.includes(q) || r.product.includes(q))
    .filter((r) => status === "الكل" || r.status === status)
    .sort((a, b) => {
      if (sortKey === "priority") return P[a.priority] - P[b.priority] || b.delayDays - a.delayDays;
      if (sortKey === "delay") return b.delayDays - a.delayDays;
      if (sortKey === "revenue") return b.revenue - a.revenue;
      return b.lastOrder.localeCompare(a.lastOrder);
    });

  const counts = {
    urgent: stats.filter((r) => r.priority === "عاجل").length,
    late: stats.filter((r) => r.status === "متأخر").length,
    soon: stats.filter((r) => r.status === "اقترب موعد المتابعة").length,
    stopped: stats.filter((r) => r.status === "متوقف").length,
  };

  const filters = ["الكل", "متأخر", "اقترب موعد المتابعة", "طبيعي", "متوقف"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="تحليل دورة إعادة الطلب"
        subtitle="متوسط الأيام بين الطلبات المتكررة لكل عميل ومنتج، مع الأولوية والإجراء المقترح."
        actions={
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالعميل أو المنتج..." className="pr-9 w-72" />
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "أولوية عاجلة", value: counts.urgent, tone: "text-brand-red" },
          { label: "متأخر", value: counts.late, tone: "text-brand-red" },
          { label: "اقترب موعده", value: counts.soon, tone: "text-brand-gold" },
          { label: "متوقف", value: counts.stopped, tone: "text-muted-foreground" },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className={`text-2xl font-bold num ${k.tone}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f} onClick={() => setStatus(f)}
              className={`text-xs px-3 py-1.5 rounded-full border ${status === f ? "bg-brand-navy text-primary-foreground border-brand-navy" : "border-border hover:bg-muted"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">ترتيب حسب:</span>
          {(["priority","delay","revenue","lastOrder"] as SortKey[]).map((k) => (
            <button key={k} onClick={() => setSortKey(k)}
              className={`px-2 py-1 rounded border ${sortKey === k ? "bg-brand-navy text-primary-foreground border-brand-navy" : "border-border hover:bg-muted"}`}>
              {k === "priority" ? "الأولوية" : k === "delay" ? "التأخير" : k === "revenue" ? "الإيراد" : "آخر طلب"}
            </button>
          ))}
        </div>
      </div>

      <Section title={`أولويات المتابعة (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">لا نتائج مطابقة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-right py-2 px-2">العميل</th>
                  <th className="text-right py-2 px-2">المنتج</th>
                  <th className="text-right py-2 px-2">آخر طلب</th>
                  <th className="text-right py-2 px-2">عدد الطلبات</th>
                  <th className="text-right py-2 px-2">متوسط الدورة</th>
                  <th className="text-right py-2 px-2">مدى الدورة</th>
                  <th className="text-right py-2 px-2">الموعد المتوقع</th>
                  <th className="text-right py-2 px-2">التأخير</th>
                  <th className="text-right py-2 px-2">إيراد المنتج</th>
                  <th className="text-right py-2 px-2">الحالة</th>
                  <th className="text-right py-2 px-2">الأولوية</th>
                  <th className="text-right py-2 px-2 min-w-72">التوصية</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/40 hover:bg-muted/30 align-top">
                    <td className="py-2 px-2 font-medium">
                      <Link to={`/client/${r.clientId}`} className="text-brand-navy hover:text-brand-red hover:underline">{r.clientName}</Link>
                    </td>
                    <td className="py-2 px-2">{r.product}</td>
                    <td className="py-2 px-2">{fmtDate(r.lastOrder)}</td>
                    <td className="py-2 px-2 num">{fmtNum(r.orders)}</td>
                    <td className="py-2 px-2 num">{r.avgCycle ? `${r.avgCycle} يوم` : "—"}</td>
                    <td className="py-2 px-2 num text-xs text-muted-foreground">{r.minCycle && r.maxCycle ? `${r.minCycle}-${r.maxCycle}` : "—"}</td>
                    <td className="py-2 px-2">{r.nextExpected === "—" ? "—" : fmtDate(r.nextExpected)}</td>
                    <td className={`py-2 px-2 num ${r.delayDays > 0 ? "text-brand-red" : "text-muted-foreground"}`}>
                      {r.avgCycle ? (r.delayDays > 0 ? `+${r.delayDays}` : r.delayDays) : "—"}
                    </td>
                    <td className="py-2 px-2 num">{fmtCurrency(r.revenue)}</td>
                    <td className="py-2 px-2"><StatusBadge status={r.status} /></td>
                    <td className="py-2 px-2"><StatusBadge status={r.priority} /></td>
                    <td className="py-2 px-2 text-xs text-muted-foreground leading-relaxed">{r.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}