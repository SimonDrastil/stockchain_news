import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";

const FINNHUB_KEY = "d5emeqpr01qmi0sjjnm0d5emeqpr01qmi0sjjnmg";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "Ticker required" }, { status: 400 });
  }

  const cacheKey = `quote:${ticker}`;
  try {
    const data = await withCache(cacheKey, 45_000, async () => {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`,
        { next: { revalidate: 0 } }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch quote");
      }
      return response.json();
    });

    return NextResponse.json({ ticker, data, delayed: false });
  } catch (error) {
    return NextResponse.json(
      { ticker, error: "Data delayed", delayed: true },
      { status: 200 }
    );
  }
}
