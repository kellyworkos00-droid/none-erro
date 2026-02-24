'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, XCircle, CheckCircle, X, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  createdAt: Date;
  alertRule?: {
    eventType: string;
  };
}

interface AlertsPanelProps {
  maxVisible?: number;
}

export function AlertsPanel({ maxVisible = 3 }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/alerts?take=10');
      if (response.ok) {
        const result = await response.json();
        setAlerts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          alertIds: [alertId],
        }),
      });

      if (response.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
        );
        toast.success('Alert acknowledged');
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          alertIds: [alertId],
        }),
      });

      if (response.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        toast.success('Alert resolved');
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'HIGH':
        return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      default:
        return 'bg-blue-50 border-blue-300 text-blue-900';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'HIGH':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  const visibleAlerts = isExpanded ? alerts : alerts.slice(0, maxVisible);
  const hasMore = alerts.length > maxVisible;

  return (
    <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          Active Alerts ({alerts.length})
        </h3>
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
            <ChevronDown
              className={`w-4 h-4 transition ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`border rounded-lg p-3 flex gap-3 items-start ${getSeverityColor(
              alert.severity
            )}`}
          >
            <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(alert.severity)}</div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-0.5">{alert.title}</h4>
              <p className="text-sm opacity-90 mb-2">{alert.message}</p>
              <p className="text-xs opacity-75">
                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
              </p>
            </div>

            <div className="flex gap-1 flex-shrink-0">
              {alert.status !== 'ACKNOWLEDGED' && (
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  className="p-1 hover:bg-opacity-75 rounded transition opacity-75 hover:opacity-100"
                  title="Acknowledge"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleResolve(alert.id)}
                className="p-1 hover:bg-opacity-75 rounded transition opacity-75 hover:opacity-100"
                title="Resolve"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
