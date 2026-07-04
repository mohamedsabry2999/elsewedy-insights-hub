export default function Section({
  title, subtitle, children, actions, padded = true,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <div className="exec-card">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-border/70">
          <div className="min-w-0">
            {title && <h3 className="font-semibold text-foreground text-[15px] leading-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-6" : ""}>{children}</div>
    </div>
  );
}