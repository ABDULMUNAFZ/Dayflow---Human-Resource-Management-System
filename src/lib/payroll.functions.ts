import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Payroll, SalaryHistory } from "@/lib/types";

function generateUUID(): string {
  return "pr-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getWorkingDaysInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const numDays = new Date(year, month, 0).getDate();
  for (let d = 1; d <= numDays; d++) {
    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }
  return dates;
}

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
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    const now = new Date();
    const period = data.period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const parts = period.split("-");
    const year = parseInt(parts[0]!);
    const month = parseInt(parts[1]!);
    const workingDaysList = getWorkingDaysInMonth(year, month);
    const totalWorkingDaysCount = workingDaysList.length;

    // Check if payroll needs to be generated / updated dynamically from attendance
    db.employees.forEach((emp) => {
      // Find salary config or default
      let sc = db.salary_configs?.find((s: any) => s.employee_id === emp.id);
      if (!sc) {
        sc = {
          wage_type: "monthly",
          wage_amount: 50000,
          working_days_per_week: 5,
          working_hours_per_day: 8,
          pf_rate: 12,
          employer_pf_rate: 12,
          professional_tax: 200,
          components: [
            { id: `c-${emp.id}-basic`, name: "Basic Salary", type: "percentage", value: 50, calculation_base_id: "wage" },
          ],
        };
      }

      // Calculate stats based on actual attendance
      let presentDays = 0;
      let halfDays = 0;
      let paidLeaves = 0;
      let unpaidLeaves = 0;
      let absentDays = 0;

      workingDaysList.forEach((dateStr) => {
        // Check leave
        const leave = db.leave_requests.find(
          (l) => l.employee_id === emp.id && l.status === "approved" && dateStr >= l.start_date && dateStr <= l.end_date
        );
        if (leave) {
          const type = db.leave_types.find((t) => t.id === leave.leave_type_id);
          const isPaid = type ? type.name.toLowerCase().includes("pto") || type.name.toLowerCase().includes("annual") || type.name.toLowerCase().includes("sick") : true;
          if (isPaid) {
            paidLeaves++;
          } else {
            unpaidLeaves++;
          }
          return;
        }

        // Check attendance
        const att = db.attendance.find((a) => a.employee_id === emp.id && a.work_date === dateStr);
        if (att) {
          if (att.status === "present") {
            presentDays++;
          } else if (att.status === "half_day") {
            halfDays++;
          } else if (att.status === "leave") {
            paidLeaves++; // default to paid
          } else {
            absentDays++;
          }
        } else {
          // If in the future, don't mark as absent
          const todayISO = new Date().toISOString().slice(0, 10);
          if (dateStr <= todayISO) {
            absentDays++;
          } else {
            presentDays++; // mock future days as present for preview
          }
        }
      });

      const payableDays = Math.max(0, presentDays + paidLeaves + (0.5 * halfDays));
      const baseSalary = Math.round(sc.wage_amount * (payableDays / totalWorkingDaysCount));

      // Calculate component allowances and deductions
      const basicAmount = Math.round(baseSalary * 0.5); // Assume basic is 50%
      const allowances = sc.components
        .filter((c: any) => c.type === "fixed" || (c.type === "percentage" && c.name.toLowerCase().includes("allowance")))
        .reduce((sum: number, c: any) => {
          if (c.type === "fixed") return sum + c.value;
          const base = c.calculation_base_id === "basic" ? basicAmount : baseSalary;
          return sum + Math.round((c.value / 100) * base);
        }, 0);

      const pfDeduction = Math.round(basicAmount * (sc.pf_rate / 100));
      const professionalTax = sc.professional_tax || 200;
      const deductions = pfDeduction + professionalTax;
      const netSalary = baseSalary + allowances - deductions;

      // Update payroll record
      let pr = db.payroll.find((p) => p.employee_id === emp.id && p.period === period);
      if (!pr) {
        pr = {
          id: generateUUID(),
          employee_id: emp.id,
          period,
          base_salary: baseSalary,
          allowances,
          deductions,
          net_salary: netSalary,
          status: "pending",
          pay_date: null,
        };
        db.payroll.push(pr);
      } else {
        pr.base_salary = baseSalary;
        pr.allowances = allowances;
        pr.deductions = deductions;
        pr.net_salary = netSalary;
      }

      // Store metrics
      (pr as any).working_days = totalWorkingDaysCount;
      (pr as any).present_days = presentDays;
      (pr as any).paid_leaves = paidLeaves;
      (pr as any).unpaid_leaves = unpaidLeaves;
      (pr as any).absent_days = absentDays;
      (pr as any).half_days = halfDays;
      (pr as any).payable_days = payableDays;
      (pr as any).salary_basis = sc.wage_amount;
      (pr as any).adjustments = 0;
    });

    saveDb(db);

    const list = db.payroll.filter((p) => p.period === period).map((r) => {
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

    if (existing) {
      existing.base_salary = data.baseSalary;
      existing.allowances = data.allowances;
      existing.deductions = data.deductions;
      existing.net_salary = net;
    } else {
      existing = {
        id: generateUUID(),
        employee_id: data.employeeId,
        period,
        base_salary: data.baseSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        net_salary: net,
        status: "pending",
        pay_date: null,
      };
      db.payroll.push(existing);
    }

    if (!(db as any).salary_history) (db as any).salary_history = [];
    (db as any).salary_history.push({
      id: generateUUID(),
      employee_id: data.employeeId,
      base_salary: data.baseSalary,
      allowances: data.allowances,
      deductions: data.deductions,
      effective_from: now.toISOString().slice(0, 10),
      changed_by: userId,
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
