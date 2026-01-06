import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";

const NEWS_KEY = "d2306a11a83e4d45bb30f1cde874ccdd";

const WINDOW_MAP: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const window = searchParams.get("window") || "7d";
  const days = WINDOW_MAP[window] ?? 7;

  const cacheKey = `news:market:${window}`;
  try {
    const data = await withCache(cacheKey, 7 * 60_000, async () => {
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=30&from=${from}&apiKey=${NEWS_KEY}`,
        { next: { revalidate: 0 } }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch market news");
      }
      return response.json();
    });

    return NextResponse.json({ window, data, delayed: false });
  } catch (error) {
    return NextResponse.json(
      { window, error: "Data delayed", delayed: true },
      { status: 200 }
    );
  }
}
