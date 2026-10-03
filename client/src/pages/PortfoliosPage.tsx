import { useState, type FormEvent } from "react";
import { useCreatePortfolioMutation, useGetPortfoliosQuery } from "../store/api";
import { pesanError } from "../lib/errors";

export default function PortfoliosPage() {
  const { data, isLoading, isError } = useGetPortfoliosQuery();
  const [buat, { isLoading: menyimpan, error }] = useCreatePortfolioMutation();
  const [nama, setNama] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await buat({ name: nama }).unwrap();
      setNama("");
    } catch {
      // pesan galat ditampilkan lewat `error`
    }
  }

  return (
    <>
      <h1>Portofolio</h1>

      {isLoading && <p className="redup">Memuat…</p>}
      {isError && (
        <p role="alert" className="galat">
          Daftar portofolio gagal dimuat. Muat ulang halaman ini.
        </p>
      )}
      {data &&
        (data.portfolios.length === 0 ? (
          <p>Belum ada portofolio. Buat satu untuk mulai mencatat transaksi.</p>
        ) : (
          <ul className="daftar">
            {data.portfolios.map((p) => (
              <li key={p.id} className="baris">
                {p.name}
              </li>
            ))}
          </ul>
        ))}

      <form onSubmit={onSubmit} className="formulir formulir--sebaris">
        <label className="bidang">
          <span>Nama portofolio</span>
          <input
            required
            maxLength={100}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </label>
        <button type="submit" className="tombol" disabled={menyimpan}>
          Buat portofolio
        </button>
      </form>
      {error && (
        <p role="alert" className="galat">
          {pesanError(error)}
        </p>
      )}
    </>
  );
}