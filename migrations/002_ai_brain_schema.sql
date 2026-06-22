-- AI BRAIN SCHEMA MIGRATION
-- Run in Supabase SQL Editor
-- Date: June 22, 2026

-- ============================================
-- 1. CALENDAR EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled',
  risk_level TEXT DEFAULT 'normal',
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on calendar_events" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_calendar_events_hospital ON calendar_events(hospital);
CREATE INDEX idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);

-- ============================================
-- 2. INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor TEXT NOT NULL,
  hospital TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  project TEXT,
  po_number TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_invoices_hospital ON invoices(hospital);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_vendor ON invoices(vendor);

-- ============================================
-- 3. EMAIL INTEL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_from TEXT NOT NULL,
  email_to TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  hospital TEXT,
  extracted_actions TEXT[],
  vendor TEXT,
  amount DECIMAL(10, 2),
  deadline DATE,
  priority TEXT DEFAULT 'normal',
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE email_intel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on email_intel" ON email_intel FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_email_intel_hospital ON email_intel(hospital);
CREATE INDEX idx_email_intel_processed ON email_intel(processed);
CREATE INDEX idx_email_intel_created ON email_intel(created_at);
CREATE INDEX idx_email_intel_vendor ON email_intel(vendor);

-- ============================================
-- 4. AI BRAIN ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_brain_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  hospital TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  description TEXT NOT NULL,
  related_invoice_id UUID REFERENCES invoices(id),
  related_event_id UUID REFERENCES calendar_events(id),
  related_email_id UUID REFERENCES email_intel(id),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

ALTER TABLE ai_brain_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on ai_brain_alerts" ON ai_brain_alerts FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_ai_brain_alerts_hospital ON ai_brain_alerts(hospital);
CREATE INDEX idx_ai_brain_alerts_severity ON ai_brain_alerts(severity);
CREATE INDEX idx_ai_brain_alerts_resolved ON ai_brain_alerts(resolved);
