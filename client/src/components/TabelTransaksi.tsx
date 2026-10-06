import { useDeleteTransactionMutation, useGetTransactionsQuery } from "../store/api";
import { angka, tanggal, uang } from "../lib/format";
import { pesanError } from "../lib/errors";

export default function TabelTransaksi({
  portfolioId,
  mataUang,
}: {
  portfolioId: number;
  mataUang: string;
}) {
  const { data, isLoading, isError } = useGetTransactionsQuery(portfolioId);
  const [hapus, { error }] = useDeleteTransactionMutation();

  if (isLoading) return <p className="redup">Memuat…</p>;
  if (isError) {
    return (
      <p role="alert" className="galat">
        Riwayat transaksi gagal dimuat. Muat ulang halaman ini.
      </p>
    );
  }
  if (!data || data.transactions.length === 0) {
    return <p className="redup">Belum ada transaksi.</p>;
  }

  return (
    <>
      <div className="tabel">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Aset</th>
              <th>Jenis</th>
              <th className="angka">Jumlah</th>
              <th className="angka">Harga</th>
              <th className="angka">Biaya</th>
              <th>
                <span className="sr">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((t) => (
              <tr key={t.id}>
                <th scope="row" data-label="Tanggal">
                  {tanggal(t.executedAt)}
                </th>
                <td data-label="Aset">{t.asset.symbol}</td>
                <td data-label="Jenis">{t.type === "BUY" ? "Beli" : "Jual"}</td>
                <td className="angka" data-label="Jumlah">
                  {angka(t.quantity)}
                </td>
                <td className="angka" data-label="Harga">
                  {uang(t.price, mataUang)}
                </td>
                <td className="angka" data-label="Biaya">
                  {Number(t.fee) > 0 ? uang(t.fee, mataUang) : "-"}
                </td>
                <td>
                  <button
                    type="button"
                    className="tombol-teks"
                    aria-label={`Hapus transaksi ${t.asset.symbol} tanggal ${tanggal(t.executedAt)}`}
                    onClick={() => {
                      if (window.confirm("Hapus transaksi ini?")) {
                        hapus({ id: t.id, portfolioId });
                      }
                    }}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className="galat">
          {pesanError(error)}
        </p>
      )}
    </>
  );
}