import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import donationsService from '../services/donationsService';
import { printReceipt } from '../components/DonationReceipt';
import { formatCurrency, formatDateTime } from '../utils/format';
import Spinner from '../components/Spinner';

// Poll the backend (which reconciles with Multicard) until the payment reaches
// a terminal state. Covers the localhost case where the gateway callback can't
// reach our server.
const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS      = 24; // ~60s

export default function PaymentReturnPage() {
  const [params]            = useSearchParams();
  const { user }            = useAuth();
  const donationId          = params.get('donation');

  // 'checking' | 'paid' | 'failed' | 'timeout' | 'error'
  const [phase, setPhase]   = useState(donationId ? 'checking' : 'error');
  const [donation, setDonation] = useState(null);
  const timer               = useRef(null);

  useEffect(() => {
    if (!donationId) return;

    let attempts = 0;
    let cancelled = false;

    async function poll() {
      attempts += 1;
      try {
        const { data } = await donationsService.getStatus(donationId);
        if (cancelled) return;

        if (data.status === 'paid') {
          setDonation(data);
          setPhase('paid');
          return;
        }
        if (data.status === 'failed') {
          setDonation(data);
          setPhase('failed');
          return;
        }
        // still pending → keep polling
        if (attempts >= MAX_ATTEMPTS) {
          setDonation(data);
          setPhase('timeout');
          return;
        }
        timer.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        if (attempts >= MAX_ATTEMPTS) {
          setPhase('error');
          return;
        }
        timer.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [donationId]);

  function handlePrint() {
    printReceipt(
      {
        created_at:      donation.created_at,
        amount:          donation.amount,
        message:         donation.message,
        case_title:      donation.case_title,
        transaction_ref: donation.transaction_ref,
      },
      user?.full_name || 'Donor'
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">

        {/* ── Checking ─────────────────────────────────────────────── */}
        {phase === 'checking' && (
          <div className="space-y-5">
            <div className="flex justify-center">
              <Spinner size="lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Confirming your payment…</h1>
              <p className="text-gray-500 text-sm mt-1">
                This usually takes a few seconds. Please don't close this page.
              </p>
            </div>
          </div>
        )}

        {/* ── Paid ─────────────────────────────────────────────────── */}
        {phase === 'paid' && donation && (
          <div className="space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center
                animate-[bounce_0.6s_ease-out]">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-800">Thank You!</h1>
              <p className="text-gray-600 text-sm mt-1">
                Your donation of{' '}
                <span className="font-semibold text-blue-600">{formatCurrency(donation.amount)}</span>
                {' '}was successful.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Case</span>
                <span className="text-gray-800 font-medium text-right">{donation.case_title}</span>
              </div>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Reference</span>
                <span className="font-mono font-semibold text-gray-800 text-xs text-right break-all">
                  {donation.transaction_ref}
                </span>
              </div>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Date</span>
                <span className="text-gray-800 text-right">
                  {formatDateTime(donation.paid_at || donation.created_at)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handlePrint}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                  rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
              <Link
                to="/dashboard"
                className="block w-full py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700
                  font-semibold rounded-lg text-sm transition-colors"
              >
                View My Donations
              </Link>
              <Link
                to={`/cases/${donation.case_id}`}
                className="block w-full py-2.5 text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                Back to the case
              </Link>
            </div>
          </div>
        )}

        {/* ── Failed ───────────────────────────────────────────────── */}
        {phase === 'failed' && (
          <div className="space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Payment not completed</h1>
              <p className="text-gray-500 text-sm mt-1">
                Your card was not charged. You can try again whenever you're ready.
              </p>
            </div>
            <div className="space-y-2">
              {donation?.case_id && (
                <Link
                  to={`/cases/${donation.case_id}`}
                  className="block w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                    rounded-lg text-sm transition-colors"
                >
                  Try Again
                </Link>
              )}
              <Link
                to="/cases"
                className="block w-full py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700
                  font-semibold rounded-lg text-sm transition-colors"
              >
                Browse Cases
              </Link>
            </div>
          </div>
        )}

        {/* ── Timeout / Error ──────────────────────────────────────── */}
        {(phase === 'timeout' || phase === 'error') && (
          <div className="space-y-5">
            <p className="text-4xl">⌛</p>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {phase === 'error' ? 'Something went wrong' : 'Still processing'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {phase === 'error'
                  ? "We couldn't confirm this payment right now."
                  : 'Your payment is taking longer than usual to confirm.'}
                {' '}You can check your donation history shortly.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                  rounded-lg text-sm transition-colors"
              >
                Check Again
              </button>
              <Link
                to="/dashboard"
                className="block w-full py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700
                  font-semibold rounded-lg text-sm transition-colors"
              >
                View My Donations
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
