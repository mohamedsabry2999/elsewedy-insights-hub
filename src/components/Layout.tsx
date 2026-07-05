import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Upload, Wand2, User, CalendarRange, Command,
  Package, RefreshCw, TrendingUp, Bell, FileText, LogOut, Search, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { store } from "@/lib/store";
import logoAsset from "@/assets/el_sewedy_logo.png.asset.json";

const navGroups: { title: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    title: "الإدارة",
    items: [
      { to: "/executive", label: "مركز القيادة", icon: Command },
      { to: "/dashboard", label: "لوحة القيادة", icon: LayoutDashboard },
    ],
  },
  {
    title: "العملاء والتحليل",
    items: [
      { to: "/clients", label: "العملاء", icon: Users },
      { to: "/annual", label: "التحليل السنوي", icon: CalendarRange },
      { to: "/growth", label: "تحليل النمو", icon: TrendingUp },
    ],
  },
  {
    title: "المنتجات والدورة",
    items: [
      { to: "/products", label: "ذكاء المنتجات", icon: Package },
      { to: "/reorder", label: "دورة إعادة الطلب", icon: RefreshCw },
    ],
  },
  {
    title: "الفرص والتقارير",
    items: [
      { to: "/opportunities", label: "الفرص والتنبيهات", icon: Bell },
      { to: "/reports", label: "التقارير", icon: FileText },
    ],
  },
  {
    title: "البيانات",
    items: [
      { to: "/upload", label: "مركز الرفع", icon: Upload },
      { to: "/cleaning", label: "تنظيف البيانات", icon: Wand2 },
    ],
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = store.getUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const Sidebar = (
    <aside className="w-[260px] bg-sidebar text-sidebar-foreground flex flex-col border-l border-sidebar-border shrink-0 h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="bg-white rounded-xl px-3 py-3 flex items-center justify-center">
          <img src={logoAsset.url} alt="Medhat Elsewedy Printhouse" className="h-14 w-auto object-contain" />
        </div>
        <div className="text-center mt-3">
          <div className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60 font-semibold">
            Client Intelligence Hub
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            <div className="px-3 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-wider text-sidebar-foreground/45">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 h-11 rounded-lg text-[13.5px] transition-all ${
                      isActive
                        ? "bg-brand-red text-white font-semibold shadow-sm"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white"
                    }`
                  }
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/50 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-red grid place-items-center text-white text-xs font-bold shrink-0">
            {(user || "؟").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold truncate">{user}</div>
            <div className="text-[10.5px] text-sidebar-foreground/60">مسؤول تحليلات</div>
          </div>
        </div>
        <button
          onClick={() => { store.logout(); navigate("/"); }}
          className="w-full text-xs flex items-center justify-center gap-2 py-2.5 rounded-lg border border-sidebar-border hover:bg-sidebar-accent/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> تسجيل الخروج
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground" dir="rtl">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{Sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative">{Sidebar}</div>
        </div>
      )}

      <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border no-print">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 h-14 flex items-center gap-3">
            <button
              className="lg:hidden p-2 -mr-2 rounded-md hover:bg-muted"
              onClick={() => setMobileOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="ابحث عن عميل، منتج، أمر تشغيل..."
                className="w-full h-9 pr-9 pl-3 rounded-lg bg-muted/60 border border-transparent focus:bg-card focus:border-border outline-none text-sm placeholder:text-muted-foreground/70"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/upload")}
                className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-red hover:bg-brand-red/90 text-white text-[13px] font-semibold transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                رفع شيت
              </button>
              <button className="w-9 h-9 rounded-lg hover:bg-muted grid place-items-center relative" aria-label="الإشعارات">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-brand-red rounded-full" />
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 md:py-7 lg:py-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}