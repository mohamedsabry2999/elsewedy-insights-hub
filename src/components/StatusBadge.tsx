export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "VIP": "bg-brand-gold/15 text-brand-gold border-brand-gold/30",
    "نمو": "bg-success/15 text-success border-success/30",
    "خطر": "bg-brand-red/15 text-brand-red border-brand-red/30",
    "مفقود": "bg-muted text-muted-foreground border-border",
    "موسمي": "bg-brand-navy/10 text-brand-navy border-brand-navy/20",
    "منتجات محدودة": "bg-brand-navy/5 text-brand-navy border-brand-navy/20",
    "طبيعي": "bg-success/15 text-success border-success/30",
    "اقترب موعد المتابعة": "bg-brand-gold/15 text-brand-gold border-brand-gold/30",
    "متأخر": "bg-brand-red/15 text-brand-red border-brand-red/30",
    "متوقف": "bg-muted text-foreground/70 border-border",
    "نشط": "bg-success/15 text-success border-success/30",
    "متباطئ": "bg-brand-gold/15 text-brand-gold border-brand-gold/30",
    "جديد": "bg-brand-navy/10 text-brand-navy border-brand-navy/20",
    "في نمو": "bg-success/15 text-success border-success/30",
    "متراجع": "bg-brand-red/15 text-brand-red border-brand-red/30",
    "عاجل": "bg-brand-red/15 text-brand-red border-brand-red/40",
    "مرتفع": "bg-brand-gold/20 text-brand-gold border-brand-gold/40",
    "متوسط": "bg-brand-navy/10 text-brand-navy border-brand-navy/20",
    "منخفض": "bg-muted text-muted-foreground border-border",
  };
  const cls = map[status] || "bg-muted text-foreground border-border";
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>{status}</span>;
}