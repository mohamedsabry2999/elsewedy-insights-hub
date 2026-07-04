export default function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-brand-navy">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}