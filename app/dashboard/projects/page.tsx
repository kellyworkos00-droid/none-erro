'use client';

import { useEffect, useState } from 'react';
import { Briefcase, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

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
                  <th className="py-2 pr-4">Estimated</th>
                  <th className="py-2 pr-4">Actual</th>
                  <th className="py-2 pr-4">Profit</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const profit = project.quotedAmount - project.actualExpenses;
                  return (
                    <tr key={project.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.clientName}</p>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{project.tenderReference || '-'}</td>
                      <td className="py-3 pr-4 text-gray-700">{toMoney(project.quotedAmount)}</td>
                      <td className="py-3 pr-4 text-gray-700">{toMoney(project.estimatedExpenses)}</td>
                      <td className="py-3 pr-4 text-gray-700">{toMoney(project.actualExpenses)}</td>
                      <td className={`py-3 pr-4 font-medium ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {toMoney(profit)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[project.status]}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
