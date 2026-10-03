import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { parseId } from "../lib/validate";

export const transactionRouter = Router();

transactionRouter.use(requireAuth);

transactionRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const result = await prisma.transaction.deleteMany({
    where: { id, portfolio: { userId: req.userId! } },
  });
  if (result.count === 0) {
    res.status(404).json({ error: "Transaksi tidak ditemukan" });
    return;
  }
  res.status(204).send();
});