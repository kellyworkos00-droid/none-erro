'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadError {
  transactionId: string;
  error: string;
}

interface UploadResults {
  total: number;
  imported: number;
  duplicates: number;
  errors: UploadError[];
}

interface UploadResponse {
  uploadId: string;
  fileName: string;
  results: UploadResults;
}

export default function UploadStatementPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/reconciliation/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Upload Statement</h2>
        </div>
        <div className="card-body">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-primary-900 mb-2">Instructions:</h3>
            <ul className="text-sm text-primary-800 space-y-1 list-disc list-inside">
              <li>Accept CSV or Excel (.xlsx, .xls) formats only</li>
              <li>Maximum file size: 10MB</li>
              <li>Ensure statement contains: Transaction Date, Transaction ID, Reference, Amount</li>
              <li>Duplicate transactions will be automatically detected and skipped</li>
              <li>System will attempt to auto-match transactions after upload</li>
            </ul>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center">
              <div className="p-4 bg-primary-100 rounded-full mb-4">
                <Upload className="w-8 h-8 text-primary-600" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive ? 'Drop the file here' : 'Drag & drop statement here'}
              </p>
              <p className="text-sm text-gray-600 mb-4">or click to browse files</p>
              <p className="text-xs text-gray-500">CSV, XLS, XLSX up to 10MB</p>
            </div>
          </div>

          {/* Loading State */}
          {uploading && (
            <div className="mt-6 flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Processing statement...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mt-6 bg-danger-50 border border-danger-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-danger-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-danger-900">Upload Failed</h3>
                  <p className="text-sm text-danger-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="mt-6 space-y-4">
              <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-success-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-success-900">Upload Successful</h3>
                    <p className="text-sm text-success-700 mt-1">
                      {result.results.imported} transaction(s) imported successfully
                    </p>
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-base font-semibold text-gray-900">Import Summary</h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{result.results.total}</p>
                      <p className="text-sm text-gray-600 mt-1">Total Rows</p>
                    </div>
                    <div className="text-center p-4 bg-success-50 rounded-lg">
                      <p className="text-2xl font-bold text-success-700">{result.results.imported}</p>
                      <p className="text-sm text-gray-600 mt-1">Imported</p>
                    </div>
                    <div className="text-center p-4 bg-warning-50 rounded-lg">
                      <p className="text-2xl font-bold text-warning-700">{result.results.duplicates}</p>
                      <p className="text-sm text-gray-600 mt-1">Duplicates</p>
                    </div>
                  </div>

                  {/* Errors */}
                  {result.results.errors && result.results.errors.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Errors & Warnings:</h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {result.results.errors.map((err, index) => (
                          <div key={index} className="text-sm bg-warning-50 border border-warning-200 rounded px-3 py-2">
                            <p className="text-warning-900">
                              <span className="font-medium">{err.transactionId}:</span> {err.error}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setResult(null)}
                      className="btn-secondary"
                    >
                      Upload Another
                    </button>
                    <button
                      onClick={() => window.location.href = '/dashboard/reconcile'}
                      className="btn-primary"
                    >
                      Go to ERP Suite
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
