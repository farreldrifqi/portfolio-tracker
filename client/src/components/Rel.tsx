import type { CSSProperties } from "react";
import { persen } from "../lib/format";

// Skala tetap: modal rata-rata di tengah, tepi kiri/kanan = -50% / +50%.
export default function Rel({ avg, harga }: { avg: number; harga: number | null }) {
  if (harga === null || avg <= 0) {
    return <div className="rel rel--kosong" aria-hidden="true" />;
  }

  const selisih = harga / avg - 1;
  const pos = 0.5 + Math.max(-0.5, Math.min(0.5, selisih));
  const gaya = {
    "--pos": pos,
    "--kiri": Math.min(pos, 0.5),
    "--lebar": Math.abs(pos - 0.5),
  } as CSSProperties;

  return (
    <div
      className="rel"
      style={gaya}
      role="img"
      aria-label={`Harga sekarang ${persen(selisih * 100)} dari modal rata-rata`}
    >
      <span className={`rel__isi ${selisih >= 0 ? "rel__isi--naik" : "rel__isi--turun"}`} />
      <span className="rel__modal" />
      <span className="rel__harga" />
    </div>
  );
}