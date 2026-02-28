'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Send,
  Users,
  User,
  DollarSign,
  Sparkles,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader,
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  currentBalance: number;
}

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  template: string;
  variables: string[];
}

export default function MessagesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<string>('GENERAL');
  const [sendingMode, setSendingMode] = useState<'single' | 'multiple' | 'all' | 'with_balance'>('single');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [minBalance, setMinBalance] = useState('1000');
  const [sendResult, setSendResult] = useState<{
    totalRecipients: number;
    successCount: number;
    failedCount: number;
    totalCost: number;
    results: Array<{
      customerName: string;
      phone: string;
      success: boolean;
      error?: string;
      cost?: number;
    }>;
  } | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchTemplates();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/customers?limit=1000', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch customers');

      const data = await response.json();
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/messages/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (sendingMode === 'single' && selectedCustomers.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }

    if (sendingMode === 'multiple' && selectedCustomers.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }

    try {
      setSending(true);
      const token = localStorage.getItem('token');

      const body: {
        message: string;
        category: string;
        customerId?: string;
        customerIds?: string[];
        group?: string;
        minBalance?: number;
      } = {
        message,
        category,
      };

      if (sendingMode === 'single' || sendingMode === 'multiple') {
        if (sendingMode === 'single') {
          body.customerId = selectedCustomers[0];
        } else {
          body.customerIds = selectedCustomers;
        }
      } else if (sendingMode === 'all') {
        body.group = 'all';
      } else if (sendingMode === 'with_balance') {
        body.group = 'with_balance';
        body.minBalance = parseFloat(minBalance) || 0;
      }

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to send message');
      }

      setSendResult(data.data.result);
      toast.success(data.data.message || 'Message sent successfully!');
      
      // Reset form
      setMessage('');
      setSelectedCustomers([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: MessageTemplate) => {
    setMessage(template.template);
    setCategory(template.category);
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied`);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  const customersWithPhone = customers.filter(c => c.phone);
  const customersWithBalance = customers.filter(c => c.currentBalance > 0 && c.phone);

  const characterCount = message.length;
  const smsCount = Math.ceil(characterCount / 160) || 1;
  const estimatedCost = smsCount * 0.8 * (
    sendingMode === 'single' ? 1 :
    sendingMode === 'multiple' ? selectedCustomers.length :
    sendingMode === 'all' ? customersWithPhone.length :
    customersWithBalance.length
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary-600" />
            Send Messages
          </h1>
          <p className="text-gray-600 mt-1">Send SMS messages to your customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Recipient Selection */}
        <div className="lg:col-span-1 space-y-6">
          {/* Sending Mode */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Select Recipients</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => { setSendingMode('single'); setSelectedCustomers([]); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                  sendingMode === 'single'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                }`}
              >
                <User className="w-5 h-5" />
                <div className="text-left flex-1">
                  <div className="font-medium">Single Customer</div>
                  <div className="text-sm text-gray-600">Send to one customer</div>
                </div>
              </button>

              <button
                onClick={() => { setSendingMode('multiple'); setSelectedCustomers([]); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                  sendingMode === 'multiple'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                }`}
              >
                <Users className="w-5 h-5" />
                <div className="text-left flex-1">
                  <div className="font-medium">Multiple Customers</div>
                  <div className="text-sm text-gray-600">Select specific customers</div>
                </div>
              </button>

              <button
                onClick={() => { setSendingMode('with_balance'); setSelectedCustomers([]); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                  sendingMode === 'with_balance'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <div className="text-left flex-1">
                  <div className="font-medium">Customers with Balance</div>
                  <div className="text-sm text-gray-600">{customersWithBalance.length} customers</div>
                </div>
              </button>

              <button
                onClick={() => { setSendingMode('all'); setSelectedCustomers([]); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                  sendingMode === 'all'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                <div className="text-left flex-1">
                  <div className="font-medium">All Customers</div>
                  <div className="text-sm text-gray-600">{customersWithPhone.length} customers</div>
                </div>
              </button>
            </div>

            {sendingMode === 'with_balance' && (
              <div className="mt-4">
                <label className="label">Minimum Balance (KES)</label>
                <input
                  type="number"
                  value={minBalance}
                  onChange={(e) => setMinBalance(e.target.value)}
                  className="input"
                  placeholder="1000"
                />
              </div>
            )}
          </div>

          {/* Customer Selection */}
          {(sendingMode === 'single' || sendingMode === 'multiple') && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">
                Select Customer{sendingMode === 'multiple' && 's'}
              </h3>
              
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input mb-3"
              />

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading...
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No customers found</div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        if (sendingMode === 'single') {
                          setSelectedCustomers([customer.id]);
                        } else {
                          setSelectedCustomers((prev) =>
                            prev.includes(customer.id)
                              ? prev.filter((id) => id !== customer.id)
                              : [...prev, customer.id]
                          );
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        selectedCustomers.includes(customer.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-200'
                      } ${!customer.phone ? 'opacity-50' : ''}`}
                      disabled={!customer.phone}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600">
                            {customer.phone || 'No phone number'}
                          </div>
                        </div>
                        {selectedCustomers.includes(customer.id) && (
                          <CheckCircle className="w-5 h-5 text-primary-600" />
                        )}
                      </div>
                      {customer.currentBalance > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          Balance: KES {customer.currentBalance.toLocaleString()}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              {selectedCustomers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700">
                    Selected: {selectedCustomers.length} customer{selectedCustomers.length > 1 && 's'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Message Composition */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message Composer */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Compose Message</h3>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Templates
              </button>
            </div>

            {showTemplates && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Message Templates</h4>
                  <button onClick={() => setShowTemplates(false)}>
                    <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition"
                    >
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                      <div className="text-xs text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">
                        {template.template.substring(0, 100)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                >
                  <option value="GENERAL">General</option>
                  <option value="PROMOTION">Promotion</option>
                  <option value="REMINDER">Reminder</option>
                  <option value="ANNOUNCEMENT">Announcement</option>
                  <option value="PAYMENT">Payment</option>
                </select>
              </div>

              <div>
                <label className="label">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input min-h-[200px] font-mono text-sm"
                  placeholder="Type your message here..."
                  maxLength={1530}
                />
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-gray-600">
                    {characterCount} / 1530 characters ({smsCount} SMS)
                  </span>
                  {characterCount > 160 && (
                    <span className="text-orange-600">
                      ⚠️ Message will be sent as {smsCount} SMS
                    </span>
                  )}
                </div>
              </div>

              {/* Cost Estimate */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Cost Estimate</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Recipients:</span>
                    <span className="font-medium text-blue-900">
                      {sendingMode === 'single' && selectedCustomers.length > 0 ? 1 :
                       sendingMode === 'multiple' ? selectedCustomers.length :
                       sendingMode === 'all' ? customersWithPhone.length :
                       customersWithBalance.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">SMS per recipient:</span>
                    <span className="font-medium text-blue-900">{smsCount}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="text-blue-700 font-medium">Estimated Cost:</span>
                    <span className="font-bold text-blue-900">
                      KES {estimatedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={sending || !message.trim()}
                className="w-full btn btn-primary flex items-center justify-center gap-2 py-4 text-lg"
              >
                {sending ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Send Result */}
          {sendResult && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Send Result</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-900">{sendResult.totalRecipients}</div>
                  <div className="text-sm text-blue-700">Total Recipients</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-900">{sendResult.successCount}</div>
                  <div className="text-sm text-green-700">Sent Successfully</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-900">{sendResult.failedCount}</div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sendResult.results.map((result, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{result.customerName}</div>
                        <div className="text-sm text-gray-600">{result.phone}</div>
                      </div>
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    {result.error && (
                      <div className="text-sm text-red-600 mt-1">Error: {result.error}</div>
                    )}
                    {result.cost && (
                      <div className="text-xs text-gray-600 mt-1">Cost: KES {result.cost}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Total Cost:</span>
                  <span className="text-xl font-bold text-gray-900">
                    KES {sendResult.totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
