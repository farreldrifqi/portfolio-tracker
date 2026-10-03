import { Link, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { keluar } from "../store/authSlice";
import { api } from "../store/api";
import type { RootState } from "../store";

export default function Layout() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);

  function handleKeluar() {
    dispatch(keluar());
    dispatch(api.util.resetApiState());
  }

  return (
    <>
      <header className="bar">
        <div className="bar__isi">
          <Link to="/" className="merek">
            Pantau
          </Link>
          <div className="bar__akun">
            <span>{user?.email}</span>
            <button type="button" className="tombol-teks" onClick={handleKeluar}>
              Keluar
            </button>
          </div>
        </div>
      </header>
      <main className="konten">
        <Outlet />
      </main>
    </>
  );
}