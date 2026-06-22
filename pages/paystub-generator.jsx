import React, { useState } from 'react'
import { jsPDF } from 'jspdf'

export default function PaystubGenerator() {
  const [formData, setFormData] = useState({
    employee_name: 'Bruce Thomas',
    employee_ssn: '123-45-6789',
    employee_address: '18 North Lindenwood St, Philadelphia, PA 19139',
    company_name: 'Hasna Development Group LLC',
    company_address: 'Philadelphia, PA',
    hourly_rate: 13,
    hours_worked: 70,
    overtime_hours: 0,
    filing_status: 'single',
    dependents: 0,
    state: 'PA',
    pay_period_start: '2026-06-09',
    pay_period_end: '2026-06-22'
  })

  const [paystub, setPaystub] = useState(null)

  const TAX_BRACKETS_2026 = {
    single: [
      { min: 0, max: 11000, rate: 0.1 },
      { min: 11000, max: 44725, rate: 0.12 },
      { min: 44725, max: 95375, rate: 0.22 },
      { min: 95375, max: 182100, rate: 0.24 },
      { min: 182100, max: 231250, rate: 0.32 },
      { min: 231250, max: 578125, rate: 0.35 },
      { min: 578125, max: Infinity, rate: 0.37 }
    ],
    married: [
      { min: 0, max: 22000, rate: 0.1 },
      { min: 22000, max: 89075, rate: 0.12 },
      { min: 89075, max: 190750, rate: 0.22 },
      { min: 190750, max: 364200, rate: 0.24 },
      { min: 364200, max: 462500, rate: 0.32 },
      { min: 462500, max: 693750, rate: 0.35 },
      { min: 693750, max: Infinity, rate: 0.37 }
    ]
  }

  const PA_TAX_BRACKETS = [
    { min: 0, max: Infinity, rate: 0.0307 } // PA flat tax
  ]

  const calculateFederalTax = (gross) => {
    const brackets = TAX_BRACKETS_2026[formData.filing_status] || TAX_BRACKETS_2026.single
    const dependentCredit = formData.dependents * 2000
    let tax = 0

    for (const bracket of brackets) {
      if (gross > bracket.min) {
        const taxableInBracket = Math.min(gross, bracket.max) - bracket.min
        tax += taxableInBracket * bracket.rate
      }
    }

    tax = Math.max(0, tax - dependentCredit)
    return Math.round(tax * 100) / 100
  }

  const calculateStateTax = (gross) => {
    return Math.round(gross * PA_TAX_BRACKETS[0].rate * 100) / 100
  }

  const handleCalculate = () => {
    const regularHours = Math.min(formData.hours_worked, 40)
    const overtimeHours = Math.max(0, formData.hours_worked - 40)

    const regularPay = regularHours * formData.hourly_rate
    const overtimePay = overtimeHours * formData.hourly_rate * 1.5
    const gross = regularPay + overtimePay

    const federalTax = calculateFederalTax(gross)
    const stateTax = calculateStateTax(gross)
    const socialSecurity = Math.round(gross * 0.062 * 100) / 100
    const medicare = Math.round(gross * 0.0145 * 100) / 100
    const totalDeductions = federalTax + stateTax + socialSecurity + medicare
    const net = Math.round((gross - totalDeductions) * 100) / 100

    setPaystub({
      ...formData,
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
      gross,
      federalTax,
      stateTax,
      socialSecurity,
      medicare,
      totalDeductions,
      net
    })
  }

  const generatePDF = () => {
    if (!paystub) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Header
    doc.setFontSize(18)
    doc.text('PAY STUB', pageWidth / 2, 20, { align: 'center' })

    // Company info
    doc.setFontSize(10)
    doc.text(`${paystub.company_name}`, 20, 35)
    doc.text(`${paystub.company_address}`, 20, 42)

    // Employee info
    doc.setFontSize(10)
    doc.text('EMPLOYEE INFORMATION', 20, 55)
    doc.setFontSize(9)
    doc.text(`Name: ${paystub.employee_name}`, 20, 62)
    doc.text(`SSN: ${paystub.employee_ssn}`, 20, 68)
    doc.text(`Address: ${paystub.employee_address}`, 20, 74)

    // Pay period
    doc.text(`Pay Period: ${paystub.pay_period_start} to ${paystub.pay_period_end}`, 20, 85)

    // Earnings
    doc.setFontSize(10)
    doc.text('EARNINGS', 20, 100)
    doc.setFontSize(9)
    doc.text(`Regular Pay (${paystub.regularHours} hrs @ $${paystub.hourly_rate}/hr):`, 20, 107)
    doc.text(`$${paystub.regularPay.toFixed(2)}`, pageWidth - 40, 107)
    
    if (paystub.overtimeHours > 0) {
      doc.text(`Overtime Pay (${paystub.overtimeHours} hrs @ $${(paystub.hourly_rate * 1.5).toFixed(2)}/hr):`, 20, 113)
      doc.text(`$${paystub.overtimePay.toFixed(2)}`, pageWidth - 40, 113)
    }

    // Gross
    doc.setFontSize(10)
    doc.text('GROSS PAY', 20, 125)
    doc.setFontSize(11)
    doc.text(`$${paystub.gross.toFixed(2)}`, pageWidth - 40, 125)

    // Deductions
    doc.setFontSize(10)
    doc.text('DEDUCTIONS', 20, 145)
    doc.setFontSize(9)
    doc.text(`Federal Income Tax:`, 20, 152)
    doc.text(`$${paystub.federalTax.toFixed(2)}`, pageWidth - 40, 152)
    doc.text(`State Income Tax:`, 20, 158)
    doc.text(`$${paystub.stateTax.toFixed(2)}`, pageWidth - 40, 158)
    doc.text(`Social Security (6.2%):`, 20, 164)
    doc.text(`$${paystub.socialSecurity.toFixed(2)}`, pageWidth - 40, 164)
    doc.text(`Medicare (1.45%):`, 20, 170)
    doc.text(`$${paystub.medicare.toFixed(2)}`, pageWidth - 40, 170)

    // Total deductions
    doc.setFontSize(10)
    doc.text('TOTAL DEDUCTIONS', 20, 185)
    doc.setFontSize(11)
    doc.text(`$${paystub.totalDeductions.toFixed(2)}`, pageWidth - 40, 185)

    // Net pay
    doc.setFontSize(12)
    doc.setTextColor(34, 197, 94)
    doc.text('NET PAY', 20, 205)
    doc.text(`$${paystub.net.toFixed(2)}`, pageWidth - 40, 205)

    // Footer
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.text('Generated by Work Universe Paystub Generator', pageWidth / 2, pageHeight - 10, { align: 'center' })

    // Download
    doc.save(`paystub-${paystub.employee_name.replace(/\s+/g, '-')}-${paystub.pay_period_end}.pdf`)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Paystub Generator</h1>

        <div className="grid grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Employee Name</label>
              <input
                type="text"
                value={formData.employee_name}
                onChange={e => setFormData({ ...formData, employee_name: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                value={formData.hourly_rate}
                onChange={e => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hours Worked</label>
              <input
                type="number"
                value={formData.hours_worked}
                onChange={e => setFormData({ ...formData, hours_worked: parseFloat(e.target.value) })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Filing Status</label>
              <select
                value={formData.filing_status}
                onChange={e => setFormData({ ...formData, filing_status: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dependents</label>
              <input
                type="number"
                value={formData.dependents}
                onChange={e => setFormData({ ...formData, dependents: parseInt(e.target.value) })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              />
            </div>

            <button
              onClick={handleCalculate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
            >
              Calculate Paystub
            </button>
          </div>

          {/* Preview */}
          {paystub && (
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold mb-4">Pay Period Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Regular Pay:</span>
                  <span>${paystub.regularPay.toFixed(2)}</span>
                </div>
                {paystub.overtimeHours > 0 && (
                  <div className="flex justify-between">
                    <span>Overtime Pay:</span>
                    <span>${paystub.overtimePay.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-600 pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Gross Pay:</span>
                  <span>${paystub.gross.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm pt-4">
                <div className="flex justify-between text-red-400">
                  <span>Federal Tax:</span>
                  <span>-${paystub.federalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>State Tax:</span>
                  <span>-${paystub.stateTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Social Security:</span>
                  <span>-${paystub.socialSecurity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Medicare:</span>
                  <span>-${paystub.medicare.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-4">
                <div className="flex justify-between font-bold text-lg text-green-400">
                  <span>Net Pay:</span>
                  <span>${paystub.net.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={generatePDF}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded mt-4"
              >
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
