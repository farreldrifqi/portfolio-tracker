import request from "supertest";
import { Prisma } from "@prisma/client";
import { app } from "./app";
import { prisma } from "./lib/prisma";
import { clearPriceCache } from "./lib/prices";
import { buildHistory } from "./lib/history";

process.env.QUOTE_CURRENCY = "usd";

const tx = (
  type: "BUY" | "SELL",
  qty: number,
  price: number,
  waktu: string,
  symbol = "BTC",
) => ({
  type,
  quantity: new Prisma.Decimal(qty),
  price: new Prisma.Decimal(price),
  fee: new Prisma.Decimal(0),
  executedAt: new Date(waktu),
  asset: { symbol },
});

describe("buildHistory", () => {
  const txs = [
    tx("BUY", 2, 100, "2026-10-01T10:00:00Z"),
    tx("BUY", 2, 200, "2026-10-03T10:00:00Z"),
  ];
  const seri = { BTC: { "2026-09-30": 90, "2026-10-01": 110, "2026-10-03": 150 } };
  const sampai = new Date("2026-10-04T12:00:00Z");

  it("menghitung nilai dan modal per hari, harga dibawa maju saat kosong", () => {
    const h = buildHistory(txs, seri, 5, sampai);
    expect(h.points.map((p) => p.date)).toEqual([
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(h.points.map((p) => p.value.toString())).toEqual(["0", "220", "220", "600", "600"]);
    expect(h.points.map((p) => p.cost.toString())).toEqual(["0", "200", "200", "600", "600"]);
    expect(h.missingPrices).toEqual([]);
  });

  it("memakai harga sebelum jendela sebagai acuan", () => {
    const h = buildHistory(txs, { BTC: { "2026-10-01": 110 } }, 2, sampai);
    expect(h.points.map((p) => p.value.toString())).toEqual(["440", "440"]);
    expect(h.points.map((p) => p.cost.toString())).toEqual(["600", "600"]);
  });

  it("mencatat simbol tanpa data harga dan tidak menghitungnya", () => {
    const h = buildHistory(txs, {}, 2, sampai);
    expect(h.points.map((p) => p.value.toString())).toEqual(["0", "0"]);
    expect(h.missingPrices).toEqual(["BTC"]);
  });
});

describe("GET /api/portfolios/:id/history", () => {
  const stamp = Date.now();
  const emailA = `his-a-${stamp}@example.com`;
  const emailB = `his-b-${stamp}@example.com`;
  const password = "password123";
  let tokenA: string;
  let tokenB: string;
  let portfolioId: number;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const a = await request(app).post("/api/auth/register").send({ email: emailA, password });
    const b = await request(app).post("/api/auth/register").send({ email: emailB, password });
    tokenA = a.body.token;
    tokenB = b.body.token;

    const p = await request(app)
      .post("/api/portfolios")
      .set(auth(tokenA))
      .send({ name: "Riwayat" });
    portfolioId = p.body.portfolio.id;

    const t = await request(app)
      .post(`/api/portfolios/${portfolioId}/transactions`)
      .set(auth(tokenA))
      .send({
        symbol: "BTC",
        assetType: "CRYPTO",
        type: "BUY",
        quantity: 2,
        price: 50000,
        executedAt: "2026-01-01T00:00:00.000Z",
      });
    expect(t.status).toBe(201);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    clearPriceCache();
    const prices = Array.from({ length: 65 }, (_, i) => [
      Date.now() - i * 86_400_000,
      70000,
    ]);
    jest
      .spyOn(global, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({ prices })));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const riwayat = (token: string) =>
    request(app).get(`/api/portfolios/${portfolioId}/history`).set(auth(token));

  it("mengembalikan 60 titik dengan nilai dan modal", async () => {
    const res = await riwayat(tokenA);

    expect(res.status).toBe(200);
    expect(res.body.points).toHaveLength(60);
    expect(res.body.points[59]).toMatchObject({ value: "140000", cost: "100000" });
    expect(res.body.missingPrices).toEqual([]);
  });

  it("tetap menjawab 200 saat API harga gagal", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network"));

    const res = await riwayat(tokenA);

    expect(res.status).toBe(200);
    expect(res.body.points[59].value).toBe("0");
    expect(res.body.missingPrices).toEqual(["BTC"]);
  });

  it("user lain tidak bisa melihat riwayat", async () => {
    const res = await riwayat(tokenB);
    expect(res.status).toBe(404);
  });
});