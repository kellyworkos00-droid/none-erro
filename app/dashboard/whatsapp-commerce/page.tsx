'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Store, Package, ShoppingCart, Bell, BarChart3, Settings, CheckCircle, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface IntegrationSettings {
  id?: string;
  whatsappNumber: string;
  whatsappApiKey: string;
  whatsappWebhookUrl: string;
  storeType: 'woocommerce' | 'shopify' | 'custom';
  storeUrl: string;
  storeApiKey: string;
  storeApiSecret: string;
  autoSyncEnabled: boolean;
  syncInterval: number;
  autoNotificationsEnabled: boolean;
  catalogEnabled: boolean;
  isConnected: boolean;
  lastSyncAt?: string;
}

interface SyncStats {
  totalProducts: number;
  syncedProducts: number;
  totalOrders: number;
  pendingOrders: number;
  messagesSent: number;
  lastSyncStatus: 'success' | 'error' | 'pending';
}

export default function WhatsAppCommercePage() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'catalog' | 'orders' | 'messages'>('overview');

  useEffect(() => {
    fetchIntegrationData();
  }, []);

  const fetchIntegrationData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [settingsRes, statsRes] = await Promise.all([
        fetch('/api/whatsapp-commerce/settings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/whatsapp-commerce/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.data || {
          whatsappNumber: '',
          whatsappApiKey: '',
          whatsappWebhookUrl: '',
          storeType: 'custom',
          storeUrl: '',
          storeApiKey: '',
          storeApiSecret: '',
          autoSyncEnabled: true,
          syncInterval: 30,
          autoNotificationsEnabled: true,
          catalogEnabled: true,
          isConnected: false,
        });
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data || {
          totalProducts: 0,
          syncedProducts: 0,
          totalOrders: 0,
          pendingOrders: 0,
          messagesSent: 0,
          lastSyncStatus: 'pending',
        });
      }
    } catch (error) {
      console.error('Error fetching integration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/whatsapp-commerce/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success('Product sync initiated successfully!');
        fetchIntegrationData();
      } else {
        toast.error('Failed to sync products');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('An error occurred during sync');
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-green-600" />
            WhatsApp Commerce Integration
          </h1>
          <p className="text-gray-600 mt-1">Connect your online store with WhatsApp Business</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncNow}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Now
          </button>
          <Link
            href="/dashboard/whatsapp-commerce/setup"
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all text-sm font-medium flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Setup Integration
          </Link>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className={`rounded-lg shadow-lg p-6 ${
        settings?.isConnected 
          ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
          : 'bg-gradient-to-r from-gray-500 to-gray-600'
      } text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings?.isConnected ? (
              <CheckCircle className="w-12 h-12" />
            ) : (
              <AlertCircle className="w-12 h-12" />
            )}
            <div>
              <h3 className="text-2xl font-bold">
                {settings?.isConnected ? 'Connected' : 'Not Connected'}
              </h3>
              <p className="text-white/80">
                {settings?.isConnected 
                  ? `WhatsApp Business • ${settings.storeType.toUpperCase()} Store`
                  : 'Set up your WhatsApp Commerce integration to get started'
                }
              </p>
            </div>
          </div>
          {settings?.isConnected && settings.lastSyncAt && (
            <div className="text-right">
              <div className="text-sm text-white/80">Last Sync</div>
              <div className="font-semibold">{new Date(settings.lastSyncAt).toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats?.totalProducts || 0}</div>
          <div className="text-blue-100 text-sm mt-1">Total Products</div>
          <div className="text-xs opacity-75 mt-2">{stats?.syncedProducts || 0} synced</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats?.totalOrders || 0}</div>
          <div className="text-green-100 text-sm mt-1">Total Orders</div>
          <div className="text-xs opacity-75 mt-2">{stats?.pendingOrders || 0} pending</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats?.messagesSent || 0}</div>
          <div className="text-purple-100 text-sm mt-1">Messages Sent</div>
          <div className="text-xs opacity-75 mt-2">Last 30 days</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            {settings?.storeType.toUpperCase() || 'N/A'}
          </div>
          <div className="text-orange-100 text-sm mt-1">Store Type</div>
          <div className="text-xs opacity-75 mt-2 truncate">{settings?.storeUrl || 'Not configured'}</div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow-lg p-6 text-white ${
          stats?.lastSyncStatus === 'success' ? 'from-teal-500 to-teal-700' :
          stats?.lastSyncStatus === 'error' ? 'from-red-500 to-red-700' :
          'from-gray-500 to-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl font-bold capitalize">{stats?.lastSyncStatus || 'Pending'}</div>
          <div className="text-white/80 text-sm mt-1">Sync Status</div>
          <div className="text-xs opacity-75 mt-2">Real-time updates</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </div>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'catalog'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Product Catalog
              </div>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'orders'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Orders
              </div>
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'messages'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Messages
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Integration Overview</h3>
              
              {!settings?.isConnected ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Integration Connected</h3>
                  <p className="text-gray-600 mb-6">Connect your WhatsApp Business and e-commerce store to get started</p>
                  <Link
                    href="/dashboard/whatsapp-commerce/setup"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Setup Integration
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900">Integration Active</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Your WhatsApp Commerce is connected and operational. Products are automatically synced from your {settings.storeType} store.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">WhatsApp Connection</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Number:</span>
                          <span className="font-semibold">{settings.whatsappNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="text-green-600 font-semibold">Connected</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Auto Notifications:</span>
                          <span className="font-semibold">{settings.autoNotificationsEnabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Store Connection</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Platform:</span>
                          <span className="font-semibold capitalize">{settings.storeType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">URL:</span>
                          <a href={settings.storeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold truncate max-w-[200px]">
                            {settings.storeUrl}
                          </a>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Auto Sync:</span>
                          <span className="font-semibold">{settings.autoSyncEnabled ? `Every ${settings.syncInterval}min` : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Integration Settings</h3>
              <p className="text-gray-600 mb-6">Configure your WhatsApp Commerce integration settings</p>
              <Link
                href="/dashboard/whatsapp-commerce/setup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                <Settings className="w-5 h-5" />
                Configure Settings
              </Link>
            </div>
          )}

          {activeTab === 'catalog' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Product Catalog</h3>
              <p className="text-gray-600 mb-6">Manage your WhatsApp product catalog</p>
              <Link
                href="/dashboard/whatsapp-commerce/catalog"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-semibold"
              >
                <Package className="w-5 h-5" />
                View Catalog
              </Link>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">WhatsApp Orders</h3>
              <p className="text-gray-600 mb-6">View and manage orders from WhatsApp</p>
              <Link
                href="/dashboard/whatsapp-commerce/orders"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold"
              >
                <ShoppingCart className="w-5 h-5" />
                View Orders
              </Link>
            </div>
          )}

          {activeTab === 'messages' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Automated Messages</h3>
              <p className="text-gray-600 mb-6">Configure automated WhatsApp notifications</p>
              <Link
                href="/dashboard/whatsapp-commerce/messages"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-semibold"
              >
                <Bell className="w-5 h-5" />
                Configure Messages
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/whatsapp-commerce/setup" className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors text-center justify-center">
            <Settings className="w-4 h-4" />
            Setup Integration
          </Link>
          <button onClick={handleSyncNow} className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors text-center justify-center">
            <RefreshCw className="w-4 h-4" />
            Sync Products
          </button>
          <Link href="/dashboard/whatsapp-commerce/catalog" className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors text-center justify-center">
            <Package className="w-4 h-4" />
            View Catalog
          </Link>
          <Link href="/dashboard/whatsapp-commerce/orders" className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors text-center justify-center">
            <ShoppingCart className="w-4 h-4" />
            View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
