import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal, StatusPill, attendanceVariant } from "@/components/ui/bits";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { getEmployees } from "@/lib/employees.functions";
import { getOrgMeta } from "@/lib/org.functions";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({
    meta: [
      { title: "Employees — Dayflow HR" },
      { name: "description", content: "Search, filter, and manage every person in your organization." },
      { property: "og:title", content: "Employees — Dayflow HR" },
      { property: "og:description", content: "Search, filter, and manage every person in your organization." },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [status, setStatus] = useState<"all" | "active" | "on_leave" | "inactive">("all");

  const { data: meta } = useQuery({ queryKey: ["org-meta"], queryFn: () => getOrgMeta() });
  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, departmentId, status],
    queryFn: () =>
      getEmployees({
        data: { search: search || undefined, departmentId, status },
      }),
    enabled: !!session && (session.role === "admin" || session.role === "hr"),
  });

  const departments = useMemo(() => meta?.departments ?? [], [meta]);

  if (sessionLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><PageLoader /></div>;
  }

  const isStaff = session.role === "admin" || session.role === "hr";
  if (!isStaff) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <h1 className="font-display text-2xl font-extrabold">Team directory</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            The full directory is available to HR and Admin roles. Your own profile lives under My profile.
          </p>
          <Link to="/profile" className="mt-5 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
            Go to my profile
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Employees</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data?.length ?? 0} people in view</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, code…"
                className="w-64 bg-secondary pl-9"
              />
            </div>
            <Select value={departmentId ?? "all"} onValueChange={(v) => setDepartmentId(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-44 bg-secondary">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-36 bg-secondary">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(data ?? []).map((e, i) => (
              <Reveal key={e.id} delay={Math.min(i * 0.04, 0.3)}>
                <Link to="/employees/$employeeId" params={{ employeeId: e.id }} className="block">
                  <div className="group rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-glow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border border-border">
                          <AvatarImage src={e.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-secondary font-bold text-muted-foreground">
                            {e.full_name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-display font-bold">{e.full_name}</p>
                          <p className="text-xs text-muted-foreground">{e.job_title}</p>
                        </div>
                      </div>
                      <StatusPill variant={e.employment_status === "active" ? "success" : e.employment_status === "on_leave" ? "accentSoft" : "neutral"}>
                        {e.employment_status.replace("_", " ")}
                      </StatusPill>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{e.departments?.name ?? "Unassigned"}</span>
                      <span className="font-data">{e.employee_code}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted-foreground">Today</span>
                      <StatusPill variant={attendanceVariant(e.today_status ?? "")}>
                        {e.today_status?.replace("_", " ") ?? "no record"}
                      </StatusPill>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
            {(data ?? []).length === 0 && (
              <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
                No employees match these filters.
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AppShell>
  );
}
