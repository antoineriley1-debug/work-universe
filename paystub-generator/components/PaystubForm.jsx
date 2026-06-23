import { useState, useEffect } from 'react';
import PaystubPreview from './PaystubPreview';
import { calculateCompletePaystub } from '../lib/taxCalculator';

export default function PaystubForm() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    regularHours: 40,
    overtimeHours: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    deductions: []
  });
  const [deductionInput, setDeductionInput] = useState({ name: '', amount: '' });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    ssn: '',
    address: '',
    city: '',
    state: 'MD',
    zip: '',
    hourlyRate: '',
    taxState: 'MD',
    w4FilingStatus: 'single',
    w4Dependents: 0
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employee');
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmployee.name,
          ssn: newEmployee.ssn,
          address: newEmployee.address,
          city: newEmployee.city,
          state: newEmployee.state,
          zip: newEmployee.zip,
          hourlyRate: parseFloat(newEmployee.hourlyRate),
          taxState: newEmployee.taxState,
          w4FilingStatus: newEmployee.w4FilingStatus,
          w4Dependents: parseInt(newEmployee.w4Dependents)
        })
      });

      if (response.ok) {
        const created = await response.json();
        setEmployees([created, ...employees]);
        setSelectedEmployee(created);
        setShowNewEmployee(false);
        setNewEmployee({
          name: '',
          ssn: '',
          address: '',
          city: '',
          state: 'MD',
          zip: '',
          hourlyRate: '',
          taxState: 'MD',
          w4FilingStatus: 'single',
          w4Dependents: 0
        });
      } else {
        alert('Error creating employee');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePaystub = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      alert('Please select or create an employee');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/paystub/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          regularHours: parseFloat(formData.regularHours),
          overtimeHours: parseFloat(formData.overtimeHours) || 0,
          startDate: formData.startDate,
          endDate: formData.endDate,
          deductions: formData.deductions
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPreview({
          employee: {
            name: selectedEmployee.name,
            ssn: selectedEmployee.ssn,
            address: selectedEmployee.address,
            city: selectedEmployee.city,
            state: selectedEmployee.state,
            zip: selectedEmployee.zip,
            hourly_rate: selectedEmployee.hourly_rate,
            tax_state: selectedEmployee.tax_state
          },
          payPeriod: {
            start_date: formData.startDate,
            end_date: formData.endDate,
            hours_worked: parseFloat(formData.regularHours) + parseFloat(formData.overtimeHours || 0)
          },
          calculations: result.calculations,
          paystubId: result.paystubId
        });
      } else {
        alert('Error generating paystub');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate paystub');
    } finally {
      setLoading(false);
    }
  };

  const addDeduction = () => {
    if (deductionInput.name && deductionInput.amount) {
      setFormData({
        ...formData,
        deductions: [
          ...formData.deductions,
          {
            name: deductionInput.name,
            amount: parseFloat(deductionInput.amount),
            type: 'voluntary'
          }
        ]
      });
      setDeductionInput({ name: '', amount: '' });
    }
  };

  const removeDeduction = (index) => {
    setFormData({
      ...formData,
      deductions: formData.deductions.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Paystub Generator</h1>
        <p className="text-gray-600 mb-8">Professional, tax-compliant paystubs in seconds</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Employee Selection */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Employee</h2>
                {!showNewEmployee ? (
                  <>
                    <select
                      value={selectedEmployee?.id || ''}
                      onChange={(e) => {
                        const emp = employees.find(e => e.id === e.target.value);
                        setSelectedEmployee(emp);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    >
                      <option value="">Choose an employee...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} (${emp.hourly_rate}/hr)
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewEmployee(true)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Create New Employee
                    </button>
                  </>
                ) : (
                  <>
                    <form onSubmit={handleCreateEmployee} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                        <input
                          type="text"
                          placeholder="SSN (XXX-XX-XXXX)"
                          value={newEmployee.ssn}
                          onChange={(e) => setNewEmployee({ ...newEmployee, ssn: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Address"
                          value={newEmployee.address}
                          onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg col-span-2"
                        />
                        <input
                          type="text"
                          placeholder="City"
                          value={newEmployee.city}
                          onChange={(e) => setNewEmployee({ ...newEmployee, city: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="State"
                          value={newEmployee.state}
                          onChange={(e) => setNewEmployee({ ...newEmployee, state: e.target.value })}
                          maxLength="2"
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="ZIP"
                          value={newEmployee.zip}
                          onChange={(e) => setNewEmployee({ ...newEmployee, zip: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Hourly Rate"
                          step="0.01"
                          value={newEmployee.hourlyRate}
                          onChange={(e) => setNewEmployee({ ...newEmployee, hourlyRate: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                        <select
                          value={newEmployee.w4FilingStatus}
                          onChange={(e) => setNewEmployee({ ...newEmployee, w4FilingStatus: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                        </select>
                        <input
                          type="number"
                          placeholder="W-4 Dependents"
                          min="0"
                          value={newEmployee.w4Dependents}
                          onChange={(e) => setNewEmployee({ ...newEmployee, w4Dependents: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <select
                          value={newEmployee.taxState}
                          onChange={(e) => setNewEmployee({ ...newEmployee, taxState: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="MD">Maryland</option>
                          <option value="VA">Virginia</option>
                          <option value="DC">DC</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {loading ? 'Creating...' : 'Create Employee'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewEmployee(false)}
                          className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>

              {selectedEmployee && !showNewEmployee && (
                <>
                  {/* Pay Period Form */}
                  <form onSubmit={handleGeneratePaystub} className="space-y-6">
                    <div className="border-t pt-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Pay Period Details</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                          <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Regular Hours</label>
                          <input
                            type="number"
                            step="0.5"
                            value={formData.regularHours}
                            onChange={(e) => setFormData({ ...formData, regularHours: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Overtime Hours</label>
                          <input
                            type="number"
                            step="0.5"
                            value={formData.overtimeHours}
                            onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="border-t pt-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Deductions</h3>
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          placeholder="Deduction name (e.g., Health Insurance)"
                          value={deductionInput.name}
                          onChange={(e) => setDeductionInput({ ...deductionInput, name: e.target.value })}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Amount"
                          step="0.01"
                          value={deductionInput.amount}
                          onChange={(e) => setDeductionInput({ ...deductionInput, amount: e.target.value })}
                          className="w-24 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={addDeduction}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </div>
                      {formData.deductions.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          {formData.deductions.map((ded, idx) => (
                            <div key={idx} className="flex justify-between items-center mb-2">
                              <span>{ded.name}: ${ded.amount.toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => removeDeduction(idx)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold text-lg"
                    >
                      {loading ? 'Generating...' : 'Generate Paystub'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Preview Section */}
          {preview && <PaystubPreview data={preview} />}
        </div>
      </div>
    </div>
  );
}
