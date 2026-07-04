import { Transaction, Client, UploadRecord, ProductAlias } from "./types";

const K = {
  clients: "eph_clients",
  tx: "eph_transactions",
  uploads: "eph_uploads",
  aliases: "eph_aliases",
  auth: "eph_auth",
  seeded: "eph_seeded_v1",
};

function read<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}
function write<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); }

export const store = {
  getClients: (): Client[] => read(K.clients, []),
  setClients: (v: Client[]) => write(K.clients, v),
  getTransactions: (): Transaction[] => read(K.tx, []),
  setTransactions: (v: Transaction[]) => write(K.tx, v),
  getUploads: (): UploadRecord[] => read(K.uploads, []),
  setUploads: (v: UploadRecord[]) => write(K.uploads, v),
  getAliases: (): ProductAlias[] => read(K.aliases, []),
  setAliases: (v: ProductAlias[]) => write(K.aliases, v),
  isAuthed: () => !!localStorage.getItem(K.auth),
  login: (email: string) => localStorage.setItem(K.auth, email),
  logout: () => localStorage.removeItem(K.auth),
  getUser: () => localStorage.getItem(K.auth) || "",
  reset: () => { [K.clients,K.tx,K.uploads,K.aliases,K.seeded].forEach(k=>localStorage.removeItem(k)); },
};

export function upsertClient(name: string, code?: string, sector?: string): Client {
  const clients = store.getClients();
  const norm = name.trim();
  let c = clients.find((x) => x.name.trim() === norm || (code && x.code === code));
  if (!c) {
    c = { id: crypto.randomUUID(), name: norm, code, sector };
    clients.push(c);
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

// ---------- Demo seed ----------
const DEMO_PRODUCTS = [
  { name: "علبة تغليف شوكولاتة 250 جم", cat: "علب تغليف", type: "أوفست", price: 3.5 },
  { name: "علبة تغليف تمور 500 جم", cat: "علب تغليف", type: "أوفست", price: 4.2 },
  { name: "استيكر ورق", cat: "استيكرات", type: "ديجيتال", price: 0.35 },
  { name: "ليبل شفاف", cat: "ليبلز", type: "ديجيتال", price: 0.55 },
  { name: "Sleeve Packaging", cat: "تغليف", type: "أوفست", price: 2.1 },
  { name: "بروشور", cat: "مطبوعات تسويقية", type: "ديجيتال", price: 1.8 },
  { name: "علبة مستحضرات تجميل", cat: "علب تغليف", type: "أوفست فاخر", price: 8.5 },
];
const DEMO_CLIENTS = [
  { name: "شركة النيل للحلويات", code: "C-001", sector: "أغذية" },
  { name: "مصنع الواحة للتمور", code: "C-002", sector: "أغذية" },
  { name: "لمسة جمال للتجميل", code: "C-003", sector: "مستحضرات تجميل" },
  { name: "الشرق الأوسط للأدوية", code: "C-004", sector: "أدوية" },
  { name: "بيت العطور الملكي", code: "C-005", sector: "عطور" },
];
const SALES = ["أحمد فتحي", "منى سعيد", "خالد النجار", "رانيا حسن"];
const FINISHES = ["UV Spot", "بارز", "ذهبي", "لامينيت مطفي", "بدون"];
const MATERIALS = ["كوشيه 300 جم", "دوبلكس 350 جم", "شفاف PP", "ورق كرافت", "ورق ذاتي اللصق"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pad(n: number) { return n.toString().padStart(2, "0"); }

export function seedDemoIfEmpty() {
  if (localStorage.getItem(K.seeded)) return;
  const clients: Client[] = DEMO_CLIENTS.map((c) => ({ id: crypto.randomUUID(), ...c }));
  store.setClients(clients);

  const tx: Transaction[] = [];
  const years = [2023, 2024, 2025, 2026];
  let jo = 10000;
  let inv = 50000;
  for (const client of clients) {
    // Assign 4-6 recurring products for this client
    const productPool = [...DEMO_PRODUCTS].sort(() => 0.5 - Math.random()).slice(0, 5);
    for (const yr of years) {
      // seasonality factor: grow over years slightly, with random noise
      const yearGrowth = 1 + (yr - 2023) * 0.15 + (Math.random() * 0.1 - 0.05);
      const monthlyOrders = randInt(6, 14);
      for (let i = 0; i < monthlyOrders; i++) {
        const month = randInt(1, yr === 2026 ? 6 : 12);
        const day = randInt(1, 27);
        const orderDate = `${yr}-${pad(month)}-${pad(day)}`;
        const delivDays = randInt(5, 18);
        const dd = new Date(orderDate); dd.setDate(dd.getDate() + delivDays);
        const deliveryDate = dd.toISOString().slice(0, 10);
        const invD = new Date(deliveryDate); invD.setDate(invD.getDate() + randInt(1, 7));
        const invoiceDate = invD.toISOString().slice(0, 10);
        // one job order = 1-3 line items
        const items = randInt(1, 3);
        const currentJo = `JO-${++jo}`;
        const currentInv = `INV-${++inv}`;
        for (let k = 0; k < items; k++) {
          const p = rand(productPool);
          const qty = randInt(500, 8000);
          const unit = +(p.price * (0.9 + Math.random() * 0.3) * yearGrowth).toFixed(2);
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
  }
  store.setTransactions(tx);
  localStorage.setItem(K.seeded, "1");
}