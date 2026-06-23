import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PaystubPreview({ data }) {
  const previewRef = useRef(null);
  const { employee, payPeriod, calculations } = data;

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

  const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString();
  const maskSSN = (ssn) => ssn ? `XXX-XX-${ssn.slice(-4)}` : 'N/A';

  const downloadPDF = async () => {
    const element = previewRef.current;
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

    const filename = `paystub_${employee.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  };

  return (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Paystub Preview</h2>

        <div ref={previewRef} className="bg-white border-2 border-gray-800 p-6 text-sm mb-6" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Header */}
          <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
            <h3 className="text-lg font-bold">PAYSTUB</h3>
            <p className="text-xs text-gray-600">Payment Statement</p>
          </div>

          {/* Employee & Pay Period Info */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
            <div>
              <h4 className="font-bold border-b mb-2">EMPLOYEE</h4>
              <div className="mb-1"><strong>Name:</strong> {employee.name}</div>
              <div className="mb-1"><strong>SSN:</strong> {maskSSN(employee.ssn)}</div>
              <div className="mb-1"><strong>Address:</strong> {employee.address || 'N/A'}</div>
              <div className="mb-1"><strong>Rate:</strong> {formatCurrency(employee.hourly_rate)}/hr</div>
            </div>
            <div>
              <h4 className="font-bold border-b mb-2">PAY PERIOD</h4>
              <div className="mb-1"><strong>Start:</strong> {formatDate(payPeriod.start_date)}</div>
              <div className="mb-1"><strong>End:</strong> {formatDate(payPeriod.end_date)}</div>
              <div className="mb-1"><strong>Hours:</strong> {payPeriod.hours_worked}</div>
              <div className="mb-1"><strong>State:</strong> {employee.tax_state}</div>
            </div>
          </div>

          {/* Earnings */}
          <div className="border border-gray-600 p-3 mb-4 text-xs">
            <h4 className="font-bold mb-2">EARNINGS</h4>
            <div className="flex justify-between mb-1">
              <span>Regular Pay</span>
              <span>{formatCurrency(breakdown.regularPay)}</span>
            </div>
            <div className="flex justify-between border-b pb-2 mb-2">
              <span>Overtime Pay (1.5x)</span>
              <span>{formatCurrency(breakdown.overtimePay)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>GROSS PAY</span>
              <span>{formatCurrency(grossPay)}</span>
            </div>
          </div>

          {/* Taxes and Deductions */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
            <div className="border border-gray-600 p-3">
              <h4 className="font-bold mb-2">TAXES</h4>
              <div className="flex justify-between mb-1">
                <span>Federal Tax</span>
                <span>{formatCurrency(federalTax)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>State Tax</span>
                <span>{formatCurrency(stateTax)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Social Security</span>
                <span>{formatCurrency(socialSecurity)}</span>
              </div>
              <div className="flex justify-between border-b pb-2 mb-2">
                <span>Medicare</span>
                <span>{formatCurrency(medicare)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Taxes</span>
                <span>{formatCurrency(totalTaxes)}</span>
              </div>
            </div>

            <div className="border border-gray-600 p-3">
              <h4 className="font-bold mb-2">DEDUCTIONS</h4>
              {deductions.length > 0 ? (
                <>
                  {deductions.map((d, i) => (
                    <div key={i} className="flex justify-between mb-1">
                      <span>{d.name}</span>
                      <span>{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total Deductions</span>
                    <span>{formatCurrency(totalDeductions)}</span>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No deductions</p>
              )}
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-gray-100 border-2 border-gray-800 p-4 text-center mb-4">
            <div className="text-xs text-gray-600 mb-2">NET PAY (AMOUNT DUE)</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(netPay)}</div>
          </div>

          {/* Footer */}
          <div className="text-xs text-gray-600 border-t pt-3">
            <div>Generated: {new Date().toLocaleDateString()} | Official paystub for tax and legal purposes</div>
          </div>
        </div>

        {/* Action Buttons */}
        <button
          onClick={downloadPDF}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold mb-2"
        >
          📥 Download PDF
        </button>

        <button
          onClick={() => window.print()}
          className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
        >
          🖨️ Print
        </button>

        {/* Summary Stats */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm">
          <h4 className="font-bold text-gray-900 mb-3">Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Gross Income:</span>
              <span className="font-bold">{formatCurrency(grossPay)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Total Taxes:</span>
              <span className="font-bold">-{formatCurrency(totalTaxes)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Deductions:</span>
              <span className="font-bold">-{formatCurrency(totalDeductions)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-bold text-green-600">
              <span>Net Income:</span>
              <span>{formatCurrency(netPay)}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            <p className="mb-1">Tax Rate: {((totalTaxes / grossPay) * 100).toFixed(1)}%</p>
            <p>Effective Rate: {((totalTaxes + totalDeductions) / grossPay * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
