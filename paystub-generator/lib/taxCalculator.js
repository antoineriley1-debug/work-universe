// Tax calculation engine for 2026 federal and Maryland state taxes

export function calculateGrossPay(regularHours, overtimeHours, hourlyRate) {
  const regularPay = Math.min(regularHours, 40) * hourlyRate;
  const overtimePay = Math.max(0, overtimeHours) * hourlyRate * 1.5;
  return regularPay + overtimePay;
}

export function calculateFederalTax(grossPay, filingStatus = 'single', dependents = 0) {
  // 2026 Federal tax brackets
  const brackets = {
    single: [
      { min: 0, max: 11000, rate: 0.10 },
      { min: 11000, max: 44725, rate: 0.12 },
      { min: 44725, max: 95375, rate: 0.22 },
      { min: 95375, max: 182100, rate: 0.24 },
      { min: 182100, max: 231250, rate: 0.32 },
      { min: 231250, max: 578125, rate: 0.35 },
      { min: 578125, max: Infinity, rate: 0.37 }
    ],
    married: [
      { min: 0, max: 22000, rate: 0.10 },
      { min: 22000, max: 89075, rate: 0.12 },
      { min: 89075, max: 190750, rate: 0.22 },
      { min: 190750, max: 364200, rate: 0.24 },
      { min: 364200, max: 462500, rate: 0.32 },
      { min: 462500, max: 693750, rate: 0.35 },
      { min: 693750, max: Infinity, rate: 0.37 }
    ]
  };

  const bracketList = brackets[filingStatus] || brackets.single;
  let tax = 0;

  for (const bracket of bracketList) {
    if (grossPay > bracket.min) {
      const taxableInBracket = Math.min(grossPay, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }
  }

  // Standard deduction reduction (simplified)
  const standardDeduction = filingStatus === 'married' ? 29200 : 14600;
  const dependentExemption = dependents * 2500; // Simplified
  const effectiveDeduction = Math.min(standardDeduction + dependentExemption, grossPay);
  
  // Recalculate with deduction
  tax = 0;
  const taxableIncome = Math.max(0, grossPay - effectiveDeduction);
  
  for (const bracket of bracketList) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }
  }

  return Math.max(0, tax);
}

export function calculateStateTax(grossPay, stateCode = 'MD', filingStatus = 'single') {
  if (stateCode !== 'MD') {
    // Default to 0 for non-MD states (can be extended)
    return 0;
  }

  // 2026 Maryland state tax brackets
  const brackets = {
    single: [
      { min: 0, max: 1000, rate: 0.02 },
      { min: 1000, max: 2000, rate: 0.03 },
      { min: 2000, max: 3000, rate: 0.04 },
      { min: 3000, max: 100000, rate: 0.0475 },
      { min: 100000, max: 125000, rate: 0.05 },
      { min: 125000, max: Infinity, rate: 0.0575 }
    ],
    married: [
      { min: 0, max: 1000, rate: 0.02 },
      { min: 1000, max: 2000, rate: 0.03 },
      { min: 2000, max: 3000, rate: 0.04 },
      { min: 3000, max: 150000, rate: 0.0475 },
      { min: 150000, max: 175000, rate: 0.05 },
      { min: 175000, max: Infinity, rate: 0.0575 }
    ]
  };

  const bracketList = brackets[filingStatus] || brackets.single;
  let tax = 0;

  for (const bracket of bracketList) {
    if (grossPay > bracket.min) {
      const taxableInBracket = Math.min(grossPay, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }
  }

  return Math.max(0, tax);
}

export function calculateSocialSecurity(grossPay) {
  // 2026 Social Security tax rate: 6.2%
  return grossPay * 0.062;
}

export function calculateMedicare(grossPay) {
  // 2026 Medicare tax rate: 1.45%
  // Additional Medicare tax of 0.9% applies to income over $200,000 (single) / $250,000 (married)
  return grossPay * 0.0145;
}

export function calculateCompletePaystub(payPeriodData, employeeData, deductionsList = []) {
  const { regularHours = 0, overtimeHours = 0 } = payPeriodData;
  const { hourlyRate, w4_filing_status = 'single', w4_dependents = 0, tax_state = 'MD' } = employeeData;

  // Calculate gross pay
  const grossPay = calculateGrossPay(regularHours, overtimeHours, hourlyRate);

  // Calculate taxes
  const federalTax = calculateFederalTax(grossPay, w4_filing_status, w4_dependents);
  const stateTax = calculateStateTax(grossPay, tax_state, w4_filing_status);
  const socialSecurity = calculateSocialSecurity(grossPay);
  const medicare = calculateMedicare(grossPay);

  // Calculate deductions
  let totalDeductions = 0;
  const deductionDetails = [];
  
  for (const deduction of deductionsList) {
    totalDeductions += deduction.amount;
    deductionDetails.push(deduction);
  }

  // Calculate net pay
  const totalTaxes = federalTax + stateTax + socialSecurity + medicare;
  const netPay = grossPay - totalTaxes - totalDeductions;

  return {
    grossPay: Math.round(grossPay * 100) / 100,
    federalTax: Math.round(federalTax * 100) / 100,
    stateTax: Math.round(stateTax * 100) / 100,
    socialSecurity: Math.round(socialSecurity * 100) / 100,
    medicare: Math.round(medicare * 100) / 100,
    totalTaxes: Math.round(totalTaxes * 100) / 100,
    deductions: deductionDetails,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.max(0, Math.round(netPay * 100) / 100),
    breakdown: {
      regularPay: Math.round(Math.min(regularHours, 40) * hourlyRate * 100) / 100,
      overtimePay: Math.round(Math.max(0, overtimeHours) * hourlyRate * 1.5 * 100) / 100
    }
  };
}
