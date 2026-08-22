import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";
import { downloadCsv } from "@/lib/format";
import { getReport, type ReportType } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Dayflow HR" },
      { name: "description", content: "Generate and export attendance, leave, payroll, and employee reports." },
      { property: "og:title", content: "Reports — Dayflow HR" },
      { property: "og:description", content: "Generate and export attendance, leave, payroll, and employee reports." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const isStaff = !!session && (session.role === "admin" || session.role === "hr");

  const defaultFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const defaultTo = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<ReportType>("attendance");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", type, from, to],
    queryFn: () => getReport({ data: { type, from, to } }),
    enabled: isStaff,
  });

  if (sessionLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><PageLoader /></div>;
  }

  if (!isStaff) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <h1 className="font-display text-2xl font-extrabold">Reports</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Reports are available to HR and Admin roles.</p>
          <Link to="/dashboard" className="mt-5 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
            Back to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const download = () => {
    if (!data || data.rows.length === 0) {
      toast.error("Nothing to export for this range.");
      return;
    }
    downloadCsv(`dayflow-${type}-report-${from}-to-${to}.csv`, data.headers, data.rows);
    toast.success("Report downloaded.");
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate and export any slice of your organization's data.</p>
        </div>

        <Reveal>
          <Card>
            <CardContent className="flex flex-wrap items-end gap-4 p-5">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Report</Label>
                <Tabs value={type} onValueChange={(v) => setType(v as ReportType)}>
                  <TabsList>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leave">Leave</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
                    <TabsTrigger value="employees">Employees</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">From</Label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block rounded-lg border border-input bg-secondary px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">To</Label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block rounded-lg border border-input bg-secondary px-3 py-2 text-sm" />
              </div>
              <Button onClick={download} disabled={!data} className="ml-auto bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.06}>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-base capitalize">{type} report</CardTitle>
              {data && <p className="text-xs text-muted-foreground">{data.rows.length} rows · generated {new Date(data.generatedAt).toLocaleString()}</p>}
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 pb-2">
              {isLoading ? (
                <div className="p-6"><div className="h-48 animate-pulse rounded-xl bg-secondary" /></div>
              ) : error ? (
                <p className="p-6 text-sm text-destructive">{error instanceof Error ? error.message : "Failed to generate report."}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(data?.headers ?? []).map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.rows ?? []).slice(0, 100).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className={j === 0 ? "font-medium" : "text-muted-foreground"}>
                            {String(cell ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {(data?.rows ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={data?.headers.length ?? 1} className="py-10 text-center text-muted-foreground">
                          No data in this range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {data && data.rows.length > 100 && (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  Showing first 100 rows in preview — export the CSV for the full dataset.
                </p>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </motion.div>
    </AppShell>
  );
}
