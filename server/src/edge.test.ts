import request from "supertest";
import { app } from "./app";
import { prisma } from "./lib/prisma";

const stamp = Date.now();
const emailA = `edge-a-${stamp}@example.com`;
const emailB = `edge-b-${stamp}@example.com`;
const password = "password123";

let tokenA: string;
let tokenB: string;
let portfolioId: number;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const tx = (type: "BUY" | "SELL", quantity: number, tanggal: string) => ({
  symbol: "SOL",
  assetType: "CRYPTO",
  type,
  quantity,
  price: 100,
  executedAt: tanggal,
});

const tambah = (body: object) =>
  request(app)
    .post(`/api/portfolios/${portfolioId}/transactions`)
    .set(auth(tokenA))
    .send(body);

beforeAll(async () => {
  const a = await request(app).post("/api/auth/register").send({ email: emailA, password });
  const b = await request(app).post("/api/auth/register").send({ email: emailB, password });
  tokenA = a.body.token;
  tokenB = b.body.token;

  const p = await request(app)
    .post("/api/portfolios")
    .set(auth(tokenA))
    .send({ name: "Tepi" });
  portfolioId = p.body.portfolio.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
  await prisma.$disconnect();
});

describe("ubah nama portofolio", () => {
  it("mengganti nama", async () => {
    const res = await request(app)
      .patch(`/api/portfolios/${portfolioId}`)
      .set(auth(tokenA))
      .send({ name: "Nama baru" });
    expect(res.status).toBe(200);
    expect(res.body.portfolio.name).toBe("Nama baru");
  });

  it("menolak nama kosong", async () => {
    const res = await request(app)
      .patch(`/api/portfolios/${portfolioId}`)
      .set(auth(tokenA))
      .send({ name: " " });
    expect(res.status).toBe(400);
  });

  it("user lain tidak bisa mengganti nama", async () => {
    const res = await request(app)
      .patch(`/api/portfolios/${portfolioId}`)
      .set(auth(tokenB))
      .send({ name: "Curang" });
    expect(res.status).toBe(404);
  });
});

describe("kepemilikan menurut urutan waktu", () => {
  let buyId: number;
  let sellId: number;

  it("menolak jual yang mendahului pembeliannya", async () => {
    const beli = await tambah(tx("BUY", 1, "2026-02-01T00:00:00.000Z"));
    expect(beli.status).toBe(201);
    buyId = beli.body.transaction.id;

    const jual = await tambah(tx("SELL", 1, "2026-01-01T00:00:00.000Z"));
    expect(jual.status).toBe(400);
  });

  it("menolak menghapus pembelian yang masih dibutuhkan penjualan", async () => {
    const jual = await tambah(tx("SELL", 1, "2026-03-01T00:00:00.000Z"));
    expect(jual.status).toBe(201);
    sellId = jual.body.transaction.id;

    const hapusBeli = await request(app)
      .delete(`/api/transactions/${buyId}`)
      .set(auth(tokenA));
    expect(hapusBeli.status).toBe(409);
  });

  it("boleh menghapus penjualan dulu, lalu pembelian", async () => {
    const a = await request(app).delete(`/api/transactions/${sellId}`).set(auth(tokenA));
    expect(a.status).toBe(204);
    const b = await request(app).delete(`/api/transactions/${buyId}`).set(auth(tokenA));
    expect(b.status).toBe(204);
  });
});

describe("galat API", () => {
  it("menjawab 404 JSON untuk endpoint yang tidak ada", async () => {
    const res = await request(app).get("/api/tidak-ada");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("menjawab 400 untuk JSON yang rusak", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{rusak");
    expect(res.status).toBe(400);
  });
});