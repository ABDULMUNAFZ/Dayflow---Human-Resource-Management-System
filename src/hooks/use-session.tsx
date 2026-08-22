import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getSessionContext } from "@/lib/session.functions";
import type { AppRole, Employee } from "@/lib/types";

export interface Session {
  user: User;
  role: AppRole;
  roles: AppRole[];
  isStaff: boolean;
  isAdmin: boolean;
  profile: Employee | null;
}

function primaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("hr")) return "hr";
  return "employee";
}

export function useSession() {
  const queryClient = useQueryClient();
  const fetchSession = useServerFn(getSessionContext);

  const query = useQuery<Session>({
    queryKey: ["session"],
    queryFn: async () => {
      const [{ data }, ctx] = await Promise.all([supabase.auth.getUser(), fetchSession()]);
      if (!data.user) throw new Error("No authenticated user");
      return {
        user: data.user,
        role: primaryRole(ctx.roles),
        roles: ctx.roles,
        isStaff: ctx.isStaff,
        isAdmin: ctx.isAdmin,
        profile: ctx.employee,
      };
    },
    staleTime: 60_000,
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["session"] });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return { session: query.data, isLoading: query.isLoading, error: query.error, refresh, signOut };
}
