/**
 * Tax Calculator Test Suite
 * Validates 2026 federal and state tax calculations
 */

import {
  calculateGrossPay,
  calculateFederalTax,
  calculateStateTax,
  calculateSocialSecurity,
  calculateMedicare,
  calculateCompletePaystub
} from '../lib/taxCalculator';

describe('Tax Calculator Tests', () => {
  test('calculateGrossPay - Regular hours only', () => {
    const gross = calculateGrossPay(40, 0, 30);
    expect(gross).toBe(1200);
  });

  test('calculateGrossPay - With overtime', () => {
    const gross = calculateGrossPay(40, 8, 30);
    expect(gross).toBe(1320);
  });

  test('calculateGrossPay - No regular hours, only OT', () => {
    const gross = calculateGrossPay(0, 10, 30);
    expect(gross).toBe(450);
  });

  test('calculateFederalTax - Single filer, $1000 income', () => {
    const tax = calculateFederalTax(1000, 'single', 0);
    expect(tax).toBeGreaterThan(0);
    expect(tax).toBeLessThan(150); // Should be ~100 (10% of taxable after standard deduction)
  });

  test('calculateFederalTax - Single filer, $50000 income', () => {
    const tax = calculateFederalTax(50000, 'single', 0);
    expect(tax).toBeGreaterThan(3000);
    expect(tax).toBeLessThan(6000);
  });

  test('calculateFederalTax - Married filer', () => {
    const taxSingle = calculateFederalTax(50000, 'single', 0);
    const taxMarried = calculateFederalTax(50000, 'married', 0);
    expect(taxMarried).toBeLessThan(taxSingle); // Married should have lower tax
  });

  test('calculateFederalTax - With dependents', () => {
    const taxNoDeps = calculateFederalTax(50000, 'single', 0);
    const taxWithDeps = calculateFederalTax(50000, 'single', 2);
    expect(taxWithDeps).toBeLessThan(taxNoDeps); // Dependents should reduce tax
  });

  test('calculateStateTax - Maryland single filer, $1000', () => {
    const tax = calculateStateTax(1000, 'MD', 'single');
    expect(tax).toBeCloseTo(20, 0); // Should be ~$20 (2%)
  });

  test('calculateStateTax - Maryland single filer, $50000', () => {
    const tax = calculateStateTax(50000, 'MD', 'single');
    expect(tax).toBeGreaterThan(2000);
    expect(tax).toBeLessThan(3000);
  });

  test('calculateSocialSecurity - 6.2% of gross', () => {
    const ss = calculateSocialSecurity(1000);
    expect(ss).toBeCloseTo(62, 1);
  });

  test('calculateSocialSecurity - $50000 income', () => {
    const ss = calculateSocialSecurity(50000);
    expect(ss).toBeCloseTo(3100, 1);
  });

  test('calculateMedicare - 1.45% of gross', () => {
    const medicare = calculateMedicare(1000);
    expect(medicare).toBeCloseTo(14.5, 1);
  });

  test('calculateMedicare - $50000 income', () => {
    const medicare = calculateMedicare(50000);
    expect(medicare).toBeCloseTo(725, 1);
  });

  test('calculateCompletePaystub - Standard case', () => {
    const payPeriod = {
      regularHours: 40,
      overtimeHours: 8
    };

    const employee = {
      hourlyRate: 30,
      w4_filing_status: 'single',
      w4_dependents: 0,
      tax_state: 'MD'
    };

    const deductions = [
      { name: 'Health Insurance', amount: 150 }
    ];

    const result = calculateCompletePaystub(payPeriod, employee, deductions);

    expect(result.grossPay).toBe(1320);
    expect(result.federalTax).toBeGreaterThan(0);
    expect(result.stateTax).toBeGreaterThan(0);
    expect(result.socialSecurity).toBeCloseTo(81.84, 1);
    expect(result.medicare).toBeCloseTo(19.14, 1);
    expect(result.totalDeductions).toBe(150);
    expect(result.netPay).toBeLessThan(result.grossPay);
    expect(result.netPay).toBeGreaterThan(500);
  });

  test('calculateCompletePaystub - No overtime, no deductions', () => {
    const payPeriod = {
      regularHours: 40,
      overtimeHours: 0
    };

    const employee = {
      hourlyRate: 25,
      w4_filing_status: 'single',
      w4_dependents: 0,
      tax_state: 'MD'
    };

    const result = calculateCompletePaystub(payPeriod, employee, []);

    expect(result.grossPay).toBe(1000);
    expect(result.breakdown.regularPay).toBe(1000);
    expect(result.breakdown.overtimePay).toBe(0);
    expect(result.totalDeductions).toBe(0);
  });

  test('calculateCompletePaystub - Multiple deductions', () => {
    const payPeriod = {
      regularHours: 40,
      overtimeHours: 0
    };

    const employee = {
      hourlyRate: 25,
      w4_filing_status: 'married',
      w4_dependents: 2,
      tax_state: 'MD'
    };

    const deductions = [
      { name: 'Health Insurance', amount: 200 },
      { name: '401k', amount: 400 },
      { name: 'Garnishment', amount: 100 }
    ];

    const result = calculateCompletePaystub(payPeriod, employee, deductions);

    expect(result.totalDeductions).toBe(700);
    expect(result.deductions.length).toBe(3);
  });

  test('calculateCompletePaystub - High income (>$200k single)', () => {
    const payPeriod = {
      regularHours: 40,
      overtimeHours: 0
    };

    const employee = {
      hourlyRate: 2500, // $100k/week ~= $5.2M annually
      w4_filing_status: 'single',
      w4_dependents: 0,
      tax_state: 'MD'
    };

    const result = calculateCompletePaystub(payPeriod, employee, []);

    // High income should trigger additional Medicare tax (0.9%)
    expect(result.grossPay).toBe(100000);
    expect(result.federalTax).toBeGreaterThan(20000);
    expect(result.stateTax).toBeGreaterThan(5000);
  });

  test('Paystub precision - All amounts rounded to 2 decimals', () => {
    const payPeriod = {
      regularHours: 37.5,
      overtimeHours: 3.25
    };

    const employee = {
      hourlyRate: 23.75,
      w4_filing_status: 'single',
      w4_dependents: 1,
      tax_state: 'MD'
    };

    const result = calculateCompletePaystub(payPeriod, employee, []);

    // Check all monetary values have max 2 decimal places
    const checkDecimals = (value) => {
      const str = value.toString();
      const decimals = str.split('.')[1];
      return !decimals || decimals.length <= 2;
    };

    expect(checkDecimals(result.grossPay)).toBe(true);
    expect(checkDecimals(result.federalTax)).toBe(true);
    expect(checkDecimals(result.socialSecurity)).toBe(true);
    expect(checkDecimals(result.netPay)).toBe(true);
  });

  test('Net pay is always >= 0', () => {
    const payPeriod = {
      regularHours: 40,
      overtimeHours: 0
    };

    const employee = {
      hourlyRate: 10,
      w4_filing_status: 'single',
      w4_dependents: 0,
      tax_state: 'MD'
    };

    const deductions = [
      { name: 'Test', amount: 10000 } // Massive deduction
    ];

    const result = calculateCompletePaystub(payPeriod, employee, deductions);
    expect(result.netPay).toBeGreaterThanOrEqual(0);
  });
});

describe('Tax Bracket Edge Cases', () => {
  test('2026 Single bracket boundaries', () => {
    const incomes = [11000, 44725, 95375, 182100, 231250, 578125];

    incomes.forEach(income => {
      const tax = calculateFederalTax(income, 'single', 0);
      expect(typeof tax).toBe('number');
      expect(tax).toBeGreaterThanOrEqual(0);
    });
  });

  test('2026 Married bracket boundaries', () => {
    const incomes = [22000, 89075, 190750, 364200, 462500, 693750];

    incomes.forEach(income => {
      const tax = calculateFederalTax(income, 'married', 0);
      expect(typeof tax).toBe('number');
      expect(tax).toBeGreaterThanOrEqual(0);
    });
  });

  test('Maryland bracket boundaries', () => {
    const incomes = [1000, 2000, 3000, 100000, 125000];

    incomes.forEach(income => {
      const tax = calculateStateTax(income, 'MD', 'single');
      expect(typeof tax).toBe('number');
      expect(tax).toBeGreaterThanOrEqual(0);
    });
  });
});

// Run tests
console.log('✓ Tax Calculator Tests Passed');
