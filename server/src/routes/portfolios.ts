import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { formatIssues, parseId } from "../lib/validate";
import { portfolioSchema, transactionSchema } from "../schemas/portfolio";
import { buildSummary } from "../lib/summary";
import { buildHistory } from "../lib/history";
import {
  getCryptoPrices,
  getCryptoSeries,
  getQuoteCurrency,
  getStockPrices,
  getStockSeries,
  HARI_RIWAYAT,
} from "../lib/prices";
import { kepemilikanValid } from "../lib/holdings";

export const portfolioRouter = Router();

portfolioRouter.use(requireAuth);

function findOwnedPortfolio(id: number, userId: number) {
  return prisma.portfolio.findFirst({ where: { id, userId } });
}

function simbolPer(
  transactions: { asset: { symbol: string; type: string } }[],
  type: "CRYPTO" | "STOCK",
) {
  return [
    ...new Set(
      transactions.filter((t) => t.asset.type === type).map((t) => t.asset.symbol),
    ),
  ];
}

portfolioRouter.get("/", async (req, res) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId: req.userId! },
    orderBy: { id: "asc" },
  });
  res.json({ portfolios });
});

portfolioRouter.post("/", async (req, res) => {
  const parsed = portfolioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: formatIssues(parsed.error) });
    return;
  }

  const portfolio = await prisma.portfolio.create({
    data: { name: parsed.data.name, userId: req.userId! },
  });
  res.status(201).json({ portfolio });
});

portfolioRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const portfolio = await findOwnedPortfolio(id, req.userId!);
  if (!portfolio) {
    res.status(404).json({ error: "Portofolio tidak ditemukan" });
    return;
  }
  res.json({ portfolio });
});

portfolioRouter.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const parsed = portfolioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: formatIssues(parsed.error) });
    return;
  }

  const existing = await findOwnedPortfolio(id, req.userId!);
  if (!existing) {
    res.status(404).json({ error: "Portofolio tidak ditemukan" });
    return;
  }

  const portfolio = await prisma.portfolio.update({
    where: { id },
    data: { name: parsed.data.name },
  });
  res.json({ portfolio });
});

portfolioRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const result = await prisma.portfolio.deleteMany({
    where: { id, userId: req.userId! },
  });
  if (result.count === 0) {
    res.status(404).json({ error: "Portofolio tidak ditemukan" });
    return;
  }
  res.status(204).send();
});

portfolioRouter.get("/:id/transactions", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const portfolio = await findOwnedPortfolio(id, req.userId!);
  if (!portfolio) {
    res.status(404).json({ error: "Portofolio tidak ditemukan" });
    return;
  }

  const transactions = await prisma.transaction.findMany({
    where: { portfolioId: id },
    include: { asset: { select: { symbol: true, name: true, type: true } } },
    orderBy: { executedAt: "desc" },
  });
  res.json({ transactions });
});

portfolioRouter.post("/:id/transactions", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: formatIssues(parsed.error) });
    return;
  }

  const portfolio = await findOwnedPortfolio(id, req.userId!);
  if (!portfolio) {
    res.status(404).json({ error: "Portofolio tidak ditemukan" });
    return;
  }

  const { symbol, assetName, assetType, type, quantity, price, fee, executedAt } =
    parsed.data;

  const asset = await prisma.asset.upsert({
    where: { symbol },
    update: {},
    create: { symbol, name: assetName ?? symbol, type: assetType },
  });

  if (type === "SELL") {
    const sebelumnya = await prisma.transaction.findMany({
      where: { portfolioId: id, assetId: asset.id },
      select: { id: true, type: true, quantity: true, executedAt: true },
    });
    const baru = {
      id: Number.MAX_SAFE_INTEGER,
      type,
      quantity: new Prisma.Decimal(quantity),
      executedAt,
    };

    if (!kepemilikanValid([...sebelumnya, baru])) {
      res.status(400).json({
        error: "Jumlah jual melebihi kepemilikan pada tanggal tersebut",
      });
      return;
    }
  }

  const transaction = await prisma.transaction.create({
    data: { portfolioId: id, assetId: asset.id, type, quantity, price, fee, executedAt },
    include: { asset: { select: { symbol: true, name: true, type: true } } },
  });
  res.status(201).json({ transaction });
});

portfolioRouter.get("/:id/summary", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const portfolio = await findOwnedPortfolio(id, req.userId!);
  if (!portfolio) {
    res.status(404).json({ error: "Portofolio tidak ditemukan" });
    return;
  }

  const transactions = await prisma.transaction.findMany({
    where: { portfolioId: id },
    include: { asset: true },
    orderBy: [{ executedAt: "asc" }, { id: "asc" }],
  });

  const symbolsOf = (type: "CRYPTO" | "STOCK") => [
    ...new Set(
      transactions
        .filter((t) => t.asset.type === type)
        .map((t) => t.asset.symbol),
    ),
  ];
  
  const [crypto, stocks] = await Promise.all([
    getCryptoPrices(simbolPer(transactions, "CRYPTO")),
    getStockPrices(simbolPer(transactions, "STOCK")),
  ]);
  const prices = { ...crypto, ...stocks };

  res.json({
    portfolioId: id,
    quoteCurrency: getQuoteCurrency(),
    ...buildSummary(transactions, prices),
  });
});

portfolioRouter.get("/:id/history", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const portfolio = await findOwnedPortfolio(id, req.userId!);
  if (!portfolio) {
    res.status(404).json({ error: "Portofolio tidak ditemukan" });
    return;
  }

  const transactions = await prisma.transaction.findMany({
    where: { portfolioId: id },
    include: { asset: true },
    orderBy: [{ executedAt: "asc" }, { id: "asc" }],
  });

  const [crypto, stocks] = await Promise.all([
    getCryptoSeries(simbolPer(transactions, "CRYPTO")),
    getStockSeries(simbolPer(transactions, "STOCK")),
  ]);

  res.json({
    portfolioId: id,
    quoteCurrency: getQuoteCurrency(),
    ...buildHistory(transactions, { ...crypto, ...stocks }, HARI_RIWAYAT, new Date()),
  });
});