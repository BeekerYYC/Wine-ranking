"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * The less-frequent pages, reachable from any screen size.
 *
 * These lived only in the desktop sidebar, so on a phone there was no way to
 * add a wine manually, add from a receipt, find duplicates, export or see
 * badges at all.
 */
const ITEMS: { href: string; label: string; download?: boolean }[] = [
  { href: "/add", label: "Add manually" },
  { href: "/add/receipt", label: "Add from receipt" },
  { href: "/fridge/audit", label: "Audit cellar" },
  { href: "/fridge/dedupe", label: "Find duplicates" },
  { href: "/achievements", label: "Badges" },
  { href: "/api/export", label: "Export CSV", download: true },
];

export default function MoreMenu() {
  const [open, setOpen] = useState(false);
  // Which edge of the button the menu lines up with. On a phone the button sits
  // at the left of its row, and a right-aligned menu opened off-screen.
  const [alignLeft, setAlignLeft] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open && ref.current) {
      const MENU_WIDTH = 208; // w-52
      setAlignLeft(ref.current.getBoundingClientRect().right < MENU_WIDTH + 8);
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass = "block px-4 py-2.5 text-[13px] text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="More"
        aria-expanded={open}
        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
          open ? "bg-gold-muted border-gold/30 text-gold" : "bg-surface-raised border-border-subtle text-text-tertiary hover:text-text-secondary"
        }`}
      >
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className={`absolute ${alignLeft ? "left-0" : "right-0"} top-12 z-40 w-52 bg-surface-raised border border-border rounded-xl shadow-2xl overflow-hidden py-1`}>
          {ITEMS.map((item) =>
            item.download ? (
              <a key={item.href} href={item.href} download className={itemClass} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={itemClass} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
