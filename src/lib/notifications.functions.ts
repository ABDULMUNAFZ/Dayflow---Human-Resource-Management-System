import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppNotification } from "@/lib/types";

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ notifications: AppNotification[]; unread: number }> => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase.from("employees").select("id").eq("user_id", userId).maybeSingle();
    if (!emp) return { notifications: [], unread: 0 };

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("employee_id", emp.id)
      .order("created_at", { ascending: false })
      .limit(60);

    const list = (data ?? []) as AppNotification[];
    return { notifications: list, unread: list.filter((n) => !n.read).length };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase } = context;
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase.from("employees").select("id").eq("user_id", userId).maybeSingle();
    if (!emp) return { ok: true };
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("employee_id", emp.id)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
