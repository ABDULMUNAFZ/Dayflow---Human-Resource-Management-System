import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppNotification } from "@/lib/types";

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ notifications: AppNotification[]; unread: number }> => {
    const { userId } = context;
    const { getDb } = await import("./mock-db");
    const db = getDb();

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) return { notifications: [], unread: 0 };

    const list = db.documents.filter((n) => n.employee_id === emp.id) as any[]; // mock using documents or simple array
    const unread = list.filter((n) => !n.read).length;

    return { notifications: list, unread };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    const item = db.documents.find((n) => n.id === data.id);
    if (item) {
      item.read = true;
      saveDb(db);
    }
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) return { ok: true };

    db.documents.forEach((n) => {
      if (n.employee_id === emp.id) {
        n.read = true;
      }
    });

    saveDb(db);
    return { ok: true };
  });
