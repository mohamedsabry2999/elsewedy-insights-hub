import { useState } from "react";
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
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

const FIELD_LABELS_AR: Record<string, string> = {
  clientName: "اسم العميل", clientCode: "كود العميل",
  orderDate: "تاريخ الطلب", deliveryDate: "تاريخ التسليم", invoiceDate: "تاريخ الفاتورة",
  jobOrderNumber: "رقم أمر الشغل", invoiceNumber: "رقم الفاتورة",
  productName: "اسم المنتج", productCategory: "الفئة", printingType: "نوع الطباعة",
  quantity: "الكمية", unitPrice: "سعر الوحدة", totalValue: "الإجمالي",
  material: "الخامة", finishing: "التشطيب", salesperson: "المندوب",
  status: "الحالة", notes: "ملاحظات",
};

const REQUIRED = ["clientName", "orderDate", "productName"];

export default function UploadCenter() {
  const clients = store.getClients();
  const [clientId, setClientId] = useState<string>("");
  const [newClientName, setNewClientName] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");

  const onFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
    if (!data.length) { toast.error("الملف فارغ."); return; }
    const hdrs = Object.keys(data[0]);
    setHeaders(hdrs); setRows(data); setMapping(autoDetectMapping(hdrs));
    toast.success(`تم تحميل ${data.length} سطر. راجع الأعمدة والمعاينة.`);
  };

  const missing = REQUIRED.filter((f) => !mapping[f]);
  const previewRows = rows.slice(0, 8);

  const doImport = () => {
    let cid = clientId;
    let cname = clients.find((c) => c.id === cid)?.name;
    if (!cid && newClientName.trim()) {
      const c = upsertClient(newClientName.trim());
      cid = c.id; cname = c.name;
    }
    if (!cid) { toast.error("اختر عميلًا أو أدخل اسم عميل جديد."); return; }
    if (missing.length) { toast.error(`أعمدة إلزامية غير مربوطة: ${missing.map((m) => FIELD_LABELS_AR[m]).join("، ")}`); return; }

    const tx: Transaction[] = [];
    let skipped = 0;
    for (const r of rows) {
      const productName = String(r[mapping.productName] ?? "").trim();
      const orderDate = parseDate(r[mapping.orderDate]);
      if (!productName || !orderDate) { skipped++; continue; }
      const quantity = toNumber(r[mapping.quantity]);
      const unitPrice = toNumber(r[mapping.unitPrice]);
      let totalValue = toNumber(r[mapping.totalValue]);
      if (!totalValue) totalValue = quantity * unitPrice;
      const d = new Date(orderDate);
      // per-row client (override) if mapping provided, else fallback to selected
      const rowClientName = mapping.clientName ? String(r[mapping.clientName] ?? "").trim() : cname!;
      const rowClientCode = mapping.clientCode ? String(r[mapping.clientCode] ?? "").trim() : undefined;
      const useClient = rowClientName && rowClientName !== cname
        ? upsertClient(rowClientName, rowClientCode)
        : { id: cid, name: cname!, code: rowClientCode };
      tx.push({
        id: crypto.randomUUID(),
        clientId: useClient.id,
        clientName: useClient.name,
        clientCode: useClient.code,
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
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      });
    }
    addTransactions(tx);
    addUpload({
      id: crypto.randomUUID(), clientId: cid, clientName: cname!, year,
      rows: tx.length, fileName, createdAt: new Date().toISOString(),
    });
    toast.success(`تم استيراد ${tx.length} حركة${skipped ? ` (${skipped} سطر تم تجاهله)` : ""}.`);
    setRows([]); setHeaders([]); setMapping({}); setFileName("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="مركز الرفع"
        subtitle="ارفع ملفات إكسل أو CSV لأي عميل وسنة، ثم راجع الأعمدة وأكد الاستيراد."
      />
      <Section title="1) بيانات الرفع">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>العميل</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="اختر عميلًا موجودًا" /></SelectTrigger>
              <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
            </Select>
            <Input placeholder="أو أدخل اسم عميل جديد..." value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>السنة</Label>
            <Input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(+e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ملف الرفع (.xlsx / .csv)</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer border border-dashed border-border rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 flex items-center gap-2">
                <UploadCloud className="w-4 h-4" />
                <span className="truncate">{fileName || "اختر ملفًا..."}</span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
            </div>
          </div>
        </div>
      </Section>

      {headers.length > 0 && (
        <>
          <Section title="2) ربط الأعمدة">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {CANONICAL_FIELDS.map((f) => (
                <div key={f} className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    {FIELD_LABELS_AR[f]}
                    {REQUIRED.includes(f) && <span className="text-brand-red">*</span>}
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
            <div className="mt-4 text-xs text-muted-foreground">
              الأعمدة المدعومة تشمل الأسماء الإنجليزية والعربية معًا. مثال: {Object.values(COLUMN_ALIASES).flat().slice(0, 6).join("، ")}...
            </div>
          </Section>

          <Section title={`3) معاينة البيانات (${rows.length} سطر)`}>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b border-border sticky top-0 bg-card">
                  <tr>{headers.map((h) => (<th key={h} className="text-right py-2 px-2 whitespace-nowrap">{h}</th>))}</tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-b border-border/40">
                      {headers.map((h) => (<td key={h} className="py-1.5 px-2 whitespace-nowrap">{String(r[h] ?? "")}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="4) التحقق والاستيراد">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm">
                {missing.length ? (
                  <div className="flex items-center gap-2 text-brand-red"><AlertCircle className="w-4 h-4" /> يجب ربط: {missing.map((m) => FIELD_LABELS_AR[m]).join("، ")}</div>
                ) : (
                  <div className="flex items-center gap-2 text-success"><CheckCircle2 className="w-4 h-4" /> جميع الحقول الإلزامية جاهزة.</div>
                )}
              </div>
              <Button disabled={!!missing.length} onClick={doImport} className="bg-brand-navy hover:bg-brand-navy/90 text-primary-foreground">
                استيراد الحركات
              </Button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}