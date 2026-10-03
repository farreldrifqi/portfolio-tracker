import request from "supertest";
import { app } from "./app";
import { prisma } from "./lib/prisma";
import jwt from "jsonwebtoken";

const email = `test-${Date.now()}@example.com`;
const password = "password123";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("auth", () => {
  it("register berhasil dan mengembalikan token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
  });

  it("register dengan email yang sama ditolak", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password });
    expect(res.status).toBe(409);
  });

  it("register dengan input tidak valid ditolak", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "bukan-email", password: "123" });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("login dengan kredensial benar mengembalikan token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("login dengan password salah ditolak", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "salahsalah" });
    expect(res.status).toBe(401);
  });
});

describe("middleware requireAuth", () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password });
    token = res.body.token;
  });

  it("menolak request tanpa token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("menolak token palsu", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer token-palsu");
    expect(res.status).toBe(401);
  });

  it("menolak token kedaluwarsa", async () => {
    const expired = jwt.sign({ sub: "1" }, process.env.JWT_SECRET!, {
      expiresIn: -10,
    });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it("menerima token valid dan mengembalikan data user", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});