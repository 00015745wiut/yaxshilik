import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import casesService from '../services/casesService';
import categoriesService from '../services/categoriesService';
import CaseForm from '../components/CaseForm';
import { useToast } from '../context/ToastContext';

// ── Confirm delete dialog ─────────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel }) {
  const [deleting, setDeleting] = useState(false);

  async function handle() {
    setDeleting(true);
    try { await onConfirm(); }
    finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!deleting ? onCancel : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Close this case?</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              This will stop accepting donations. This action can be undone by editing the case status.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700
              hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
              bg-red-600 hover:bg-red-700 text-white text-sm font-semibold
              transition-colors disabled:opacity-70"
          >
            {deleting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Closing…
              </>
            ) : 'Close Case'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditCasePage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { addToast } = useToast();

  const [caseData,   setCaseData]   = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    Promise.all([
      casesService.getCaseById(id),
      categoriesService.getCategories(),
    ])
      .then(([caseRes, catRes]) => {
        setCaseData(caseRes.data);
        setCategories(catRes.data);
      })
      .catch((err) => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(formData) {
    await casesService.updateCase(id, formData);
    addToast('Case updated successfully!');
    navigate('/admin');
  }

  async function handleDelete() {
    await casesService.deleteCase(id);
    addToast('Case closed successfully');
    navigate('/admin');
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-40" />
        <div className="h-10 bg-gray-200 rounded w-64" />
        <div className="bg-white rounded-2xl p-8 space-y-4 shadow-sm">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded" />)}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-2xl font-bold text-gray-800">Case not found</h2>
        <Link to="/admin" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to Admin
        </Link>
      </div>
    );
  }

  const deleteButton = (
    <button
      type="button"
      onClick={() => setShowDelete(true)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-300
        text-red-600 hover:bg-red-50 hover:border-red-400 text-sm font-semibold transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
      Close Case
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link to="/admin" className="hover:text-blue-600 transition-colors">Admin</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-800 font-medium line-clamp-1">{caseData.title}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Edit Case</h1>
        <p className="text-gray-500 mt-1">Update the details for this charity case</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <CaseForm
          initialData={caseData}
          categories={categories}
          submitLabel="Update Case"
          isEdit={true}
          onSubmit={handleSubmit}
          extraActions={caseData.status !== 'closed' ? deleteButton : null}
        />
      </div>

      {showDelete && (
        <DeleteConfirm
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
