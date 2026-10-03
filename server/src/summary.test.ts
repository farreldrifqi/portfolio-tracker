import request from "supertest";
import { app } from "./app";
import { prisma } from "./lib/prisma";
import { clearPriceCache } from "./lib/prices";

process.env.QUOTE_CURRENCY = "usd";

const stamp = Date.now();
const emailA = `sum-a-${stamp}@example.com`;
const emailB = `sum-b-${stamp}@example.com`;
const password = "password123";

let tokenA: string;
let tokenB: string;
let portfolioId: number;
let emptyId: number;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function register(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password });
  return res.body.token as string;
}

async function addTx(body: object) {
  const res = await request(app)
    .post(`/api/portfolios/${portfolioId}/transactions`)
    .set(auth(tokenA))
    .send(body);
  expect(res.status).toBe(201);
}

beforeAll(async () => {
  tokenA = await register(emailA);
  tokenB = await register(emailB);

  const p1 = await request(app)
    .post("/api/portfolios")
    .set(auth(tokenA))
    .send({ name: "Kripto" });
  portfolioId = p1.body.portfolio.id;

  const p2 = await request(app)
    .post("/api/portfolios")
    .set(auth(tokenA))
    .send({ name: "Kosong" });
  emptyId = p2.body.portfolio.id;

  const base = { assetType: "CRYPTO" };
  await addTx({ ...base, symbol: "BTC", type: "BUY", quantity: 2, price: 50000, executedAt: "2026-01-01T00:00:00.000Z" });
  await addTx({ ...base, symbol: "BTC", type: "BUY", quantity: 2, price: 70000, executedAt: "2026-02-01T00:00:00.000Z" });
  await addTx({ ...base, symbol: "BTC", type: "SELL", quantity: 1, price: 80000, fee: 100, executedAt: "2026-03-01T00:00:00.000Z" });
  await addTx({ ...base, symbol: "ETH", type: "BUY", quantity: 10, price: 2000, executedAt: "2026-03-05T00:00:00.000Z" });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  clearPriceCache();
  // Hanya BTC yang dijawab, ETH sengaja tidak ada
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({ bitcoin: { usd: 70000 } })));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/portfolios/:id/summary", () => {
  it("menghitung posisi dan profit/loss", async () => {
    const res = await request(app)
      .get(`/api/portfolios/${portfolioId}/summary`)
      .set(auth(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.quoteCurrency).toBe("usd");

    const btc = res.body.holdings.find(
      (h: { symbol: string }) => h.symbol === "BTC",
    );
    expect(btc).toMatchObject({
      quantity: "3",
      avgPrice: "60000",
      costBasis: "180000",
      marketPrice: "70000",
      marketValue: "210000",
      unrealizedPnl: "30000",
      unrealizedPnlPct: "16.67",
      realizedPnl: "19900",
    });

    expect(res.body.totals).toMatchObject({
      costBasis: "200000",
      marketValue: "210000",
      unrealizedPnl: "30000",
      realizedPnl: "19900",
    });
    expect(res.body.missingPrices).toEqual(["ETH"]);
  });

  it("tetap menjawab 200 saat API harga gagal", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network"));

    const res = await request(app)
      .get(`/api/portfolios/${portfolioId}/summary`)
      .set(auth(tokenA));

    expect(res.status).toBe(200);
    expect(
      res.body.holdings.every(
        (h: { marketPrice: unknown }) => h.marketPrice === null,
      ),
    ).toBe(true);
    expect([...res.body.missingPrices].sort()).toEqual(["BTC", "ETH"]);
    expect(res.body.totals.unrealizedPnl).toBe("0");
    expect(res.body.totals.realizedPnl).toBe("19900");
  });

  it("mengembalikan ringkasan kosong untuk portofolio tanpa transaksi", async () => {
    const res = await request(app)
      .get(`/api/portfolios/${emptyId}/summary`)
      .set(auth(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.holdings).toEqual([]);
    expect(res.body.totals.costBasis).toBe("0");
  });

  it("user lain tidak bisa melihat ringkasan", async () => {
    const res = await request(app)
      .get(`/api/portfolios/${portfolioId}/summary`)
      .set(auth(tokenB));
    expect(res.status).toBe(404);
  });
});