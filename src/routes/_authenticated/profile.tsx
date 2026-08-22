import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal, RoleBadge, StatusPill } from "@/components/ui/bits";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { updateMyProfile } from "@/lib/employees.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Dayflow HR" },
      { name: "description", content: "Your Dayflow employee profile and personal details." },
      { property: "og:title", content: "My Profile — Dayflow HR" },
      { property: "og:description", content: "Your Dayflow employee profile and personal details." },
    ],
  }),
  component: ProfilePage,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name is too short").max(120),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(240).optional(),
});

function ProfilePage() {
  const { session, isLoading, refresh } = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });

  useEffect(() => {
    if (session?.profile) {
      setForm({
        full_name: session.profile.full_name,
        phone: session.profile.phone ?? "",
        address: session.profile.address ?? "",
      });
    }
  }, [session]);

  const save = useMutation({
    mutationFn: () =>
      updateMyProfile({
        data: {
          full_name: form.full_name,
          phone: form.phone || null,
          address: form.address || null,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated.");
      refresh();
      queryClient.invalidateQueries({ queryKey: ["employee"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  if (isLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><PageLoader /></div>;
  }

  const profile = session.profile;
  const parsed = profileSchema.safeParse({ ...form, phone: form.phone || undefined, address: form.address || undefined });

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your identity in Dayflow — keep it current.</p>
        </div>

        <Reveal>
          <Card className="relative overflow-hidden">
            <div aria-hidden className="absolute inset-0 bg-hero-glow opacity-40" />
            <CardContent className="relative flex flex-wrap items-center gap-5 p-6">
              <Avatar className="h-20 w-20 border-2 border-accent/30">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-secondary font-display text-xl font-bold text-muted-foreground">
                  {(profile?.full_name ?? "D F").split(" ").map((x) => x[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-2xl font-extrabold tracking-tight">{profile?.full_name ?? session.user.email}</h2>
                  <RoleBadge role={session.role} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile ? `${profile.job_title} · ${profile.departments?.name ?? "Unassigned"} · ${profile.employee_code}` : session.user.email}
                </p>
                {profile && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusPill variant="neutral">Joined {profile.joining_date}</StatusPill>
                    <StatusPill variant={profile.employment_status === "active" ? "success" : "accentSoft"}>
                      {profile.employment_status.replace("_", " ")}
                    </StatusPill>
                    {profile.manager && <StatusPill variant="neutral">Reports to {profile.manager.full_name}</StatusPill>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Personal details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">Full name</Label>
                  <Input id="p-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-phone">Phone</Label>
                  <Input id="p-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-address">Address</Label>
                <Input id="p-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City, country" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={session.user.email} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email is managed by your account credentials and can't be changed here.</p>
              </div>
              <Button
                onClick={() => save.mutate()}
                disabled={!parsed.success || save.isPending}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
              {!parsed.success && <p className="text-xs text-destructive">{parsed.error.issues[0]?.message}</p>}
            </CardContent>
          </Card>
        </Reveal>
      </motion.div>
    </AppShell>
  );
}
