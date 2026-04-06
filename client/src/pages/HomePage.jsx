import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import casesService from '../services/casesService';
import statsService from '../services/statsService';
import CaseCard from '../components/CaseCard';
import CaseCardSkeleton from '../components/CaseCardSkeleton';
import { formatCurrency, formatNumber } from '../utils/format';

// ── How It Works steps ────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Browse',
    desc: 'Explore verified charity cases across Uzbekistan.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Donate',
    desc: 'Contribute any amount securely and transparently.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Track',
    desc: 'See your impact in real time on every case you support.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth();

  const [featuredCases, setFeaturedCases] = useState([]);
  const [stats, setStats]                 = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    Promise.all([
      casesService.getCases({ sort: 'newest' }),
      statsService.getPublicStats().catch(() => null),
    ]).then(([casesRes, statsRes]) => {
      setFeaturedCases(casesRes.data.slice(0, 3));
      if (statsRes) setStats(statsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Active Cases',
      value: stats ? formatNumber(stats.total_active_cases) : '—',
      icon: '📋',
    },
    {
      label: 'Total Raised',
      value: stats ? formatCurrency(stats.total_raised) : '—',
      icon: '💰',
    },
    {
      label: 'Generous Donors',
      value: stats ? formatNumber(stats.total_donors) : '—',
      icon: '🤲',
    },
  ];

  return (
    <div className="flex flex-col">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-linear-to-br from-blue-600 to-blue-800 text-white py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center gap-4 text-4xl mb-6 select-none" aria-hidden>
            ❤️ 🤲 🌟
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
            Make a Difference Today
          </h1>
          <p className="text-blue-100 text-lg sm:text-xl leading-relaxed max-w-xl mx-auto mb-10">
            Connect with verified charity cases and contribute to meaningful causes across Uzbekistan.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/cases"
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-7 py-3
                rounded-lg transition-colors shadow-md"
            >
              Browse Cases
            </Link>
            <Link
              to={user ? '/cases' : '/register'}
              className="border-2 border-white text-white hover:bg-white/10 font-semibold
                px-7 py-3 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100 py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {statCards.map(({ label, value, icon }) => (
            <div key={label}
              className="flex flex-col items-center text-center bg-gray-50 rounded-xl p-6 shadow-sm">
              <span className="text-3xl mb-2 select-none" aria-hidden>{icon}</span>
              <p className="text-2xl font-extrabold text-gray-800">{value}</p>
              <p className="text-gray-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Cases ──────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Featured Cases</h2>
            <Link to="/cases"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <CaseCardSkeleton key={i} />)
              : featuredCases.map((c) => <CaseCard key={c.id} caseData={c} />)}
          </div>

          {!loading && featuredCases.length === 0 && (
            <p className="text-center text-gray-400 py-12">No cases available yet.</p>
          )}
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white text-xs
                    font-bold rounded-full flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{step.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-blue-600 py-16 px-4 text-center text-white">
        <h2 className="text-3xl font-bold mb-3">Ready to Make an Impact?</h2>
        <p className="text-blue-100 mb-8 max-w-md mx-auto">
          Join thousands of donors helping families across Uzbekistan every day.
        </p>
        <Link
          to={user ? '/cases' : '/register'}
          className="inline-block bg-white text-blue-700 hover:bg-blue-50 font-semibold
            px-8 py-3 rounded-lg transition-colors shadow-md"
        >
          {user ? 'Browse Cases' : 'Create an Account'}
        </Link>
      </section>
    </div>
  );
}
