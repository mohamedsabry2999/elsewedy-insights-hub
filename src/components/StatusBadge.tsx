const SUCCESS = "bg-success/10 text-success border-success/20";
const WARN = "bg-warning/10 text-warning border-warning/25";
const DANGER = "bg-brand-red/10 text-brand-red border-brand-red/25";
const INFO = "bg-info/10 text-info border-info/20";
const GOLD = "bg-brand-gold/15 text-brand-gold border-brand-gold/30";
const NEUTRAL = "bg-muted text-muted-foreground border-border";
const DARK = "bg-foreground/5 text-foreground/80 border-border";

export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    // Client
    "VIP": GOLD,
    "نشط": SUCCESS,
    "نمو": SUCCESS,
    "في نمو": SUCCESS,
    "خطر": WARN,
    "متراجع": DANGER,
    "مفقود": DANGER,
    "متباطئ": WARN,
    "جديد": INFO,
    "موسمي": INFO,
    "منتجات محدودة": NEUTRAL,
    // Reorder
    "طبيعي": SUCCESS,
    "اقترب موعد المتابعة": WARN,
    "متأخر": DANGER,
    "متوقف": DARK,
    // Priority
    "عاجل": DANGER,
    "مرتفع": WARN,
    "متوسط": INFO,
    "منخفض": NEUTRAL,
  };
  const cls = map[status] || NEUTRAL;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}