import express from "express";
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