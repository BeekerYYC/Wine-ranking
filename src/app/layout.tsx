import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { CategoryProvider } from "@/lib/CategoryContext";

export const metadata: Metadata = {
  title: "Wine Ranker",
  description: "Track and rank your wine collection",
};

export const viewport: Viewport = {
  themeColor: "#0a0608",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text-primary min-h-screen font-sans">
        <CategoryProvider>
          <Sidebar />
          <main className="md:ml-[220px] min-h-screen pb-24 md:pb-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {children}
            </div>
          </main>
        </CategoryProvider>
      </body>
    </html>
  );
}
