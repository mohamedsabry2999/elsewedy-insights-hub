import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Upload, Wand2, User, CalendarRange,
  Package, RefreshCw, TrendingUp, Bell, FileText, LogOut,
} from "lucide-react";
import { store } from "@/lib/store";

const nav = [
  { to: "/dashboard", label: "لوحة القيادة", icon: LayoutDashboard },
  { to: "/clients", label: "العملاء", icon: Users },
  { to: "/upload", label: "مركز الرفع", icon: Upload },
  { to: "/cleaning", label: "تنظيف البيانات", icon: Wand2 },
  { to: "/annual", label: "التحليل السنوي", icon: CalendarRange },
  { to: "/products", label: "ذكاء المنتجات", icon: Package },
  { to: "/reorder", label: "دورة إعادة الطلب", icon: RefreshCw },
  { to: "/growth", label: "تحليل النمو", icon: TrendingUp },
  { to: "/opportunities", label: "الفرص والتنبيهات", icon: Bell },
  { to: "/reports", label: "التقارير", icon: FileText },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = store.getUser();
  return (
    <div className="min-h-screen flex bg-background text-foreground" dir="rtl">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-l border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gold-gradient grid place-items-center text-brand-navy font-black text-lg shrink-0">س</div>
            <div>
              <div className="font-bold text-sm leading-tight">السويدي بيت الطباعة</div>
              <div className="text-[11px] text-sidebar-foreground/70">Client Intelligence Hub</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-r-2 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary border-sidebar-primary font-semibold"
                    : "border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70 mb-2">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{user}</span>
          </div>
          <button
            onClick={() => { store.logout(); navigate("/"); }}
            className="w-full text-xs flex items-center justify-center gap-2 py-2 rounded-md bg-sidebar-accent hover:bg-sidebar-accent/80"
          >
            <LogOut className="w-3.5 h-3.5" /> تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}