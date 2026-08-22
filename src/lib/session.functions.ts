import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, Employee, SessionContext } from "@/lib/types";

export const getSessionContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionContext> => {
    const { userId } = context;
    const { getDb } = await import("./mock-db");
    const db = getDb();
    
    const employee = db.employees.find((e) => e.user_id === userId);
    const dept = employee ? db.departments.find((d) => d.id === employee.department_id) : null;
    const manager = employee ? db.employees.find((e) => e.id === employee.manager_id) : null;

    const roles = db.user_roles.filter((r) => r.user_id === userId).map((r) => r.role) as AppRole[];
    const isStaff = roles.includes("hr") || roles.includes("admin");

    return {
      userId,
      email: employee?.email ?? null,
      employee: employee ? {
        ...employee,
        departments: dept ? { name: dept.name } : null,
        manager: manager ? { full_name: manager.full_name } : null,
      } as any : null,
      roles,
      isStaff,
      isAdmin: roles.includes("admin"),
    };
  });
