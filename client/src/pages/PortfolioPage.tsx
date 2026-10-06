import { Link, useParams } from "react-router-dom";
import {
  useGetHistoryQuery,
  useGetPortfolioQuery,
  useGetSummaryQuery,
  type Holding,
  type Summary,
} from "../store/api";
import { angka, persen, uang } from "../lib/format";
import Rel from "../components/Rel";
import FormTransaksi from "../components/FormTransaksi";
import TabelTransaksi from "../components/TabelTransaksi";
import GrafikRiwayat from "../components/GrafikRiwayat";
import AksiPortofolio from "../components/AksiPortofolio";

function Ringkasan({ s }: { s: Summary }) {
  const cur = s.quoteCurrency;
  const nilai = Number(s.totals.marketValue);
  const pnl = Number(s.totals.unrealizedPnl);
  const modal = nilai - pnl;
  const realized = Number(s.totals.realizedPnl);

  if (s.holdings.length === 0 && realized === 0) return null;

  return (
    <div className="ringkas">
      {nilai > 0 && (
        <p>
          Nilai <strong>{uang(nilai, cur)}</strong>,{" "}
          <span className={pnl >= 0 ? "untung" : "rugi"}>
            {pnl >= 0 ? "naik" : "turun"} {uang(Math.abs(pnl), cur)} (
            {persen(modal ? (pnl / modal) * 100 : 0)})
          </span>{" "}
          dari modal {uang(modal, cur)}.
        </p>
      )}
      {s.missingPrices.length > 0 && (
        <p className="redup">
          Harga {s.missingPrices.join(", ")} belum tersedia, jadi belum masuk hitungan nilai.
        </p>
      )}
      {realized !== 0 && (
        <p className="redup">
          Dari penjualan, Anda sudah {realized > 0 ? "untung" : "rugi"}{" "}
          {uang(Math.abs(realized), cur)}.
        </p>
      )}
    </div>
  );
}

function Posisi({ holdings, mataUang }: { holdings: Holding[]; mataUang: string }) {
  return (
    <ul className="daftar">
      {holdings.map((h) => {
        const avg = h.avgPrice ? Number(h.avgPrice) : 0;
        const harga = h.marketPrice === null ? null : Number(h.marketPrice);
        const pnl = h.unrealizedPnl === null ? null : Number(h.unrealizedPnl);

        return (
          <li key={h.symbol} className="posisi">
            <div className="posisi__aset">
              <strong>{h.symbol}</strong>
              <span className="redup">
                {angka(h.quantity)} unit, modal rata-rata {uang(avg, mataUang)}
              </span>
            </div>

            <Rel avg={avg} harga={harga} />

            <div className="posisi__nilai">
              {h.marketValue !== null ? (
                <>
                  {uang(h.marketValue, mataUang)}
                  <span className="redup">modal {uang(h.costBasis, mataUang)}</span>
                </>
              ) : (
                <>
                  <span className="redup">
                    {h.type === "STOCK"
                      ? "Harga saham belum tersedia."
                      : "Harga belum tersedia."}
                  </span>
                  <span className="redup">modal {uang(h.costBasis, mataUang)}</span>
                </>
              )}
            </div>

            <div className={`posisi__hasil ${pnl === null ? "" : pnl >= 0 ? "untung" : "rugi"}`}>
              {pnl !== null && (
                <>
                  {uang(pnl, mataUang, true)}
                  {h.unrealizedPnlPct !== null && <span>{persen(h.unrealizedPnlPct)}</span>}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function PortfolioPage() {
  const { id } = useParams();
  const portfolioId = Number(id);
  const valid = Number.isInteger(portfolioId) && portfolioId > 0;

  const portfolio = useGetPortfolioQuery(portfolioId, { skip: !valid });
  const summary = useGetSummaryQuery(portfolioId, { skip: !valid });
  const riwayat = useGetHistoryQuery(portfolioId, { skip: !valid });

  if (!valid || portfolio.isError) {
    return (
      <>
        <h1>Portofolio tidak ditemukan</h1>
        <p>
          <Link to="/">Kembali ke daftar portofolio</Link>
        </p>
      </>
    );
  }

  const s = summary.data;

  return (
    <>
      <div className="judul-halaman">
        <Link to="/">Semua portofolio</Link>
        <h1>{portfolio.data?.name ?? "Memuat…"}</h1>
        {portfolio.data && <AksiPortofolio portfolio={portfolio.data} />}
      </div>

      {summary.isError && (
        <p role="alert" className="galat">
          Ringkasan gagal dimuat. Muat ulang halaman ini.
        </p>
      )}
      {s && <Ringkasan s={s} />}

      <section className="bagian">
        <h2>Posisi</h2>
        {s &&
          (s.holdings.length === 0 ? (
            <p className="redup">Belum ada posisi. Catat pembelian pertama di bawah.</p>
          ) : (
            <Posisi holdings={s.holdings} mataUang={s.quoteCurrency} />
          ))}
      </section>

      <section className="bagian">
        <h2>Riwayat nilai</h2>
        {riwayat.isLoading && <p className="redup">Memuat riwayat…</p>}
        {riwayat.isError && (
          <p role="alert" className="galat">
            Riwayat nilai gagal dimuat. Muat ulang halaman ini.
          </p>
        )}
        {riwayat.data && <GrafikRiwayat data={riwayat.data} />}
      </section>

      <section className="bagian">
        <h2>Catat transaksi</h2>
        <FormTransaksi portfolioId={portfolioId} />
      </section>

      <section className="bagian">
        <h2>Riwayat transaksi</h2>
        <TabelTransaksi portfolioId={portfolioId} mataUang={s?.quoteCurrency ?? "usd"} />
      </section>
    </>
  );
}