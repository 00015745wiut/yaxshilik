import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import donationsService from '../services/donationsService';
import { formatCurrency, formatDateTime } from '../utils/format';
import { printReceipt } from '../components/DonationReceipt';

// ─────────────────────────────────────────────────────────────────────────────
// Stat card icons
// ─────────────────────────────────────────────────────────────────────────────

const HeartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const GiftIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const HandsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loaders
// ─────────────────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-6 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          <div className="h-7 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function DonationListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex gap-4 items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function DonorDashboard() {
  const { user } = useAuth();

  const [stats, setStats]         = useState(null);
  const [donations, setDonations] = useState([]);
  const [statsLoading, setStatsLoading]         = useState(true);
  const [donationsLoading, setDonationsLoading] = useState(true);

  useEffect(() => {
    donationsService.getMyStats()
      .then(({ data }) => setStats(data))
      .finally(() => setStatsLoading(false));

    donationsService.getMyDonations()
      .then(({ data }) => setDonations(data))
      .finally(() => setDonationsLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Total Donated',
      value: stats ? formatCurrency(stats.total_donated) : '—',
      icon: <HeartIcon />,
      color: 'bg-red-50 text-red-500',
    },
    {
      label: 'Donations Made',
      value: stats ? stats.total_donations : '—',
      icon: <GiftIcon />,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Cases Supported',
      value: stats ? stats.unique_cases : '—',
      icon: <HandsIcon />,
      color: 'bg-green-50 text-green-600',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, <span className="font-medium text-gray-700">{user?.full_name}</span>
        </p>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                {icon}
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-800 leading-none">{value}</p>
                <p className="text-gray-500 text-sm mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Donation history ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Your Donation History</h2>
          {donations.length > 0 && (
            <span className="text-sm text-gray-500">
              {donations.length} donation{donations.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {donationsLoading ? (
          <DonationListSkeleton />
        ) : donations.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center
            bg-white rounded-xl shadow-sm border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No donations yet</h3>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">
              You haven&apos;t made any donations yet. Browse cases to get started!
            </p>
            <Link
              to="/cases"
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Browse Cases
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {donations.map((d) => (
              <li key={d.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100
                  flex items-center gap-4 p-4 hover:shadow-md transition-shadow">

                {/* Case thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                  {d.case_image_url ? (
                    <img
                      src={`http://localhost:5000${d.case_image_url}`}
                      alt={d.case_title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-blue-400 to-blue-600
                      flex items-center justify-center">
                      <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Middle info */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <Link
                    to={`/cases/${d.case_id}`}
                    className="text-blue-600 hover:underline font-semibold text-sm leading-snug
                      line-clamp-1 block"
                  >
                    {d.case_title}
                  </Link>
                  <p className="text-gray-400 text-xs">{formatDateTime(d.created_at)}</p>
                  <p className="font-mono text-xs text-gray-400 truncate">{d.transaction_ref}</p>
                  {d.message && (
                    <p className="text-gray-600 text-xs italic truncate">"{d.message}"</p>
                  )}
                </div>

                {/* Right: amount + print */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className="font-bold text-lg text-gray-800">
                    {formatCurrency(d.amount)}
                  </span>
                  <button
                    onClick={() => printReceipt(d, user?.full_name)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500
                      border border-gray-300 rounded-lg px-2.5 py-1.5
                      hover:text-gray-700 hover:border-gray-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
