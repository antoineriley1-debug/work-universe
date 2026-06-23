import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return createEmployee(req, res);
  } else if (req.method === 'GET') {
    return getEmployees(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function createEmployee(req, res) {
  try {
    const {
      name,
      ssn,
      address,
      city,
      state,
      zip,
      hourlyRate,
      taxState = 'MD',
      w4FilingStatus = 'single',
      w4Dependents = 0
    } = req.body;

    // Validate required fields
    if (!name || !ssn || !hourlyRate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        name,
        ssn,
        address,
        city,
        state,
        zip,
        hourly_rate: hourlyRate,
        tax_state: taxState,
        w4_filing_status: w4FilingStatus,
        w4_dependents: w4Dependents
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'SSN already exists' });
      }
      throw error;
    }

    return res.status(201).json(employee);
  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ error: 'Failed to create employee' });
  }
}

async function getEmployees(req, res) {
  try {
    const { id } = req.query;

    if (id) {
      const { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      return res.status(200).json(employee);
    }

    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json(employees || []);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
}
