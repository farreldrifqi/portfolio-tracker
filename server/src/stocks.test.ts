import request from "supertest";
import { app } from "./app";
import { prisma } from "./lib/prisma";
import { clearPriceCache } from "./lib/prices";

process.env.QUOTE_CURRENCY = "idr";
process.env.SECTORS_API_KEY = "kunci-uji";

const email = `stk-${Date.now()}@example.com`;
const password = "password123";

let token: string;
let portfolioId: number;
let fetchMock: jest.SpyInstance;

const auth = () => ({ Authorization: `Bearer ${token}` });

// Sengaja tidak berurutan: harga terbaru harus dipilih berdasarkan tanggal
const baris = [
  { symbol: "BBCA.JK", date: "2026-10-01", close: 9500 },
  { symbol: "BBCA.JK", date: "2026-09-30", close: 9400 },
];

beforeAll(async () => {
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ email, password });
  token = reg.body.token;

  const p = await request(app)
    .post("/api/portfolios")
    .set(auth())
    .send({ name: "Saham" });
  portfolioId = p.body.portfolio.id;

  const tx = await request(app)
    .post(`/api/portfolios/${portfolioId}/transactions`)
    .set(auth())
    .send({
      symbol: "BBCA",
      assetType: "STOCK",
      type: "BUY",
      quantity: 100,
      price: 9000,
      executedAt: "2026-01-01T00:00:00.000Z",
    });
  expect(tx.status).toBe(201);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

beforeEach(() => {
  clearPriceCache();
  fetchMock = jest
    .spyOn(global, "fetch")
    .mockImplementation(async () => new Response(JSON.stringify(baris)));
});

afterEach(() => {
  jest.restoreAllMocks();
});

const summary = () =>
  request(app).get(`/api/portfolios/${portfolioId}/summary`).set(auth());

describe("harga saham dari Sectors", () => {
  it("memakai penutupan terbaru dan menghitung profit/loss", async () => {
    const res = await summary();

    expect(res.status).toBe(200);
    expect(res.body.holdings[0]).toMatchObject({
      symbol: "BBCA",
      quantity: "100",
      avgPrice: "9000",
      costBasis: "900000",
      marketPrice: "9500",
      marketValue: "950000",
      unrealizedPnl: "50000",
      unrealizedPnlPct: "5.56",
    });
    expect(res.body.missingPrices).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v2/daily/BBCA/"),
      expect.objectContaining({ headers: { Authorization: "kunci-uji" } }),
    );
  });

  it("tetap menjawab 200 saat API Sectors gagal", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network"));

    const res = await summary();

    expect(res.status).toBe(200);
    expect(res.body.holdings[0].marketPrice).toBeNull();
    expect(res.body.missingPrices).toEqual(["BBCA"]);
  });

  it("memakai cache sehingga tidak memanggil API dua kali", async () => {
    await summary();
    await summary();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});