import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Department, LeaveType } from "@/lib/types";

export const getOrgMeta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ departments: Department[]; leaveTypes: LeaveType[] }> => {
    const { supabase } = context;
    const [{ data: departments }, { data: leaveTypes }] = await Promise.all([
      supabase.from("departments").select("id, name, description").order("name"),
      supabase.from("leave_types").select("id, name, annual_allowance").order("name"),
    ]);
    return {
      departments: (departments ?? []) as Department[],
      leaveTypes: (leaveTypes ?? []) as LeaveType[],
    };
  });
