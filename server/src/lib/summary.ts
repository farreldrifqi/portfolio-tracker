import { Prisma } from "@prisma/client";
import { calculatePosition, TxInput } from "./position";

type Asset = { symbol: string; name: string; type: "STOCK" | "CRYPTO" };
type TxWithAsset = TxInput & { asset: Asset };

const r8 = (d: Prisma.Decimal) => d.toDecimalPlaces(8);

export function buildSummary(
  txs: TxWithAsset[],
  prices: Record<string, number>,
) {
  const groups = new Map<string, TxWithAsset[]>();
  for (const tx of txs) {
    const list = groups.get(tx.asset.symbol) ?? [];
    list.push(tx);
    groups.set(tx.asset.symbol, list);
  }

  let totalCost = new Prisma.Decimal(0);
  let totalValue = new Prisma.Decimal(0);
  let totalUnrealized = new Prisma.Decimal(0);
  let totalRealized = new Prisma.Decimal(0);
  const missingPrices: string[] = [];
  const holdings = [];

  for (const list of groups.values()) {
    const { asset } = list[0];
    const pos = calculatePosition(list);

    totalRealized = totalRealized.plus(pos.realizedPnl);
    if (pos.quantity.isZero()) continue; // posisi sudah tertutup

    totalCost = totalCost.plus(pos.costBasis);

    let marketPrice: Prisma.Decimal | null = null;
    let marketValue: Prisma.Decimal | null = null;
    let unrealizedPnl: Prisma.Decimal | null = null;
    let unrealizedPnlPct: Prisma.Decimal | null = null;

    const raw = prices[asset.symbol];
    if (raw === undefined) {
      missingPrices.push(asset.symbol);
    } else {
      marketPrice = new Prisma.Decimal(raw);
      marketValue = pos.quantity.times(marketPrice);
      unrealizedPnl = marketValue.minus(pos.costBasis);
      unrealizedPnlPct = pos.costBasis.isZero()
        ? null
        : unrealizedPnl.div(pos.costBasis).times(100);

      totalValue = totalValue.plus(marketValue);
      totalUnrealized = totalUnrealized.plus(unrealizedPnl);
    }

    holdings.push({
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      quantity: pos.quantity,
      avgPrice: pos.avgPrice && r8(pos.avgPrice),
      costBasis: r8(pos.costBasis),
      marketPrice,
      marketValue: marketValue && r8(marketValue),
      unrealizedPnl: unrealizedPnl && r8(unrealizedPnl),
      unrealizedPnlPct: unrealizedPnlPct && unrealizedPnlPct.toDecimalPlaces(2),
      realizedPnl: r8(pos.realizedPnl),
    });
  }

  return {
    holdings,
    totals: {
      costBasis: r8(totalCost),
      marketValue: r8(totalValue), // hanya aset yang harganya tersedia
      unrealizedPnl: r8(totalUnrealized), // hanya aset yang harganya tersedia
      realizedPnl: r8(totalRealized),
    },
    missingPrices,
  };
}