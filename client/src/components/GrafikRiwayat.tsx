import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { Riwayat } from "../store/api";
import { ringkas, tanggalPendek, uang } from "../lib/format";

const TINGGI = 220;
const M = { atas: 12, kanan: 56, bawah: 26, kiri: 48 };

function useLebar() {
  const ref = useRef<HTMLDivElement>(null);
  const [lebar, setLebar] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pengamat = new ResizeObserver(([e]) =>
      setLebar(Math.floor(e.contentRect.width)),
    );
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, []);

  return [ref, lebar] as const;
}

export default function GrafikRiwayat({ data }: { data: Riwayat }) {
  const [wadah, lebar] = useLebar();
  const [aktif, setAktif] = useState<number | null>(null);

  const cur = data.quoteCurrency;
  const n = data.points.length;
  const nilai = data.points.map((p) => Number(p.value));
  const modal = data.points.map((p) => Number(p.cost));
  const bisa = n >= 2 && nilai.some((v) => v > 0);

  // Skala
  const semua = [...nilai, ...modal];
  const dMin = Math.min(...semua);
  const dMax = Math.max(...semua);
  let lo = dMin;
  let hi = dMax === dMin ? dMin + 1 : dMax;
  const pad = (hi - lo) * 0.08;
  lo = dMin >= 0 ? Math.max(0, lo - pad) : lo - pad;
  hi += pad;

  const lebarPlot = Math.max(1, lebar - M.kiri - M.kanan);
  const x = (i: number) => M.kiri + (i / Math.max(1, n - 1)) * lebarPlot;
  const y = (v: number) =>
    M.atas + (1 - (v - lo) / (hi - lo)) * (TINGGI - M.atas - M.bawah);
  const f = (v: number) => v.toFixed(1);

  const jalurNilai = nilai
    .map((v, i) => `${i ? "L" : "M"}${f(x(i))},${f(y(v))}`)
    .join("");
  // Modal berubah hanya saat ada transaksi, jadi digambar bertangga
  const jalurModal = modal
    .map((v, i) => (i ? `H${f(x(i))}V${f(y(v))}` : `M${f(x(i))},${f(y(v))}`))
    .join("");

  const tick = dMax === dMin ? [dMin] : [dMin, (dMin + dMax) / 2, dMax];

  // Label langsung di ujung kanan, dijauhkan bila terlalu berdekatan
  let yLabelNilai = y(nilai[n - 1] ?? 0);
  let yLabelModal = y(modal[n - 1] ?? 0);
  if (Math.abs(yLabelNilai - yLabelModal) < 14) {
    const tengah = (yLabelNilai + yLabelModal) / 2;
    const atas = yLabelNilai <= yLabelModal;
    yLabelNilai = tengah + (atas ? -7 : 7);
    yLabelModal = tengah + (atas ? 7 : -7);
  }

  const i = aktif ?? n - 1;
  const p = data.points[i];

  function onGerak(e: PointerEvent<SVGSVGElement>) {
    const kiri = e.currentTarget.getBoundingClientRect().left;
    const idx = Math.round(((e.clientX - kiri - M.kiri) / lebarPlot) * (n - 1));
    setAktif(Math.max(0, Math.min(n - 1, idx)));
  }

  function onTombol(e: KeyboardEvent<SVGSVGElement>) {
    const sekarang = aktif ?? n - 1;
    if (e.key === "ArrowLeft") setAktif(Math.max(0, sekarang - 1));
    else if (e.key === "ArrowRight") setAktif(Math.min(n - 1, sekarang + 1));
    else if (e.key === "Home") setAktif(0);
    else if (e.key === "End") setAktif(n - 1);
    else return;
    e.preventDefault();
  }

  return (
    <figure className="grafik">
      {bisa && p ? (
        <p className="grafik__baca">
          {tanggalPendek(p.date)}: nilai <strong>{uang(p.value, cur)}</strong>, modal{" "}
          {uang(p.cost, cur)} (
          <span className={Number(p.value) >= Number(p.cost) ? "untung" : "rugi"}>
            {uang(Number(p.value) - Number(p.cost), cur, true)}
          </span>
          )
        </p>
      ) : (
        <p className="redup">
          Belum ada riwayat nilai untuk digambar. Grafik muncul setelah ada posisi
          yang punya data harga.
        </p>
      )}

      <div ref={wadah} className="grafik__area">
        {bisa && lebar > 0 && (
          <svg
            width={lebar}
            height={TINGGI}
            viewBox={`0 0 ${lebar} ${TINGGI}`}
            role="img"
            tabIndex={0}
            aria-label={`Riwayat nilai portofolio ${n} hari terakhir, dari ${uang(
              nilai[0],
              cur,
            )} menjadi ${uang(nilai[n - 1], cur)}. Gunakan panah kiri dan kanan untuk memeriksa tiap hari.`}
            onPointerMove={onGerak}
            onPointerLeave={() => setAktif(null)}
            onKeyDown={onTombol}
            onBlur={() => setAktif(null)}
          >
            {tick.map((t) => (
              <g key={t}>
                <line
                  className="grafik__garis"
                  x1={M.kiri}
                  x2={lebar - M.kanan}
                  y1={y(t)}
                  y2={y(t)}
                />
                <text
                  className="grafik__sumbu"
                  x={M.kiri - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                >
                  {ringkas(t)}
                </text>
              </g>
            ))}

            {[0, Math.floor((n - 1) / 2), n - 1].map((idx, k) => (
              <text
                key={idx}
                className="grafik__sumbu"
                x={x(idx)}
                y={TINGGI - 6}
                textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
              >
                {tanggalPendek(data.points[idx].date)}
              </text>
            ))}

            <path className="grafik__modal" d={jalurModal} />
            <path className="grafik__nilai" d={jalurNilai} />

            <text
              className="grafik__label grafik__label--nilai"
              x={lebar - M.kanan + 8}
              y={yLabelNilai}
              dy="0.32em"
            >
              Nilai
            </text>
            <text
              className="grafik__label grafik__label--modal"
              x={lebar - M.kanan + 8}
              y={yLabelModal}
              dy="0.32em"
            >
              Modal
            </text>

            {aktif !== null && (
              <g>
                <line
                  className="grafik__penanda"
                  x1={x(aktif)}
                  x2={x(aktif)}
                  y1={M.atas}
                  y2={TINGGI - M.bawah}
                />
                <circle className="grafik__titik grafik__titik--modal" cx={x(aktif)} cy={y(modal[aktif])} r={4} />
                <circle className="grafik__titik grafik__titik--nilai" cx={x(aktif)} cy={y(nilai[aktif])} r={4} />
              </g>
            )}
          </svg>
        )}
      </div>

      {bisa && (
        <figcaption className="redup">
          Harga penutupan harian. Modal dihitung dari rata-rata bergerak transaksi Anda.
          {data.missingPrices.length > 0 &&
            ` Riwayat harga ${data.missingPrices.join(", ")} tidak tersedia, jadi belum ikut dihitung.`}
        </figcaption>
      )}
    </figure>
  );
}