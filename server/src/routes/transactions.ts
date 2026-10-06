import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { parseId } from "../lib/validate";
import { kepemilikanValid } from "../lib/holdings";

export const transactionRouter = Router();

transactionRouter.use(requireAuth);

transactionRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const tx = await prisma.transaction.findFirst({
    where: { id, portfolio: { userId: req.userId! } },
  });
  if (!tx) {
    res.status(404).json({ error: "Transaksi tidak ditemukan" });
    return;
  }

  const lainnya = await prisma.transaction.findMany({
    where: { portfolioId: tx.portfolioId, assetId: tx.assetId, id: { not: id } },
    select: { id: true, type: true, quantity: true, executedAt: true },
  });
  if (!kepemilikanValid(lainnya)) {
    res.status(409).json({
      error:
        "Transaksi ini tidak bisa dihapus karena ada penjualan setelahnya yang bergantung padanya. Hapus penjualannya dulu.",
    });
    return;
  }

  await prisma.transaction.delete({ where: { id } });
  res.status(204).send();
});