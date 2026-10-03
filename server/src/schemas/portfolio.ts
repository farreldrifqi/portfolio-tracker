import { z } from "zod";

export const portfolioSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
});

export const transactionSchema = z.object({
  symbol: z.string().trim().toUpperCase().min(1).max(20),
  assetName: z.string().trim().min(1).max(100).optional(),
  assetType: z.enum(["STOCK", "CRYPTO"]),
  type: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  price: z.coerce.number().positive("Harga harus lebih dari 0"),
  fee: z.coerce.number().min(0).default(0),
  executedAt: z.coerce.date(),
});