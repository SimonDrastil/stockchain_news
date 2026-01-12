import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";

const FINNHUB_KEY = "d5emeqpr01qmi0sjjnm0d5emeqpr01qmi0sjjnmg";

const WINDOW_MAP: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();
  const window = searchParams.get("window") || "7d";
  const days = WINDOW_MAP[window] ?? 7;

  if (!ticker) {
    return NextResponse.json({ error: "Ticker required" }, { status: 400 });
  }

  const cacheKey = `news:company:${ticker}:${window}`;
  try {
    const data = await withCache(cacheKey, 7 * 60_000, async () => {
      const to = new Date();
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const toDate = to.toISOString().split("T")[0];
      const fromDate = from.toISOString().split("T")[0];

      const response = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`,
        { next: { revalidate: 0 } }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch company news");
      }
      return response.json();
    });

    return NextResponse.json({ ticker, window, data, delayed: false });
  } catch (error) {
    return NextResponse.json(
      { ticker, window, error: "Data delayed", delayed: true },
      { status: 200 }
    );
  }
}
