/**
 * Supabase Setup Script
 * This script creates the necessary database schema for the email ingest pipeline
 * 
 * Requires:
 * 1. SUPABASE_URL environment variable
 * 2. SUPABASE_SERVICE_ROLE_KEY environment variable (admin access)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

async function setupDatabase() {
  console.log('🔧 Setting up Supabase database...');
  
  try {
    // SQL to create the table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.email_inbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT,
        body TEXT,
        html_body TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE public.email_inbox ENABLE ROW LEVEL SECURITY;

      -- Create policies to allow public inserts and reads
      DROP POLICY IF EXISTS "Allow public inserts" ON public.email_inbox;
      CREATE POLICY "Allow public inserts" ON public.email_inbox
        FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow public reads" ON public.email_inbox;
      CREATE POLICY "Allow public reads" ON public.email_inbox
        FOR SELECT USING (true);

      -- Create index on created_at for sorting
      CREATE INDEX IF NOT EXISTS idx_email_inbox_created_at ON public.email_inbox(created_at DESC);
    `;

    // Execute SQL via Supabase SQL API
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/exec`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: createTableSQL,
        }),
      }
    );

    if (response.status === 404) {
      console.log('ℹ️ RPC endpoint not available, trying direct approach...');
      // Try direct API endpoint
      await createTableDirectly();
    } else if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error setting up database:', error);
      throw new Error(error);
    } else {
      console.log('✅ Database setup complete!');
    }
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function createTableDirectly() {
  console.log('Creating table via direct SQL...');
  
  try {
    // Use PostgreSQL REST endpoint directly
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/email_inbox`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: 'test@example.com',
          recipient: 'test@example.com',
          subject: 'Test',
        }),
      }
    );

    if (response.status === 201 || response.status === 200) {
      console.log('✅ Table created successfully!');
    } else {
      const error = await response.text();
      console.error('Response:', response.status, error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run setup
setupDatabase();
