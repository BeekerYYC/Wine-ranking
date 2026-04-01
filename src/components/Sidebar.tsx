"use client";

import { usePathname } from "next/navigation";

const nav = [
  {
    href: "/",
    label: "Collection",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/fridge",
    label: "Fridge",
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
    href: "/sommelier",
    label: "Sommelier",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "Insights",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[220px] bg-surface border-r border-border flex-col z-40">
        {/* Logo */}
        <div className="px-5 h-16 flex items-center gap-2.5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-gold">
              <path d="M8 2h8l-1 9H9L8 2z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 11v6" strokeLinecap="round" />
              <path d="M8 21h8" strokeLinecap="round" />
              <path d="M10 17h4" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold text-text-primary tracking-tight">Wine Ranker</span>
        </div>

        {/* Add button */}
        <div className="px-3 pt-5 pb-2">
          <a
            href="/add"
            className="flex items-center justify-center gap-2 w-full bg-gold/90 hover:bg-gold text-bg px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Wine
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
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  active ? "text-gold" : "text-text-muted"
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </a>
            );
          })}
          <a
            href="/add"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-gold"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] font-medium">Add</span>
          </a>
        </div>
      </nav>
    </>
  );
}
