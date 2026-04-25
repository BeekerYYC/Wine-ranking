"use client";

import { usePathname } from "next/navigation";
import { useCategory } from "@/lib/CategoryContext";

const HomeIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1m-6 0h6" />
  </svg>
);

const CellarIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path strokeLinecap="round" d="M4 9h16M4 15h16M9 3v18M15 3v18" />
  </svg>
);

const InsightsIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-5" />
  </svg>
);

const PairingIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v6a4 4 0 008 0V2M12 8v14M5 22h14" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <circle cx="12" cy="8" r="4" />
    <path strokeLinecap="round" d="M4 21c0-4 4-7 8-7s8 3 8 7" />
  </svg>
);

const ScanIcon = ({ className = "" }: { className?: string }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M9 8h6a1 1 0 011 1v6a1 1 0 01-1 1H9a1 1 0 01-1-1V9a1 1 0 011-1z" />
  </svg>
);

export default function Sidebar() {
  const pathname = usePathname();
  const { config } = useCategory();

  const nav = [
    { href: "/", label: "Dashboard", icon: <HomeIcon /> },
    { href: "/fridge", label: "Cellar", icon: <CellarIcon /> },
    { href: "/dashboard", label: "Insights", icon: <InsightsIcon /> },
    { href: "/fridge/drink", label: "Pairing", icon: <PairingIcon /> },
  ];

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[220px] bg-surface/60 backdrop-blur-xl border-r border-border-subtle flex-col z-40">
        {/* Logo */}
        <div className="px-5 h-16 flex items-center gap-2.5 border-b border-border-subtle">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-pink flex items-center justify-center text-base shadow-lg shadow-gold/20">
            {config.icon}
          </div>
          <div>
            <div className="font-serif text-[16px] font-semibold text-text-primary leading-none">Wine Ranker</div>
            <div className="text-[10px] text-text-tertiary tracking-widest uppercase mt-0.5">Premium</div>
          </div>
        </div>

        {/* Scan CTA */}
        <div className="px-3 pt-4 pb-2">
          <a
            href="/fridge/scan"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-gold to-gold-light hover:opacity-90 text-bg px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all shadow-lg shadow-gold/20"
          >
            <ScanIcon className="w-4 h-4" />
            Scan & Add
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  active
                    ? "bg-gold-muted text-gold"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-surface-raised"
                }`}
              >
                <span className={active ? "text-gold" : "text-text-muted"}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Add manual + Export */}
        <div className="px-3 pb-4 space-y-1 border-t border-border-subtle pt-3">
          <a
            href="/add"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] text-text-muted hover:text-text-tertiary transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add manually
          </a>
          <a
            href="/api/export"
            download
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] text-text-muted hover:text-text-tertiary transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </a>
        </div>
      </aside>

      {/* Mobile bottom bar with floating scan button */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="relative">
          <div className="bg-surface/95 backdrop-blur-xl border-t border-border-subtle">
            <div className="flex items-center justify-around h-[68px] px-2 pb-2 pt-1">
              <MobileTab href="/" label="Home" icon={<HomeIcon />} active={isActive("/")} />
              <MobileTab href="/fridge" label="Cellar" icon={<CellarIcon />} active={isActive("/fridge") && pathname !== "/fridge/drink" && pathname !== "/fridge/scan"} />
              {/* Spacer for floating button */}
              <div className="w-14" />
              <MobileTab href="/dashboard" label="Insights" icon={<InsightsIcon />} active={isActive("/dashboard")} />
              <MobileTab href="/fridge/drink" label="Pairing" icon={<PairingIcon />} active={isActive("/fridge/drink")} />
            </div>
          </div>
          {/* Floating scan FAB */}
          <a
            href="/fridge/scan"
            className="absolute left-1/2 -translate-x-1/2 -top-7 w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-bg shadow-2xl shadow-gold/40 active:scale-95 transition-transform"
          >
            <ScanIcon />
          </a>
        </div>
      </nav>
    </>
  );
}

function MobileTab({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors ${active ? "text-gold" : "text-text-muted"}`}
    >
      {icon}
      <span className="text-[9.5px] font-medium tracking-wide">{label}</span>
    </a>
  );
}
