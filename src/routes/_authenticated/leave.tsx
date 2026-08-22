import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal, StatusPill, leaveVariant } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { applyLeave, getLeaveRequests, getMyLeave, reviewLeave } from "@/lib/leave.functions";
import { getOrgMeta } from "@/lib/org.functions";
import type { LeaveRequest } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/leave")({
  head: () => ({
    meta: [
      { title: "Leave & Time Off — Dayflow HR" },
      { name: "description", content: "Apply for leave and manage team time-off requests with one-click approvals." },
      { property: "og:title", content: "Leave & Time Off — Dayflow HR" },
      { property: "og:description", content: "Apply for leave and manage team time-off requests with one-click approvals." },
    ],
  }),
  component: LeavePage,
});

function ApplyLeaveDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [remarks, setRemarks] = useState("");
  const { data: meta } = useQuery({ queryKey: ["org-meta"], queryFn: () => getOrgMeta() });

  const submit = useMutation({
    mutationFn: () =>
      applyLeave({ data: { leaveTypeId: typeId, startDate: start, endDate: end, remarks: remarks || undefined } }),
    onSuccess: () => {
      toast.success("Leave request submitted for review.");
      setOpen(false);
      setTypeId("");
      setStart("");
      setEnd("");
      setRemarks("");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  const valid =
    z.string().uuid().safeParse(typeId).success &&
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(start).success &&
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(end).success &&
    end >= start;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground shadow-glow-sm hover:bg-accent/90">Apply for leave</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Request time off</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Leave type</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {(meta?.leaveTypes ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · up to {t.annual_allowance} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lv-start">From</Label>
              <input id="lv-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lv-end">To</Label>
              <input id="lv-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lv-remarks">Reason (optional)</Label>
            <Textarea id="lv-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="A short note for your reviewer…" rows={3} maxLength={500} />
          </div>
          <Button onClick={() => submit.mutate()} disabled={!valid || submit.isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {submit.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequestsTable({
  rows,
  showEmployee,
  staffActions,
  onReviewed,
}: {
  rows: LeaveRequest[];
  showEmployee: boolean;
  staffActions: boolean;
  onReviewed?: () => void;
}) {
  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      reviewLeave({ data: { id, decision } }),
    onSuccess: (_, v) => {
      toast.success(
        v.decision === "approved" ? "Request approved — attendance updated automatically." : "Request rejected.",
      );
      onReviewed?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Review failed"),
  });

  const colSpan = 5 + (showEmployee ? 1 : 0) + (staffActions ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {showEmployee && <TableHead>Employee</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reviewer</TableHead>
            {staffActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              {showEmployee && (
                <TableCell>
                  <p className="font-medium">{r.employees?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{r.employees?.employee_code}</p>
                </TableCell>
              )}
              <TableCell className="font-medium">{r.leave_types?.name}</TableCell>
              <TableCell className="font-data text-muted-foreground">{r.start_date} → {r.end_date}</TableCell>
              <TableCell className="max-w-[220px] truncate text-muted-foreground">{r.remarks || "—"}</TableCell>
              <TableCell>
                <StatusPill variant={leaveVariant(r.status)}>{r.status}</StatusPill>
              </TableCell>
              <TableCell className="text-muted-foreground">{r.reviewer?.full_name ?? "—"}</TableCell>
              {staffActions && (
                <TableCell className="text-right">
                  {r.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="border-success/40 text-success hover:bg-success/10" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, decision: "approved" })}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, decision: "rejected" })}>
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Reviewed</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
                No requests in this view.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function EmployeeLeave() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-leave"], queryFn: () => getMyLeave() });

  if (isLoading || !data) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {data.balances.map((b, i) => {
          const remaining = Math.max(0, b.allowance - b.used);
          return (
            <Reveal key={b.name} delay={i * 0.06}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{b.name}</p>
                    <StatusPill variant="accentSoft">{b.allowance} days / year</StatusPill>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <p className="font-display text-3xl font-extrabold">
                      {remaining}
                      <span className="text-base font-medium text-muted-foreground"> left</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.used} used{b.pending > 0 ? ` · ${b.pending} pending` : ""}
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.allowance ? Math.min(100, (b.used / b.allowance) * 100) : 0}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                      className="h-full rounded-full bg-accent"
                    />
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.1}>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base">My requests</CardTitle>
            <ApplyLeaveDialog onDone={() => queryClient.invalidateQueries({ queryKey: ["my-leave"] })} />
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <RequestsTable rows={data.requests} showEmployee={false} staffActions={false} />
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

function StaffLeave() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const { data, isLoading } = useQuery({
    queryKey: ["leave-requests", filter],
    queryFn: () => getLeaveRequests({ data: { status: filter } }),
  });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="font-display text-base">Team requests</CardTitle>
        <div className="flex items-center gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <ApplyLeaveDialog onDone={() => queryClient.invalidateQueries({ queryKey: ["leave-requests"] })} />
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {isLoading ? (
          <div className="p-6">
            <div className="h-48 animate-pulse rounded-xl bg-secondary" />
          </div>
        ) : (
          <RequestsTable
            rows={data ?? []}
            showEmployee
            staffActions
            onReviewed={() => queryClient.invalidateQueries({ queryKey: ["leave-requests"] })}
          />
        )}
      </CardContent>
    </Card>
  );
}

function LeavePage() {
  const { session, isLoading } = useSession();
  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageLoader />
      </div>
    );
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Leave & time off</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.isStaff
              ? "Review and approve team requests. Approved leave marks attendance automatically."
              : "Track balances and request time off in seconds."}
          </p>
        </div>
        {session.isStaff ? <StaffLeave /> : <EmployeeLeave />}
      </motion.div>
    </AppShell>
  );
}
