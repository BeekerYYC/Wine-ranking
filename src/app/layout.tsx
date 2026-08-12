import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { CategoryProvider } from "@/lib/CategoryContext";

export const metadata: Metadata = {
  title: "Wine Ranker",
  description: "Track and rank your wine collection",
  applicationName: "Wine Ranker",
  // Installed to the iPhone home screen, these drive the standalone launch:
  // no Safari chrome, this title under the icon, an opaque dark status bar.
  appleWebApp: {
    capable: true,
    title: "Wine Ranker",
    statusBarStyle: "black",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // Stops iOS turning vintages and prices into phone-number links.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0608",
  width: "device-width",
  initialScale: 1,
  // Draw into the home-indicator area; anything pinned to an edge insets itself
  // with env(safe-area-inset-bottom) — see the mobile tab bar in Sidebar.tsx.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Next emits only the standard `mobile-web-app-capable` for
            appleWebApp.capable. Recent iOS honours that (and the manifest's
            display mode), but the Apple-prefixed tag is what older iOS looks for
            to launch without Safari chrome, so it is declared explicitly. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
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
          <main className="md:ml-[220px] min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {children}
            </div>
          </main>
        </CategoryProvider>
      </body>
    </html>
  );
}
