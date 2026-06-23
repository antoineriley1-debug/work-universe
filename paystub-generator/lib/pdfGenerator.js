import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generatePaystubPDF(paystubData, employeeData, payPeriodData) {
  const {
    grossPay,
    federalTax,
    stateTax,
    socialSecurity,
    medicare,
    totalTaxes,
    deductions = [],
    totalDeductions,
    netPay,
    breakdown
  } = paystubData;

  // Create paystub HTML
  const html = createPaystubHTML(
    employeeData,
    payPeriodData,
    {
      grossPay,
      federalTax,
      stateTax,
      socialSecurity,
      medicare,
      totalTaxes,
      deductions,
      totalDeductions,
      netPay,
      breakdown
    }
  );

  // Convert HTML to canvas then to PDF
  const element = document.createElement('div');
  element.innerHTML = html;
  element.style.width = '8.5in';
  element.style.padding = '20px';
  element.style.backgroundColor = 'white';
  element.style.fontFamily = 'Arial, sans-serif';
  
  document.body.appendChild(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);

    const filename = `paystub_${employeeData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

    return filename;
  } finally {
    document.body.removeChild(element);
  }
}

function createPaystubHTML(employee, payPeriod, calculations) {
  const {
    grossPay,
    federalTax,
    stateTax,
    socialSecurity,
    medicare,
    totalTaxes,
    deductions,
    totalDeductions,
    netPay,
    breakdown
  } = calculations;

  const formatCurrency = (val) => `$${parseFloat(val).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString();

  return `
    <div style="border: 2px solid #333; padding: 20px; font-size: 12px; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        <h2 style="margin: 0 0 5px 0; font-size: 18px;">PAYSTUB</h2>
        <p style="margin: 0; font-size: 10px; color: #666;">Payment Statement</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Employee Information -->
        <div>
          <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: bold; border-bottom: 1px solid #999;">EMPLOYEE INFORMATION</h4>
          <div style="margin-bottom: 5px;">
            <strong>Name:</strong> ${employee.name}
          </div>
          <div style="margin-bottom: 5px;">
            <strong>SSN:</strong> ${maskSSN(employee.ssn)}
          </div>
          <div style="margin-bottom: 5px;">
            <strong>Address:</strong> ${employee.address || 'N/A'}
          </div>
          <div style="margin-bottom: 5px;">
            <strong>City/State:</strong> ${employee.city || ''} ${employee.state || ''}
          </div>
          <div style="margin-bottom: 5px;">
            <strong>Hourly Rate:</strong> ${formatCurrency(employee.hourly_rate)}
          </div>
          <div>
            <strong>Tax State:</strong> ${employee.tax_state}
          </div>
        </div>

        <!-- Pay Period Information -->
        <div>
          <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: bold; border-bottom: 1px solid #999;">PAY PERIOD</h4>
          <div style="margin-bottom: 5px;">
            <strong>Period Start:</strong> ${formatDate(payPeriod.start_date)}
          </div>
          <div style="margin-bottom: 5px;">
            <strong>Period End:</strong> ${formatDate(payPeriod.end_date)}
          </div>
          <div style="margin-bottom: 5px;">
            <strong>Regular Hours:</strong> ${Math.min(payPeriod.hours_worked, 40).toFixed(2)}
          </div>
          <div style="margin-bottom: 5px;">
            <strong>Overtime Hours:</strong> ${Math.max(0, payPeriod.hours_worked - 40).toFixed(2)}
          </div>
          <div style="margin-bottom: 5px;">
            <strong>Total Hours:</strong> ${payPeriod.hours_worked.toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Earnings -->
      <div style="margin-bottom: 20px; border: 1px solid #999; padding: 10px;">
        <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: bold;">EARNINGS</h4>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 8px;">
          <div>Regular Pay (${Math.min(payPeriod.hours_worked, 40).toFixed(2)} hrs)</div>
          <div style="text-align: right;">${formatCurrency(breakdown.regularPay)}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; border-bottom: 1px solid #999; padding-bottom: 8px;">
          <div>Overtime Pay (${Math.max(0, payPeriod.hours_worked - 40).toFixed(2)} hrs @ 1.5x)</div>
          <div style="text-align: right;">${formatCurrency(breakdown.overtimePay)}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; font-weight: bold; font-size: 13px;">
          <div>GROSS PAY</div>
          <div style="text-align: right;">${formatCurrency(grossPay)}</div>
        </div>
      </div>

      <!-- Deductions and Taxes -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Taxes -->
        <div style="border: 1px solid #999; padding: 10px;">
          <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: bold;">TAXES</h4>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 5px;">
            <div>Federal Income Tax</div>
            <div style="text-align: right;">${formatCurrency(federalTax)}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 5px;">
            <div>State Tax (${employee.tax_state})</div>
            <div style="text-align: right;">${formatCurrency(stateTax)}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 5px;">
            <div>Social Security (6.2%)</div>
            <div style="text-align: right;">${formatCurrency(socialSecurity)}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; border-bottom: 1px solid #999; padding-bottom: 8px;">
            <div>Medicare (1.45%)</div>
            <div style="text-align: right;">${formatCurrency(medicare)}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; font-weight: bold; font-size: 11px;">
            <div>Total Taxes</div>
            <div style="text-align: right;">${formatCurrency(totalTaxes)}</div>
          </div>
        </div>

        <!-- Deductions -->
        <div style="border: 1px solid #999; padding: 10px;">
          <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: bold;">DEDUCTIONS</h4>
          ${deductions.length > 0
            ? deductions.map(d => `
              <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 5px;">
                <div>${d.name || 'Deduction'}</div>
                <div style="text-align: right;">${formatCurrency(d.amount)}</div>
              </div>
            `).join('')
            : '<div style="color: #999;">No deductions</div>'
          }
          ${deductions.length > 0
            ? `<div style="border-top: 1px solid #999; padding-top: 8px; display: grid; grid-template-columns: 1fr auto; gap: 10px; font-weight: bold; font-size: 11px;">
                <div>Total Deductions</div>
                <div style="text-align: right;">${formatCurrency(totalDeductions)}</div>
              </div>`
            : ''
          }
        </div>
      </div>

      <!-- Net Pay -->
      <div style="background-color: #f0f0f0; border: 2px solid #333; padding: 15px; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 11px; color: #666; margin-bottom: 5px;">NET PAY (AMOUNT DUE)</div>
        <div style="font-size: 20px; font-weight: bold; color: #333;">${formatCurrency(netPay)}</div>
      </div>

      <!-- Summary -->
      <div style="font-size: 10px; color: #666; border-top: 1px solid #999; padding-top: 10px;">
        <div>Generated: ${new Date().toLocaleDateString()} | This is an official paystub for tax and legal purposes</div>
      </div>
    </div>
  `;
}

function maskSSN(ssn) {
  if (!ssn) return 'N/A';
  const last4 = ssn.slice(-4);
  return `XXX-XX-${last4}`;
}
