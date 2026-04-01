import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wine Ranker",
  description: "Track and rank your wine collection",
};

const navLinks = [
  { href: "/", label: "Collection" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sommelier", label: "Sommelier" },
  { href: "/insights", label: "Insights" },
  { href: "/achievements", label: "Badges" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-wine-950 text-stone-100 min-h-screen">
        {/* Top nav */}
        <nav className="bg-wine-950/95 backdrop-blur-md border-b border-wine-800/50 px-4 py-3 sticky top-0 z-50">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight text-wine-300 hover:text-wine-200 transition-colors">
              Wine Ranker
            </a>
            <a
              href="/add"
              className="bg-wine-700 hover:bg-wine-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-wine-900/50"
            >
              + Add Wine
            </a>
          </div>
        </nav>

        {/* Sub nav */}
        <div className="bg-wine-900/50 border-b border-wine-800/30 px-4 overflow-x-auto">
          <div className="max-w-3xl mx-auto flex gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2.5 text-sm font-medium text-wine-300 hover:text-white hover:bg-wine-800/50 rounded-t-lg transition-colors whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
