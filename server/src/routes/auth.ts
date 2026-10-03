import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authSchema } from "../schemas/auth";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

function signToken(userId: number) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
}

authRouter.post("/register", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      errors: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  const { email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({ data: { email, passwordHash } });
    res.status(201).json({
      token: signToken(user.id),
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      res.status(409).json({ error: "Email sudah terdaftar" });
      return;
    }
    throw err;
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      errors: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Email atau password salah" });
    return;
  }

  res.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }

  res.json({ user });
});