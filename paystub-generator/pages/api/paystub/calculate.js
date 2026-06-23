import { calculateCompletePaystub } from '../../../lib/taxCalculator';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      employeeId,
      regularHours,
      overtimeHours,
      deductions = [],
      startDate,
      endDate
    } = req.body;

    // Validate input
    if (!employeeId || !regularHours || regularHours < 0) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Fetch employee data
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Create pay period
    const { data: payPeriod, error: payPeriodError } = await supabase
      .from('pay_periods')
      .insert({
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        hours_worked: regularHours + (overtimeHours || 0),
        overtime_hours: overtimeHours || 0
      })
      .select()
      .single();

    if (payPeriodError) {
      return res.status(400).json({ error: 'Failed to create pay period' });
    }

    // Calculate paystub
    const calculations = calculateCompletePaystub(
      {
        regularHours,
        overtimeHours: overtimeHours || 0
      },
      employee,
      deductions
    );

    // Create paystub record
    const { data: paystub, error: paystubError } = await supabase
      .from('paystubs')
      .insert({
        pay_period_id: payPeriod.id,
        employee_id: employeeId,
        gross_pay: calculations.grossPay,
        federal_tax: calculations.federalTax,
        social_security: calculations.socialSecurity,
        medicare: calculations.medicare,
        state_tax: calculations.stateTax,
        total_deductions: calculations.totalDeductions,
        net_pay: calculations.netPay
      })
      .select()
      .single();

    if (paystubError) {
      return res.status(400).json({ error: 'Failed to create paystub' });
    }

    // Insert deductions
    if (deductions.length > 0) {
      const deductionRecords = deductions.map(d => ({
        paystub_id: paystub.id,
        name: d.name,
        amount: d.amount,
        type: d.type || 'voluntary'
      }));

      await supabase
        .from('deductions')
        .insert(deductionRecords);
    }

    // Return complete data
    return res.status(200).json({
      paystubId: paystub.id,
      payPeriodId: payPeriod.id,
      employee: {
        id: employee.id,
        name: employee.name,
        ssn: employee.ssn,
        address: employee.address,
        city: employee.city,
        state: employee.state,
        zip: employee.zip,
        hourlyRate: employee.hourly_rate,
        taxState: employee.tax_state
      },
      payPeriod: {
        startDate: payPeriod.start_date,
        endDate: payPeriod.end_date,
        regularHours,
        overtimeHours: overtimeHours || 0,
        totalHours: regularHours + (overtimeHours || 0)
      },
      calculations
    });
  } catch (error) {
    console.error('Calculation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
