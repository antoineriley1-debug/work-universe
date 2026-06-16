import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { secret, from, subject, text } = body;

    // Validate secret
    if (secret !== process.env.INBOUND_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('emails')
      .insert([
        {
          from,
          subject,
          body: text,
          received_at: new Date().toISOString(),
          user_id: process.env.INBOUND_USER_ID
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
