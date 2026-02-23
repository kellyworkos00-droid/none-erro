'use client';

import { useEffect, useState } from 'react';
import { Users, DollarSign, Calendar, TrendingUp, Plus, X, Check, FileText, UserPlus, Building2 } from 'lucide-react';

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department?: { name: string };
  basicSalary: number;
  employmentStatus: string;
  hireDate: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  _count: { employees: number };
}

interface Leave {
  id: string;
  employee: { firstName: string; lastName: string; position: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason: string;
  status: string;
}

interface PayrollSummary {
  total: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  byStatus: {
    draft: number;
    processed: number;
    paid: number;
  };
}

export default function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'employees' | 'departments' | 'payroll' | 'leaves'>('employees');
  
  // Modals
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Form data
  const [newEmployee, setNewEmployee] = useState({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    departmentId: '',
    basicSalary: 0,
    employmentType: 'FULL_TIME',
    phone: '',
    bankName: '',
    bankAccount: '',
  });

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
  });

  const [newLeave, setNewLeave] = useState({
    employeeId: '',
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'employees' || activeTab === 'payroll') {
        const empRes = await fetch('/api/hr/employees', { headers });
        if (empRes.ok) {
          const data = await empRes.json();
          setEmployees(data.data.employees || []);
        }
      }

      if (activeTab === 'departments') {
        const deptRes = await fetch('/api/hr/departments', { headers });
        if (deptRes.ok) {
          const data = await deptRes.json();
          setDepartments(data.data.departments || []);
        }
      }

      if (activeTab === 'leaves') {
        const leaveRes = await fetch('/api/hr/leaves?status=PENDING', { headers });
        if (leaveRes.ok) {
          const data = await leaveRes.json();
          setLeaves(data.data.leaves || []);
        }
      }

      if (activeTab === 'payroll') {
        const currentDate = new Date();
        const payrollRes = await fetch(
          `/api/hr/payroll?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`,
          { headers }
        );
        if (payrollRes.ok) {
          const data = await payrollRes.json();
          setPayrollSummary(data.data.summary);
        }
      }
    } catch (error) {
      console.error('Error fetching HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEmployee),
      });

      if (res.ok) {
        alert('Employee created successfully!');
        setShowEmployeeModal(false);
        fetchData();
        // Reset form
        setNewEmployee({
          employeeNumber: '',
          firstName: '',
          lastName: '',
          email: '',
          position: '',
          departmentId: '',
          basicSalary: 0,
          employmentType: 'FULL_TIME',
          phone: '',
          bankName: '',
          bankAccount: '',
        });
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('An error occurred');
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/hr/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newDepartment),
      });

      if (res.ok) {
        alert('Department created successfully!');
        setShowDepartmentModal(false);
        fetchData();
        setNewDepartment({ name: '', description: '' });
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to create department');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      alert('An error occurred');
    }
  };

  const handleApproveLeave = async (leaveId: string, approved: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/hr/leaves?id=${leaveId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: approved ? 'APPROVED' : 'REJECTED',
          rejectionReason: approved ? undefined : 'Not approved',
        }),
      });

      if (res.ok) {
        alert(`Leave ${approved ? 'approved' : 'rejected'} successfully!`);
        fetchData();
      } else {
        alert('Failed to process leave');
      }
    } catch (error) {
      console.error('Error processing leave:', error);
      alert('An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Human Resources</h1>
        <p className="text-sm text-gray-600 mt-1">Manage employees, payroll, leaves, and departments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{employees.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                Active: {employees.filter(e => e.employmentStatus === 'ACTIVE').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{departments.length}</p>
              <p className="text-xs text-gray-500 mt-1">Active departments</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Leaves</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{leaves.length}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                KES {(payrollSummary?.totalNet || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Current month</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['employees', 'departments', 'payroll', 'leaves'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Employee Roster</h2>
                <button
                  onClick={() => setShowEmployeeModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Employee
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee #</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Position</th>
                      <th>Department</th>
                      <th>Salary</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id}>
                        <td className="text-sm font-medium">{emp.employeeNumber}</td>
                        <td className="text-sm">{emp.firstName} {emp.lastName}</td>
                        <td className="text-sm">{emp.email}</td>
                        <td className="text-sm">{emp.position}</td>
                        <td className="text-sm">{emp.department?.name || 'N/A'}</td>
                        <td className="text-sm">KES {emp.basicSalary.toLocaleString()}</td>
                        <td>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            emp.employmentStatus === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {emp.employmentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Departments</h2>
                <button
                  onClick={() => setShowDepartmentModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Department
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{dept.description || 'No description'}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {dept._count.employees} {dept._count.employees === 1 ? 'employee' : 'employees'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === 'payroll' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Payroll Overview</h2>
              </div>
              {payrollSummary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Gross Pay</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      KES {payrollSummary.totalGross.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Deductions</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      KES {payrollSummary.totalDeductions.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Net Pay</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      KES {payrollSummary.totalNet.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              <p className="text-gray-600">Payroll processing and history will be displayed here.</p>
            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 'leaves' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Pending Leave Requests</h2>
              <div className="space-y-3">
                {leaves.map((leave) => (
                  <div key={leave.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{leave.employee.firstName} {leave.employee.lastName}</h3>
                      <p className="text-sm text-gray-600">{leave.employee.position}</p>
                      <p className="text-sm text-gray-700 mt-2">
                        <span className="font-medium">{leave.leaveType}</span> -{' '}
                        {new Date(leave.startDate).toLocaleDateString()} to{' '}
                        {new Date(leave.endDate).toLocaleDateString()} ({leave.daysRequested} days)
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveLeave(leave.id, true)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveLeave(leave.id, false)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {leaves.length === 0 && (
                  <p className="text-gray-600 text-center py-8">No pending leave requests</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Employee</h2>
              <button onClick={() => setShowEmployeeModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Number</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.employeeNumber}
                    onChange={(e) => setNewEmployee({ ...newEmployee, employeeNumber: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.firstName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.lastName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary (KES)</label>
                  <input
                    type="number"
                    required
                    value={newEmployee.basicSalary}
                    onChange={(e) => setNewEmployee({ ...newEmployee, basicSalary: parseFloat(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={newEmployee.departmentId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, departmentId: e.target.value })}
                    className="input"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select
                    value={newEmployee.employmentType}
                    onChange={(e) => setNewEmployee({ ...newEmployee, employmentType: e.target.value })}
                    className="input"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Create Employee
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showDepartmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Department</h2>
              <button onClick={() => setShowDepartmentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Create Department
                </button>
                <button
                  type="button"
                  onClick={() => setShowDepartmentModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
>
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                KES {(summary?.totalMonthlyPayroll || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Yearly Payroll</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                KES {(summary?.totalYearlyPayroll || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payrolls</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{summary?.pendingPayrolls || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payroll Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-colors">
            <DollarSign className="w-4 h-4" />
            Process Payroll
          </button>
          <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors">
            <Users className="w-4 h-4" />
            Add Employee
          </button>
          <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors">
            <Calendar className="w-4 h-4" />
            View Schedule
          </button>
          <button className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2 transition-colors">
            <TrendingUp className="w-4 h-4" />
            Payroll Report
          </button>
        </div>
      </div>

      {/* Placeholder for employees table */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Roster</h2>
        {employees.length === 0 ? (
          <p className="text-gray-600 text-center py-12">No active employees found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="text-sm font-medium">{employee.firstName} {employee.lastName}</td>
                    <td className="text-sm">{employee.email}</td>
                    <td className="text-sm">{employee.role}</td>
                    <td className="text-sm">{formatDate(employee.lastLogin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
