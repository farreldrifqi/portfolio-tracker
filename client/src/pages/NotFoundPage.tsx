import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="masuk">
      <p className="merek">Pantau</p>
      <h1>Halaman tidak ditemukan</h1>
      <p className="redup">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <p>
        <Link to="/">Ke daftar portofolio</Link>
      </p>
    </main>
  );
}