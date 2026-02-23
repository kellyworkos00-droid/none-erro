'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  categoryId?: string | null;
  amount: number;
  vendor?: string | null;
  description?: string | null;
  expenseDate: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  monthlyBudget: number;
  alertThresholdPercent: number;
}

interface ExpenseApiItem extends Expense {
  categoryRef?: { id: string; name: string } | null;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [form, setForm] = useState({
    category: '',
    categoryId: '',
    amount: '',
    vendor: '',
    description: '',
    expenseDate: '',
    paymentMethod: '',
    reference: '',
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    monthlyBudget: '',
    alertThresholdPercent: '80',
  });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/expenses?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch expenses');

      const data = (await response.json()) as {
        data: { items: ExpenseApiItem[]; budgetAlert?: string | null };
      };
      const items = data.data.items.map((item) => ({
        ...item,
        categoryId: item.categoryRef?.id || null,
        category: item.categoryRef?.name || item.category,
        budgetAlert: data.data?.budgetAlert || null,
      }));
      setExpenses(items);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/expense-categories', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      setCategories(data.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const monthlyExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((expense) => {
      const date = new Date(expense.expenseDate);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
  }, [expenses]);

  const totals = useMemo(() => {
    const totalMonth = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const average = monthlyExpenses.length > 0 ? totalMonth / monthlyExpenses.length : 0;
    const categoryCount = new Set(expenses.map((expense) => expense.category)).size;

    return {
      totalMonth,
      average,
      count: monthlyExpenses.length,
      categoryCount,
    };
  }, [expenses, monthlyExpenses]);

  const categoryBudgets = useMemo(() => {
    return categories.map((category) => {
      const spent = monthlyExpenses
        .filter((expense) =>
          expense.categoryId
            ? expense.categoryId === category.id
            : expense.category === category.name
        )
        .reduce((sum, expense) => sum + expense.amount, 0);

      const budget = category.monthlyBudget || 0;
      const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
      const isAlert = budget > 0 && percent >= category.alertThresholdPercent;

      return {
        ...category,
        spent,
        budget,
        percent,
        isAlert,
      };
    });
  }, [categories, monthlyExpenses]);

  const handleCreate = async () => {
    if (!form.category || !form.amount || !form.expenseDate) {
      toast.error('Category, amount, and date are required');
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: form.category || undefined,
          categoryId: form.categoryId || undefined,
          amount: parseFloat(form.amount),
          vendor: form.vendor || undefined,
          description: form.description || undefined,
          expenseDate: form.expenseDate,
          paymentMethod: form.paymentMethod || undefined,
          reference: form.reference || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create expense');
      }

      setExpenses((prev) => [data.data.expense ?? data.data, ...prev]);
      setForm({
        category: '',
        categoryId: '',
        amount: '',
        vendor: '',
        description: '',
        expenseDate: '',
        paymentMethod: '',
        reference: '',
      });
      setShowAdd(false);
      if (data.data?.budgetAlert) {
        toast.error(data.data.budgetAlert);
      }
      toast.success('Expense added');
    } catch (error) {
      console.error('Create expense error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create expense');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name) {
      toast.error('Category name is required');
      return;
    }

    try {
      setCreatingCategory(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: categoryForm.name,
          monthlyBudget: categoryForm.monthlyBudget
            ? parseFloat(categoryForm.monthlyBudget)
            : 0,
          alertThresholdPercent: categoryForm.alertThresholdPercent
            ? parseFloat(categoryForm.alertThresholdPercent)
            : 80,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create category');
      }

      setCategories((prev) => [...prev, data.data]);
      setCategoryForm({ name: '', monthlyBudget: '', alertThresholdPercent: '80' });
      setShowCategoryModal(false);
      toast.success('Category created');
    } catch (error) {
      console.error('Create category error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
              <p className="text-sm text-gray-600">Track operating costs and payments.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCategoryModal(true)} className="btn-secondary">
                + Category
              </button>
              <button onClick={() => setShowAdd(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">This Month</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(totals.totalMonth)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{totals.count} expenses logged</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Average Expense</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(totals.average)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Per expense entry</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Categories</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{totals.categoryCount}</p>
            <p className="text-xs text-gray-500 mt-1">Active expense categories</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Next Budget Alert</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {categoryBudgets.find((category) => category.isAlert)?.name || 'All good'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Based on monthly budgets</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-gray-900">Recent Expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Expense #</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No expenses found
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="text-sm font-medium">{expense.expenseNumber}</td>
                    <td className="text-sm">{expense.category}</td>
                    <td className="text-sm">{expense.vendor || '-'}</td>
                    <td className="text-sm">
                      {new Date(expense.expenseDate).toLocaleDateString('en-KE')}
                    </td>
                    <td className="text-sm font-semibold">{formatCurrency(expense.amount)}</td>
                    <td className="text-sm">{expense.description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900">Budget Alerts</h3>
          </div>
          <div className="card-body space-y-4">
            {categoryBudgets.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{category.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(category.spent)} of {formatCurrency(category.budget || 0)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${category.isAlert ? 'text-warning-700' : 'text-gray-500'}`}>
                    <AlertTriangle className={`w-4 h-4 ${category.isAlert ? 'text-warning-600' : 'text-gray-300'}`} />
                    {category.alertThresholdPercent}% alert
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`${category.isAlert ? 'bg-warning-500' : 'bg-primary-500'} h-full rounded-full transition-all`}
                    style={{ width: `${category.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Expense</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Category</label>
                <div className="space-y-2">
                  <select
                    value={form.categoryId}
                    onChange={(e) => {
                      const selected = categories.find((cat) => cat.id === e.target.value);
                      setForm((prev) => ({
                        ...prev,
                        categoryId: e.target.value,
                        category: selected?.name || '',
                      }));
                    }}
                    className="input"
                  >
                    <option value="">Select category...</option>
                    {loadingCategories ? (
                      <option value="" disabled>
                        Loading categories...
                      </option>
                    ) : (
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value, categoryId: '' }))
                    }
                    className="input"
                    placeholder="Or type a new category"
                  />
                </div>
              </div>
              <div>
                <label className="label">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Expense Date</label>
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Vendor</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={(e) => setForm((prev) => ({ ...prev, vendor: e.target.value }))}
                  className="input"
                  placeholder="Acme Services"
                />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <input
                  type="text"
                  value={form.paymentMethod}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  className="input"
                  placeholder="Bank Transfer"
                />
              </div>
              <div>
                <label className="label">Reference</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
                  className="input"
                  placeholder="INV-124"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="input"
                  placeholder="Monthly office internet"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                disabled={creating}
              >
                {creating ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Expense Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Utilities"
                />
              </div>
              <div>
                <label className="label">Monthly Budget</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={categoryForm.monthlyBudget}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, monthlyBudget: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Alert Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={categoryForm.alertThresholdPercent}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({ ...prev, alertThresholdPercent: e.target.value }))
                  }
                  className="input"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                disabled={creatingCategory}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                disabled={creatingCategory}
              >
                {creatingCategory ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
