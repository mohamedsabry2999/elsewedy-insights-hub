import { Transaction, Client, UploadRecord, ProductAlias } from "./types";

const K = {
  clients: "eph_clients",
  tx: "eph_transactions",
  uploads: "eph_uploads",
  aliases: "eph_aliases",
  printMap: "eph_print_map",
  auth: "eph_auth",
  seeded: "eph_seeded_v3",
};

function read<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}
function write<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); }

export const PRINT_TYPES = ["Digital", "Offset", "Packaging", "Labels", "Stickers", "Finishing"] as const;
export type PrintType = (typeof PRINT_TYPES)[number];

export const store = {
  getClients: (): Client[] => read(K.clients, []),
  setClients: (v: Client[]) => write(K.clients, v),
  getTransactions: (): Transaction[] => read(K.tx, []),
  setTransactions: (v: Transaction[]) => write(K.tx, v),
  getUploads: (): UploadRecord[] => read(K.uploads, []),
  setUploads: (v: UploadRecord[]) => write(K.uploads, v),
  getAliases: (): ProductAlias[] => read(K.aliases, []),
  setAliases: (v: ProductAlias[]) => write(K.aliases, v),
  getPrintMap: (): Record<string, PrintType> => read(K.printMap, {}),
  setPrintMap: (v: Record<string, PrintType>) => write(K.printMap, v),
  isAuthed: () => !!localStorage.getItem(K.auth),
  login: (email: string) => localStorage.setItem(K.auth, email),
  logout: () => localStorage.removeItem(K.auth),
  getUser: () => localStorage.getItem(K.auth) || "",
  reset: () => { [K.clients,K.tx,K.uploads,K.aliases,K.printMap,K.seeded].forEach(k=>localStorage.removeItem(k)); },
};

export function upsertClient(name: string, code?: string, sector?: string): Client {
  const clients = store.getClients();
  const norm = name.trim();
  let c = clients.find((x) => x.name.trim() === norm || (code && x.code === code));
  if (!c) {
    c = { id: crypto.randomUUID(), name: norm, code, sector };
    clients.push(c);
    store.setClients(clients);
  } else if (sector && !c.sector) {
    c.sector = sector;
    store.setClients(clients);
  }
  return c;
}

export function addTransactions(newTx: Transaction[]) {
  const all = store.getTransactions();
  all.push(...newTx);
  store.setTransactions(all);
}

export function addUpload(u: UploadRecord) {
  const arr = store.getUploads();
  arr.unshift(u);
  store.setUploads(arr.slice(0, 100));
}

/** Add an alias mapping: variant -> canonical. */
export function addAlias(variant: string, canonical: string) {
  const arr = store.getAliases();
  const existing = arr.find((a) => a.canonical === canonical);
  if (existing) {
    if (!existing.aliases.includes(variant)) existing.aliases.push(variant);
  } else {
    arr.push({ canonical, aliases: [variant] });
  }
  store.setAliases(arr);
}

/** Infer print type category from free-text printing type or product name. */
export function inferPrintType(t: { productName: string; printingType?: string; productCategory?: string }): PrintType | null {
  const map = store.getPrintMap();
  const raw = (t.printingType || "").trim();
  if (raw && map[raw]) return map[raw];
  const s = `${t.productName} ${t.printingType || ""} ${t.productCategory || ""}`.toLowerCase();
  if (/(sticker|استيكر)/.test(s)) return "Stickers";
  if (/(label|ليبل)/.test(s)) return "Labels";
  if (/(finish|foil|spot uv|lamin|تشطيب|بارز)/.test(s)) return "Finishing";
  if (/(carton|packag|sleeve|علب|تغليف)/.test(s)) return "Packaging";
  if (/(offset|أوفست)/.test(s)) return "Offset";
  if (/(digital|ديجيتال|رقمي)/.test(s)) return "Digital";
  return null;
}

/* ============ Demo seed ============ */
const DEMO_PRODUCTS = [
  { name: "علبة تغليف شوكولاتة 250 جم", cat: "علب تغليف", type: "Offset", price: 3.5, sectors: ["Food", "Chocolate"] },
  { name: "علبة تغليف تمور 500 جم", cat: "علب تغليف", type: "Offset", price: 4.2, sectors: ["Food", "Dates"] },
  { name: "علبة تغليف تمور 1 كجم", cat: "علب تغليف", type: "Offset", price: 6.8, sectors: ["Food", "Dates"] },
  { name: "استيكر ورق 100ml", cat: "استيكرات", type: "Digital", price: 0.4, sectors: ["Cosmetics", "FMCG"] },
  { name: "ليبل شفاف", cat: "ليبلز", type: "Labels", price: 0.55, sectors: ["Pharma", "Cosmetics"] },
  { name: "ليبل دوائي", cat: "ليبلز", type: "Labels", price: 0.7, sectors: ["Pharma"] },
  { name: "Sleeve Packaging", cat: "تغليف", type: "Packaging", price: 2.1, sectors: ["Food", "FMCG"] },
  { name: "Folding Carton Pharma", cat: "علب تغليف", type: "Packaging", price: 5.5, sectors: ["Pharma"] },
  { name: "بروشور A4", cat: "مطبوعات تسويقية", type: "Digital", price: 1.8, sectors: ["FMCG", "Cosmetics"] },
  { name: "علبة مستحضرات تجميل", cat: "علب تغليف", type: "Finishing", price: 8.5, sectors: ["Cosmetics"] },
  { name: "Sticker Metallic Label", cat: "استيكرات", type: "Finishing", price: 1.2, sectors: ["Cosmetics", "FMCG"] },
  { name: "كرت تعريفي", cat: "مطبوعات", type: "Digital", price: 0.9, sectors: ["FMCG", "Cosmetics"] },
  { name: "علبة غذائية", cat: "علب تغليف", type: "Packaging", price: 3.9, sectors: ["Food"] },
];

const DEMO_CLIENTS = [
  { name: "شركة النيل للحلويات", code: "C-001", sector: "Chocolate", pool: ["علبة تغليف شوكولاتة 250 جم", "Sleeve Packaging", "استيكر ورق 100ml", "بروشور A4"] },
  { name: "مصنع الواحة للتمور", code: "C-002", sector: "Dates", pool: ["علبة تغليف تمور 500 جم", "علبة تغليف تمور 1 كجم", "ليبل شفاف", "علبة غذائية"] },
  { name: "لمسة جمال للتجميل", code: "C-003", sector: "Cosmetics", pool: ["علبة مستحضرات تجميل", "Sticker Metallic Label", "ليبل شفاف", "كرت تعريفي"] },
  { name: "الشرق الأوسط للأدوية", code: "C-004", sector: "Pharma", pool: ["Folding Carton Pharma", "ليبل دوائي", "بروشور A4"] },
  { name: "بيت العطور الملكي", code: "C-005", sector: "Cosmetics", pool: ["علبة مستحضرات تجميل", "Sticker Metallic Label", "ليبل شفاف"] },
  { name: "شركة نور للأغذية", code: "C-006", sector: "Food", pool: ["علبة غذائية", "Sleeve Packaging", "استيكر ورق 100ml"] },
  { name: "مصنع الفراعنة للشوكولاتة", code: "C-007", sector: "Chocolate", pool: ["علبة تغليف شوكولاتة 250 جم", "Sticker Metallic Label", "بروشور A4"] },
  { name: "الأهرام للمنتجات الاستهلاكية", code: "C-008", sector: "FMCG", pool: ["كرت تعريفي", "استيكر ورق 100ml", "Sleeve Packaging", "بروشور A4"] },
  { name: "شركة الشفاء للأدوية", code: "C-009", sector: "Pharma", pool: ["Folding Carton Pharma", "ليبل دوائي"] },
  { name: "وادي التمور للتصدير", code: "C-010", sector: "Dates", pool: ["علبة تغليف تمور 500 جم", "علبة تغليف تمور 1 كجم", "ليبل شفاف"] },
  { name: "لمار للعناية الشخصية", code: "C-011", sector: "Cosmetics", pool: ["علبة مستحضرات تجميل", "Sticker Metallic Label", "ليبل شفاف", "كرت تعريفي"] },
  { name: "دار الطباعة للوكالات", code: "C-012", sector: "Agencies", pool: ["بروشور A4", "كرت تعريفي", "استيكر ورق 100ml"] },
];

const SALES = ["أحمد فتحي", "منى سعيد", "خالد النجار", "رانيا حسن", "محمود عبدالله"];
const FINISHES = ["Spot UV", "Foil Stamping", "Lamination", "بارز", "ذهبي", "لامينيت مطفي", "بدون"];
const MATERIALS = ["كوشيه 300 جم", "دوبلكس 350 جم", "شفاف PP", "ورق كرافت", "ورق ذاتي اللصق", "كوشيه 250 جم"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pad(n: number) { return n.toString().padStart(2, "0"); }

export function seedDemoIfEmpty() {
  if (localStorage.getItem(K.seeded)) return;
  const clients: Client[] = DEMO_CLIENTS.map((c) => ({
    id: crypto.randomUUID(), name: c.name, code: c.code, sector: c.sector,
  }));
  store.setClients(clients);

  const productByName = new Map(DEMO_PRODUCTS.map((p) => [p.name, p]));
  const tx: Transaction[] = [];
  const years = [2023, 2024, 2025, 2026];
  let jo = 10000, inv = 50000;

  clients.forEach((client, idx) => {
    const template = DEMO_CLIENTS[idx];
    const productPool = template.pool.map((n) => productByName.get(n)!).filter(Boolean);

    // Make a subset of products "drop" in later years to create متوقف / lost cases
    const droppedInYear = new Map<string, number>();
    productPool.slice(-1).forEach((p) => droppedInYear.set(p.name, 2025));

    for (const yr of years) {
      // Overall trend per client
      const yearMultiplier = 1 + (yr - 2023) * (0.05 + (idx % 4) * 0.05) + (Math.random() * 0.15 - 0.07);
      const monthCap = yr === 2026 ? 6 : 12; // partial current year
      const monthlyOrders = Math.max(4, Math.round((10 + idx) * (yr === 2026 ? 0.5 : 1)));

      for (let i = 0; i < monthlyOrders; i++) {
        // Seasonal bias for some sectors
        let month = randInt(1, monthCap);
        if (template.sector === "Chocolate" && Math.random() < 0.45) month = rand([2, 3, 11, 12].filter((m) => m <= monthCap));
        if (template.sector === "Dates" && Math.random() < 0.5) month = rand([3, 4, 5, 6].filter((m) => m <= monthCap));
        if (template.sector === "Cosmetics" && Math.random() < 0.35) month = rand([1, 2, 5, 6, 11, 12].filter((m) => m <= monthCap));

        const day = randInt(1, 27);
        const orderDate = `${yr}-${pad(month)}-${pad(day)}`;
        const delivDays = randInt(5, 18);
        const dd = new Date(orderDate); dd.setDate(dd.getDate() + delivDays);
        const deliveryDate = dd.toISOString().slice(0, 10);
        const invD = new Date(deliveryDate); invD.setDate(invD.getDate() + randInt(1, 7));
        const invoiceDate = invD.toISOString().slice(0, 10);
        const items = randInt(1, 3);
        const currentJo = `JO-${++jo}`;
        const currentInv = `INV-${++inv}`;

        for (let k = 0; k < items; k++) {
          let p = rand(productPool);
          const dropped = droppedInYear.get(p.name);
          if (dropped && yr >= dropped) {
            const others = productPool.filter((x) => !droppedInYear.has(x.name) || droppedInYear.get(x.name)! > yr);
            if (others.length) p = rand(others);
          }
          const qty = randInt(500, 8000);
          const unit = +(p.price * (0.9 + Math.random() * 0.35) * yearMultiplier).toFixed(2);
          const total = +(qty * unit).toFixed(2);
          tx.push({
            id: crypto.randomUUID(),
            clientId: client.id,
            clientName: client.name,
            clientCode: client.code,
            orderDate, deliveryDate, invoiceDate,
            jobOrderNumber: currentJo, invoiceNumber: currentInv,
            productName: p.name, productCategory: p.cat, printingType: p.type,
            quantity: qty, unitPrice: unit, totalValue: total,
            material: rand(MATERIALS), finishing: rand(FINISHES),
            salesperson: rand(SALES), status: "منفذ",
            year: yr, month,
          });
        }
      }
    }
  });

  // Add a couple of duplicate-style rows to make Data Cleaning meaningful
  const dupCandidates = tx.slice(0, 6).map((t) => ({
    ...t,
    id: crypto.randomUUID(),
    productName: t.productName.replace("علبة", "علبه").replace(/\s+/g, " ").trim(),
  }));
  tx.push(...dupCandidates);

  store.setTransactions(tx);
  localStorage.setItem(K.seeded, "1");
}