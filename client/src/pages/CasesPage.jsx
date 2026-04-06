import { useEffect, useState, useCallback } from 'react';
import casesService from '../services/casesService';
import categoriesService from '../services/categoriesService';
import CaseCard from '../components/CaseCard';
import CaseCardSkeleton from '../components/CaseCardSkeleton';

const SORT_OPTIONS = [
  { value: 'newest',           label: 'Newest' },
  { value: 'most_funded',      label: 'Most Funded' },
  { value: 'closest_to_goal',  label: 'Closest to Goal' },
];

export default function CasesPage() {
  const [cases, setCases]             = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [categoryId, setCategoryId]   = useState(null);
  const [sort, setSort]               = useState('newest');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Load categories once
  useEffect(() => {
    categoriesService.getCategories().then(({ data }) => setCategories(data));
  }, []);

  // Fetch cases whenever filters change
  const fetchCases = useCallback(() => {
    setLoading(true);
    const params = { sort };
    if (categoryId) params.category_id = categoryId;
    if (search)     params.search = search;

    casesService.getCases(params)
      .then(({ data }) => setCases(data))
      .finally(() => setLoading(false));
  }, [categoryId, sort, search]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // Debounce search: only fire API call 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleCategoryClick(id) {
    setCategoryId((prev) => (prev === id ? null : id));
  }

  const pillBase = 'px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer border';
  const pillActive = 'bg-blue-600 text-white border-blue-600';
  const pillInactive = 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* ── Heading ────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">All Cases</h1>
        <p className="text-gray-500 mt-1">Find a cause that matters to you</p>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8 space-y-4">

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryId(null)}
            className={`${pillBase} ${categoryId === null ? pillActive : pillInactive}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`${pillBase} ${categoryId === cat.id ? pillActive : pillInactive}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort + Search row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 rounded-lg border border-gray-300
                bg-white text-gray-700 text-sm font-medium
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                hover:border-gray-400 transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search cases by title or description…"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white
                text-sm text-gray-800 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                hover:border-gray-400 transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Results count ──────────────────────────────────────────────────── */}
      {!loading && (
        <p className="text-sm text-gray-500 mb-5">
          {cases.length === 0
            ? 'No cases found'
            : `${cases.length} case${cases.length !== 1 ? 's' : ''} found`}
        </p>
      )}

      {/* ── Grid ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CaseCardSkeleton key={i} />)
          : cases.map((c) => <CaseCard key={c.id} caseData={c} />)}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!loading && cases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No cases found</h3>
          <p className="text-gray-400 text-sm max-w-xs">
            Try adjusting your filters or search term to find what you&apos;re looking for.
          </p>
          <button
            onClick={() => { setCategoryId(null); setSort('newest'); setSearchInput(''); }}
            className="mt-5 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
