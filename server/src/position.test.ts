import { Prisma } from "@prisma/client";
import { calculatePosition } from "./lib/position";

const tx = (
  type: "BUY" | "SELL",
  quantity: number,
  price: number,
  fee = 0,
) => ({
  type,
  quantity: new Prisma.Decimal(quantity),
  price: new Prisma.Decimal(price),
  fee: new Prisma.Decimal(fee),
});

describe("calculatePosition", () => {
  it("menghitung harga rata-rata dan realized P/L", () => {
    const pos = calculatePosition([
      tx("BUY", 2, 100),
      tx("BUY", 2, 200),
      tx("SELL", 1, 300, 5),
    ]);
    expect(pos.quantity.toString()).toBe("3");
    expect(pos.costBasis.toString()).toBe("450");
    expect(pos.avgPrice?.toString()).toBe("150");
    expect(pos.realizedPnl.toString()).toBe("145");
  });

  it("memasukkan fee beli ke dalam modal", () => {
    const pos = calculatePosition([tx("BUY", 1, 100, 10)]);
    expect(pos.avgPrice?.toString()).toBe("110");
  });

  it("posisi tertutup setelah dijual habis", () => {
    const pos = calculatePosition([tx("BUY", 1, 100), tx("SELL", 1, 150)]);
    expect(pos.quantity.isZero()).toBe(true);
    expect(pos.avgPrice).toBeNull();
    expect(pos.realizedPnl.toString()).toBe("50");
  });
});