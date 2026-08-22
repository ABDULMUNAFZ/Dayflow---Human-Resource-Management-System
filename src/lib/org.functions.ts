import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Department, LeaveType } from "@/lib/types";

export const getOrgMeta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ departments: Department[]; leaveTypes: LeaveType[] }> => {
    const { getDb } = await import("./mock-db");
    const db = getDb();
    return {
      departments: (db.departments ?? []) as Department[],
      leaveTypes: (db.leave_types ?? []) as LeaveType[],
    };
  });
