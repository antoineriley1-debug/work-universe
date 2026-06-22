// /api/calendar.js - Calendar Events API
// GET: List events, POST: Create event

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // GET /api/calendar?hospital=MWHC&month=2026-06
      const { hospital, month, status } = req.query
      
      let query = supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true })

      if (hospital) query = query.eq('hospital', hospital)
      if (status) query = query.eq('status', status)
      if (month) {
        // Filter by month (YYYY-MM)
        const startDate = `${month}-01`
        const endDate = `${month}-31`
        query = query.gte('event_date', startDate).lte('event_date', endDate)
      }

      const { data, error } = await query

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json(data)
    }

    if (req.method === 'POST') {
      // POST /api/calendar
      const { hospital, event_date, event_type, title, description, status, risk_level } = req.body

      // Validation
      if (!hospital || !event_date || !event_type || !title) {
        return res.status(400).json({
          error: 'Missing required fields: hospital, event_date, event_type, title'
        })
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([
          {
            hospital,
            event_date,
            event_type,
            title,
            description: description || null,
            status: status || 'scheduled',
            risk_level: risk_level || 'normal'
          }
        ])
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json(data[0])
    }

    if (req.method === 'PUT') {
      // PUT /api/calendar?id=UUID
      const { id } = req.query
      const { status, risk_level, description } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Missing id parameter' })
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          status: status || undefined,
          risk_level: risk_level || undefined,
          description: description || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json(data[0])
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
