'use client';

import { useEffect, useState } from 'react';
import { Briefcase, DollarSign, TrendingUp, AlertCircle, Plus, Trash2, X } from 'lucide-react';

interface ProjectSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalSpent: number;
  projectsAtRisk: number;
}

interface Project {
  id: string;
  name: string;
  clientName: string;
  tenderReference: string | null;
  description: string | null;
  quotedAmount: number;
  estimatedExpenses: number;
  actualExpenses: number;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface ProjectExpense {
  id: string;
  projectId: string;
  description: string;
  category: 'LABOR' | 'MATERIALS' | 'EQUIPMENT' | 'SUBCONTRACTOR' | 'OVERHEAD' | 'OTHER';
  amount: number;
  date: string;
  notes: string | null;
}

interface CreateProjectForm {
  name: string;
  clientName: string;
  tenderReference: string;
  description: string;
  quotedAmount: string;
  estimatedExpenses: string;
  actualExpenses: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface ExpenseForm {
  description: string;
  category: 'LABOR' | 'MATERIALS' | 'EQUIPMENT' | 'SUBCONTRACTOR' | 'OVERHEAD' | 'OTHER';
  amount: string;
  date: string;
  notes: string;
}

const allowedRoles = ['ADMIN', 'FINANCE_MANAGER'];

export default function ProjectsPage() {
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Expense tracking state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [expenseSuccess, setExpenseSuccess] = useState('');

  const [form, setForm] = useState<CreateProjectForm>({
    name: '',
    clientName: '',
    tenderReference: '',
    description: '',
    quotedAmount: '0',
    estimatedExpenses: '0',
    actualExpenses: '0',
    status: 'PLANNING',
  });

  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    description: '',
    category: 'LABOR',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to continue');
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    try {
      setLoading(true);
      setError('');

      const userResponse = await fetch('/api/auth/me', { headers });
      if (!userResponse.ok) {
        setError('Unable to verify your account');
        setLoading(false);
        return;
      }

      const userData = await userResponse.json();
      const role = userData?.data?.role || '';
      setUserRole(role);

      if (!allowedRoles.includes(role)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const [summaryResponse, projectsResponse] = await Promise.all([
        fetch('/api/projects/summary', { headers }),
        fetch('/api/projects', { headers }),
      ]);

      if (!summaryResponse.ok || !projectsResponse.ok) {
        setError('Failed to load projects data');
        setLoading(false);
        return;
      }

      const summaryPayload = await summaryResponse.json();
      const projectsPayload = await projectsResponse.json();

      setSummary(summaryPayload.data);
      setProjects(projectsPayload.data || []);
      setAccessDenied(false);
    } catch (fetchError) {
      console.error('Error fetching projects data:', fetchError);
      setError('Failed to load projects data');
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async (projectId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoadingExpenses(true);
      setExpenseError('');
      const response = await fetch(`/api/projects/${projectId}/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setExpenseError('Failed to load expenses');
        return;
      }

      const data = await response.json();
      setExpenses(data.data || []);
    } catch (err) {
      console.error('Error loading expenses:', err);
      setExpenseError('Failed to load expenses');
    } finally {
      setLoadingExpenses(false);
    }
  };

  const openExpenseModal = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowExpenseModal(true);
    setExpenseForm({
      description: '',
      category: 'LABOR',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setExpenseSuccess('');
    setExpenseError('');
    await loadExpenses(projectId);
  };

  const handleAddExpense = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedProjectId) {
      setExpenseError('No project selected');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setExpenseError('Please login to continue');
      return;
    }

    if (!expenseForm.description.trim()) {
      setExpenseError('Expense description is required');
      return;
    }

    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setExpenseError('Expense amount must be greater than 0');
      return;
    }

    try {
      setSubmittingExpense(true);
      setExpenseError('');
      setExpenseSuccess('');

      const response = await fetch(`/api/projects/${selectedProjectId}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: expenseForm.description,
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          date: expenseForm.date,
          notes: expenseForm.notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setExpenseError(error.message || 'Failed to add expense');
        return;
      }

      setExpenseSuccess('Expense added successfully');
      setExpenseForm({
        description: '',
        category: 'LABOR',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });

      // Reload expenses and projects
      await loadExpenses(selectedProjectId);
      await fetchData();
    } catch (err) {
      console.error('Error adding expense:', err);
      setExpenseError('Failed to add expense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!selectedProjectId || !confirm('Are you sure you want to delete this expense?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/projects/${selectedProjectId}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setExpenseError('Failed to delete expense');
        return;
      }

      setExpenseSuccess('Expense deleted successfully');
      await loadExpenses(selectedProjectId);
      await fetchData();
    } catch (err) {
      console.error('Error deleting expense:', err);
      setExpenseError('Failed to delete expense');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to continue');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          clientName: form.clientName,
          tenderReference: form.tenderReference,
          description: form.description,
          quotedAmount: Number(form.quotedAmount || 0),
          estimatedExpenses: Number(form.estimatedExpenses || 0),
          actualExpenses: Number(form.actualExpenses || 0),
          status: form.status,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload?.error?.message || 'Failed to create project');
        return;
      }

      setSuccess('Project created successfully');
      setForm({
        name: '',
        clientName: '',
        tenderReference: '',
        description: '',
        quotedAmount: '0',
        estimatedExpenses: '0',
        actualExpenses: '0',
        status: 'PLANNING',
      });

      await fetchData();
    } catch (createError) {
      console.error('Create project error:', createError);
      setError('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedProfit = Number(form.quotedAmount || 0) - Number(form.estimatedExpenses || 0);
  const currentProfit = Number(form.quotedAmount || 0) - Number(form.actualExpenses || 0);
  const budgetUtilization = summary?.totalBudget
    ? ((summary.totalSpent / summary.totalBudget) * 100).toFixed(1)
    : '0';

  if (accessDenied) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Project Management</h1>
        <p className="text-sm text-gray-600 mt-2">
          Access denied. This module is only available to Admin and Owner users.
        </p>
        <p className="text-xs text-gray-500 mt-2">Current role: {userRole || 'Unknown'}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statusStyles: Record<Project['status'], string> = {
    PLANNING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-200 text-gray-700',
  };

  const toMoney = (value: number) => `KES ${value.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Project Management</h1>
        <p className="text-sm text-gray-600 mt-1">Tender quotations, expense tracking, and project profitability</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{success}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{summary?.activeProjects || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Quoted Value</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{toMoney(summary?.totalBudget || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Utilized</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{budgetUtilization}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Projects At Risk</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{summary?.projectsAtRisk || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Tender Project</h2>
          <form onSubmit={handleCreateProject} className="space-y-3">
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Project name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Client name"
              value={form.clientName}
              onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Tender reference"
              value={form.tenderReference}
              onChange={(event) => setForm((prev) => ({ ...prev, tenderReference: event.target.value }))}
            />
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                placeholder="Quoted amount"
                value={form.quotedAmount}
                onChange={(event) => setForm((prev) => ({ ...prev, quotedAmount: event.target.value }))}
                required
              />
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                placeholder="Estimated expenses"
                value={form.estimatedExpenses}
                onChange={(event) => setForm((prev) => ({ ...prev, estimatedExpenses: event.target.value }))}
                required
              />
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                placeholder="Actual expenses"
                value={form.actualExpenses}
                onChange={(event) => setForm((prev) => ({ ...prev, actualExpenses: event.target.value }))}
                required
              />
            </div>

            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value as CreateProjectForm['status'] }))
              }
            >
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-blue-700">Estimated Profit</p>
                <p className="font-semibold text-blue-900">{toMoney(estimatedProfit)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="text-purple-700">Current Profit</p>
                <p className="font-semibold text-purple-900">{toMoney(currentProfit)}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Create Project'}
            </button>
          </form>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Status Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {summary?.activeProjects || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {summary?.completedProjects || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                {summary?.totalProjects || 0}
              </span>
            </div>
            <div className="pt-2">
              <p className="text-xs text-gray-600">
                Spent: {toMoney(summary?.totalSpent || 0)} / Quoted: {toMoney(summary?.totalBudget || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-gray-600 text-center py-12">No projects yet. Add your first tender project above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-2 pr-4">Project</th>
                  <th className="py-2 pr-4">Tender Ref</th>
                  <th className="py-2 pr-4">Quoted</th>
                  <th className="py-2 pr-4">Actual</th>
                  <th className="py-2 pr-4">Budget Used</th>
                  <th className="py-2 pr-4">Profit</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const profit = project.quotedAmount - project.actualExpenses;
                  const budgetPercentage = project.quotedAmount > 0 
                    ? Math.min(100, Math.round((project.actualExpenses / project.quotedAmount) * 100))
                    : 0;
                  const isAtRisk = budgetPercentage >= 80;
                  const isOverBudget = project.actualExpenses > project.quotedAmount;

                  return (
                    <tr key={project.id} className={`border-b border-gray-100 ${isOverBudget ? 'bg-red-50' : isAtRisk ? 'bg-yellow-50' : ''}`}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.clientName}</p>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{project.tenderReference || '-'}</td>
                      <td className="py-3 pr-4 text-gray-700">{toMoney(project.quotedAmount)}</td>
                      <td className="py-3 pr-4 text-gray-700">{toMoney(project.actualExpenses)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isOverBudget ? 'bg-red-600' : isAtRisk ? 'bg-yellow-500' : 'bg-green-600'
                              }`}
                              style={{ width: `${budgetPercentage}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            isOverBudget ? 'text-red-600' : isAtRisk ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {budgetPercentage}%
                          </span>
                        </div>
                      </td>
                      <td className={`py-3 pr-4 font-medium ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {toMoney(profit)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[project.status]}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => openExpenseModal(project.id)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Expenses
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Project Expenses - {projects.find(p => p.id === selectedProjectId)?.name}
              </h2>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Budget Status */}
              {selectedProjectId && projects.find(p => p.id === selectedProjectId) && (() => {
                const project = projects.find(p => p.id === selectedProjectId)!;
                const budgetPercentage = project.quotedAmount > 0 
                  ? Math.round((project.actualExpenses / project.quotedAmount) * 100)
                  : 0;
                const remaining = project.quotedAmount - project.actualExpenses;
                const isOverBudget = project.actualExpenses > project.quotedAmount;

                return (
                  <div className={`p-4 rounded-lg border ${
                    isOverBudget ? 'bg-red-50 border-red-200' : budgetPercentage >= 80 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Quoted Budget</p>
                        <p className="font-semibold text-gray-900">{toMoney(project.quotedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Spent</p>
                        <p className="font-semibold text-gray-900">{toMoney(project.actualExpenses)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Remaining</p>
                        <p className={`font-semibold ${remaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {toMoney(remaining)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Used</p>
                        <p className={`font-semibold ${isOverBudget ? 'text-red-700' : budgetPercentage >= 80 ? 'text-yellow-700' : 'text-green-700'}`}>
                          {budgetPercentage}%
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isOverBudget ? 'bg-red-600' : budgetPercentage >= 80 ? 'bg-yellow-500' : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(100, budgetPercentage)}%` }}
                      />
                    </div>
                    {isOverBudget && (
                      <p className="text-xs text-red-700 mt-2 font-medium">⚠️ Over budget by {toMoney(Math.abs(remaining))}</p>
                    )}
                    {!isOverBudget && budgetPercentage >= 80 && (
                      <p className="text-xs text-yellow-700 mt-2 font-medium">⚠️ Approaching budget limit</p>
                    )}
                  </div>
                );
              })()}

              {/* Add Expense Form */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Daily Expense</h3>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  {expenseError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {expenseError}
                    </div>
                  )}
                  {expenseSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                      {expenseSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Expense description"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value as ExpenseForm['category'] }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="LABOR">Labor</option>
                      <option value="MATERIALS">Materials</option>
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="SUBCONTRACTOR">Subcontractor</option>
                      <option value="OVERHEAD">Overhead</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Amount"
                      min="0"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <textarea
                    placeholder="Notes (optional)"
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    rows={2}
                  />

                  <button
                    type="submit"
                    disabled={submittingExpense}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {submittingExpense ? 'Adding...' : 'Add Expense'}
                  </button>
                </form>
              </div>

              {/* Expense List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense History</h3>
                {loadingExpenses ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : expenses.length === 0 ? (
                  <p className="text-center py-8 text-gray-600">No expenses recorded yet. Add your first expense above.</p>
                ) : (
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{expense.description}</span>
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                              {expense.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>{new Date(expense.date).toLocaleDateString()}</span>
                            {expense.notes && <span className="italic">{expense.notes}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{toMoney(expense.amount)}</p>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-700 text-xs font-medium mt-1"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Category Summary */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-3">Breakdown by Category</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACTOR', 'OVERHEAD', 'OTHER'].map(category => {
                          const categoryTotal = expenses
                            .filter(e => e.category === category)
                            .reduce((sum, e) => sum + e.amount, 0);
                          if (categoryTotal === 0) return null;
                          return (
                            <div key={category} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                              <p className="text-gray-600">{category}</p>
                              <p className="font-semibold text-gray-900">{toMoney(categoryTotal)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
