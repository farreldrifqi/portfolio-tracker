import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { portfolioRouter } from "./routes/portfolios";
import { transactionRouter } from "./routes/transactions";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/portfolios", portfolioRouter);
app.use("/api/transactions", transactionRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);

// Endpoint yang tidak ada
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan" });
});

// Galat tak terduga: selalu JSON, tanpa membocorkan detail
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number })?.status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: "Permintaan tidak valid" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server" });
});