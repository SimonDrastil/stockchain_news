import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";

const FINNHUB_KEY = "d5emeqpr01qmi0sjjnm0d5emeqpr01qmi0sjjnmg";

const RANGE_MAP: Record<string, { resolution: string; days: number; ttl: number }> = {
  "1D": { resolution: "5", days: 1, ttl: 120_000 },
  "5D": { resolution: "15", days: 5, ttl: 180_000 },
  "1M": { resolution: "60", days: 30, ttl: 240_000 },
  "6M": { resolution: "D", days: 180, ttl: 300_000 },
  "1Y": { resolution: "D", days: 365, ttl: 300_000 },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();
  const range = searchParams.get("range") || "1M";

  if (!ticker || !RANGE_MAP[range]) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { resolution, days, ttl } = RANGE_MAP[range];
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 24 * 60 * 60;
  const cacheKey = `candles:${ticker}:${range}`;

  try {
    const data = await withCache(cacheKey, ttl, async () => {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${start}&to=${end}&token=${FINNHUB_KEY}`,
        { next: { revalidate: 0 } }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch candles");
      }
      return response.json();
    });

    return NextResponse.json({ ticker, range, data, delayed: false });
  } catch (error) {
    return NextResponse.json(
      { ticker, range, error: "Data delayed", delayed: true },
      { status: 200 }
    );
  }
}
