import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, Employee, SessionContext } from "@/lib/types";

export const getSessionContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionContext> => {
    const { supabase, userId, claims } = context;

    const [{ data: employee }, { data: roleRows }] = await Promise.all([
      supabase
        .from("employees")
        .select("*, departments(name), manager:manager_id(full_name)")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const roles = ((roleRows ?? []).map((r) => r.role) ?? []) as AppRole[];
    const isStaff = roles.includes("hr") || roles.includes("admin");

    return {
      userId,
      email: (claims?.email as string | undefined) ?? null,
      employee: (employee as unknown as Employee) ?? null,
      roles,
      isStaff,
      isAdmin: roles.includes("admin"),
    };
  });
