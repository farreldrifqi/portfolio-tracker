import { useState, type ChangeEvent, type FormEvent } from "react";
import { useAddTransactionMutation } from "../store/api";
import { pesanError } from "../lib/errors";

type Isian = {
  type: "BUY" | "SELL";
  assetType: "STOCK" | "CRYPTO";
  symbol: string;
  quantity: string;
  price: string;
  fee: string;
  executedAt: string;
};

const hariIni = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, waktu lokal

export default function FormTransaksi({ portfolioId }: { portfolioId: number }) {
  const [tambah, { isLoading, error }] = useAddTransactionMutation();
  const [f, setF] = useState<Isian>({
    type: "BUY",
    assetType: "CRYPTO",
    symbol: "",
    quantity: "",
    price: "",
    fee: "",
    executedAt: hariIni(),
  });

  const ubah =
    (kunci: keyof Isian) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF((p) => ({ ...p, [kunci]: e.target.value }) as Isian);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await tambah({
        portfolioId,
        body: {
          symbol: f.symbol,
          assetType: f.assetType,
          type: f.type,
          quantity: Number(f.quantity),
          price: Number(f.price),
          fee: f.fee ? Number(f.fee) : 0,
          executedAt: f.executedAt,
        },
      }).unwrap();
      setF((p) => ({ ...p, quantity: "", price: "", fee: "" }));
    } catch {
      // pesan galat ditampilkan lewat `error`
    }
  }

  return (
    <form onSubmit={onSubmit} className="formulir formulir--rapat">
      <label className="bidang">
        <span>Jenis</span>
        <select value={f.type} onChange={ubah("type")}>
          <option value="BUY">Beli</option>
          <option value="SELL">Jual</option>
        </select>
      </label>
      <label className="bidang">
        <span>Tipe aset</span>
        <select value={f.assetType} onChange={ubah("assetType")}>
          <option value="CRYPTO">Kripto</option>
          <option value="STOCK">Saham</option>
        </select>
      </label>
      <label className="bidang">
        <span>Simbol</span>
        <input
          required
          maxLength={20}
          autoCapitalize="characters"
          value={f.symbol}
          onChange={ubah("symbol")}
        />
        <small>Contoh: BTC, ETH, BBCA</small>
      </label>
      <label className="bidang">
        <span>Jumlah</span>
        <input
          required
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={f.quantity}
          onChange={ubah("quantity")}
        />
        <small>Saham: dalam lembar (1 lot = 100 lembar)</small>
      </label>
      <label className="bidang">
        <span>Harga per unit</span>
        <input
          required
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={f.price}
          onChange={ubah("price")}
        />
      </label>
      <label className="bidang">
        <span>Biaya transaksi</span>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={f.fee}
          onChange={ubah("fee")}
        />
        <small>Boleh dikosongkan</small>
      </label>
      <label className="bidang">
        <span>Tanggal</span>
        <input required type="date" value={f.executedAt} onChange={ubah("executedAt")} />
      </label>

      {error && (
        <p role="alert" className="galat">
          {pesanError(error)}
        </p>
      )}
      <button type="submit" className="tombol" disabled={isLoading}>
        Catat transaksi
      </button>
    </form>
  );
}