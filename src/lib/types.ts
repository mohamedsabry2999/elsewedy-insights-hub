export type Transaction = {
  id: string;
  clientId: string;
  clientName: string;
  clientCode?: string;
  orderDate: string; // ISO date
  deliveryDate?: string;
  invoiceDate?: string;
  jobOrderNumber?: string;
  invoiceNumber?: string;
  productName: string;
  productCategory?: string;
  printingType?: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  material?: string;
  finishing?: string;
  salesperson?: string;
  status?: string;
  notes?: string;
  year: number;
  month: number;
};

export type Client = {
  id: string;
  name: string;
  code?: string;
  sector?: string;
};

export type UploadRecord = {
  id: string;
  clientId: string;
  clientName: string;
  year: number;
  rows: number;
  fileName: string;
  createdAt: string;
};

export type ProductAlias = {
  canonical: string;
  aliases: string[];
};