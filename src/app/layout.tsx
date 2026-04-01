import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wine Ranker",
  description: "Track and rank your wine collection",
};

export const viewport: Viewport = {
  themeColor: "#18181b",
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface text-text-primary min-h-screen font-sans">
        <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-5">
            <div className="flex items-center justify-between h-14">
              <a href="/" className="text-lg font-semibold tracking-tight text-text-primary">
                Wine Ranker
              </a>
              <a
                href="/add"
                className="bg-accent/90 hover:bg-accent text-surface px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Add Wine
              </a>
            </div>
            <nav className="flex gap-1 -mb-px overflow-x-auto">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-[13px] font-medium text-text-tertiary hover:text-text-primary border-b-2 border-transparent hover:border-accent/40 transition-all whitespace-nowrap"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
