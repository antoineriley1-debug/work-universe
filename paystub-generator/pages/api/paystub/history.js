import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { employeeId } = req.query;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID required' });
    }

    // Fetch paystubs with related data
    const { data: paystubs, error } = await supabase
      .from('paystubs')
      .select(`
        *,
        pay_period:pay_periods(*),
        deductions:deductions(*)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format response
    const formattedPaystubs = paystubs.map(p => ({
      id: p.id,
      paystubId: p.id,
      payPeriodId: p.pay_period_id,
      grossPay: p.gross_pay,
      federalTax: p.federal_tax,
      stateTax: p.state_tax,
      socialSecurity: p.social_security,
      medicare: p.medicare,
      totalTaxes: p.federal_tax + p.state_tax + p.social_security + p.medicare,
      deductions: p.deductions || [],
      totalDeductions: p.total_deductions,
      netPay: p.net_pay,
      pdfUrl: p.pdf_url,
      payPeriod: {
        startDate: p.pay_period?.start_date,
        endDate: p.pay_period?.end_date,
        hoursWorked: p.pay_period?.hours_worked,
        overtimeHours: p.pay_period?.overtime_hours
      },
      createdAt: p.created_at
    }));

    return res.status(200).json(formattedPaystubs);
  } catch (error) {
    console.error('Error fetching paystub history:', error);
    return res.status(500).json({ error: 'Failed to fetch paystub history' });
  }
}
