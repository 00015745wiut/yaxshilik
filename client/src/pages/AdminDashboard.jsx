import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import casesService from '../services/casesService';
import donationsService from '../services/donationsService';
import ProgressBar from '../components/ProgressBar';
import { formatCurrency, formatDate } from '../utils/format';
import { useToast } from '../context/ToastContext';

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  closed:    'bg-gray-100 text-gray-600',
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, borderColor }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-extrabold text-gray-800 mt-1">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 h-28 shadow-sm" />
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm h-64" />
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 space-y-4">
        <p className="text-gray-800 font-semibold">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700
              hover:bg-gray-50 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white
              text-sm font-semibold transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate     = useNavigate();
  const { addToast } = useToast();

  const [stats, setStats]           = useState(null);
  const [donations, setDonations]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [closingId, setClosingId]   = useState(null); // case id pending close confirm

  function fetchData() {
    return Promise.all([
      casesService.getAdminStats(),
      donationsService.getRecentDonations(),
    ]).then(([statsRes, donationsRes]) => {
      setStats(statsRes.data);
      setDonations(donationsRes.data);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCloseCase(id) {
    try {
      await casesService.deleteCase(id);
      addToast('Case closed successfully');
      setClosingId(null);
      fetchData();
    } catch {
      addToast('Failed to close case', 'error');
      setClosingId(null);
    }
  }

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-10"><Skeleton /></div>
  );

  const statCards = [
    {
      label: 'Active Cases',
      value: stats.total_active_cases,
      borderColor: 'border-blue-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Total Donations',
      value: formatCurrency(stats.total_donations_sum),
      borderColor: 'border-green-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Total Donors',
      value: stats.total_donors,
      borderColor: 'border-purple-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'Completed Cases',
      value: stats.total_completed_cases,
      borderColor: 'border-orange-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and quick actions</p>
        </div>
        <Link
          to="/admin/cases/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
            text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Case
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Recent cases table */}
      <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Recent Cases</h2>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {stats.recent_cases.map((c) => (
            <div key={c.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-800 text-sm leading-snug">{c.title}</span>
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full
                  ${STATUS_BADGE[c.status] ?? STATUS_BADGE.closed}`}>
                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </span>
              </div>
              <p className="text-xs text-gray-500">{c.category_name ?? '—'}</p>
              <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
              <p className="text-xs text-gray-500">
                {formatCurrency(c.raised_amount)} of {formatCurrency(c.goal_amount)}
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => navigate(`/admin/cases/${c.id}/edit`)}
                  className="text-xs font-medium text-blue-600 border border-blue-200
                    px-3 py-1.5 rounded-lg hover:border-blue-400 transition-colors min-h-9">
                  Edit
                </button>
                {c.status !== 'closed' && (
                  <button onClick={() => setClosingId(c.id)}
                    className="text-xs font-medium text-red-600 border border-red-200
                      px-3 py-1.5 rounded-lg hover:border-red-400 transition-colors min-h-9">
                    Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                {['Title', 'Category', 'Goal', 'Raised', 'Progress', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recent_cases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-gray-800 line-clamp-1 max-w-[200px] block">
                      {c.title}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                    {c.category_name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">
                    {formatCurrency(c.goal_amount)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">
                    {formatCurrency(c.raised_amount)}
                  </td>
                  <td className="px-5 py-3.5 w-36">
                    <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full
                      ${STATUS_BADGE[c.status] ?? STATUS_BADGE.closed}`}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/cases/${c.id}/edit`)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700
                          border border-blue-200 hover:border-blue-400 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      {c.status !== 'closed' && (
                        <button
                          onClick={() => setClosingId(c.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-700
                            border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>{/* end desktop table wrapper */}
      </section>

      {/* Recent donations */}
      <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Recent Donations</h2>
        </div>

        {donations.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No donations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  {['Donor', 'Case', 'Amount', 'Date'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donations.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">
                      {d.donor_name ?? 'Anonymous'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      <Link
                        to={`/cases/${d.case_id}`}
                        className="hover:text-blue-600 hover:underline line-clamp-1 max-w-[220px] block"
                      >
                        {d.case_title ?? '—'}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800 whitespace-nowrap">
                      {formatCurrency(d.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">
                      {formatDate(d.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Confirm close dialog */}
      {closingId && (
        <ConfirmDialog
          message="Are you sure you want to close this case? This will stop accepting donations."
          onCancel={() => setClosingId(null)}
          onConfirm={() => handleCloseCase(closingId)}
        />
      )}
    </div>
  );
}
