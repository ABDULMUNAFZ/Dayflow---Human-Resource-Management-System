-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  prefix text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Populate default companies
INSERT INTO public.companies (name, prefix) VALUES 
('Dayflow', 'DF'), 
('OpenAI', 'OI'), 
('Google', 'GO')
ON CONFLICT (name) DO NOTHING;

-- Add new columns to public.employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS needs_password_change boolean NOT NULL DEFAULT false;

-- Grant permissions for companies
GRANT SELECT ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create policies for companies
DROP POLICY IF EXISTS "Anyone authenticated can view companies" ON public.companies;
CREATE POLICY "Anyone authenticated can view companies" ON public.companies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "HR and Admin can insert companies" ON public.companies;
CREATE POLICY "HR and Admin can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Update select policy of public.employees to allow any authenticated user to view other employee profiles
DROP POLICY IF EXISTS "Employees read own profile" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users read all profiles" ON public.employees;
CREATE POLICY "Authenticated users read all profiles" ON public.employees FOR SELECT TO authenticated USING (true);
