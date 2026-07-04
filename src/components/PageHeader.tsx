export default function PageHeader({
  title, subtitle, actions, breadcrumb,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; to?: string }[];
}) {
  return (
    <div className="mb-6 md:mb-8">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 flex-wrap">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-border">/</span>}
              {b.to ? <a href={b.to} className="hover:text-foreground">{b.label}</a> : <span>{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[26px] md:text-[30px] font-bold text-foreground leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1.5 text-sm md:text-[15px] max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}