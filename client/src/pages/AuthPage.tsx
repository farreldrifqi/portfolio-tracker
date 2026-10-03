import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useLoginMutation, useRegisterMutation } from "../store/api";
import { masuk } from "../store/authSlice";
import { pesanError } from "../lib/errors";
import type { RootState } from "../store";

export default function AuthPage({ mode }: { mode: "masuk" | "daftar" }) {
  const token = useSelector((s: RootState) => s.auth.token);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (token) return <Navigate to="/" replace />;

  const daftar = mode === "daftar";
  const state = daftar ? registerState : loginState;
  const judul = daftar ? "Buat akun" : "Masuk";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const kirim = daftar ? register : login;
    try {
      const res = await kirim({ email, password }).unwrap();
      dispatch(masuk(res));
      navigate("/", { replace: true });
    } catch {
      // pesan galat ditampilkan lewat state.error
    }
  }

  return (
    <main className="masuk">
      <p className="merek">Pantau</p>
      <h1>{judul}</h1>
      <p className="redup">
        Catat transaksi saham dan kripto, lalu lihat untung-rugi tiap aset.
      </p>

      <form onSubmit={onSubmit} className="formulir">
        <label className="bidang">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="bidang">
          <span>Kata sandi</span>
          <input
            type="password"
            autoComplete={daftar ? "new-password" : "current-password"}
            required
            minLength={daftar ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {daftar && <small>Minimal 8 karakter</small>}
        </label>

        {state.error && (
          <p role="alert" className="galat">
            {pesanError(state.error)}
          </p>
        )}

        <button type="submit" className="tombol" disabled={state.isLoading}>
          {state.isLoading ? "Memproses…" : judul}
        </button>
      </form>

      <p>
        {daftar ? "Sudah punya akun? " : "Belum punya akun? "}
        <Link to={daftar ? "/masuk" : "/daftar"}>{daftar ? "Masuk" : "Buat akun"}</Link>
      </p>
    </main>
  );
}