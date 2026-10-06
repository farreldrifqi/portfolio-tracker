import { Prisma } from "@prisma/client";
import { calculatePosition, TxInput } from "./position";
import type { Seri } from "./prices";

type Tx = TxInput & { executedAt: Date; asset: { symbol: string } };

const HARI_MS = 24 * 60 * 60 * 1000;
const hari = (d: Date) => d.toISOString().slice(0, 10);

// Transaksi harus terurut dari yang paling lama.
// Satu titik per hari (UTC) sampai dengan hari `sampai`.
export function buildHistory(
  txs: Tx[],
  series: Record<string, Seri>,
  jumlahHari: number,
  sampai: Date,
) {
  const tanggal = Array.from({ length: jumlahHari }, (_, i) =>
    hari(new Date(sampai.getTime() - (jumlahHari - 1 - i) * HARI_MS)),
  );
  const awal = tanggal[0];

  const groups = new Map<string, Tx[]>();
  for (const tx of txs) {
    const list = groups.get(tx.asset.symbol) ?? [];
    list.push(tx);
    groups.set(tx.asset.symbol, list);
  }

  // Harga terakhir yang diketahui sebelum jendela dimulai (untuk dibawa maju)
  const terakhir: Record<string, number | undefined> = {};
  for (const [symbol, seri] of Object.entries(series)) {
    for (const d of Object.keys(seri).sort()) {
      if (d < awal) terakhir[symbol] = seri[d];
    }
  }

  const points = tanggal.map((d) => {
    const batas = new Date(`${d}T23:59:59.999Z`);
    let value = new Prisma.Decimal(0);
    let cost = new Prisma.Decimal(0);

    for (const [symbol, list] of groups) {
      const harga = series[symbol]?.[d];
      if (harga !== undefined) terakhir[symbol] = harga;

      const acuan = terakhir[symbol];
      if (acuan === undefined) continue; // belum ada harga: tidak ikut dihitung

      const pos = calculatePosition(list.filter((t) => t.executedAt <= batas));
      if (pos.quantity.isZero()) continue;

      value = value.plus(pos.quantity.times(acuan));
      cost = cost.plus(pos.costBasis); // modal hanya untuk aset yang punya harga
    }

    return {
      date: d,
      value: value.toDecimalPlaces(8),
      cost: cost.toDecimalPlaces(8),
    };
  });

  const missingPrices = [...groups.keys()].filter((s) => !series[s]);
  return { points, missingPrices };
}