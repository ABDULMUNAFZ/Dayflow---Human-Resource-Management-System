import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal, StatusPill, attendanceVariant, leaveVariant } from "@/components/ui/bits";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";
import { addDocument, deleteDocument, getEmployeeDetail, updateEmployee, type EmployeeDetail } from "@/lib/employees.functions";
import { getOrgMeta } from "@/lib/org.functions";
import { formatCurrency, formatDuration, formatTime, workDurationMs } from "@/lib/format";
import type { Employee } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/employees/$employeeId")({
  head: () => ({
    meta: [
      { title: "Employee — Dayflow HR" },
      { name: "description", content: "Full employee profile with attendance, leave, payroll, and documents." },
      { property: "og:title", content: "Employee — Dayflow HR" },
      { property: "og:description", content: "Full employee profile with attendance, leave, payroll, and documents." },
    ],
  }),
  component: EmployeeDetailPage,
});

function EditEmployeeDialog({ employee, open, onOpenChange }: { employee: Employee; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: meta } = useQuery({ queryKey: ["org-meta"], queryFn: () => getOrgMeta() });
  const { data: employees } = useQuery({ queryKey: ["employees", "", undefined, "all"], queryFn: () => getEmployees({ data: { status: "all" } }) });

  const [form, setForm] = useState({
    full_name: employee.full_name,
    phone: employee.phone ?? "",
    address: employee.address ?? "",
    job_title: employee.job_title,
    department_id: employee.department_id ?? "",
    manager_id: employee.manager_id ?? "",
    employment_status: employee.employment_status,
  });

  useEffect(() => {
    setForm({
      full_name: employee.full_name,
      phone: employee.phone ?? "",
      address: employee.address ?? "",
      job_title: employee.job_title,
      department_id: employee.department_id ?? "",
      manager_id: employee.manager_id ?? "",
      employment_status: employee.employment_status,
    });
  }, [employee]);

  const save = useMutation({
    mutationFn: () =>
      updateEmployee({
        data: {
          id: employee.id,
          full_name: form.full_name,
          phone: form.phone || null,
          address: form.address || null,
          job_title: form.job_title,
          department_id: form.department_id || null,
          manager_id: form.manager_id || null,
          employment_status: form.employment_status,
        },
      }),
    onSuccess: () => {
      toast.success("Employee record updated.");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["employee", employee.id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Edit employee</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Job title</Label>
            <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {(meta?.departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Manager</Label>
            <Select value={form.manager_id} onValueChange={(v) => setForm({ ...form, manager_id: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {(employees ?? []).filter((e) => e.id !== employee.id).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Employment status</Label>
            <Select value={form.employment_status} onValueChange={(v) => setForm({ ...form, employment_status: v as Employee["employment_status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeDetailPage() {
  const { employeeId } = Route.useParams();
  const { session, isLoading: sessionLoading } = useSession();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState<"offer_letter" | "id_proof" | "certificate" | "contract" | "other">("other");
  const [docUrl, setDocUrl] = useState("");

  const { data, isLoading, error } = useQuery<EmployeeDetail>({
    queryKey: ["employee", employeeId],
    queryFn: () => getEmployeeDetail({ data: { id: employeeId } }),
    retry: false,
  });

  const isStaff = !!session && (session.role === "admin" || session.role === "hr");

  const addDoc = useMutation({
    mutationFn: () => addDocument({ data: { employeeId, title: docTitle, docType, fileUrl: docUrl } }),
    onSuccess: () => {
      toast.success("Document added.");
      setDocOpen(false);
      setDocTitle("");
      setDocUrl("");
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add document"),
  });

  const removeDoc = useMutation({
    mutationFn: (id: string) => deleteDocument({ data: { id } }),
    onSuccess: () => {
      toast.success("Document removed.");
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove document"),
  });

  if (sessionLoading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><PageLoader /></div>;
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <h1 className="font-display text-2xl font-extrabold">Not available</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            This employee record doesn't exist or you don't have access to it.
          </p>
          <Link to="/employees" className="mt-5 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
            Back to directory
          </Link>
        </div>
      </AppShell>
    );
  }

  const { employee } = data;

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
        <Link to="/employees" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All employees
        </Link>

        <Reveal>
          <Card className="relative overflow-hidden">
            <div aria-hidden className="absolute inset-0 bg-hero-glow opacity-40" />
            <CardContent className="relative flex flex-wrap items-center gap-5 p-6">
              <Avatar className="h-20 w-20 border-2 border-accent/30">
                <AvatarImage src={employee.avatar_url ?? undefined} />
                <AvatarFallback className="bg-secondary font-display text-xl font-bold text-muted-foreground">
                  {employee.full_name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl font-extrabold tracking-tight">{employee.full_name}</h1>
                  <StatusPill variant={employee.employment_status === "active" ? "success" : employee.employment_status === "on_leave" ? "accentSoft" : "neutral"}>
                    {employee.employment_status.replace("_", " ")}
                  </StatusPill>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {employee.job_title} · {employee.departments?.name ?? "Unassigned"} · {employee.employee_code}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {employee.email} · Joined {employee.joining_date}
                  {employee.manager ? ` · Reports to ${employee.manager.full_name}` : ""}
                </p>
              </div>
              {isStaff && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.06}>
          <Tabs defaultValue="attendance">
            <TabsList>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
              {data.payroll.length > 0 && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
              <TabsTrigger value="documents">Documents</TabsTrigger>
              {isStaff && <TabsTrigger value="activity">Audit</TabsTrigger>}
            </TabsList>

            <TabsContent value="attendance" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="font-display text-base">Last 30 days</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto p-0 pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>In</TableHead><TableHead>Out</TableHead><TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.attendance.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.work_date}</TableCell>
                          <TableCell><StatusPill variant={attendanceVariant(a.status)}>{a.status.replace("_", " ")}</StatusPill></TableCell>
                          <TableCell className="font-data text-muted-foreground">{formatTime(a.check_in)}</TableCell>
                          <TableCell className="font-data text-muted-foreground">{formatTime(a.check_out)}</TableCell>
                          <TableCell className="text-right font-data font-semibold">{formatDuration(workDurationMs(a.check_in, a.check_out))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leave" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="font-display text-base">Leave history</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto p-0 pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Status</TableHead><TableHead>Reviewed by</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.leaveRequests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.leave_types?.name}</TableCell>
                          <TableCell className="font-data text-muted-foreground">{r.start_date} → {r.end_date}</TableCell>
                          <TableCell><StatusPill variant={leaveVariant(r.status)}>{r.status}</StatusPill></TableCell>
                          <TableCell className="text-muted-foreground">{r.reviewer?.full_name ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                      {data.leaveRequests.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No leave history.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {data.payroll.length > 0 && (
              <TabsContent value="payroll" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="font-display text-base">Recent payslips</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto p-0 pb-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead><TableHead className="text-right">Base</TableHead><TableHead className="text-right">Allowances</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net</TableHead><TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.payroll.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.period}</TableCell>
                            <TableCell className="text-right font-data">{formatCurrency(Number(p.base_salary))}</TableCell>
                            <TableCell className="text-right font-data text-success">{formatCurrency(Number(p.allowances))}</TableCell>
                            <TableCell className="text-right font-data text-destructive">{formatCurrency(Number(p.deductions))}</TableCell>
                            <TableCell className="text-right font-data font-bold text-accent">{formatCurrency(Number(p.net_salary))}</TableCell>
                            <TableCell><StatusPill variant={p.status === "paid" ? "success" : "warning"}>{p.status}</StatusPill></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="font-display text-base">Documents</CardTitle>
                  {isStaff && (
                    <Button size="sm" variant="outline" onClick={() => setDocOpen(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add document
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-accent" />
                        <div>
                          <p className="text-sm font-medium">{d.title}</p>
                          <p className="text-xs capitalize text-muted-foreground">{d.doc_type.replace("_", " ")}</p>
                        </div>
                      </div>
                      {isStaff && (
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removeDoc.mutate(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {data.documents.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No documents on file.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            {isStaff && (
              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="font-display text-base">Audit trail</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {data.audit.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-3 text-sm">
                        <span className="font-medium">{a.action.replaceAll("_", " ")}</span>
                        <span className="font-data text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                    {data.audit.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No audit entries.</p>}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </Reveal>
      </motion.div>

      <EditEmployeeDialog employee={employee} open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Offer Letter 2026" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as typeof docType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offer_letter">Offer letter</SelectItem>
                  <SelectItem value="id_proof">ID proof</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>File URL (optional)</Label>
              <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://…" />
            </div>
            <Button onClick={() => addDoc.mutate()} disabled={docTitle.trim().length < 2 || addDoc.isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {addDoc.isPending ? "Adding…" : "Add document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
