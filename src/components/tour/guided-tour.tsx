"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/lib/guided-tour";
import { setTourStatus } from "@/lib/guided-tour";
import type { UserRole } from "@/types/user";

interface GuidedTourProps {
  steps: TourStep[];
  role: UserRole;
  onComplete: () => void;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTour({ steps, role, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Position the highlight and popover around the target element
  const positionElements = useCallback(() => {
    if (!step?.target) {
      // No target: center the popover
      setHighlightRect(null);
      setPopoverStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      // Target not found: center the popover
      setHighlightRect(null);
      setPopoverStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = 6;

    setHighlightRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Position popover to the right of the element, or below on small screens
    const viewportWidth = window.innerWidth;
    const popoverWidth = Math.min(340, viewportWidth - 32);

    if (viewportWidth < 768) {
      // Mobile: position below
      setPopoverStyle({
        position: "fixed",
        top: `${Math.min(rect.bottom + 16, window.innerHeight - 220)}px`,
        left: "50%",
        transform: "translateX(-50%)",
        width: `${popoverWidth}px`,
      });
    } else {
      // Desktop: position to the right of the sidebar element
      const rightSpace = viewportWidth - rect.right;
      if (rightSpace > popoverWidth + 24) {
        setPopoverStyle({
          position: "fixed",
          top: `${Math.max(16, rect.top - 8)}px`,
          left: `${rect.right + 16}px`,
          width: `${popoverWidth}px`,
        });
      } else {
        // Not enough space on right, position below
        setPopoverStyle({
          position: "fixed",
          top: `${Math.min(rect.bottom + 16, window.innerHeight - 220)}px`,
          left: `${Math.max(16, rect.left)}px`,
          width: `${popoverWidth}px`,
        });
      }
    }
  }, [step]);

  // Reposition on step change and resize
  useEffect(() => {
    // Small delay to let DOM settle
    const timer = setTimeout(() => {
      positionElements();
      setIsVisible(true);
    }, 100);

    window.addEventListener("resize", positionElements);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", positionElements);
    };
  }, [currentStep, positionElements]);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  const handleNext = () => {
    if (isLast) {
      setTourStatus(role, "completed");
      onComplete();
    } else {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
      }, 150);
    }
  };

  const handleSkip = () => {
    setTourStatus(role, "skipped");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with cutout */}
      <svg
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left}
                y={highlightRect.top}
                width={highlightRect.width}
                height={highlightRect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border ring */}
      {highlightRect && (
        <div
          className={cn(
            "absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent transition-all duration-300",
            isVisible ? "opacity-100" : "opacity-0"
          )}
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Click blocker (prevents interaction with background) */}
      <div
        className="absolute inset-0"
        onClick={handleSkip}
        style={{ pointerEvents: "auto" }}
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        className={cn(
          "z-[101] rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-2)] transition-all duration-300",
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        style={{ ...popoverStyle, pointerEvents: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-1">
          <div className="flex-1">
            <p className="text-xs font-medium text-primary mb-1">
              Étape {currentStep + 1} sur {steps.length}
            </p>
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {step.title}
            </h3>
          </div>
          <button
            onClick={handleSkip}
            className="ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Fermer la visite"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {step.description}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mx-5 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3">
          <button
            onClick={handleSkip}
            className="flex items-center gap-1.5 rounded-[var(--radius-button)] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SkipForward className="h-3 w-3" />
            Passer
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-[var(--radius-button)] bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:brightness-110"
          >
            {isLast ? "Terminer" : "Suivant"}
            {!isLast && <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
