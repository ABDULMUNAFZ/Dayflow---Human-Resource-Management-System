import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell, CalendarOff, Check, Info, Wallet } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Dayflow HR" },
      { name: "description", content: "Every Dayflow update — leave decisions, payroll, and team activity in one feed." },
      { property: "og:title", content: "Notifications — Dayflow HR" },
      { property: "og:description", content: "Every Dayflow update — leave decisions, payroll, and team activity in one feed." },
    ],
  }),
  component: NotificationsPage,
});

const typeIcon = { leave: CalendarOff, payroll: Wallet, info: Info } as const;

function NotificationsPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getMyNotifications(),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (sessionLoading || !session || isLoading || !data) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><PageLoader /></div>;
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data.unread} unread</p>
          </div>
          {data.unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <Check className="mr-1.5 h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {data.notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">All caught up. Nothing needs your attention.</p>
            </div>
          )}
          {data.notifications.map((n, i) => {
            const Icon = typeIcon[n.type] ?? Info;
            return (
              <Reveal key={n.id} delay={Math.min(i * 0.03, 0.3)}>
                <button
                  onClick={() => !n.read && markRead.mutate(n.id)}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
                    n.read
                      ? "border-border bg-card hover:bg-secondary/40"
                      : "border-accent/25 bg-accent/5 hover:bg-accent/10",
                  )}
                >
                  <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", n.read ? "bg-secondary text-muted-foreground" : "bg-accent/15 text-accent")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{n.message}</span>
                    <span className="mt-1 block font-data text-[11px] text-muted-foreground/70">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </span>
                </button>
              </Reveal>
            );
          })}
        </div>
      </motion.div>
    </AppShell>
  );
}
