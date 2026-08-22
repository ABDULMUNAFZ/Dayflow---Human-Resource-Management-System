import * as fs from 'fs';
import * as path from 'path';

const IS_VERCEL = !!process.env['VERCEL'];
const BUNDLED_DB_FILE = path.join(process.cwd(), 'mock_db.json');
const WRITEABLE_DB_FILE = IS_VERCEL ? path.join('/tmp', 'mock_db.json') : BUNDLED_DB_FILE;

export interface MockDb {
  companies: any[];
  departments: any[];
  leave_types: any[];
  employees: any[];
  user_roles: any[];
  attendance: any[];
  leave_requests: any[];
  payroll: any[];
  documents: any[];
  audit_logs: any[];
  salary_configs: any[];
}

function generateMockAttendance(employeeId: string, daysCount: number) {
  const list: any[] = [];
  const now = new Date();
  let count = 0;
  let offsetDays = 1;

  while (count < daysCount) {
    const d = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = d.toISOString().slice(0, 10);
      const checkInTime = `${dateStr}T09:00:00.000Z`;
      const checkOutTime = `${dateStr}T18:00:00.000Z`;

      list.push({
        id: `att-${employeeId}-${dateStr}`,
        employee_id: employeeId,
        work_date: dateStr,
        check_in: checkInTime,
        check_out: checkOutTime,
        status: "present",
        created_at: checkInTime,
      });
      count++;
    }
    offsetDays++;
  }
  return list;
}

function generateMockLeaveRequests(employeeId: string) {
  const now = new Date();
  const date1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const date2 = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const futureStart = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const futureEnd = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return [
    {
      id: `leave-${employeeId}-1`,
      employee_id: employeeId,
      leave_type_id: 'lt1',
      start_date: date1,
      end_date: date2,
      remarks: "Family gathering",
      status: "approved",
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      reviewer_id: 'e1',
      review_comment: "Approved, cover available.",
      reviewed_at: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `leave-${employeeId}-2`,
      employee_id: employeeId,
      leave_type_id: 'lt2',
      start_date: futureStart,
      end_date: futureEnd,
      remarks: "Dental checkup",
      status: "pending",
      created_at: new Date().toISOString(),
      reviewer_id: null,
      review_comment: null,
      reviewed_at: null,
    }
  ];
}

function generateMockPayroll(employeeId: string, base: number, allowances: number, deductions: number) {
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;

  const net = base + allowances - deductions;

  return [
    {
      id: `pay-${employeeId}-prev`,
      employee_id: employeeId,
      period: previousPeriod,
      base_salary: base,
      allowances: allowances,
      deductions: deductions,
      net_salary: net,
      status: "paid",
      pay_date: `${prevYear}-${String(prevMonth).padStart(2, "0")}-28`,
      created_at: new Date(prevYear, prevMonth - 1, 25).toISOString(),
    },
    {
      id: `pay-${employeeId}-curr`,
      employee_id: employeeId,
      period: currentPeriod,
      base_salary: base,
      allowances: allowances,
      deductions: deductions,
      net_salary: net,
      status: "pending",
      pay_date: null,
      created_at: new Date().toISOString(),
    }
  ];
}

function createDefaultDb(): MockDb {
  return {
    companies: [
      { id: 'c1', name: 'Dayflow', prefix: 'DF' },
      { id: 'c2', name: 'OpenAI', prefix: 'OI' },
      { id: 'c3', name: 'Google', prefix: 'GO' },
    ],
    departments: [
      { id: 'd1', name: 'Engineering', description: 'Product & Engineering' },
      { id: 'd2', name: 'Human Resources', description: 'HR & People Operations' },
      { id: 'd3', name: 'Sales & Marketing', description: 'Sales & Marketing Operations' },
    ],
    leave_types: [
      { id: 'lt1', name: 'Annual Leave', annual_allowance: 20 },
      { id: 'lt2', name: 'Sick Leave', annual_allowance: 10 },
      { id: 'lt3', name: 'Casual Leave', annual_allowance: 7 },
    ],
    employees: [
      {
        id: 'e1',
        user_id: '00000000-0000-0000-0000-000000000001',
        employee_code: 'DFAD20260001',
        full_name: 'Admin User',
        email: 'admin@dayflow.com',
        job_title: 'HR Director',
        joining_date: '2026-01-01',
        company_id: 'c1',
        company: 'Dayflow',
        department_id: 'd2',
        needs_password_change: false,
        employment_status: 'active',
      },
      {
        id: 'e2',
        user_id: '00000000-0000-0000-0000-000000000002',
        employee_code: 'DFEM20260001',
        full_name: 'John Doe',
        email: 'john@dayflow.com',
        job_title: 'Software Engineer',
        joining_date: '2026-01-15',
        company_id: 'c1',
        company: 'Dayflow',
        department_id: 'd1',
        needs_password_change: false,
        employment_status: 'active',
      }
    ],
    user_roles: [
      { user_id: '00000000-0000-0000-0000-000000000001', role: 'admin' },
      { user_id: '00000000-0000-0000-0000-000000000002', role: 'employee' },
    ],
    attendance: [
      ...generateMockAttendance('e1', 20),
      ...generateMockAttendance('e2', 20),
    ],
    leave_requests: [
      ...generateMockLeaveRequests('e1'),
      ...generateMockLeaveRequests('e2'),
    ],
    payroll: [
      ...generateMockPayroll('e1', 120000, 15000, 5000),
      ...generateMockPayroll('e2', 80000, 10000, 4000),
    ],
    documents: [],
    audit_logs: [],
    salary_configs: [
      {
        id: 'sc1',
        employee_id: 'e1',
        wage_type: 'monthly',
        wage_amount: 120000,
        working_days_per_week: 5,
        working_hours_per_day: 8,
        pf_rate: 12,
        employer_pf_rate: 12,
        professional_tax: 200,
        components: [
          { id: 'comp-e1-basic', name: 'Basic Salary', type: 'percentage', value: 50, calculation_base_id: 'wage' },
          { id: 'comp-e1-hra', name: 'House Rent Allowance', type: 'percentage', value: 50, calculation_base_id: 'comp-e1-basic' },
          { id: 'comp-e1-fixed', name: 'Fixed Allowance', type: 'fixed', value: 30000, calculation_base_id: null },
        ]
      },
      {
        id: 'sc2',
        employee_id: 'e2',
        wage_type: 'monthly',
        wage_amount: 80000,
        working_days_per_week: 5,
        working_hours_per_day: 8,
        pf_rate: 12,
        employer_pf_rate: 12,
        professional_tax: 200,
        components: [
          { id: 'comp-e2-basic', name: 'Basic Salary', type: 'percentage', value: 50, calculation_base_id: 'wage' },
          { id: 'comp-e2-hra', name: 'House Rent Allowance', type: 'percentage', value: 50, calculation_base_id: 'comp-e2-basic' },
          { id: 'comp-e2-fixed', name: 'Fixed Allowance', type: 'fixed', value: 20000, calculation_base_id: null },
        ]
      }
    ]
  };
}

export function getDb(): MockDb {
  if (!fs.existsSync(WRITEABLE_DB_FILE)) {
    if (IS_VERCEL && fs.existsSync(BUNDLED_DB_FILE)) {
      try {
        fs.copyFileSync(BUNDLED_DB_FILE, WRITEABLE_DB_FILE);
      } catch (e) {
        // Fallback to programmatic creation
      }
    }
  }

  if (!fs.existsSync(WRITEABLE_DB_FILE)) {
    const db = createDefaultDb();
    fs.writeFileSync(WRITEABLE_DB_FILE, JSON.stringify(db, null, 2));
    return db;
  }
  try {
    const data = JSON.parse(fs.readFileSync(WRITEABLE_DB_FILE, 'utf-8'));
    if (!data.attendance || data.attendance.length === 0) {
      const db = createDefaultDb();
      fs.writeFileSync(WRITEABLE_DB_FILE, JSON.stringify(db, null, 2));
      return db;
    }
    return data;
  } catch (e) {
    const db = createDefaultDb();
    return db;
  }
}

export function saveDb(db: MockDb) {
  fs.writeFileSync(WRITEABLE_DB_FILE, JSON.stringify(db, null, 2));
}
