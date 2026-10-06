import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  useDeletePortfolioMutation,
  useUpdatePortfolioMutation,
  type Portfolio,
} from "../store/api";
import { pesanError } from "../lib/errors";

export default function AksiPortofolio({ portfolio }: { portfolio: Portfolio }) {
  const navigate = useNavigate();
  const [ubah, ubahState] = useUpdatePortfolioMutation();
  const [hapus, hapusState] = useDeletePortfolioMutation();
  const [mengubah, setMengubah] = useState(false);
  const [nama, setNama] = useState(portfolio.name);

  async function simpan(e: FormEvent) {
    e.preventDefault();
    try {
      await ubah({ id: portfolio.id, name: nama }).unwrap();
      setMengubah(false);
    } catch {
      // pesan galat ditampilkan lewat state.error
    }
  }

  async function onHapus() {
    const yakin = window.confirm(
      "Hapus portofolio ini beserta seluruh transaksinya? Tindakan ini tidak bisa dibatalkan.",
    );
    if (!yakin) return;
    try {
      await hapus(portfolio.id).unwrap();
      navigate("/", { replace: true });
    } catch {
      // pesan galat ditampilkan lewat state.error
    }
  }

  const galat = ubahState.error ?? hapusState.error;

  return (
    <div className="aksi">
      {mengubah ? (
        <form onSubmit={simpan} className="formulir formulir--sebaris">
          <label className="bidang">
            <span>Nama portofolio</span>
            <input
              required
              maxLength={100}
              autoFocus
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
          </label>
          <div className="aksi__tombol">
            <button type="submit" className="tombol" disabled={ubahState.isLoading}>
              Simpan
            </button>
            <button type="button" className="tombol-teks" onClick={() => setMengubah(false)}>
              Batal
            </button>
          </div>
        </form>
      ) : (
        <>
          <button
            type="button"
            className="tombol-teks"
            onClick={() => {
              setNama(portfolio.name);
              setMengubah(true);
            }}
          >
            Ganti nama
          </button>
          <button
            type="button"
            className="tombol-teks"
            onClick={onHapus}
            disabled={hapusState.isLoading}
          >
            Hapus portofolio
          </button>
        </>
      )}
      {galat && (
        <p role="alert" className="galat">
          {pesanError(galat)}
        </p>
      )}
    </div>
  );
}