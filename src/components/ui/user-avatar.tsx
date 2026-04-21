"use client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const BG_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-rose-500",
];

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function getColorFromName(name?: string | null): string {
  if (!name) return BG_COLORS[0];
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return BG_COLORS[sum % BG_COLORS.length];
}

export function UserAvatar({ src, name, size = "md", className }: UserAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name ?? "Avatar"}
        className={cn(
          sizeClass,
          "rounded-full object-cover border-2 border-border",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        bgColor,
        "flex items-center justify-center rounded-full font-semibold text-white border-2 border-border select-none",
        className
      )}
      aria-label={name ?? "Avatar"}
    >
      {initials}
    </div>
  );
}
