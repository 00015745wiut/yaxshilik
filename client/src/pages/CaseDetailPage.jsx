import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import casesService from '../services/casesService';
import donationsService from '../services/donationsService';
import ProgressBar from '../components/ProgressBar';
import DonationConfirmModal from '../components/DonationConfirmModal';
import { formatCurrency, formatDate, timeAgo } from '../utils/format';

const PRESET_AMOUNTS = [10_000, 25_000, 50_000, 100_000];

const CATEGORY_GRADIENTS = {
  'Medical':          { gradient: 'from-red-100 to-red-200',       emoji: '❤️',  text: 'text-red-600'    },
  'Education':        { gradient: 'from-blue-100 to-blue-200',     emoji: '📚',  text: 'text-blue-600'   },
  'Emergency Relief': { gradient: 'from-orange-100 to-orange-200', emoji: '🏠',  text: 'text-orange-600' },
  'Community':        { gradient: 'from-purple-100 to-purple-200', emoji: '📖',  text: 'text-purple-600' },
  'Housing':          { gradient: 'from-green-100 to-green-200',   emoji: '🏡',  text: 'text-green-600'  },
};

const DEFAULT_GRADIENT = { gradient: 'from-gray-100 to-gray-200', emoji: '🤲', text: 'text-gray-600' };

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          <div className="aspect-video bg-gray-200 rounded-2xl" />
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="space-y-2 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="bg-gray-200 rounded-2xl h-96" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Donation form
// ─────────────────────────────────────────────────────────────────────────────

function DonationForm({ caseData }) {
  const { user } = useAuth();

  const [amount, setAmount]         = useState('');
  const [preset, setPreset]         = useState(null);
  const [message, setMessage]       = useState('');
  const [amountError, setAmountError] = useState('');
  const [showModal, setShowModal]   = useState(false);

  function selectPreset(val) {
    setPreset(val);
    setAmount(String(val));
    setAmountError('');
  }

  function handleAmountChange(e) {
    setPreset(null);
    setAmount(e.target.value);
    setAmountError('');
  }

  function validate() {
    const n = Number(amount);
    if (!amount || isNaN(n) || n < 1000) {
      setAmountError('Minimum donation is 1,000 UZS');
      return false;
    }
    if (n > 50_000_000) {
      setAmountError('Maximum donation is 50,000,000 UZS');
      return false;
    }
    return true;
  }

  function handleDonateClick() {
    if (!validate()) return;
    setShowModal(true);
  }

  async function handleConfirm() {
    const { data } = await donationsService.checkout(
      caseData.id, Number(amount), message || undefined
    );
    if (!data?.checkout_url) {
      throw new Error('Could not start the payment. Please try again.');
    }
    // Hand off to Multicard's hosted checkout. The browser navigates away; the
    // never-resolving promise keeps the modal in its loading state until then.
    window.location.assign(data.checkout_url);
    await new Promise(() => {});
  }

  return (
    <>
      <div className="space-y-5">
        <h3 className="text-lg font-bold text-gray-800">Make a Donation</h3>

        {/* Preset buttons */}
        <div className="grid grid-cols-2 gap-2">
          {PRESET_AMOUNTS.map((val) => (
            <button
              key={val}
              onClick={() => selectPreset(val)}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors
                ${preset === val
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'}`}
            >
              {formatCurrency(val)}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Enter amount"
              min={1000}
              max={50_000_000}
              className={`w-full pl-4 pr-16 py-2.5 rounded-lg border text-gray-800 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                transition-colors
                ${amountError ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
              UZS
            </span>
          </div>
          {amountError && (
            <p className="mt-1.5 text-xs text-red-600">{amountError}</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="Leave a word of support…"
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-800
              placeholder-gray-400 resize-none hover:border-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-colors"
          />
          <p className="text-right text-xs text-gray-400 mt-0.5">{message.length}/200</p>
        </div>

        {/* CTA */}
        {user ? (
          <>
            <button
              onClick={handleDonateClick}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold
                rounded-lg transition-colors text-base"
            >
              Donate Now
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 -mt-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure payment via Multicard
            </p>
          </>
        ) : (
          <Link
            to="/login"
            className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold
              rounded-lg transition-colors text-base text-center"
          >
            Sign in to Donate
          </Link>
        )}
      </div>

      {showModal && (
        <DonationConfirmModal
          caseTitle={caseData.title}
          amount={Number(amount)}
          message={message}
          confirmLabel="Proceed to Payment"
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const { id }                          = useParams();
  const [caseData, setCaseData]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [notFound, setNotFound]         = useState(false);

  const fetchCase = useCallback(() => {
    casesService.getCaseById(id)
      .then(({ data }) => setCaseData(data))
      .catch((err) => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  if (loading) return <DetailSkeleton />;

  if (notFound) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-2xl font-bold text-gray-800">Case not found</h2>
        <Link to="/cases" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to all cases
        </Link>
      </div>
    );
  }

  const {
    title, description, image_url, goal_amount, raised_amount,
    category_name, status, created_at, recent_donations = [],
  } = caseData;

  const placeholder = CATEGORY_GRADIENTS[category_name] ?? DEFAULT_GRADIENT;
  const donationCount = recent_donations.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-7">

          {/* Image */}
          <div className="aspect-video rounded-2xl overflow-hidden shadow-md">
            {image_url ? (
              <img
                src={`http://localhost:5000${image_url}`}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full bg-linear-to-br ${placeholder.gradient} flex flex-col items-center justify-center gap-3`}>
                <span className="text-6xl select-none" aria-hidden>{placeholder.emoji}</span>
                <span className={`text-sm font-bold uppercase tracking-widest ${placeholder.text}`}>
                  {category_name}
                </span>
              </div>
            )}
          </div>

          {/* Category + title */}
          {category_name && (
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold
              px-3 py-1 rounded-full">
              {category_name}
            </span>
          )}
          <h1 className="text-3xl font-bold text-gray-800 leading-snug -mt-3">
            {title}
          </h1>
          <p className="text-sm text-gray-400 -mt-4">
            Posted on {formatDate(created_at)}
          </p>

          {/* Description */}
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
              {description}
            </p>
          </div>

          {/* Recent Donations */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              Recent Donations
              {donationCount > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({donationCount})
                </span>
              )}
            </h2>

            {recent_donations.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-4xl mb-2">💝</p>
                <p className="text-gray-500 font-medium">Be the first to donate!</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-100 shadow-sm">
                {recent_donations.map((d, i) => (
                  <li key={d.id ?? i} className="flex items-start gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center
                      justify-center font-bold text-sm shrink-0 mt-0.5">
                      {d.donor_name ? d.donor_name[0].toUpperCase() : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">
                          {d.donor_name ?? 'Anonymous'}
                        </span>
                        <span className="font-bold text-blue-600 text-sm shrink-0">
                          {formatCurrency(d.amount)}
                        </span>
                      </div>
                      {d.message && (
                        <p className="text-gray-500 text-sm italic mt-0.5 truncate">
                          "{d.message}"
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-1">{timeAgo(d.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN (sticky sidebar) ────────────────────────────────── */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5">

            {/* Progress */}
            <div className="space-y-2">
              <div className="h-4">
                <ProgressBar raised={raised_amount} goal={goal_amount} />
              </div>
              <div>
                <span className="text-xl font-extrabold text-gray-800">
                  {formatCurrency(raised_amount)}
                </span>
                <span className="text-gray-500 text-sm ml-1">
                  raised of{' '}
                  <span className="font-semibold text-gray-700">{formatCurrency(goal_amount)}</span>
                </span>
              </div>
              {donationCount > 0 && (
                <p className="text-sm text-gray-500">
                  {donationCount} donation{donationCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Status / form */}
            {status === 'completed' ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-2xl mb-1">🎉</p>
                <p className="font-bold text-green-700">Goal Reached!</p>
                <p className="text-green-600 text-sm mt-1">Thank you to all donors!</p>
              </div>
            ) : (
              <DonationForm caseData={caseData} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
