'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface ComplianceStatus {
  totalAuditLogs: number;
  criticalAlerts: number;
  warningAlerts: number;
  complianceScore: number;
  lastAuditDate: string;
}

interface AuditLog {
  id: string;
  action: string;
  description: string;
  ipAddress: string | null;
  createdAt: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AuditAndCompliancePage() {
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const [statusRes, logsRes] = await Promise.all([
          fetch('/api/compliance/status', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/compliance/audit-logs?limit=10', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatus(data.data);
        }

        if (logsRes.ok) {
          const data = await logsRes.json();
          setAuditLogs(data.data);
        }
      } catch (error) {
        console.error('Error fetching compliance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        <h1 className="text-2xl font-display font-bold text-gray-900">Audit & Compliance</h1>
        <p className="text-sm text-gray-600 mt-1">System compliance monitoring and audit logs</p>
      </div>

      {/* Compliance Score */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 backdrop-blur rounded-lg shadow-sm border border-primary-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary-900">Compliance Score</h2>
            <p className="text-sm text-primary-700 mt-1">Overall system compliance rating</p>
          </div>
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-4xl font-bold text-primary-600">{status?.complianceScore || 0}%</p>
            </div>
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="2" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 45 * ((status?.complianceScore || 0) / 100)} ${2 * Math.PI * 45}`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Audit Logs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{status?.totalAuditLogs || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{status?.criticalAlerts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Warning Alerts</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{status?.warningAlerts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Audit</p>
              <p className="text-lg font-bold text-green-600 mt-2">
                {status?.lastAuditDate ? new Date(status.lastAuditDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Compliance Checklist</h2>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-sm font-medium text-green-900">All transactions logged and auditable</span>
          </div>
          <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-sm font-medium text-green-900">Double-entry accounting verified</span>
          </div>
          <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-sm font-medium text-green-900">User authentication enforced</span>
          </div>
          <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-sm font-medium text-green-900">Data encryption enabled</span>
          </div>
          <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-sm font-medium text-green-900">Regular backups configured</span>
          </div>
        </div>
      </div>

      {/* Recent Audits */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Audit Activities</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/80 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Action</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Description</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">User</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Date</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{log.action}</td>
                    <td className="px-4 py-3 text-gray-600">{log.description}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.user.firstName} {log.user.lastName}
                      <span className="text-xs text-gray-400 block">{log.user.email}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.ipAddress || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-colors">
            <Activity className="w-4 h-4" />
            Export Audit Report
          </button>
          <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors">
            <ShieldAlert className="w-4 h-4" />
            Security Settings
          </button>
          <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors">
            <CheckCircle className="w-4 h-4" />
            Run Compliance Check
          </button>
          <button className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2 transition-colors">
            <AlertTriangle className="w-4 h-4" />
            View Alerts
          </button>
        </div>
      </div>
    </div>
  );
}
