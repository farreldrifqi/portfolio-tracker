import { Prisma } from "@prisma/client";

export type TxInput = {
  type: "BUY" | "SELL";
  quantity: Prisma.Decimal;
  price: Prisma.Decimal;
  fee: Prisma.Decimal;
};

// Transaksi harus sudah terurut dari yang paling lama
export function calculatePosition(txs: TxInput[]) {
  const zero = new Prisma.Decimal(0);
  let quantity = zero;
  let cost = zero;
  let realizedPnl = zero;

  for (const tx of txs) {
    if (tx.type === "BUY") {
      quantity = quantity.plus(tx.quantity);
      cost = cost.plus(tx.quantity.times(tx.price)).plus(tx.fee);
    } else {
      const sold = tx.quantity.gt(quantity) ? quantity : tx.quantity;
      const avg = quantity.isZero() ? zero : cost.div(quantity);
      const removed = avg.times(sold);

      realizedPnl = realizedPnl
        .plus(sold.times(tx.price))
        .minus(tx.fee)
        .minus(removed);
      quantity = quantity.minus(sold);
      cost = cost.minus(removed);
    }
  }

  return {
    quantity,
    costBasis: cost,
    avgPrice: quantity.isZero() ? null : cost.div(quantity),
    realizedPnl,
  };
}