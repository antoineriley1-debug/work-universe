import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    // Validate Authorization header
    const authHeader = request.headers.get('authorization');
    const expectedToken = 'Bearer medstar-inbox-2026';

    if (!authHeader || authHeader !== expectedToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    const { from, to, subject, text, html } = body;

    // Validate required fields
    if (!from || !subject || !text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: from, subject, text' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with SERVICE_ROLE key (has full permissions)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Store email in Supabase
    const { data, error } = await supabase
      .from('ingested_emails')
      .insert([
        {
          from,
          to: to || null,
          subject,
          text_body: text,
          html_body: html || null,
          received_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
