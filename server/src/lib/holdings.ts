import { Prisma } from "@prisma/client";

type Tx = {
  id: number;
  type: "BUY" | "SELL";
  quantity: Prisma.Decimal;
  executedAt: Date;
};

// true bila kepemilikan tidak pernah negatif di titik waktu mana pun
export function kepemilikanValid(txs: Tx[]) {
  const urut = [...txs].sort(
    (a, b) => a.executedAt.getTime() - b.executedAt.getTime() || a.id - b.id,
  );

  let qty = new Prisma.Decimal(0);
  for (const t of urut) {
    qty = t.type === "BUY" ? qty.plus(t.quantity) : qty.minus(t.quantity);
    if (qty.lt(0)) return false;
  }
  return true;
}