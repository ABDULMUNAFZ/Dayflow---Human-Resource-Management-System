import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { AnimatedNumber, PageLoader, Reveal, StatusPill } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import { formatCurrency, monthLabel } from "@/lib/format";
import { getMyPayroll, getPayrollOverview, setPayrollStatus, updateSalary } from "@/lib/payroll.functions";
import type { Payroll } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll — Dayflow HR" },
      { name: "description", content: "Transparent payroll — payslips, salary structures, and compensation history." },
      { property: "og:title", content: "Payroll — Dayflow HR" },
      { property: "og:description", content: "Transparent payroll — payslips, salary structures, and compensation history." },
    ],
  }),
  component: PayrollPage,
});

function EmployeePayroll() {
  const { data, isLoading } = useQuery({ queryKey: ["my-payroll"], queryFn: () => getMyPayroll() });
  if (isLoading || !data) return <PageLoader />;

  const latest = data.payroll[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Reveal>
          <Card className="border-accent/25">
            <CardContent className="p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Net salary{latest ? ` (${monthLabel(latest.period)})` : ""}
              </p>
              <p className="mt-3 font-display text-2xl font-extrabold text-accent">
                <AnimatedNumber value={latest ? Number(latest.net_salary) : 0} format={(n) => formatCurrency(n)} />
              </p>
              <div className="mt-2">
                <StatusPill variant={latest?.status === "paid" ? "success" : "warning"}>{latest?.status ?? "pending"}</StatusPill>
              </div>
            </CardContent>
          </Card>
        </Reveal>
        {[
          { label: "Base", value: latest ? Number(latest.base_salary) : 0 },
          { label: "Allowances", value: latest ? Number(latest.allowances) : 0 },
          { label: "Deductions", value: latest ? Number(latest.deductions) : 0 },
        ].map((s, i) => (
          <Reveal key={s.label} delay={0.05 * (i + 1)}>
            <Card>
              <CardContent className="p-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-3 font-display text-2xl font-extrabold">
                  <AnimatedNumber value={s.value} format={(n) => formatCurrency(n)} />
                </p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Payslip history</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Allowances</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
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
                {data.payroll.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No payroll records yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Reveal>

      {data.history.length > 0 && (
        <Reveal delay={0.14}>
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Compensation history</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-3 text-sm">
                  <span className="font-data text-muted-foreground">Effective {h.effective_from}</span>
                  <span className="font-data font-semibold text-accent">{formatCurrency(Number(h.base_salary + h.allowances - h.deductions))} / month</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  );
}

function EditSalaryDialog({ row, open, onOpenChange }: { row: Payroll | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [base, setBase] = useState("");
  const [allow, setAllow] = useState("");
  const [deduct, setDeduct] = useState("");

  useEffect(() => {
    if (row) {
      setBase(String(Number(row.base_salary)));
      setAllow(String(Number(row.allowances)));
      setDeduct(String(Number(row.deductions)));
    }
  }, [row]);

  const save = useMutation({
    mutationFn: () =>
      updateSalary({
        data: { employeeId: row!.employee_id, baseSalary: Number(base), allowances: Number(allow), deductions: Number(deduct) },
      }),
    onSuccess: () => {
      toast.success("Salary structure updated for the current period.");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["payroll-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const valid = row && base !== "" && Number(base) >= 0 && allow !== "" && Number(allow) >= 0 && deduct !== "" && Number(deduct) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Adjust salary — {row?.employees?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Base salary (monthly, ₹)</Label>
            <Input type="number" min={0} value={base} onChange={(e) => setBase(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Allowances (₹)</Label>
            <Input type="number" min={0} value={allow} onChange={(e) => setAllow(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Deductions (₹)</Label>
            <Input type="number" min={0} value={deduct} onChange={(e) => setDeduct(e.target.value)} />
          </div>
          <div className="rounded-xl bg-secondary/60 p-3 text-sm">
            Projected net: <span className="font-data font-bold text-accent">{formatCurrency((Number(base) || 0) + (Number(allow) || 0) - (Number(deduct) || 0))}</span>
          </div>
          <Button onClick={() => save.mutate()} disabled={!valid || save.isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {save.isPending ? "Saving…" : "Save structure"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StaffPayroll() {
  const [period, setPeriod] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<Payroll | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["payroll-overview", period],
    queryFn: () => getPayrollOverview({ data: { period } }),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => setPayrollStatus({ data: { id, status: "paid" } }),
    onSuccess: () => {
      toast.success("Marked as paid — employee notified.");
      queryClient.invalidateQueries({ queryKey: ["payroll-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  if (isLoading || !data) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total net payout", value: data.totalNet, money: true },
          { label: "Total base", value: data.totalBase, money: true },
          { label: "Paid", value: data.paidCount },
          { label: "Pending", value: data.pendingCount },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 0.05}>
            <Card>
              <CardContent className="p-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-3 font-display text-2xl font-extrabold">
                  <AnimatedNumber value={s.value} format={s.money ? (n: number) => formatCurrency(n) : undefined} />
                </p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.08}>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base">Payroll run — {data.period.slice(0, 7)}</CardTitle>
            <input
              type="month"
              value={data.period.slice(0, 7)}
              onChange={(e) => setPeriod(`${e.target.value}-01`)}
              className="rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm"
            />
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Allowances</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.employees?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.employees?.employee_code} · {p.employees?.job_title}</p>
                    </TableCell>
                    <TableCell className="text-right font-data">{formatCurrency(Number(p.base_salary))}</TableCell>
                    <TableCell className="text-right font-data text-success">{formatCurrency(Number(p.allowances))}</TableCell>
                    <TableCell className="text-right font-data text-destructive">{formatCurrency(Number(p.deductions))}</TableCell>
                    <TableCell className="text-right font-data font-bold text-accent">{formatCurrency(Number(p.net_salary))}</TableCell>
                    <TableCell><StatusPill variant={p.status === "paid" ? "success" : "warning"}>{p.status}</StatusPill></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {p.status !== "paid" && (
                          <Button size="sm" variant="outline" className="border-success/40 text-success hover:bg-success/10" onClick={() => markPaid.mutate(p.id)}>
                            Mark paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data.rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No payroll rows for this period.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Reveal>

      <EditSalaryDialog row={editing} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} />
    </div>
  );
}

function PayrollPage() {
  const { session, isLoading } = useSession();
  if (isLoading || !session) return <div className="flex min-h-screen items-center justify-center bg-background"><PageLoader /></div>;
  const isStaff = session.role === "admin" || session.role === "hr";

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Payroll</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isStaff ? "Run, review, and adjust monthly payroll across the organization." : "Your payslips and compensation, always transparent."}
          </p>
        </div>
        {isStaff ? <StaffPayroll /> : <EmployeePayroll />}
      </motion.div>
    </AppShell>
  );
}
