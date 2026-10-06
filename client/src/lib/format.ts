const lokal = "id-ID";

export function angka(v: string | number, maks = 8) {
  return new Intl.NumberFormat(lokal, { maximumFractionDigits: maks }).format(Number(v));
}

export function uang(v: string | number, mataUang: string, bertanda = false) {
  const n = Number(v);
  return new Intl.NumberFormat(lokal, {
    style: "currency",
    currency: mataUang.toUpperCase(),
    maximumFractionDigits: n !== 0 && Math.abs(n) < 1 ? 6 : undefined,
    signDisplay: bertanda ? "exceptZero" : "auto",
  }).format(n);
}

export function persen(v: string | number) {
  const f = new Intl.NumberFormat(lokal, {
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  });
  return `${f.format(Number(v))}%`;
}

export function tanggal(iso: string) {
  return new Date(iso).toLocaleDateString(lokal, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Angka ringkas untuk label sumbu, misalnya "1,2 jt"
export function ringkas(v: number) {
  return new Intl.NumberFormat(lokal, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

// "2026-10-03" -> "3 Okt" (tanggal dari server berupa tanggal UTC)
export function tanggalPendek(hariIso: string) {
  return new Date(`${hariIso}T00:00:00Z`).toLocaleDateString(lokal, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}