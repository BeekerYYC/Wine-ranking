import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wine Ranker",
  description: "Track and rank your wine collection",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        <nav className="bg-stone-800 text-white px-4 py-3 sticky top-0 z-50">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-semibold tracking-tight">
              🍷 Wine Ranker
            </a>
            <a
              href="/add"
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Wine
            </a>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
