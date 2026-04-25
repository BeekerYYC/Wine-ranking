"use client";

import { usePathname } from "next/navigation";
import { useCategory } from "@/lib/CategoryContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { category, config, setCategory } = useCategory();

  const nav = [
    {
      href: "/",
      label: `All ${config.plural}`,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      href: "/fridge",
      label: config.fridgeLabel.split(" ").slice(-1)[0],
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 3h16v18H4V3zm0 9h16M9 3v9m0 0v9" />
        </svg>
      ),
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h4v8H3zM10 8h4v13h-4zM17 3h4v18h-4z" />
        </svg>
      ),
    },
    {
      href: "/fridge/drink",
      label: "Pairing",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      href: "/achievements",
      label: "Badges",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[220px] bg-surface border-r border-border flex-col z-40">
        {/* Logo */}
        <div className="px-5 h-16 flex items-center gap-2.5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center text-lg">
            {config.icon}
          </div>
          <span className="text-[15px] font-semibold text-text-primary tracking-tight">{config.label} Ranker</span>
        </div>

        {/* Add button */}
        <div className="px-3 pt-3 pb-2">
          <a
            href="/add"
            className="flex items-center justify-center gap-2 w-full bg-gold/90 hover:bg-gold text-bg px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add {config.label}
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
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

        {/* Footer */}
        <div className="px-3 pb-4">
          <a
            href="/api/export"
            download
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-text-muted hover:text-text-tertiary transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </a>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {nav.filter((item) => ["/", "/fridge", "/dashboard", "/fridge/drink"].includes(item.href)).map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
                  active ? "text-gold" : "text-text-muted"
                }`}
              >
                {item.icon}
                <span className="text-[9px] font-medium">{item.label}</span>
              </a>
            );
          })}
          <a
            href="/add"
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-gold"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[9px] font-medium">Add</span>
          </a>
        </div>
      </nav>
    </>
  );
}
