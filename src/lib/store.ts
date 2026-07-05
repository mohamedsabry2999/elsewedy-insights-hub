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
