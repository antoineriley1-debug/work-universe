// ai-brain.js - AI Brain Analyzer
// Runs daily to cross-reference data and flag risks
// Can be scheduled via Vercel Cron or run on-demand

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function analyzeAIBrain() {
  console.log('[AI BRAIN] Starting analysis...')

  try {
    // 1. Fetch all data
    const [calendarRes, invoicesRes, emailRes] = await Promise.all([
      supabase.from('calendar_events').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('email_intel').select('*').eq('processed', false)
    ])

    const calendar = calendarRes.data || []
    const invoices = invoicesRes.data || []
    const emails = emailRes.data || []

    console.log(`[AI BRAIN] Loaded ${calendar.length} calendar events, ${invoices.length} invoices, ${emails.length} emails`)

    const today = new Date().toISOString().split('T')[0]
    const alerts = []

    // ============================================
    // 2. ANALYZE OVERDUE DELIVERABLES
    // ============================================
    const overdueCalendarEvents = calendar.filter(
      e => e.event_date < today && e.status !== 'completed'
    )

    for (const event of overdueCalendarEvents) {
      alerts.push({
        alert_type: 'overdue-deliverable',
        hospital: event.hospital,
        severity: event.risk_level === 'critical' ? 'critical' : 'warning',
        description: `[OVERDUE] ${event.title} - Due: ${event.event_date}`,
        related_event_id: event.id
      })
    }

    console.log(`[AI BRAIN] Found ${overdueCalendarEvents.length} overdue deliverables`)

    // ============================================
    // 3. ANALYZE OVERDUE INVOICES
    // ============================================
    const overdueInvoices = invoices.filter(
      inv => inv.due_date < today && inv.status !== 'paid'
    )

    for (const invoice of overdueInvoices) {
      alerts.push({
        alert_type: 'missing-payment',
        hospital: invoice.hospital,
        severity: 'critical',
        description: `[OVERDUE] ${invoice.vendor} invoice $${invoice.amount} - Due: ${invoice.due_date}`,
        related_invoice_id: invoice.id
      })
    }

    console.log(`[AI BRAIN] Found ${overdueInvoices.length} overdue invoices`)

    // ============================================
    // 4. ANALYZE THERMAL ANOMALIES
    // ============================================
    const thermalAnomalies = calendar.filter(e => e.event_type === 'thermal-anomaly')

    for (const event of thermalAnomalies) {
      alerts.push({
        alert_type: 'thermal-anomaly',
        hospital: event.hospital,
        severity: event.risk_level === 'critical' ? 'critical' : 'warning',
        description: `[THERMAL] ${event.title} - Status: ${event.status}`,
        related_event_id: event.id
      })
    }

    console.log(`[AI BRAIN] Found ${thermalAnomalies.length} thermal anomalies`)

    // ============================================
    // 5. ANALYZE NON-FUNCTIONAL EQUIPMENT
    // ============================================
    const nonFunctionalEquipment = calendar.filter(
      e => e.event_type === 'maintenance' && e.status === 'in-progress'
    )

    for (const event of nonFunctionalEquipment) {
      alerts.push({
        alert_type: 'non-functional-equipment',
        hospital: event.hospital,
        severity: event.risk_level === 'critical' ? 'critical' : 'warning',
        description: `[EQUIPMENT] ${event.title} - Status: In Progress`,
        related_event_id: event.id
      })
    }

    console.log(`[AI BRAIN] Found ${nonFunctionalEquipment.length} non-functional equipment items`)

    // ============================================
    // 6. CROSS-REFERENCE EMAILS TO CALENDAR/INVOICES
    // ============================================
    for (const email of emails) {
      // Try to extract dates and amounts
      const dateMatch = email.body?.match(/\d{4}-\d{2}-\d{2}/)
      const amountMatch = email.body?.match(/\$?(\d+,?\d*\.\d{2})/)

      if (email.hospital) {
        // Find related invoices
        const relatedInvoices = invoices.filter(
          inv => inv.hospital === email.hospital && inv.status === 'pending'
        )

        if (relatedInvoices.length > 0 && email.vendor) {
          for (const invoice of relatedInvoices) {
            if (invoice.vendor.toLowerCase().includes(email.vendor.toLowerCase())) {
              alerts.push({
                alert_type: 'missing-payment',
                hospital: email.hospital,
                severity: 'warning',
                description: `[EMAIL] ${email.vendor} - pending payment for ${email.subject}`,
                related_invoice_id: invoice.id,
                related_email_id: email.id
              })
            }
          }
        }
      }
    }

    console.log(`[AI BRAIN] Processed ${emails.length} emails`)

    // ============================================
    // 7. INSERT ALERTS INTO DATABASE
    // ============================================
    if (alerts.length > 0) {
      const { error } = await supabase.from('ai_brain_alerts').insert(alerts)

      if (error) {
        console.error('[AI BRAIN] Failed to insert alerts:', error)
      } else {
        console.log(`[AI BRAIN] Inserted ${alerts.length} alerts`)
      }
    }

    // ============================================
    // 8. MARK EMAILS AS PROCESSED
    // ============================================
    if (emails.length > 0) {
      const emailIds = emails.map(e => e.id)
      const { error } = await supabase
        .from('email_intel')
        .update({ processed: true })
        .in('id', emailIds)

      if (error) {
        console.error('[AI BRAIN] Failed to mark emails as processed:', error)
      }
    }

    // ============================================
    // 9. GENERATE SUMMARY
    // ============================================
    const summary = {
      timestamp: new Date().toISOString(),
      alerts_generated: alerts.length,
      overdue_deliverables: overdueCalendarEvents.length,
      overdue_invoices: overdueInvoices.length,
      thermal_anomalies: thermalAnomalies.length,
      non_functional_equipment: nonFunctionalEquipment.length,
      emails_processed: emails.length
    }

    console.log('[AI BRAIN] Analysis complete:', summary)

    return summary
  } catch (error) {
    console.error('[AI BRAIN] Error during analysis:', error)
    throw error
  }
}

// Export for API endpoint
export default async function handler(req, res) {
  try {
    const summary = await analyzeAIBrain()
    return res.status(200).json({ success: true, ...summary })
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message })
  }
}

// Can also be run as a Node.js script:
// node ai-brain.js
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeAIBrain()
    .then(summary => {
      console.log('\n=== AI BRAIN ANALYSIS COMPLETE ===')
      console.log(JSON.stringify(summary, null, 2))
      process.exit(0)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}
