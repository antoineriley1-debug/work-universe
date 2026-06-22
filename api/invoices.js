// /api/invoices.js - Invoices API
// GET: List invoices, POST: Create invoice

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // GET /api/invoices?hospital=MWHC&status=pending&vendor=Powercor
      const { hospital, status, vendor, project } = req.query

      let query = supabase
        .from('invoices')
        .select('*')
        .order('due_date', { ascending: true })

      if (hospital) query = query.eq('hospital', hospital)
      if (status) query = query.eq('status', status)
      if (vendor) query = query.eq('vendor', vendor)
      if (project) query = query.eq('project', project)

      const { data, error } = await query

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      // Calculate overdue
      const today = new Date().toISOString().split('T')[0]
      const enriched = data.map(invoice => ({
        ...invoice,
        is_overdue: invoice.due_date < today && invoice.status !== 'paid'
      }))

      return res.status(200).json(enriched)
    }

    if (req.method === 'POST') {
      // POST /api/invoices
      const { 
        vendor, 
        hospital, 
        amount, 
        invoice_date, 
        due_date, 
        status, 
        project, 
        po_number, 
        notes 
      } = req.body

      // Validation
      if (!vendor || !hospital || !amount || !invoice_date || !due_date) {
        return res.status(400).json({
          error: 'Missing required fields: vendor, hospital, amount, invoice_date, due_date'
        })
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert([
          {
            vendor,
            hospital,
            amount: parseFloat(amount),
            invoice_date,
            due_date,
            status: status || 'pending',
            project: project || null,
            po_number: po_number || null,
            notes: notes || null
          }
        ])
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json(data[0])
    }

    if (req.method === 'PUT') {
      // PUT /api/invoices?id=UUID
      const { id } = req.query
      const { status, notes } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Missing id parameter' })
      }

      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: status || undefined,
          notes: notes || undefined,
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
