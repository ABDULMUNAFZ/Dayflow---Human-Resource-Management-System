import * as fs from 'fs';
import * as path from 'path';

const DB_FILE = path.join(process.cwd(), 'mock_db.json');

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
}

const DEFAULT_DB: MockDb = {
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
  attendance: [],
  leave_requests: [],
  payroll: [],
  documents: [],
  audit_logs: [],
};

export function getDb(): MockDb {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
    return DEFAULT_DB;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return DEFAULT_DB;
  }
}

export function saveDb(db: MockDb) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
