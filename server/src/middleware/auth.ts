import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token tidak ditemukan" });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!);
    if (typeof payload === "string" || !payload.sub) {
      throw new Error("Payload tidak valid");
    }
    req.userId = Number(payload.sub);
    next();
  } catch {
    res.status(401).json({ error: "Token tidak valid atau kedaluwarsa" });
  }
}