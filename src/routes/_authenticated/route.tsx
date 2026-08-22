import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const checkNeedsPasswordChange = createServerFn({ method: "GET" })
  .validator((userId: string) => z.string().parse(userId))
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/mock-db");
    const db = getDb();
    const emp = db.employees.find((e) => e.user_id === data || e.id === data);
    return !!emp?.needs_password_change;
  });

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Call server function to check password status locally
    const needsChange = await checkNeedsPasswordChange({ data: data.user.id });

    if (needsChange && location.pathname !== "/change-password") {
      throw redirect({ to: "/change-password" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
