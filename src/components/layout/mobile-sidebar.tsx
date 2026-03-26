"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Fermer sur changement de route
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-3 top-[1.125rem] z-50 flex h-10 w-10 items-center justify-center rounded-[var(--radius-button)] bg-card text-foreground shadow-[var(--shadow-1)] lg:hidden border border-border"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[240px] border-r border-border bg-sidebar lg:hidden">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -right-10 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar collapsed={false} onToggle={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
