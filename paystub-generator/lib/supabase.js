import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Schema initialization SQL
export const schemaSQL = `
-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ssn VARCHAR(11) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  tax_state VARCHAR(2) DEFAULT 'MD',
  hourly_rate DECIMAL(10, 2) NOT NULL,
  w4_filing_status VARCHAR(20) DEFAULT 'single',
  w4_dependents INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pay periods table
CREATE TABLE IF NOT EXISTS pay_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours_worked DECIMAL(10, 2) NOT NULL,
  overtime_hours DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, start_date, end_date)
);

-- Paystubs table
CREATE TABLE IF NOT EXISTS paystubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  gross_pay DECIMAL(10, 2) NOT NULL,
  federal_tax DECIMAL(10, 2) NOT NULL,
  social_security DECIMAL(10, 2) NOT NULL,
  medicare DECIMAL(10, 2) NOT NULL,
  state_tax DECIMAL(10, 2) NOT NULL,
  total_deductions DECIMAL(10, 2) DEFAULT 0,
  net_pay DECIMAL(10, 2) NOT NULL,
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deductions table
CREATE TABLE IF NOT EXISTS deductions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paystub_id UUID NOT NULL REFERENCES paystubs(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(50) DEFAULT 'voluntary'
);

-- Tax tables for 2026 (Federal)
CREATE TABLE IF NOT EXISTS federal_tax_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INT DEFAULT 2026,
  filing_status VARCHAR(20) NOT NULL,
  income_bracket_min DECIMAL(12, 2) NOT NULL,
  income_bracket_max DECIMAL(12, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) NOT NULL
);

-- Maryland state tax tables for 2026
CREATE TABLE IF NOT EXISTS md_tax_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INT DEFAULT 2026,
  filing_status VARCHAR(20) NOT NULL,
  income_bracket_min DECIMAL(12, 2) NOT NULL,
  income_bracket_max DECIMAL(12, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) NOT NULL
);

CREATE INDEX idx_employees_ssn ON employees(ssn);
CREATE INDEX idx_pay_periods_employee ON pay_periods(employee_id);
CREATE INDEX idx_paystubs_employee ON paystubs(employee_id);
CREATE INDEX idx_paystubs_pay_period ON paystubs(pay_period_id);
CREATE INDEX idx_deductions_paystub ON deductions(paystub_id);
`;

// Initialize federal tax tables for 2026 (Single)
export const federalTaxData2026 = [
  // Single filers 2026
  { filing_status: 'single', income_bracket_min: 0, income_bracket_max: 11000, tax_rate: 0.10 },
  { filing_status: 'single', income_bracket_min: 11000, income_bracket_max: 44725, tax_rate: 0.12 },
  { filing_status: 'single', income_bracket_min: 44725, income_bracket_max: 95375, tax_rate: 0.22 },
  { filing_status: 'single', income_bracket_min: 95375, income_bracket_max: 182100, tax_rate: 0.24 },
  { filing_status: 'single', income_bracket_min: 182100, income_bracket_max: 231250, tax_rate: 0.32 },
  { filing_status: 'single', income_bracket_min: 231250, income_bracket_max: 578125, tax_rate: 0.35 },
  { filing_status: 'single', income_bracket_min: 578125, income_bracket_max: 9999999, tax_rate: 0.37 },
  
  // Married filing jointly 2026
  { filing_status: 'married', income_bracket_min: 0, income_bracket_max: 22000, tax_rate: 0.10 },
  { filing_status: 'married', income_bracket_min: 22000, income_bracket_max: 89075, tax_rate: 0.12 },
  { filing_status: 'married', income_bracket_min: 89075, income_bracket_max: 190750, tax_rate: 0.22 },
  { filing_status: 'married', income_bracket_min: 190750, income_bracket_max: 364200, tax_rate: 0.24 },
  { filing_status: 'married', income_bracket_min: 364200, income_bracket_max: 462500, tax_rate: 0.32 },
  { filing_status: 'married', income_bracket_min: 462500, income_bracket_max: 693750, tax_rate: 0.35 },
  { filing_status: 'married', income_bracket_min: 693750, income_bracket_max: 9999999, tax_rate: 0.37 }
];

// Maryland state tax tables for 2026
export const mdTaxData2026 = [
  { filing_status: 'single', income_bracket_min: 0, income_bracket_max: 1000, tax_rate: 0.02 },
  { filing_status: 'single', income_bracket_min: 1000, income_bracket_max: 2000, tax_rate: 0.03 },
  { filing_status: 'single', income_bracket_min: 2000, income_bracket_max: 3000, tax_rate: 0.04 },
  { filing_status: 'single', income_bracket_min: 3000, income_bracket_max: 100000, tax_rate: 0.0475 },
  { filing_status: 'single', income_bracket_min: 100000, income_bracket_max: 125000, tax_rate: 0.05 },
  { filing_status: 'single', income_bracket_min: 125000, income_bracket_max: 9999999, tax_rate: 0.0575 },
  
  { filing_status: 'married', income_bracket_min: 0, income_bracket_max: 1000, tax_rate: 0.02 },
  { filing_status: 'married', income_bracket_min: 1000, income_bracket_max: 2000, tax_rate: 0.03 },
  { filing_status: 'married', income_bracket_min: 2000, income_bracket_max: 3000, tax_rate: 0.04 },
  { filing_status: 'married', income_bracket_min: 3000, income_bracket_max: 150000, tax_rate: 0.0475 },
  { filing_status: 'married', income_bracket_min: 150000, income_bracket_max: 175000, tax_rate: 0.05 },
  { filing_status: 'married', income_bracket_min: 175000, income_bracket_max: 9999999, tax_rate: 0.0575 }
];
