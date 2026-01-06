import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StockChain News",
  description: "Premium stock tracking and market news dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
