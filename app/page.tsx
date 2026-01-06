"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import clsx from "clsx";
import { Badge, GlassButton, GlassInput, GlassPanel, Skeleton } from "@/components/ui";
import { useLocalStorage } from "@/lib/storage";

const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"];
const RANGE_TABS = ["1D", "5D", "1M", "6M", "1Y"] as const;
const NEWS_WINDOWS = ["24h", "7d", "30d"] as const;
const SORT_OPTIONS = ["name", "price", "% change"] as const;
const TAG_OPTIONS = ["Core", "Growth", "Spec"] as const;
const MOBILE_TABS = ["Watchlist", "Stock", "News"] as const;

const STATIC_COMPANIES: Record<string, string> = {
  AAPL: "Apple",
  MSFT: "Microsoft",
  NVDA: "NVIDIA",
  TSLA: "Tesla",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
  META: "Meta",
  JPM: "JPMorgan",
};

type QuoteData = {
  c: number;
  d: number;
  dp: number;
  o: number;
  pc: number;
  h?: number;
  l?: number;
  v?: number;
};

type CandleData = {
  c: number[];
  t: number[];
  s: string;
};

type NewsArticle = {
  id?: string;
  headline?: string;
  summary?: string;
  url?: string;
  source?: string;
  datetime?: number;
  title?: string;
  description?: string;
  publishedAt?: string;
};

type CompanyProfile = {
  name?: string;
  ticker?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
  ipo?: string;
  finnhubIndustry?: string;
};

const formatNumber = (value?: number) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const formatCurrency = (value?: number) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
};

const getTimeAgo = (date: Date) => {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getMarketStatus = () => {
  const now = new Date();
  const nyHour = Number(now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }));
  const nyMinute = Number(now.toLocaleString("en-US", { timeZone: "America/New_York", minute: "2-digit", hour12: false }));
  const totalMinutes = nyHour * 60 + nyMinute;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  return totalMinutes >= open && totalMinutes <= close ? "Market open" : "Market closed";
};

export default function Home() {
  const [watchlist, setWatchlist] = useLocalStorage<string[]>(
    "watchlist",
    DEFAULT_WATCHLIST
  );
  const [selected, setSelected] = useLocalStorage<string>(
    "selectedTicker",
    DEFAULT_WATCHLIST[0]
  );
  const [settings, setSettings] = useLocalStorage(
    "settings",
    {
      refresh: 60,
      autoRefresh: true,
      reduceMotion: false,
      compact: false,
      theme: "dark",
    }
  );
  const [tagMap, setTagMap] = useLocalStorage<Record<string, string>>(
    "watchlistTags",
    {}
  );
  const [pinned, setPinned] = useLocalStorage<string[]>("watchlistPinned", []);

  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("name");
  const [search, setSearch] = useState("");
  const [addTicker, setAddTicker] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [companyNewsTab, setCompanyNewsTab] = useState<"forYou" | "market">(
    "forYou"
  );
  const [newsWindow, setNewsWindow] = useState<(typeof NEWS_WINDOWS)[number]>("7d");
  const [keyword, setKeyword] = useState("");
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [range, setRange] = useState<(typeof RANGE_TABS)[number]>("1M");
  const [mobileTab, setMobileTab] = useState<(typeof MOBILE_TABS)[number]>("Stock");

  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [candles, setCandles] = useState<CandleData | null>(null);
  const [sparklineMap, setSparklineMap] = useState<Record<string, CandleData>>({});
  const [companyProfile, setCompanyProfile] = useState<Record<string, CompanyProfile>>({});
  const [companyNews, setCompanyNews] = useState<NewsArticle[]>([]);
  const [marketNews, setMarketNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [delayed, setDelayed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshQuotes = async () => {
    const updates = await Promise.all(
      watchlist.map(async (ticker) => {
        const response = await fetch(`/api/quote?ticker=${ticker}`);
        const payload = await response.json();
        if (payload.delayed) {
          setDelayed(true);
        }
        return [ticker, payload.data] as const;
      })
    );

    setQuotes((prev) => ({
      ...prev,
      ...Object.fromEntries(updates.filter((entry) => entry[1]))
    }));
    setLastUpdated(new Date());
  };

  const refreshCandles = async () => {
    setChartLoading(true);
    const response = await fetch(`/api/candles?ticker=${selected}&range=${range}`);
    const payload = await response.json();
    setCandles(payload.data?.s === "ok" ? payload.data : null);
    setChartLoading(false);
  };

  const refreshSparkline = async (ticker: string) => {
    const response = await fetch(`/api/candles?ticker=${ticker}&range=5D`);
    const payload = await response.json();
    if (payload.data?.s === "ok") {
      setSparklineMap((prev) => ({ ...prev, [ticker]: payload.data }));
    }
  };

  const refreshProfiles = async () => {
    const missing = watchlist.filter((ticker) => !companyProfile[ticker]);
    await Promise.all(
      missing.map(async (ticker) => {
        const response = await fetch(`/api/profile?ticker=${ticker}`);
        const payload = await response.json();
        setCompanyProfile((prev) => ({
          ...prev,
          [ticker]: payload.data || {},
        }));
      })
    );
  };

  const refreshNews = async () => {
    setNewsLoading(true);
    const [companyResponse, marketResponse] = await Promise.all([
      fetch(`/api/news/company?ticker=${selected}&window=${newsWindow}`),
      fetch(`/api/news/market?window=${newsWindow}`),
    ]);
    const companyPayload = await companyResponse.json();
    const marketPayload = await marketResponse.json();
    setCompanyNews(companyPayload.data || []);
    setMarketNews(marketPayload.data?.articles || []);
    if (companyPayload.delayed || marketPayload.delayed) {
      setDelayed(true);
    }
    setNewsLoading(false);
  };

  useEffect(() => {
    refreshQuotes();
    refreshProfiles();
  }, []);

  useEffect(() => {
    refreshCandles();
    refreshNews();
  }, [selected, range, newsWindow]);

  useEffect(() => {
    watchlist.forEach((ticker) => {
      if (!sparklineMap[ticker]) {
        refreshSparkline(ticker);
      }
    });
  }, [watchlist]);

  useEffect(() => {
    if (!settings.autoRefresh) return;
    const interval = setInterval(refreshQuotes, settings.refresh * 1000);
    return () => clearInterval(interval);
  }, [settings.autoRefresh, settings.refresh, watchlist]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("theme-light", settings.theme === "light");
    document.body.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings.theme, settings.reduceMotion]);

  const filteredSuggestions = useMemo(() => {
    if (!search) return [];
    const term = search.toUpperCase();
    return Object.keys(STATIC_COMPANIES)
      .filter((ticker) => ticker.includes(term) || STATIC_COMPANIES[ticker].toUpperCase().includes(term))
      .slice(0, 5);
  }, [search]);

  const chartData = useMemo(() => {
    if (!candles) return [];
    return candles.t.map((timestamp, index) => ({
      time: new Date(timestamp * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: candles.c[index],
    }));
  }, [candles]);

  const sortedWatchlist = useMemo(() => {
    const list = [...watchlist];
    const pinnedSet = new Set(pinned);
    return list.sort((a, b) => {
      if (pinnedSet.has(a) && !pinnedSet.has(b)) return -1;
      if (!pinnedSet.has(a) && pinnedSet.has(b)) return 1;
      if (sortBy === "name") return a.localeCompare(b);
      if (sortBy === "price") {
        return (quotes[b]?.c || 0) - (quotes[a]?.c || 0);
      }
      return (quotes[b]?.dp || 0) - (quotes[a]?.dp || 0);
    });
  }, [watchlist, sortBy, quotes, pinned]);

  const handleAddTicker = (ticker: string) => {
    if (!ticker) return;
    const upper = ticker.toUpperCase();
    if (watchlist.includes(upper)) return;
    setWatchlist([...watchlist, upper]);
    setSelected(upper);
    setAddTicker("");
  };

  const handleBulkAdd = () => {
    const tickers = bulkInput
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length === 0) return;
    const merged = Array.from(new Set([...watchlist, ...tickers]));
    setWatchlist(merged);
    setBulkInput("");
  };

  const newsItems = useMemo(() => {
    const base = companyNewsTab === "forYou" ? companyNews : marketNews;
    const watchlistSet = new Set(watchlist);
    return base.filter((item) => {
      const title = item.headline || item.title || "";
      const description = item.summary || item.description || "";
      const matchesKeyword = keyword
        ? `${title} ${description}`.toLowerCase().includes(keyword.toLowerCase())
        : true;
      const matchesWatchlist = watchlistOnly
        ? Array.from(watchlistSet).some((ticker) =>
            `${title} ${description}`.toUpperCase().includes(ticker)
          )
        : true;
      return matchesKeyword && matchesWatchlist;
    });
  }, [companyNewsTab, companyNews, marketNews, keyword, watchlistOnly, watchlist]);

  const selectedQuote = quotes[selected];
  const dailyChange = selectedQuote?.d ?? 0;
  const dailyPercent = selectedQuote?.dp ?? 0;
  const changeColor = dailyChange >= 0 ? "text-white" : "text-white/60";
  const profile = companyProfile[selected] || {};
  const marketStatus = getMarketStatus();

  const renderSparkline = (ticker: string) => {
    const data = sparklineMap[ticker];
    if (!data) {
      return <div className="h-8 w-24 rounded-full bg-white/10" />;
    }
    const points = data.c.slice(-7).map((value, index, arr) => {
      const x = (index / (arr.length - 1)) * 80 + 4;
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const y = 28 - ((value - min) / (max - min || 1)) * 20;
      return `${x},${y}`;
    });
    return (
      <svg className="h-8 w-24" viewBox="0 0 88 32">
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="2"
        />
      </svg>
    );
  };

  return (
    <div className={clsx("min-h-screen px-6 pb-12 pt-6", settings.theme === "light" ? "bg-white text-black" : "bg-black text-white")}>
      <header className="sticky top-4 z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-6 rounded-full border border-white/10 bg-black/70 px-6 py-3 backdrop-blur-lg">
        <div className="text-sm font-medium tracking-[0.3em] text-white/80">StockChain News</div>
        <div className="relative flex-1">
          <GlassInput
            value={search}
            onChange={setSearch}
            placeholder="Search ticker or company"
          />
          {filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-white/10 bg-black/80 p-2 text-sm text-white/70 shadow-glass">
              {filteredSuggestions.map((ticker) => (
                <button
                  key={ticker}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-white/10"
                  onClick={() => {
                    handleAddTicker(ticker);
                    setSearch("");
                  }}
                >
                  <span>{ticker}</span>
                  <span className="text-xs text-white/50">{STATIC_COMPANIES[ticker]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <button
            className="rounded-full border border-white/10 px-3 py-2"
            onClick={() =>
              setSettings((prev: typeof settings) => ({
                ...prev,
                theme: prev.theme === "dark" ? "light" : "dark",
              }))
            }
          >
            {settings.theme === "dark" ? "Dark" : "Light"}
          </button>
          <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}</span>
          <button
            className="rounded-full border border-white/10 px-3 py-2"
            onClick={() => {
              refreshQuotes();
              refreshCandles();
              refreshNews();
            }}
          >
            Refresh
          </button>
          <details className="relative">
            <summary className="cursor-pointer rounded-full border border-white/10 px-3 py-2">
              Settings
            </summary>
            <div className="absolute right-0 mt-2 w-64 space-y-4 rounded-2xl border border-white/10 bg-black/90 p-4 text-xs shadow-glass">
              <div>
                <p className="text-white/50">Update frequency</p>
                <div className="mt-2 flex gap-2">
                  {[15, 30, 60].map((value) => (
                    <button
                      key={value}
                      className={clsx(
                        "rounded-full border px-3 py-1",
                        settings.refresh === value
                          ? "border-white/40 bg-white/10"
                          : "border-white/10"
                      )}
                      onClick={() => setSettings({ ...settings, refresh: value })}
                    >
                      {value}s
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between">
                Auto-refresh
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(event) =>
                    setSettings({ ...settings, autoRefresh: event.target.checked })
                  }
                />
              </label>
              <label className="flex items-center justify-between">
                Reduce motion
                <input
                  type="checkbox"
                  checked={settings.reduceMotion}
                  onChange={(event) =>
                    setSettings({ ...settings, reduceMotion: event.target.checked })
                  }
                />
              </label>
              <label className="flex items-center justify-between">
                Compact view
                <input
                  type="checkbox"
                  checked={settings.compact}
                  onChange={(event) =>
                    setSettings({ ...settings, compact: event.target.checked })
                  }
                />
              </label>
            </div>
          </details>
        </div>
      </header>

      <div className="mx-auto mt-6 flex max-w-7xl gap-2 rounded-full border border-white/10 bg-black/60 p-2 text-xs uppercase tracking-[0.3em] text-white/60 lg:hidden">
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab}
            className={clsx(
              "flex-1 rounded-full py-2",
              mobileTab === tab ? "bg-white/10 text-white" : "text-white/50"
            )}
            onClick={() => setMobileTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="mx-auto mt-6 grid max-w-7xl gap-6 lg:grid-cols-[1.2fr_2fr_1.4fr]">
        <GlassPanel
          className={clsx(
            "p-6",
            mobileTab !== "Watchlist" ? "hidden lg:block" : "block"
          )}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">Watchlist</h2>
            <select
              className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as (typeof SORT_OPTIONS)[number])}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  Sort {option}
                </option>
              ))}
            </select>
          </div>
          <div className={clsx("mt-4 space-y-3", settings.compact && "space-y-2")}>
            {sortedWatchlist.map((ticker) => {
              const quote = quotes[ticker];
              const name = companyProfile[ticker]?.name || STATIC_COMPANIES[ticker] || ticker;
              const change = quote?.d ?? 0;
              const percent = quote?.dp ?? 0;
              return (
                <div
                  key={ticker}
                  className={clsx(
                    "rounded-2xl border border-white/5 px-4 py-3",
                    selected === ticker ? "bg-white/10" : "bg-white/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => setSelected(ticker)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">{ticker}</p>
                        <p className="text-xs text-white/50">{name}</p>
                      </div>
                    </button>
                    <div className="text-right">
                      <p className="text-sm">{formatCurrency(quote?.c)}</p>
                      <p className={clsx("text-xs", change >= 0 ? "text-white/70" : "text-white/40")}>
                        {formatNumber(change)} ({formatNumber(percent)}%)
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px]"
                        value={tagMap[ticker] || "Core"}
                        onChange={(event) =>
                          setTagMap({ ...tagMap, [ticker]: event.target.value })
                        }
                      >
                        {TAG_OPTIONS.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                      <button
                        className={clsx(
                          "rounded-full border px-2 py-1 text-[10px]",
                          pinned.includes(ticker)
                            ? "border-white/40 bg-white/10"
                            : "border-white/10"
                        )}
                        onClick={() =>
                          setPinned((prev) =>
                            prev.includes(ticker)
                              ? prev.filter((item) => item !== ticker)
                              : [...prev, ticker]
                          )
                        }
                      >
                        Pin
                      </button>
                      <button
                        className="rounded-full border border-white/10 px-2 py-1 text-[10px]"
                        onClick={() =>
                          setWatchlist((prev) => prev.filter((item) => item !== ticker))
                        }
                      >
                        Remove
                      </button>
                    </div>
                    {renderSparkline(ticker)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 space-y-3">
            <GlassInput
              value={addTicker}
              onChange={setAddTicker}
              placeholder="Add ticker"
            />
            <div className="flex gap-2">
              <GlassButton onClick={() => handleAddTicker(addTicker)}>Add</GlassButton>
              <GlassButton onClick={handleBulkAdd}>Bulk add</GlassButton>
            </div>
            <GlassInput
              value={bulkInput}
              onChange={setBulkInput}
              placeholder="AAPL, MSFT, NVDA"
            />
          </div>
        </GlassPanel>

        <div className={clsx("space-y-6", mobileTab !== "Stock" ? "hidden lg:block" : "block")}>
          <GlassPanel className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Selected</p>
                <h1 className="mt-2 text-3xl font-semibold">{selected}</h1>
                <p className="text-sm text-white/50">
                  {profile.name || STATIC_COMPANIES[selected] || "—"}
                </p>
                <p className="mt-2 text-xs text-white/40">{marketStatus}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold">{formatCurrency(selectedQuote?.c)}</p>
                <p className={clsx("text-sm", changeColor)}>
                  {formatNumber(dailyChange)} ({formatNumber(dailyPercent)}%)
                </p>
                <Badge className="mt-2">{delayed ? "Data delayed" : "Realtime"}</Badge>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              {RANGE_TABS.map((tab) => (
                <button
                  key={tab}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-xs",
                    range === tab ? "border-white/40 bg-white/10" : "border-white/10"
                  )}
                  onClick={() => setRange(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="mt-6 h-64 w-full">
              {chartLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Skeleton className="h-2 w-32" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,10,10,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-white/60 md:grid-cols-4">
              <div>
                <p className="uppercase tracking-[0.2em]">Market cap</p>
                <p className="text-white">{formatNumber(profile.marketCapitalization)}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em]">P/E</p>
                <p className="text-white">—</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em]">Volume</p>
                <p className="text-white">{formatNumber(selectedQuote?.v)}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em]">Avg volume</p>
                <p className="text-white">—</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em]">52w high</p>
                <p className="text-white">—</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em]">52w low</p>
                <p className="text-white">—</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em]">Open</p>
                <p className="text-white">{formatCurrency(selectedQuote?.o)}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em]">Prev close</p>
                <p className="text-white">{formatCurrency(selectedQuote?.pc)}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <GlassButton
                onClick={() =>
                  setWatchlist((prev) =>
                    prev.includes(selected)
                      ? prev.filter((item) => item !== selected)
                      : [...prev, selected]
                  )
                }
              >
                {watchlist.includes(selected) ? "Remove from Watchlist" : "Add to Watchlist"}
              </GlassButton>
              <GlassButton onClick={() => navigator.clipboard.writeText(selected)}>
                Copy ticker
              </GlassButton>
              <a
                className="glass-button"
                href={`https://finance.yahoo.com/quote/${selected}`}
                target="_blank"
                rel="noreferrer"
              >
                Open on Yahoo
              </a>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <h3 className="text-sm uppercase tracking-[0.3em] text-white/60">Insights</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Recent high</p>
                <p className="mt-2 text-lg">{formatCurrency(selectedQuote?.h)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Recent low</p>
                <p className="mt-2 text-lg">{formatCurrency(selectedQuote?.l)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Volatility</p>
                <p className="mt-2 text-lg">{candles ? "Moderate" : "—"}</p>
              </div>
            </div>
          </GlassPanel>
        </div>

        <GlassPanel
          className={clsx(
            "p-6",
            mobileTab !== "News" ? "hidden lg:block" : "block"
          )}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">News</h2>
            <div className="flex gap-2">
              {NEWS_WINDOWS.map((window) => (
                <button
                  key={window}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs",
                    newsWindow === window ? "border-white/40 bg-white/10" : "border-white/10"
                  )}
                  onClick={() => setNewsWindow(window)}
                >
                  {window}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className={clsx(
                "rounded-full border px-3 py-1 text-xs",
                companyNewsTab === "forYou" ? "border-white/40 bg-white/10" : "border-white/10"
              )}
              onClick={() => setCompanyNewsTab("forYou")}
            >
              For You
            </button>
            <button
              className={clsx(
                "rounded-full border px-3 py-1 text-xs",
                companyNewsTab === "market" ? "border-white/40 bg-white/10" : "border-white/10"
              )}
              onClick={() => setCompanyNewsTab("market")}
            >
              Market
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <GlassInput value={keyword} onChange={setKeyword} placeholder="Filter by keyword" />
            <label className="flex items-center justify-between text-xs text-white/60">
              Watchlist only
              <input
                type="checkbox"
                checked={watchlistOnly}
                onChange={(event) => setWatchlistOnly(event.target.checked)}
              />
            </label>
          </div>
          <div className="mt-6 space-y-4">
            {newsLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))
              : newsItems
                  .slice(0, 8)
                  .map((item, index) => {
                    const title = item.headline || item.title || "Untitled";
                    const description = item.summary || item.description || "";
                    const source = item.source || "Market";
                    const badges = watchlist.filter((ticker) =>
                      `${title} ${description}`.toUpperCase().includes(ticker)
                    );
                    const published = item.datetime
                      ? new Date(item.datetime * 1000)
                      : item.publishedAt
                      ? new Date(item.publishedAt)
                      : new Date();
                    return (
                      <a
                        key={`${title}-${index}`}
                        href={item.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                      >
                        <div className="flex items-center justify-between text-xs text-white/50">
                          <span>{source}</span>
                          <span>{getTimeAgo(published)}</span>
                        </div>
                        <h4 className="mt-2 text-sm font-medium text-white">{title}</h4>
                        <p className="mt-2 text-xs text-white/60">{description}</p>
                        {badges.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {badges.slice(0, 3).map((ticker) => (
                              <Badge key={ticker}>{ticker}</Badge>
                            ))}
                          </div>
                        )}
                      </a>
                    );
                  })}
          </div>
        </GlassPanel>
      </main>
    </div>
  );
}
