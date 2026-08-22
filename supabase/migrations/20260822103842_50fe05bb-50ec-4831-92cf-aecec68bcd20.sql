
create type public.app_role as enum ('admin', 'hr', 'employee');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('hr','admin'))
$$;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);
grant select on public.departments to authenticated;
grant insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;
create policy "Authenticated can read departments" on public.departments for select to authenticated using (true);
create policy "Staff manage departments" on public.departments for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create sequence public.employee_code_seq start 13;

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  employee_code text not null unique,
  full_name text not null,
  email text not null unique,
  phone text,
  address text,
  avatar_url text,
  job_title text not null default 'Team Member',
  department_id uuid references public.departments(id) on delete set null,
  manager_id uuid references public.employees(id) on delete set null,
  joining_date date not null default current_date,
  employment_status text not null default 'active' check (employment_status in ('active','on_leave','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.employees to authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;
create policy "Employees read own profile" on public.employees for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "Staff create employees" on public.employees for insert to authenticated with check (public.is_staff(auth.uid()) or user_id = auth.uid());
create policy "Employees update own profile" on public.employees for update to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid())) with check (user_id = auth.uid() or public.is_staff(auth.uid()));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
create trigger employees_touch before update on public.employees for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role public.app_role;
  _code text;
begin
  _role := coalesce(nullif(new.raw_user_meta_data->>'role',''), 'employee')::public.app_role;
  _code := nullif(new.raw_user_meta_data->>'employee_code','');
  if _code is null then
    _code := 'DF-' || lpad(nextval('public.employee_code_seq')::text, 4, '0');
  end if;
  insert into public.employees (user_id, employee_code, full_name, email, job_title, joining_date)
  values (
    new.id,
    _code,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'job_title',''), 'Team Member'),
    current_date
  );
  insert into public.user_roles (user_id, role) values (new.id, _role);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  annual_allowance integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.leave_types to authenticated;
grant insert, update, delete on public.leave_types to authenticated;
grant all on public.leave_types to service_role;
alter table public.leave_types enable row level security;
create policy "Authenticated read leave types" on public.leave_types for select to authenticated using (true);
create policy "Staff manage leave types" on public.leave_types for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'present' check (status in ('present','absent','half_day','leave')),
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
grant select, insert, update on public.attendance to authenticated;
grant all on public.attendance to service_role;
alter table public.attendance enable row level security;
create policy "Read own or staff attendance" on public.attendance for select to authenticated
  using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_staff(auth.uid()));
create policy "Employee logs own attendance" on public.attendance for insert to authenticated
  with check (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_staff(auth.uid()));
create policy "Update own or staff attendance" on public.attendance for update to authenticated
  using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_staff(auth.uid()));
create index attendance_emp_date_idx on public.attendance (employee_id, work_date desc);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id),
  start_date date not null,
  end_date date not null,
  remarks text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewer_id uuid references public.employees(id) on delete set null,
  review_comment text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
grant select, insert, update on public.leave_requests to authenticated;
grant all on public.leave_requests to service_role;
alter table public.leave_requests enable row level security;
create policy "Read own or staff leave" on public.leave_requests for select to authenticated
  using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_staff(auth.uid()));
create policy "Employee applies leave" on public.leave_requests for insert to authenticated
  with check (employee_id in (select id from public.employees where user_id = auth.uid()) and status = 'pending');
create policy "Staff review leave" on public.leave_requests for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create index leave_emp_status_idx on public.leave_requests (employee_id, status);

create table public.payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  period date not null,
  base_salary numeric(12,2) not null default 0,
  allowances numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  net_salary numeric(12,2) generated always as (base_salary + allowances - deductions) stored,
  pay_date date,
  status text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz not null default now(),
  unique (employee_id, period)
);
grant select, insert, update on public.payroll to authenticated;
grant all on public.payroll to service_role;
alter table public.payroll enable row level security;
create policy "Read own or staff payroll" on public.payroll for select to authenticated
  using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_staff(auth.uid()));
create policy "Staff manage payroll" on public.payroll for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "Staff update payroll" on public.payroll for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.salary_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  base_salary numeric(12,2) not null,
  allowances numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  effective_from date not null default current_date,
  changed_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert on public.salary_history to authenticated;
grant all on public.salary_history to service_role;
alter table public.salary_history enable row level security;
create policy "Read own or staff salary history" on public.salary_history for select to authenticated
  using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_staff(auth.uid()));
create policy "Staff add salary history" on public.salary_history for insert to authenticated with check (public.is_staff(auth.uid()));

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null,
  doc_type text not null default 'other' check (doc_type in ('offer_letter','id_proof','certificate','contract','other')),
  file_url text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "Read own or staff documents" on public.documents for select to authenticated
  using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_staff(auth.uid()));
create policy "Staff manage documents" on public.documents for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "Staff delete documents" on public.documents for delete to authenticated using (public.is_staff(auth.uid()));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info','success','warning','leave','payroll','attendance')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Read own notifications" on public.notifications for select to authenticated
  using (employee_id in (select id from public.employees where user_id = auth.uid()));
create policy "Mark own notifications read" on public.notifications for update to authenticated
  using (employee_id in (select id from public.employees where user_id = auth.uid()))
  with check (employee_id in (select id from public.employees where user_id = auth.uid()));
create index notifications_emp_idx on public.notifications (employee_id, read, created_at desc);

create or replace function public.notify(_employee_id uuid, _title text, _message text, _type text default 'info')
returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  insert into public.notifications (employee_id, title, message, type) values (_employee_id, _title, _message, _type) returning id into _id;
  return _id;
end $$;
grant execute on function public.notify(uuid, text, text, text) to authenticated;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "Staff read audit logs" on public.audit_logs for select to authenticated using (public.is_staff(auth.uid()));
create index audit_entity_idx on public.audit_logs (entity, entity_id, created_at desc);

create or replace function public.log_audit(_action text, _entity text, _entity_id uuid, _metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata) values (auth.uid(), _action, _entity, _entity_id, _metadata) returning id into _id;
  return _id;
end $$;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;

-- ================= SEED DATA =================

insert into public.departments (name, description) values
  ('Engineering','Product and platform engineering'),
  ('Design','Product design and brand'),
  ('Sales','Revenue and partnerships'),
  ('Marketing','Growth and communications'),
  ('People','HR and workplace operations'),
  ('Operations','Business operations and finance');

insert into public.leave_types (name, annual_allowance) values
  ('Paid Leave', 20),
  ('Sick Leave', 10),
  ('Unpaid Leave', 30);

insert into public.employees (employee_code, full_name, email, phone, job_title, department_id, manager_id, joining_date, employment_status, address)
select e.employee_code, e.full_name, e.email, e.phone, e.job_title, e.department_id, e.manager_id, e.joining_date::date, e.employment_status, e.address
from (values
  ('DF-0001','Aarav Mehta','aarav.mehta@dayflow.io','+91 98200 11001','Chief Executive Officer',(select id from public.departments where name='Operations'),null::uuid,'2019-04-08','active','Bengaluru, IN'),
  ('DF-0002','Priya Nair','priya.nair@dayflow.io','+91 98200 11002','Head of People',(select id from public.departments where name='People'),(select id from public.employees where employee_code='DF-0001'),'2020-01-20','active','Kochi, IN'),
  ('DF-0003','Rohan Kapoor','rohan.kapoor@dayflow.io','+91 98200 11003','Engineering Manager',(select id from public.departments where name='Engineering'),(select id from public.employees where employee_code='DF-0001'),'2020-06-15','active','Pune, IN'),
  ('DF-0004','Sana Iqbal','sana.iqbal@dayflow.io','+91 98200 11004','Senior Product Designer',(select id from public.departments where name='Design'),(select id from public.employees where employee_code='DF-0001'),'2021-02-01','active','Mumbai, IN'),
  ('DF-0005','Vikram Rao','vikram.rao@dayflow.io','+91 98200 11005','Staff Engineer',(select id from public.departments where name='Engineering'),(select id from public.employees where employee_code='DF-0003'),'2021-07-12','active','Hyderabad, IN'),
  ('DF-0006','Ananya Desai','ananya.desai@dayflow.io','+91 98200 11006','Frontend Engineer',(select id from public.departments where name='Engineering'),(select id from public.employees where employee_code='DF-0003'),'2022-03-21','active','Bengaluru, IN'),
  ('DF-0007','Karan Malhotra','karan.malhotra@dayflow.io','+91 98200 11007','Account Executive',(select id from public.departments where name='Sales'),(select id from public.employees where employee_code='DF-0001'),'2022-08-08','active','Delhi, IN'),
  ('DF-0008','Meera Krishnan','meera.krishnan@dayflow.io','+91 98200 11008','Marketing Lead',(select id from public.departments where name='Marketing'),(select id from public.employees where employee_code='DF-0001'),'2021-11-02','active','Chennai, IN'),
  ('DF-0009','Dev Patel','dev.patel@dayflow.io','+91 98200 11009','Backend Engineer',(select id from public.departments where name='Engineering'),(select id from public.employees where employee_code='DF-0003'),'2023-01-16','active','Ahmedabad, IN'),
  ('DF-0010','Ishita Bose','ishita.bose@dayflow.io','+91 98200 11010','People Operations Specialist',(select id from public.departments where name='People'),(select id from public.employees where employee_code='DF-0002'),'2023-05-29','active','Kolkata, IN'),
  ('DF-0011','Arjun Reddy','arjun.reddy@dayflow.io','+91 98200 11011','Sales Development Rep',(select id from public.departments where name='Sales'),(select id from public.employees where employee_code='DF-0007'),'2024-02-05','active','Hyderabad, IN'),
  ('DF-0012','Nadia Sheikh','nadia.sheikh@dayflow.io','+91 98200 11012','Content Strategist',(select id from public.departments where name='Marketing'),(select id from public.employees where employee_code='DF-0008'),'2024-09-09','active','Mumbai, IN')
) as e(employee_code, full_name, email, phone, job_title, department_id, manager_id, joining_date, employment_status, address);

insert into public.attendance (employee_id, work_date, check_in, check_out, status)
select
  emp.id,
  d::date,
  case when r.status in ('present','half_day')
       then (d + interval '8 hours' + (random()*90 || ' minutes')::interval + interval '30 minutes')
  end,
  case when r.status = 'present'
       then (d + interval '17 hours' + (random()*90 || ' minutes')::interval)
       when r.status = 'half_day'
       then (d + interval '12 hours' + (random()*60 || ' minutes')::interval)
  end,
  r.status
from public.employees emp
cross join generate_series(current_date - 45, current_date - 1, interval '1 day') as d
cross join lateral (
  select case
    when random() < 0.86 then 'present'
    when random() < 0.92 then 'leave'
    when random() < 0.96 then 'half_day'
    else 'absent' end as status
) r
where extract(isodow from d) < 6;

insert into public.attendance (employee_id, work_date, check_in, status)
select id, current_date, current_date + interval '8 hours' + (random()*50 || ' minutes')::interval + interval '45 minutes', 'present'
from public.employees where employee_code in ('DF-0001','DF-0002','DF-0003','DF-0004','DF-0005','DF-0006','DF-0008','DF-0009','DF-0012');
insert into public.attendance (employee_id, work_date, status)
select id, current_date, 'leave' from public.employees where employee_code in ('DF-0007','DF-0010');
insert into public.attendance (employee_id, work_date, status)
select id, current_date, 'absent' from public.employees where employee_code = 'DF-0011';

insert into public.leave_requests (employee_id, leave_type_id, start_date, end_date, remarks, status, reviewer_id, review_comment, reviewed_at, created_at)
select emp.id, t.id, lr.s, lr.e, lr.remarks, lr.status, rev.id, lr.rc, lr.rat, lr.cat
from (values
  ('DF-0005','Paid Leave', current_date + 12, current_date + 16, 'Family trip to Coorg.', 'pending', null::text, null::text, null::timestamptz, now() - interval '1 day'),
  ('DF-0006','Sick Leave', current_date + 3, current_date + 3, 'Dental procedure scheduled.', 'pending', null, null, null, now() - interval '6 hours'),
  ('DF-0009','Paid Leave', current_date + 20, current_date + 24, 'Attending a cousin''s wedding.', 'pending', null, null, null, now() - interval '2 days'),
  ('DF-0011','Unpaid Leave', current_date + 30, current_date + 34, 'Personal reasons.', 'pending', null, null, null, now() - interval '3 hours'),
  ('DF-0007','Paid Leave', current_date - 1, current_date + 2, 'Family function in Delhi.', 'approved', 'DF-0002', 'Approved. Enjoy!', now() - interval '2 days', now() - interval '4 days'),
  ('DF-0010','Sick Leave', current_date - 1, current_date + 1, 'Recovering from flu.', 'approved', 'DF-0002', 'Get well soon.', now() - interval '1 day', now() - interval '2 days'),
  ('DF-0004','Paid Leave', current_date - 20, current_date - 16, 'Design conference in Goa.', 'approved', 'DF-0002', null, now() - interval '24 days', now() - interval '26 days'),
  ('DF-0008','Paid Leave', current_date - 35, current_date - 33, 'Short break.', 'approved', 'DF-0002', null, now() - interval '38 days', now() - interval '40 days'),
  ('DF-0012','Unpaid Leave', current_date - 10, current_date - 6, 'Moving apartments.', 'rejected', 'DF-0002', 'Critical launch week — please reschedule.', now() - interval '12 days', now() - interval '14 days'),
  ('DF-0003','Sick Leave', current_date - 8, current_date - 8, 'Migraine.', 'approved', 'DF-0002', null, now() - interval '9 days', now() - interval '10 days')
) as lr(code, lt, s, e, remarks, status, rev, rc, rat, cat)
join public.employees emp on emp.employee_code = lr.code
join public.leave_types t on t.name = lr.lt
left join public.employees rev on rev.employee_code = lr.rev;

insert into public.payroll (employee_id, period, base_salary, allowances, deductions, pay_date, status)
select
  emp.id,
  p.period,
  s.base,
  round(s.base * 0.18, 2),
  round(s.base * 0.09, 2),
  (p.period + interval '1 month' - interval '1 day')::date,
  case when p.period < date_trunc('month', current_date)::date then 'paid' else 'pending' end
from public.employees emp
cross join (values
  ((date_trunc('month', current_date) - interval '2 month')::date),
  ((date_trunc('month', current_date) - interval '1 month')::date),
  (date_trunc('month', current_date)::date)
) as p(period)
join lateral (
  select case emp.employee_code
    when 'DF-0001' then 320000 when 'DF-0002' then 210000 when 'DF-0003' then 235000
    when 'DF-0004' then 165000 when 'DF-0005' then 195000 when 'DF-0006' then 125000
    when 'DF-0007' then 110000 when 'DF-0008' then 140000 when 'DF-0009' then 118000
    when 'DF-0010' then 85000 when 'DF-0011' then 72000 when 'DF-0012' then 78000
  end as base
) s on true;

insert into public.salary_history (employee_id, base_salary, allowances, deductions, effective_from)
select employee_id, base_salary, allowances, deductions, period
from public.payroll where period = (date_trunc('month', current_date) - interval '2 month')::date;

insert into public.documents (employee_id, title, doc_type, file_url)
select emp.id, d.title, d.dtype, null::text
from public.employees emp
cross join (values
  ('Offer Letter','offer_letter'),
  ('Government ID','id_proof')
) as d(title, dtype);
insert into public.documents (employee_id, title, doc_type)
select id, 'Employment Contract', 'contract' from public.employees where employee_code in ('DF-0001','DF-0002','DF-0003');

insert into public.notifications (employee_id, title, message, type, read, created_at)
select emp.id, n.title, n.message, n.ntype, (random() < 0.4), now() - (random()*interval '3 days')
from public.employees emp
cross join (values
  ('Leave request approved','Your Paid Leave request was approved by Priya Nair.','success'),
  ('Payroll updated','Your salary slip for this month is now available.','payroll'),
  ('Attendance reminder','Don''t forget to check in when you start your day.','attendance'),
  ('Profile review','Please verify your personal information is up to date.','info')
) as n(title, message, ntype)
where emp.employee_code in ('DF-0004','DF-0005','DF-0006','DF-0009');

insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
select null, 'employee_created', 'employee', id, jsonb_build_object('name', full_name, 'source', 'seed')
from public.employees;
