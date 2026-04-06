import { useState } from 'react';
import { formatCurrency } from '../utils/format';

export default function DonationConfirmModal({ caseTitle, amount, message, onCancel, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleConfirm() {
    setLoading(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      const data = err.response?.data;
      const msg = Array.isArray(data?.errors)
        ? data.errors[0].msg
        : (data?.error || 'Donation failed. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!loading ? onCancel : undefined}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Confirm Your Donation</h2>
          {!loading && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Details */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Case</p>
            <p className="text-gray-800 font-semibold mt-0.5 leading-snug">{caseTitle}</p>
          </div>
          <div className="border-t border-gray-200" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Amount</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-0.5">{formatCurrency(amount)}</p>
          </div>
          {message && (
            <>
              <div className="border-t border-gray-200" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Your message</p>
                <p className="text-gray-700 text-sm mt-0.5 italic">"{message}"</p>
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700
            rounded-lg px-3 py-2.5 text-sm">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
            </svg>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700
              hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
              bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm
              transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing…
              </>
            ) : 'Confirm Donation'}
          </button>
        </div>
      </div>
    </div>
  );
}
