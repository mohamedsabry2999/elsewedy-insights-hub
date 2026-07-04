import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { store } from "@/lib/store";
import { reorderStats, fmtDate } from "@/lib/analytics";
import { Search } from "lucide-react";

export default function ReorderCycle() {
  const tx = store.getTransactions();
  const stats = useMemo(() => reorderStats(tx), [tx]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("الكل");
  const rows = stats
    .filter((r) => !q || r.clientName.includes(q) || r.product.includes(q))
    .filter((r) => status === "الكل" || r.status === status)
    .sort((a, b) => b.delayDays - a.delayDays);

  const filters = ["الكل", "متأخر", "اقترب موعد المتابعة", "طبيعي", "متوقف"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="دورة إعادة الطلب"
        subtitle="متوسط الأيام بين الطلبات المتكررة لكل عميل ومنتج، وتوقع موعد الطلب القادم."
        actions={
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالعميل أو المنتج..." className="pr-9 w-72" />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            className={`text-xs px-3 py-1.5 rounded-full border ${status === f ? "bg-brand-navy text-primary-foreground border-brand-navy" : "border-border hover:bg-muted"}`}>
            {f}
          </button>
        ))}
      </div>

      <Section title={`النتائج (${rows.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-right py-2 px-2">العميل</th>
                <th className="text-right py-2 px-2">المنتج</th>
                <th className="text-right py-2 px-2">آخر طلب</th>
                <th className="text-right py-2 px-2">عدد الطلبات</th>
                <th className="text-right py-2 px-2">متوسط الدورة</th>
                <th className="text-right py-2 px-2">الموعد المتوقع</th>
                <th className="text-right py-2 px-2">أيام التأخير</th>
                <th className="text-right py-2 px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-muted/40">
                  <td className="py-2 px-2 font-medium">{r.clientName}</td>
                  <td className="py-2 px-2">{r.product}</td>
                  <td className="py-2 px-2">{fmtDate(r.lastOrder)}</td>
                  <td className="py-2 px-2 num">{r.orders}</td>
                  <td className="py-2 px-2 num">{r.avgCycle ? `${r.avgCycle} يوم` : "—"}</td>
                  <td className="py-2 px-2">{r.nextExpected === "—" ? "—" : fmtDate(r.nextExpected)}</td>
                  <td className={`py-2 px-2 num ${r.delayDays > 0 ? "text-brand-red" : "text-muted-foreground"}`}>
                    {r.avgCycle ? (r.delayDays > 0 ? `+${r.delayDays}` : r.delayDays) : "—"}
                  </td>
                  <td className="py-2 px-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}