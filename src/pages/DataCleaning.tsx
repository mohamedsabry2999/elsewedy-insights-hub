import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { store } from "@/lib/store";
import { toast } from "sonner";

function similarity(a: string, b: string) {
  const A = a.replace(/\s+/g, "").toLowerCase();
  const B = b.replace(/\s+/g, "").toLowerCase();
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.85;
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

  const productNames = useMemo(() => [...new Set(tx.map((t) => t.productName))].sort(), [tx]);
  const suspectedProducts = useMemo(() => {
    const pairs: { a: string; b: string; score: number }[] = [];
    for (let i = 0; i < productNames.length; i++) {
      for (let j = i + 1; j < productNames.length; j++) {
        const s = similarity(productNames[i], productNames[j]);
        if (s >= 0.8 && s < 1) pairs.push({ a: productNames[i], b: productNames[j], score: s });
      }
    }
    return pairs.slice(0, 30);
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
    return pairs;
  }, [clients]);

  const [fromProd, setFromProd] = useState(""); const [toProd, setToProd] = useState("");
  const mergeProducts = () => {
    if (!fromProd || !toProd) return;
    const arr = store.getTransactions();
    let count = 0;
    for (const t of arr) if (t.productName === fromProd) { t.productName = toProd; count++; }
    store.setTransactions(arr);
    toast.success(`تم دمج ${count} سطر: "${fromProd}" ← "${toProd}".`);
    setFromProd(""); setToProd(""); setTick((x) => x + 1);
  };

  const [fromCli, setFromCli] = useState(""); const [toCli, setToCli] = useState("");
  const mergeClients = () => {
    if (!fromCli || !toCli || fromCli === toCli) return;
    const arr = store.getTransactions();
    let count = 0;
    const target = clients.find((c) => c.id === toCli);
    if (!target) return;
    for (const t of arr) if (t.clientId === fromCli) { t.clientId = toCli; t.clientName = target.name; count++; }
    store.setTransactions(arr);
    store.setClients(clients.filter((c) => c.id !== fromCli));
    toast.success(`تم دمج ${count} حركة.`);
    setFromCli(""); setToCli(""); setTick((x) => x + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="تنظيف البيانات" subtitle="دمج المنتجات المتشابهة وتوحيد أسماء العملاء وتصنيف المطبوعات." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="دمج منتجات متشابهة">
          <div className="space-y-2 mb-4">
            <div className="flex gap-2">
              <Input list="products" placeholder="من (اسم المنتج المكرر)" value={fromProd} onChange={(e) => setFromProd(e.target.value)} />
              <Input list="products" placeholder="إلى (الاسم المعتمد)" value={toProd} onChange={(e) => setToProd(e.target.value)} />
              <Button onClick={mergeProducts} className="bg-brand-navy text-primary-foreground hover:bg-brand-navy/90">دمج</Button>
            </div>
            <datalist id="products">{productNames.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <h4 className="text-sm font-semibold mb-2">منتجات مشتبه في تكرارها</h4>
          <div className="max-h-72 overflow-y-auto">
            {suspectedProducts.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد تكرار مشتبه.</p>}
            <ul className="space-y-1 text-sm">
              {suspectedProducts.map((p, i) => (
                <li key={i} className="p-2 rounded bg-muted/40 flex items-center justify-between gap-2">
                  <span>{p.a} <span className="text-muted-foreground text-xs">↔</span> {p.b}</span>
                  <button className="text-xs text-brand-red hover:underline" onClick={() => { setFromProd(p.a); setToProd(p.b); }}>ربط</button>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="توحيد أسماء العملاء">
          <div className="grid grid-cols-1 gap-2 mb-4">
            <div className="flex gap-2">
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
          </div>
          <h4 className="text-sm font-semibold mb-2">عملاء مشتبه في تكرارهم</h4>
          {suspectedClients.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد تكرار مشتبه.</p>}
          <ul className="space-y-1 text-sm max-h-60 overflow-y-auto">
            {suspectedClients.map((p, i) => (
              <li key={i} className="p-2 rounded bg-muted/40">{p.a} <span className="text-muted-foreground text-xs">↔</span> {p.b}</li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="خريطة الفئات وأنواع الطباعة">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">الفئات المستخدمة</h4>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(tx.map((t) => t.productCategory).filter(Boolean))].map((c) => (
                <span key={c} className="px-2 py-1 rounded-md bg-muted text-xs">{c}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">أنواع الطباعة</h4>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(tx.map((t) => t.printingType).filter(Boolean))].map((c) => (
                <span key={c} className="px-2 py-1 rounded-md bg-brand-gold/15 text-brand-gold text-xs">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}