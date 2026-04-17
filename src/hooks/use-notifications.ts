"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbNotification } from "@/types/notifications";

export function useNotifications() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);

  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load notifications
  useEffect(() => {
    if (isDemo || !user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!cancelled) {
        if (!error && data) setNotifications(data as DbNotification[]);
        setLoading(false);
      }
    }

    load();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as DbNotification;
          setNotifications((prev) => [newNotif, ...prev]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, isDemo, user?.id]);

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      if (!isDemo) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", id);
      }
    },
    [supabase, isDemo],
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!isDemo && user?.id) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
    }
  }, [supabase, isDemo, user?.id]);

  const markAsResolved = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, resolved_at: now } : n)),
      );
      if (!isDemo) {
        await supabase
          .from("notifications")
          .update({ read: true, resolved_at: now })
          .eq("id", id);
      }
    },
    [supabase, isDemo],
  );

  const unresolvedCount = notifications.filter((n) => !n.resolved_at).length;

  return { notifications, unreadCount, unresolvedCount, loading, markAsRead, markAllAsRead, markAsResolved };
}
