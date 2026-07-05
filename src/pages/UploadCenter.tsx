import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { store, upsertClient, addTransactions, addUpload } from "@/lib/store";
import { autoDetectMapping, CANONICAL_FIELDS, COLUMN_ALIASES, parseDate, toNumber } from "@/lib/columnMap";
import { Transaction } from "@/lib/types";
import { toast } from "sonner";
import { downloadSampleTemplate } from "@/lib/sampleTemplate";
import {
  UploadCloud, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Download, FileSpreadsheet, User2, CalendarRange, Eye, ListChecks, ShieldCheck,
} from "lucide-react";

const FIELD_LABELS_AR: Record<string, string> = {
  clientName: "اسم العميل", clientCode: "كود العميل",
  orderDate: "تاريخ الطلب", deliveryDate: "تاريخ التسليم", invoiceDate: "تاريخ الفاتورة",
  jobOrderNumber: "رقم أمر الشغل", invoiceNumber: "رقم الفاتورة",
  productName: "اسم المنتج", productCategory: "الفئة", printingType: "نوع الطباعة",
  quantity: "الكمية", unitPrice: "سعر الوحدة", totalValue: "الإجمالي",
  material: "الخامة", finishing: "التشطيب", salesperson: "المندوب",
  status: "الحالة", notes: "ملاحظات",
};

const REQUIRED = ["orderDate", "productName"] as const;
const STEPS = [
  { id: 1, label: "اختيار العميل", icon: User2 },
  { id: 2, label: "اختيار السنة", icon: CalendarRange },
  { id: 3, label: "رفع الملف", icon: UploadCloud },
  { id: 4, label: "معاينة البيانات", icon: Eye },
  { id: 5, label: "ربط الأعمدة", icon: ListChecks },
  { id: 6, label: "التحقق والاستيراد", icon: ShieldCheck },
];

function simText(a: string, b: string) {
  const A = a.replace(/\s+/g, "").toLowerCase(), B = b.replace(/\s+/g, "").toLowerCase();
  if (A === B) return 1;
  if (!A || !B) return 0;
  if (A.includes(B) || B.includes(A)) return 0.87;
  let hits = 0; const short = A.length < B.length ? A : B, long = A.length < B.length ? B : A;
  for (const ch of short) if (long.includes(ch)) hits++;
  return hits / long.length;
}

/** Extract 4-digit year from sheet name (e.g. "2024", "Sales 2024", "بيانات 2024"). */
function yearFromSheetName(name: string, fallback: number): number {
  const m = String(name).match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : fallback;
}

export default function UploadCenter() {
  const clients = store.getClients();
  const [step, setStep] = useState(1);

  const [clientId, setClientId] = useState<string>("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientCode, setNewClientCode] = useState("");
  const [newClientSector, setNewClientSector] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [sheetSummary, setSheetSummary] = useState<{ name: string; year: number; rows: number }[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");

  const resolvedClient = useMemo(() => {
    if (clientId) return clients.find((c) => c.id === clientId);
    if (newClientName.trim()) return { id: "__new__", name: newClientName.trim(), code: newClientCode.trim() || undefined, sector: newClientSector.trim() || undefined };
    return null;
  }, [clientId, newClientName, newClientCode, newClientSector, clients]);

  const canNext = () => {
    if (step === 1) return !!resolvedClient;
    if (step === 2) return year > 2000 && year < 2100;
    if (step === 3) return rows.length > 0;
    if (step === 4) return rows.length > 0;
    if (step === 5) return REQUIRED.every((f) => mapping[f]);
    return true;
  };

  const onFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const allRows: Record<string, unknown>[] = [];
      const summary: { name: string; year: number; rows: number }[] = [];
      const headerSet = new Set<string>();
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
        if (!data.length) continue;
        const yr = yearFromSheetName(name, year);
        for (const row of data) {
          Object.keys(row).forEach((h) => headerSet.add(h));
          allRows.push({ ...row, __sheet: name, __sheetYear: yr });
        }
        summary.push({ name, year: yr, rows: data.length });
      }
      if (!allRows.length) { toast.error("الملف فارغ."); return; }
      const hdrs = [...headerSet];
      setHeaders(hdrs); setRows(allRows); setSheetSummary(summary);
      setMapping(autoDetectMapping(hdrs));
      const yrList = summary.map((s) => s.year);
      if (yrList.length) setYear(Math.max(...yrList));
      toast.success(
        summary.length > 1
          ? `تم تحميل ${allRows.length} سطر من ${summary.length} صفحات (${summary.map((s) => s.year).join("، ")}).`
          : `تم تحميل ${allRows.length} سطر.`
      );
      setStep(4);
    } catch {
      toast.error("تعذّر قراءة الملف. تأكد من الصيغة.");
    }
  };

  // Validation report (computed once mapping is set)
  const validation = useMemo(() => {
    if (!rows.length || !mapping.orderDate || !mapping.productName) return null;
    let valid = 0, missingProduct = 0, badDate = 0, missingMoney = 0;
    const productSeen = new Map<string, number>();
    for (const r of rows) {
      const pn = String(r[mapping.productName] ?? "").trim();
      const od = parseDate(r[mapping.orderDate]);
      if (!pn) missingProduct++;
      if (!od) badDate++;
      const qty = mapping.quantity ? toNumber(r[mapping.quantity]) : 0;
      const up = mapping.unitPrice ? toNumber(r[mapping.unitPrice]) : 0;
      const tot = mapping.totalValue ? toNumber(r[mapping.totalValue]) : 0;
      if (!tot && !(qty && up)) missingMoney++;
      if (pn && od) valid++;
      if (pn) productSeen.set(pn, (productSeen.get(pn) || 0) + 1);
    }
    const names = [...productSeen.keys()];
    const suspected: { a: string; b: string; sim: number }[] = [];
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        const s = simText(names[i], names[j]);
        if (s >= 0.82 && s < 1) suspected.push({ a: names[i], b: names[j], sim: s });
      }
    return { total: rows.length, valid, missingProduct, badDate, missingMoney, suspected: suspected.slice(0, 8) };
  }, [rows, mapping]);

  const doImport = () => {
    if (!resolvedClient) return;
    let cid = clientId, cname = clients.find((c) => c.id === cid)?.name || "";
    let ccode: string | undefined = clients.find((c) => c.id === cid)?.code;
    if (!cid) {
      const c = upsertClient(newClientName.trim(), newClientCode.trim() || undefined, newClientSector.trim() || undefined);
      cid = c.id; cname = c.name; ccode = c.code;
    }

    const tx: Transaction[] = [];
    let skipped = 0;
    for (const r of rows) {
      const productName = String(r[mapping.productName] ?? "").trim();
      const orderDate = parseDate(r[mapping.orderDate]);
      const sheetYear = typeof r.__sheetYear === "number" ? (r.__sheetYear as number) : undefined;
      if (!productName || !orderDate) { skipped++; continue; }
      const quantity = mapping.quantity ? toNumber(r[mapping.quantity]) : 0;
      const unitPrice = mapping.unitPrice ? toNumber(r[mapping.unitPrice]) : 0;
      let totalValue = mapping.totalValue ? toNumber(r[mapping.totalValue]) : 0;
      if (!totalValue) totalValue = quantity * unitPrice;
      const d = new Date(orderDate);
      const rowYear = sheetYear ?? d.getFullYear();

      const rowClientName = mapping.clientName ? String(r[mapping.clientName] ?? "").trim() : cname;
      const rowClientCode = mapping.clientCode ? String(r[mapping.clientCode] ?? "").trim() : ccode;
      const useClient = rowClientName && rowClientName !== cname
        ? upsertClient(rowClientName, rowClientCode)
        : { id: cid, name: cname, code: ccode };

      tx.push({
        id: crypto.randomUUID(),
        clientId: useClient.id, clientName: useClient.name, clientCode: useClient.code,
        orderDate,
        deliveryDate: mapping.deliveryDate ? parseDate(r[mapping.deliveryDate]) : undefined,
        invoiceDate: mapping.invoiceDate ? parseDate(r[mapping.invoiceDate]) : undefined,
        jobOrderNumber: mapping.jobOrderNumber ? String(r[mapping.jobOrderNumber] ?? "").trim() || undefined : undefined,
        invoiceNumber: mapping.invoiceNumber ? String(r[mapping.invoiceNumber] ?? "").trim() || undefined : undefined,
        productName,
        productCategory: mapping.productCategory ? String(r[mapping.productCategory] ?? "").trim() || undefined : undefined,
        printingType: mapping.printingType ? String(r[mapping.printingType] ?? "").trim() || undefined : undefined,
        quantity, unitPrice, totalValue,
        material: mapping.material ? String(r[mapping.material] ?? "").trim() || undefined : undefined,
        finishing: mapping.finishing ? String(r[mapping.finishing] ?? "").trim() || undefined : undefined,
        salesperson: mapping.salesperson ? String(r[mapping.salesperson] ?? "").trim() || undefined : undefined,
        status: mapping.status ? String(r[mapping.status] ?? "").trim() || undefined : undefined,
        notes: mapping.notes ? String(r[mapping.notes] ?? "").trim() || undefined : undefined,
        year: rowYear, month: d.getMonth() + 1,
      });
    }
    addTransactions(tx);
    addUpload({
      id: crypto.randomUUID(), clientId: cid, clientName: cname, year,
      rows: tx.length, fileName, createdAt: new Date().toISOString(),
    });
    toast.success(`تم استيراد ${tx.length} حركة${skipped ? ` (${skipped} سطر تم تجاهله)` : ""}.`);
    // reset
    setStep(1); setClientId(""); setNewClientName(""); setNewClientCode(""); setNewClientSector("");
    setRows([]); setHeaders([]); setMapping({}); setFileName(""); setSheetSummary([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="مركز الرفع"
        subtitle="خطوات ذكية لرفع ملفات Excel/CSV لأي عميل وسنة مع كشف تلقائي للأعمدة العربية والإنجليزية."
        actions={
          <Button variant="outline" onClick={downloadSampleTemplate}>
            <Download className="w-4 h-4 ml-2" /> تحميل النموذج
          </Button>
        }
      />

      {/* Stepper */}
      <div className="bg-card border border-border rounded-xl p-4 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {STEPS.map((s, i) => {
            const active = step === s.id, done = step > s.id; const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <button onClick={() => { if (done) setStep(s.id); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition
                  ${active ? "bg-brand-navy text-primary-foreground" : done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{s.id}. {s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      {step === 1 && (
        <Section title="اختر العميل">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">عميل موجود</Label>
              <Select value={clientId} onValueChange={(v) => { setClientId(v); setNewClientName(""); }}>
                <SelectTrigger><SelectValue placeholder="اختر من القائمة" /></SelectTrigger>
                <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} {c.code && `(${c.code})`}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>أو عميل جديد</Label>
              <Input value={newClientName} onChange={(e) => { setNewClientName(e.target.value); setClientId(""); }} placeholder="اسم العميل" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={newClientCode} onChange={(e) => setNewClientCode(e.target.value)} placeholder="كود العميل (اختياري)" />
                <Input value={newClientSector} onChange={(e) => setNewClientSector(e.target.value)} placeholder="القطاع (Food/Pharma/...)" />
              </div>
            </div>
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title="اختر السنة">
          <div className="max-w-xs">
            <Label className="mb-2 block">السنة المرتبطة بالبيانات</Label>
            <Input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(+e.target.value)} />
            <p className="text-xs text-muted-foreground mt-2">تُستخدم للفلترة والعرض؛ التواريخ الفعلية تُقرأ من الملف.</p>
          </div>
        </Section>
      )}

      {step === 3 && (
        <Section title="ارفع ملف Excel أو CSV">
          <label className="block cursor-pointer border-2 border-dashed border-border rounded-xl px-6 py-10 text-center hover:bg-muted/40">
            <UploadCloud className="w-10 h-10 mx-auto text-brand-navy mb-3" />
            <div className="font-semibold text-brand-navy">{fileName || "اسحب الملف هنا أو اضغط للاختيار"}</div>
            <div className="text-xs text-muted-foreground mt-1">صيغ مدعومة: .xlsx • .xls • .csv</div>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            الأعمدة المدعومة: {Object.values(COLUMN_ALIASES).flat().slice(0, 6).join("، ")}...
            <button className="text-brand-red hover:underline mr-2" onClick={downloadSampleTemplate}>حمّل نموذج جاهز</button>
          </div>
        </Section>
      )}

      {step === 4 && (
        <Section title={`معاينة البيانات (${rows.length} سطر)`}>
          {sheetSummary.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {sheetSummary.map((s) => (
                <div key={s.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-brand-navy" />
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-muted-foreground">→ سنة {s.year}</span>
                  <span className="text-muted-foreground">• {s.rows} سطر</span>
                </div>
              ))}
            </div>
          )}
          <div className="overflow-x-auto max-h-96 border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border sticky top-0 bg-card">
                <tr>{headers.map((h) => (<th key={h} className="text-right py-2 px-2 whitespace-nowrap font-semibold">{h}</th>))}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((r, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {headers.map((h) => (<td key={h} className="py-1.5 px-2 whitespace-nowrap">{String(r[h] ?? "")}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">يتم عرض أول 12 سطر فقط للمعاينة.</p>
        </Section>
      )}

      {step === 5 && (
        <Section title="ربط الأعمدة">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CANONICAL_FIELDS.map((f) => (
              <div key={f} className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  {FIELD_LABELS_AR[f]}
                  {(REQUIRED as readonly string[]).includes(f) && <span className="text-brand-red">*</span>}
                  {mapping[f] && <CheckCircle2 className="w-3 h-3 text-success" />}
                </Label>
                <Select value={mapping[f] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f]: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— بدون —</SelectItem>
                    {headers.map((h) => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            تم الكشف التلقائي عن {Object.keys(mapping).filter((k) => mapping[k]).length} عمود من {headers.length}. راجعها قبل المتابعة.
          </p>
        </Section>
      )}

      {step === 6 && (
        <Section title="تقرير التحقق والاستيراد">
          {validation ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                {[
                  { label: "إجمالي الصفوف", value: validation.total, color: "navy" },
                  { label: "صفوف صحيحة", value: validation.valid, color: "success" },
                  { label: "منتج ناقص", value: validation.missingProduct, color: "red" },
                  { label: "تواريخ غير صحيحة", value: validation.badDate, color: "red" },
                  { label: "قيم مالية ناقصة", value: validation.missingMoney, color: "gold" },
                ].map((k) => (
                  <div key={k.label} className="kpi-card">
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                    <div className={`text-2xl font-bold num ${
                      k.color === "red" ? "text-brand-red" : k.color === "gold" ? "text-brand-gold" : k.color === "success" ? "text-success" : "text-brand-navy"
                    }`}>{k.value}</div>
                  </div>
                ))}
              </div>

              {validation.suspected.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-brand-navy mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-brand-gold" /> منتجات مشكوك في تكرارها
                  </h4>
                  <ul className="text-sm space-y-1">
                    {validation.suspected.map((s, i) => (
                      <li key={i} className="p-2 rounded bg-muted/40 flex items-center justify-between">
                        <span>{s.a} <span className="text-muted-foreground text-xs mx-2">↔</span> {s.b}</span>
                        <span className="text-xs text-brand-gold">{(s.sim * 100).toFixed(0)}% تشابه</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">يمكن دمجها لاحقًا من صفحة "تنظيف البيانات".</p>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-border">
                <div className="text-sm">
                  {validation.valid > 0 ? (
                    <div className="flex items-center gap-2 text-success"><CheckCircle2 className="w-4 h-4" /> جاهز للاستيراد: {validation.valid} سطر</div>
                  ) : (
                    <div className="flex items-center gap-2 text-brand-red"><AlertCircle className="w-4 h-4" /> لا توجد صفوف صحيحة للاستيراد.</div>
                  )}
                </div>
                <Button disabled={validation.valid === 0} onClick={doImport} className="bg-brand-navy text-primary-foreground hover:bg-brand-navy/90">
                  <UploadCloud className="w-4 h-4 ml-2" /> استيراد {validation.valid} حركة
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">تأكد من ربط الأعمدة الإلزامية أولًا.</p>
          )}
        </Section>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
          <ChevronRight className="w-4 h-4 ml-1" /> السابق
        </Button>
        <div className="text-xs text-muted-foreground">خطوة {step} من {STEPS.length}</div>
        <Button disabled={!canNext() || step === STEPS.length} onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
          className="bg-brand-navy text-primary-foreground hover:bg-brand-navy/90">
          التالي <ChevronLeft className="w-4 h-4 mr-1" />
        </Button>
      </div>
    </div>
  );
}