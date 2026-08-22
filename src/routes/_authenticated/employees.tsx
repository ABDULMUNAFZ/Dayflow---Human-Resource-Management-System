import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Plus, Copy, Check, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal, StatusPill, attendanceVariant } from "@/components/ui/bits";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { getEmployees, getCompanies, createEmployee } from "@/lib/employees.functions";
import { getOrgMeta } from "@/lib/org.functions";
import { todayISO } from "@/lib/format";

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [status, setStatus] = useState<"all" | "active" | "on_leave" | "inactive">("all");

  // Create employee dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    loginId: string;
    tempPassword: string;
    email: string;
    fullName: string;
  } | null>(null);

  // Form states
  const [companyId, setCompanyId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [joiningDate, setJoiningDate] = useState(todayISO());
  const [deptId, setDeptId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [roleInput, setRoleInput] = useState<"admin" | "hr" | "employee">("employee");
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isStaff = !!session && (session.role === "admin" || session.role === "hr");

  const { data: meta } = useQuery({ queryKey: ["org-meta"], queryFn: () => getOrgMeta() });
  const { data: companies } = useQuery({ 
    queryKey: ["companies"], 
    queryFn: () => getCompanies(),
    enabled: isStaff 
  });
  
  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, departmentId, status],
    queryFn: () =>
      getEmployees({
        data: { search: search || undefined, departmentId, status },
      }),
    enabled: !!session,
  });

  const departments = useMemo(() => meta?.departments ?? [], [meta]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error("Please select a company.");
      return;
    }
    if (!deptId) {
      toast.error("Please select a department.");
      return;
    }

    setIsSubmitting(true);
    try {
      const credentials = await createEmployee({
        data: {
          companyId,
          firstName,
          lastName,
          email: emailInput,
          phone: phoneInput || null,
          joiningDate,
          departmentId: deptId || null,
          jobTitle,
          role: roleInput,
          avatarUrl: avatarUrlInput || null,
        },
      });
      setCreatedCredentials(credentials);
      toast.success("Employee created successfully!");
      // Reset form
      setFirstName("");
      setLastName("");
      setEmailInput("");
      setPhoneInput("");
      setJobTitle("");
      setAvatarUrlInput("");
      // Refetch
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(
      `Dayflow HRMS Credentials:\nLogin ID: ${createdCredentials.loginId}\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.tempPassword}`
    );
    setCopied(true);
    toast.success("Credentials copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  if (sessionLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><PageLoader /></div>;
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
            {isStaff && (
              <Button onClick={() => setCreateOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            )}
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
                          <p className="font-display font-bold group-hover:text-accent transition-colors">{e.full_name}</p>
                          <p className="text-xs text-muted-foreground">{e.job_title}</p>
                        </div>
                      </div>
                      <StatusPill variant={e.work_status === "present" ? "success" : e.work_status === "on_leave" ? "accentSoft" : "warning"}>
                        {e.work_status === "present" ? "Working" : e.work_status === "on_leave" ? "On Leave" : "Absent"}
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

      {/* Add Employee Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) setCreatedCredentials(null); // Clear credentials when closing
      }}>
        <DialogContent className="max-w-lg bg-card border border-border text-foreground">
          {createdCredentials ? (
            // Success Overlay showing generated credentials
            <div className="space-y-6 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success">
                <Check className="h-6 w-6" />
              </div>
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-bold text-center">Employee Created Successfully</DialogTitle>
                <DialogDescription className="text-center">
                  Copy these login credentials for the employee. They will be forced to change this temporary password on their first login.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-secondary/50 p-5 text-left space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Employee Name</span>
                  <p className="font-semibold">{createdCredentials.fullName}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Login ID (Auto-Generated)</span>
                  <p className="font-data font-semibold text-accent">{createdCredentials.loginId}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Email</span>
                  <p className="font-semibold">{createdCredentials.email}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Temporary Password</span>
                  <p className="font-data font-semibold text-yellow-500 bg-secondary px-2 py-1 rounded w-fit border border-border">{createdCredentials.tempPassword}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleCopy} className="flex-1 bg-secondary text-foreground hover:bg-secondary/80 gap-2">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  Copy Credentials
                </Button>
                <DialogClose asChild>
                  <Button onClick={() => setCreateOpen(false)} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                    Done
                  </Button>
                </DialogClose>
              </div>
            </div>
          ) : (
            // Form View
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-bold">Add New Employee</DialogTitle>
                <DialogDescription>
                  Credentials will be generated automatically. Employee accounts are created by HR or Administrators.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEmployee} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="company">Company</Label>
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select Company" /></SelectTrigger>
                      <SelectContent>
                        {(companies ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.prefix})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="bg-secondary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="bg-secondary" />
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="email">Work Email</Label>
                    <Input id="email" type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} required className="bg-secondary" />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} className="bg-secondary" placeholder="+91 …" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="joiningDate">Joining Date</Label>
                    <Input id="joiningDate" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required className="bg-secondary text-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="department">Department</Label>
                    <Select value={deptId} onValueChange={setDeptId}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select Department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required className="bg-secondary" placeholder="e.g. Frontend Engineer" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role">System Role</Label>
                    <Select value={roleInput} onValueChange={(v) => setRoleInput(v as typeof roleInput)}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select Role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="hr">HR Specialist</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="avatarUrl">Profile Picture / Avatar URL (optional)</Label>
                    <Input id="avatarUrl" value={avatarUrlInput} onChange={(e) => setAvatarUrlInput(e.target.value)} className="bg-secondary" placeholder="https://…" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="flex-1 bg-transparent">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
                    {isSubmitting ? "Creating…" : "Create Account"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
