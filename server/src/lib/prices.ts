// Peta simbol -> ID CoinGecko. Tambahkan koin lain sesuai kebutuhan
// (ID-nya ada di halaman koin CoinGecko, kolom "API ID").
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  USDT: "tether",
  USDC: "usd-coin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  LTC: "litecoin",
  TRX: "tron",
  XTZ: "tezos",
};

export const HARI_RIWAYAT = 60;
const HARI_MS = 24 * 60 * 60 * 1000;

const CACHE_TTL_MS = 5 * 60 * 1000;
const SERI_TTL_MS = 60 * 60 * 1000; // riwayat harian cukup diperbarui tiap jam

// Seri harga harian: "YYYY-MM-DD" (UTC) -> harga
export type Seri = Record<string, number>;

const cache = new Map<string, { price: number; expires: number }>();
const stockCache = new Map<string, { seri: Seri | null; expires: number }>();
const cryptoSeriesCache = new Map<string, { seri: Seri; expires: number }>();

const hariUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const getQuoteCurrency = () =>
  (process.env.QUOTE_CURRENCY ?? "usd").toLowerCase();

export function clearPriceCache() {
  cache.clear();
  stockCache.clear();
  cryptoSeriesCache.clear();
}

function coingeckoHeaders() {
  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }
  return headers;
}

// ---------- Kripto ----------

// Mengembalikan { SIMBOL: harga }. Simbol yang gagal diambil tidak disertakan.
export async function getCryptoPrices(
  symbols: string[],
): Promise<Record<string, number>> {
  const quote = getQuoteCurrency();
  const now = Date.now();
  const result: Record<string, number> = {};
  const missing: string[] = [];

  for (const symbol of symbols) {
    const id = COINGECKO_IDS[symbol];
    if (!id) continue;

    const hit = cache.get(`${id}:${quote}`);
    if (hit && hit.expires > now) {
      result[symbol] = hit.price;
    } else {
      missing.push(symbol);
    }
  }

  if (missing.length === 0) return result;

  const ids = missing.map((s) => COINGECKO_IDS[s]).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${quote}`;

  try {
    const res = await fetch(url, {
      headers: coingeckoHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`CoinGecko merespons ${res.status}`);

    const data = (await res.json()) as Record<string, Record<string, number>>;
    for (const symbol of missing) {
      const id = COINGECKO_IDS[symbol];
      const price = data[id]?.[quote];
      if (typeof price === "number") {
        cache.set(`${id}:${quote}`, { price, expires: now + CACHE_TTL_MS });
        result[symbol] = price;
      }
    }
  } catch (err) {
    // Gagal ambil harga tidak boleh menjatuhkan endpoint
    console.error("Gagal mengambil harga kripto:", err);
  }

  return result;
}

// Seri harga harian per koin (untuk grafik riwayat)
export async function getCryptoSeries(
  symbols: string[],
): Promise<Record<string, Seri>> {
  const quote = getQuoteCurrency();
  const now = Date.now();
  const result: Record<string, Seri> = {};

  await Promise.all(
    symbols.map(async (symbol) => {
      const id = COINGECKO_IDS[symbol];
      if (!id) return;

      const kunci = `${id}:${quote}`;
      const hit = cryptoSeriesCache.get(kunci);
      if (hit && hit.expires > now) {
        result[symbol] = hit.seri;
        return;
      }

      try {
        const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${quote}&days=${HARI_RIWAYAT + 5}&interval=daily`;
        const res = await fetch(url, {
          headers: coingeckoHeaders(),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`CoinGecko merespons ${res.status}`);

        const data = (await res.json()) as { prices: [number, number][] };
        const seri: Seri = {};
        for (const [ms, harga] of data.prices) seri[hariUtc(ms)] = harga;

        cryptoSeriesCache.set(kunci, { seri, expires: now + SERI_TTL_MS });
        result[symbol] = seri;
      } catch (err) {
        console.error(`Gagal mengambil riwayat harga ${symbol}:`, err);
      }
    }),
  );

  return result;
}

// ---------- Saham IDX (Sectors API v2, dalam IDR) ----------

// null = ticker tidak dikenal / tidak ada data. Error jaringan dilempar ke pemanggil.
async function fetchStockSeries(symbol: string): Promise<Seri | null> {
  if (!/^[A-Z]{4}$/.test(symbol)) return null; // format ticker IDX

  const end = Date.now();
  // Jendela grafik + cadangan 25 hari (melewati akhir pekan/libur). Batas Sectors: 90 hari.
  const start = end - (HARI_RIWAYAT + 25) * HARI_MS;
  const url = `https://api.sectors.app/v2/daily/${symbol}/?start=${hariUtc(start)}&end=${hariUtc(end)}`;

  const res = await fetch(url, {
    headers: { Authorization: process.env.SECTORS_API_KEY! },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Sectors merespons ${res.status}`);

  const rows = (await res.json()) as { date: string; close: number }[];
  if (!Array.isArray(rows)) return null;

  const seri: Seri = {};
  for (const r of rows) {
    if (typeof r.close === "number") seri[r.date] = r.close;
  }
  return Object.keys(seri).length > 0 ? seri : null;
}

export async function getStockSeries(
  symbols: string[],
): Promise<Record<string, Seri>> {
  if (symbols.length === 0 || !process.env.SECTORS_API_KEY) return {};
  if (getQuoteCurrency() !== "idr") {
    console.warn("Harga saham dari Sectors berupa IDR. Set QUOTE_CURRENCY=idr agar ditampilkan.");
    return {};
  }

  const now = Date.now();
  const result: Record<string, Seri> = {};

  await Promise.all(
    symbols.map(async (symbol) => {
      const hit = stockCache.get(symbol);
      if (hit && hit.expires > now) {
        if (hit.seri) result[symbol] = hit.seri;
        return;
      }

      try {
        const seri = await fetchStockSeries(symbol);
        stockCache.set(symbol, { seri, expires: now + SERI_TTL_MS });
        if (seri) result[symbol] = seri;
      } catch (err) {
        console.error(`Gagal mengambil harga saham ${symbol}:`, err);
      }
    }),
  );

  return result;
}

// Penutupan terbaru dari seri yang sama
export async function getStockPrices(
  symbols: string[],
): Promise<Record<string, number>> {
  const series = await getStockSeries(symbols);
  const result: Record<string, number> = {};
  for (const [symbol, seri] of Object.entries(series)) {
    const terbaru = Object.keys(seri).sort().pop();
    if (terbaru) result[symbol] = seri[terbaru];
  }
  return result;
}