import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Payroll, SalaryHistory } from "@/lib/types";

export const getMyPayroll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ payroll: Payroll[]; history: SalaryHistory[] }> => {
    const { userId } = context;
    const { getDb } = await import("./mock-db");
    const db = getDb();

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) return { payroll: [], history: [] };

    const payroll = db.payroll.filter((p) => p.employee_id === emp.id);
    const history = (db as any).salary_history?.filter((s: any) => s.employee_id === emp.id) || [];

    return { payroll: [...payroll].reverse(), history: [...history].reverse() };
  });

export interface PayrollOverview {
  rows: Payroll[];
  period: string;
  totalNet: number;
  totalBase: number;
  paidCount: number;
  pendingCount: number;
}

export const getPayrollOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(data))
  .handler(async ({ data }): Promise<PayrollOverview> => {
    const { getDb } = await import("./mock-db");
    const db = getDb();

    const now = new Date();
    const period = data.period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const rawRows = db.payroll.filter((p) => p.period === period);
    const list = rawRows.map((r) => {
      const emp = db.employees.find((e) => e.id === r.employee_id);
      return {
        ...r,
        employees: emp ? {
          full_name: emp.full_name,
          employee_code: emp.employee_code,
          job_title: emp.job_title,
        } : null,
      };
    }) as any[];

    return {
      rows: list,
      period,
      totalNet: list.reduce((s, r) => s + Number(r.net_salary || 0), 0),
      totalBase: list.reduce((s, r) => s + Number(r.base_salary || 0), 0),
      paidCount: list.filter((r) => r.status === "paid").length,
      pendingCount: list.filter((r) => r.status === "pending").length,
    };
  });

export const updateSalary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        employeeId: z.string(),
        baseSalary: z.number().min(0).max(100000000),
        allowances: z.number().min(0).max(100000000),
        deductions: z.number().min(0).max(100000000),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<Payroll> => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    const roles = db.user_roles.filter((r) => r.user_id === userId).map((r) => r.role);
    if (!roles.includes("hr") && !roles.includes("admin")) {
      throw new Error("Only HR or Admin can modify salary structures.");
    }

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    let existing = db.payroll.find((p) => p.employee_id === data.employeeId && p.period === period);
    const net = data.baseSalary + data.allowances - data.deductions;

    const crypto = await import("crypto");

    if (existing) {
      existing.base_salary = data.baseSalary;
      existing.allowances = data.allowances;
      existing.deductions = data.deductions;
      existing.net_salary = net;
    } else {
      existing = {
        id: crypto.randomUUID(),
        employee_id: data.employeeId,
        period,
        base_salary: data.baseSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        net_salary: net,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      db.payroll.push(existing);
    }

    if (!(db as any).salary_history) (db as any).salary_history = [];
    (db as any).salary_history.push({
      id: crypto.randomUUID(),
      employee_id: data.employeeId,
      base_salary: data.baseSalary,
      allowances: data.allowances,
      deductions: data.deductions,
      effective_from: now.toISOString().slice(0, 10),
      changed_by: userId,
    });

    db.audit_logs.push({
      id: crypto.randomUUID(),
      action: "salary_updated",
      created_at: new Date().toISOString(),
    });

    saveDb(db);

    const emp = db.employees.find((e) => e.id === data.employeeId);
    return {
      ...existing,
      employees: emp ? {
        full_name: emp.full_name,
        employee_code: emp.employee_code,
        job_title: emp.job_title,
      } : null,
    } as any;
  });

export const setPayrollStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string(), status: z.enum(["pending", "paid"]) }).parse(data),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    const roles = db.user_roles.filter((r) => r.user_id === userId).map((r) => r.role);
    if (!roles.includes("hr") && !roles.includes("admin")) {
      throw new Error("Only HR or Admin can change payroll status.");
    }

    const row = db.payroll.find((p) => p.id === data.id);
    if (!row) throw new Error("Payroll record not found.");

    row.status = data.status;
    if (data.status === "paid") {
      row.pay_date = new Date().toISOString().slice(0, 10);
    }

    saveDb(db);
    return { ok: true };
  });
