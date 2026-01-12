# StockChain News

Premium one-page stock tracking + market news dashboard built with Next.js App Router, TypeScript, and TailwindCSS.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API keys (server-only route handlers)

Keys are in the following files so they are easy to replace later with `.env.local` values:

- `app/api/quote/route.ts`
- `app/api/candles/route.ts`
- `app/api/profile/route.ts`
- `app/api/news/company/route.ts`
- `app/api/news/market/route.ts`

Placeholder keys (exact strings):

- Finnhub: `d5emeqpr01qmi0sjjnm0d5emeqpr01qmi0sjjnmg`
- NewsAPI: `d2306a11a83e4d45bb30f1cde874ccdd`

**Recommended improvement:** move the keys into `.env.local` (e.g. `FINNHUB_API_KEY` and `NEWS_API_KEY`) and read them via `process.env` in the route handlers.

## Deploy (Vercel)

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. If you move keys into `.env.local`, set the same environment variables in Vercel.
4. Deploy.
