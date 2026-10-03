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

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { price: number; expires: number }>();

export const getQuoteCurrency = () =>
  (process.env.QUOTE_CURRENCY ?? "usd").toLowerCase();

export function clearPriceCache() {
  cache.clear();
}

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
  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
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