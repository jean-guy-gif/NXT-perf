"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-card text-foreground shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[72px] border-r border-border bg-background lg:hidden">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -right-10 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar />
          </div>
        </>
      )}
    </>
  );
}
