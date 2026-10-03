import request from "supertest";
import { app } from "./app";
import { prisma } from "./lib/prisma";

const stamp = Date.now();
const emailA = `pf-a-${stamp}@example.com`;
const emailB = `pf-b-${stamp}@example.com`;
const password = "password123";

let tokenA: string;
let tokenB: string;
let portfolioId: number;
let sellId: number;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function register(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password });
  return res.body.token as string;
}

const buy = {
  symbol: "btc",
  assetType: "CRYPTO",
  type: "BUY",
  quantity: 2,
  price: 50000,
  executedAt: "2026-01-10T00:00:00.000Z",
};

beforeAll(async () => {
  tokenA = await register(emailA);
  tokenB = await register(emailB);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
  await prisma.$disconnect();
});

describe("portfolios & transactions", () => {
  it("menolak request tanpa token", async () => {
    const res = await request(app).get("/api/portfolios");
    expect(res.status).toBe(401);
  });

  it("membuat portofolio", async () => {
    const res = await request(app)
      .post("/api/portfolios")
      .set(auth(tokenA))
      .send({ name: "Utama" });
    expect(res.status).toBe(201);
    expect(res.body.portfolio.name).toBe("Utama");
    portfolioId = res.body.portfolio.id;
  });

  it("menolak nama portofolio kosong", async () => {
    const res = await request(app)
      .post("/api/portfolios")
      .set(auth(tokenA))
      .send({ name: "  " });
    expect(res.status).toBe(400);
  });

  it("menampilkan daftar portofolio milik sendiri", async () => {
    const res = await request(app).get("/api/portfolios").set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.portfolios).toHaveLength(1);

    const other = await request(app).get("/api/portfolios").set(auth(tokenB));
    expect(other.body.portfolios).toHaveLength(0);
  });

  it("mencatat transaksi beli", async () => {
    const res = await request(app)
      .post(`/api/portfolios/${portfolioId}/transactions`)
      .set(auth(tokenA))
      .send(buy);
    expect(res.status).toBe(201);
    expect(res.body.transaction.asset.symbol).toBe("BTC");
    expect(Number(res.body.transaction.quantity)).toBe(2);
  });

  it("menolak jual melebihi kepemilikan", async () => {
    const res = await request(app)
      .post(`/api/portfolios/${portfolioId}/transactions`)
      .set(auth(tokenA))
      .send({ ...buy, type: "SELL", quantity: 5 });
    expect(res.status).toBe(400);
  });

  it("mencatat transaksi jual", async () => {
    const res = await request(app)
      .post(`/api/portfolios/${portfolioId}/transactions`)
      .set(auth(tokenA))
      .send({ ...buy, type: "SELL", quantity: 1, price: 60000 });
    expect(res.status).toBe(201);
    sellId = res.body.transaction.id;
  });

  it("menampilkan daftar transaksi", async () => {
    const res = await request(app)
      .get(`/api/portfolios/${portfolioId}/transactions`)
      .set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(2);
  });

  it("menolak transaksi dengan input tidak valid", async () => {
    const res = await request(app)
      .post(`/api/portfolios/${portfolioId}/transactions`)
      .set(auth(tokenA))
      .send({ ...buy, quantity: -1 });
    expect(res.status).toBe(400);
  });

  it("user lain tidak bisa melihat portofolio", async () => {
    const res = await request(app)
      .get(`/api/portfolios/${portfolioId}`)
      .set(auth(tokenB));
    expect(res.status).toBe(404);
  });

  it("user lain tidak bisa menambah transaksi", async () => {
    const res = await request(app)
      .post(`/api/portfolios/${portfolioId}/transactions`)
      .set(auth(tokenB))
      .send(buy);
    expect(res.status).toBe(404);
  });

  it("menghapus transaksi", async () => {
    const res = await request(app)
      .delete(`/api/transactions/${sellId}`)
      .set(auth(tokenA));
    expect(res.status).toBe(204);
  });

  it("menghapus portofolio", async () => {
    const res = await request(app)
      .delete(`/api/portfolios/${portfolioId}`)
      .set(auth(tokenA));
    expect(res.status).toBe(204);

    const check = await request(app)
      .get(`/api/portfolios/${portfolioId}`)
      .set(auth(tokenA));
    expect(check.status).toBe(404);
  });
});