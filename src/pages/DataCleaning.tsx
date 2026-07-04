import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { store, addAlias, PRINT_TYPES, PrintType } from "@/lib/store";
import { toast } from "sonner";
import { Wand2, ArrowRightLeft, Check } from "lucide-react";

function similarity(a: string, b: string) {
  const A = a.replace(/\s+/g, "").toLowerCase();
  const B = b.replace(/\s+/g, "").toLowerCase();
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.87;
  const shorter = A.length < B.length ? A : B;
  const longer = A.length < B.length ? B : A;
  let hits = 0;
  for (const ch of shorter) if (longer.includes(ch)) hits++;
  return hits / longer.length;
}

export default function DataCleaning() {
  const [tick, setTick] = useState(0);
  const tx = useMemo(() => store.getTransactions(), [tick]);
  const clients = useMemo(() => store.getClients(), [tick]);
  const aliases = useMemo(() => store.getAliases(), [tick]);
  const printMap = useMemo(() => store.getPrintMap(), [tick]);

  const productNames = useMemo(() => [...new Set(tx.map((t) => t.productName))].sort(), [tx]);
  const suspectedProducts = useMemo(() => {
    const pairs: { a: string; b: string; score: number }[] = [];
    for (let i = 0; i < productNames.length; i++) {
      for (let j = i + 1; j < productNames.length; j++) {
        const s = similarity(productNames[i], productNames[j]);
        if (s >= 0.8 && s < 1) pairs.push({ a: productNames[i], b: productNames[j], score: s });
      }
    }
    return pairs.sort((a, b) => b.score - a.score).slice(0, 40);
  }, [productNames]);

  const suspectedClients = useMemo(() => {
    const names = clients.map((c) => c.name);
    const pairs: { a: string; b: string; score: number }[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const s = similarity(names[i], names[j]);
        if (s >= 0.8 && s < 1) pairs.push({ a: names[i], b: names[j], score: s });
      }
    }
    return pairs.sort((a, b) => b.score - a.score);
  }, [clients]);

  const [fromProd, setFromProd] = useState("");
  const [toProd, setToProd] = useState("");
  const mergeProducts = () => {
    if (!fromProd || !toProd || fromProd === toProd) return;
    const arr = store.getTransactions();
    let count = 0;
    for (const t of arr) if (t.productName === fromProd) { t.productName = toProd; count++; }
    store.setTransactions(arr);
    addAlias(fromProd, toProd);
    toast.success(`تم دمج ${count} سطر: "${fromProd}" ← "${toProd}" وحفظه في قاموس المنتجات.`);
    setFromProd(""); setToProd(""); setTick((x) => x + 1);
  };

  const [fromCli, setFromCli] = useState("");
  const [toCli, setToCli] = useState("");
  const mergeClients = () => {
    if (!fromCli || !toCli || fromCli === toCli) return;
    const arr = store.getTransactions();
    let count = 0;
    const target = clients.find((c) => c.id === toCli);
    if (!target) return;
    for (const t of arr) if (t.clientId === fromCli) { t.clientId = toCli; t.clientName = target.name; count++; }
    store.setTransactions(arr);
    store.setClients(clients.filter((c) => c.id !== fromCli));
    toast.success(`تم دمج ${count} حركة تحت العميل الموحد.`);
    setFromCli(""); setToCli(""); setTick((x) => x + 1);
  };

  // Print type mapping – all distinct printingType values in data
  const printTypeValues = useMemo(() => [...new Set(tx.map((t) => (t.printingType || "").trim()).filter(Boolean))].sort(), [tx]);
  const savePrintTypeMap = (raw: string, cat: PrintType | "") => {
    const map = { ...printMap };
    if (cat) map[raw] = cat; else delete map[raw];
    store.setPrintMap(map);
    setTick((x) => x + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات وتنظيف الداتا"
        subtitle="توحيد أسماء المنتجات والعملاء، وربط أنواع الطباعة بفئات معيارية."
        actions={<div className="text-xs text-muted-foreground">قاموس المنتجات: {aliases.reduce((s, a) => s + a.aliases.length, 0)} مرادف</div>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Product Normalization">
          <div className="space-y-2 mb-4">
            <div className="flex gap-2">
              <Input list="products" placeholder="من (اسم المنتج المكرر)" value={fromProd} onChange={(e) => setFromProd(e.target.value)} />
              <Input list="products" placeholder="إلى (الاسم المعتمد)" value={toProd} onChange={(e) => setToProd(e.target.value)} />
              <Button onClick={mergeProducts} className="bg-brand-navy text-primary-foreground hover:bg-brand-navy/90">
                <Wand2 className="w-4 h-4 ml-1" /> دمج
              </Button>
            </div>
            <datalist id="products">{productNames.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <h4 className="text-sm font-semibold mb-2 text-brand-navy">اقتراحات دمج ({suspectedProducts.length})</h4>
          <div className="max-h-72 overflow-y-auto">
            {suspectedProducts.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد تكرار مشتبه.</p>}
            <ul className="space-y-1 text-sm">
              {suspectedProducts.map((p, i) => (
                <li key={i} className="p-2 rounded bg-muted/40 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="truncate">{p.a}</span>
                    <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{p.b}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold">{(p.score * 100).toFixed(0)}% تشابه</span>
                    <button className="text-xs text-brand-red hover:underline" onClick={() => { setFromProd(p.a); setToProd(p.b); }}>ربط</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Client Name Normalization">
          <div className="flex gap-2 mb-4">
            <select className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={fromCli} onChange={(e) => setFromCli(e.target.value)}>
              <option value="">من (سيتم إزالته)</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={toCli} onChange={(e) => setToCli(e.target.value)}>
              <option value="">إلى (المعتمد)</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button onClick={mergeClients} className="bg-brand-navy text-primary-foreground hover:bg-brand-navy/90">دمج</Button>
          </div>
          <h4 className="text-sm font-semibold mb-2 text-brand-navy">عملاء مشتبه في تكرارهم</h4>
          {suspectedClients.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد تكرار مشتبه.</p>}
          <ul className="space-y-1 text-sm max-h-60 overflow-y-auto">
            {suspectedClients.map((p, i) => (
              <li key={i} className="p-2 rounded bg-muted/40 flex items-center justify-between">
                <span>{p.a} <span className="text-muted-foreground text-xs mx-2">↔</span> {p.b}</span>
                <span className="text-xs text-brand-gold">{(p.score * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Category Mapping — أنواع الطباعة">
        {printTypeValues.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد قيم لنوع الطباعة في البيانات الحالية.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-right py-2 px-2">القيمة الأصلية</th>
                  <th className="text-right py-2 px-2">الفئة المعيارية</th>
                  <th className="text-right py-2 px-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {printTypeValues.map((v) => (
                  <tr key={v} className="border-b border-border/40">
                    <td className="py-2 px-2 font-medium">{v}</td>
                    <td className="py-2 px-2">
                      <Select value={printMap[v] || ""} onValueChange={(val) => savePrintTypeMap(v, val as PrintType)}>
                        <SelectTrigger className="w-48 h-9"><SelectValue placeholder="اختر فئة" /></SelectTrigger>
                        <SelectContent>
                          {PRINT_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 px-2">
                      {printMap[v] ? <span className="text-success text-xs flex items-center gap-1"><Check className="w-3.5 h-3.5" /> مربوطة</span>
                        : <span className="text-xs text-muted-foreground">غير مربوطة</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="الفئات المستخدمة">
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(tx.map((t) => t.productCategory).filter(Boolean))].map((c) => (
              <span key={c} className="px-2 py-1 rounded-md bg-muted text-xs">{c}</span>
            ))}
          </div>
        </Section>
        <Section title="قاموس المرادفات المحفوظة">
          {aliases.length === 0 ? <p className="text-sm text-muted-foreground">لم يتم حفظ أي مرادفات بعد.</p> : (
            <ul className="text-sm space-y-1 max-h-56 overflow-y-auto">
              {aliases.map((a) => (
                <li key={a.canonical} className="p-2 rounded bg-muted/40">
                  <div className="font-medium">{a.canonical}</div>
                  <div className="text-xs text-muted-foreground">← {a.aliases.join("، ")}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}