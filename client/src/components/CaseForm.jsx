import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../utils/format';

const MAX_FILE_SIZE   = 5 * 1024 * 1024;
const ALLOWED_TYPES   = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const STATUS_OPTIONS  = ['active', 'completed', 'closed'];

const SERVER_ORIGIN     = ''; // same-origin; /uploads is proxied in dev, served by Express in prod
const PROOF_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const PROOF_DOC_TYPES   = [...PROOF_IMAGE_TYPES, 'application/pdf'];
const PROOF_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_PROOF_SIZE    = 50 * 1024 * 1024; // 50 MB

// Categorised proof uploads — field names match the server's multer config.
const PROOF_CATEGORIES = [
  { key: 'documents', field: 'proof_documents', label: 'Official documents', accept: '.pdf,.jpg,.jpeg,.png,.webp', hint: 'PDF or scan — medical report, government letter, invoice', allowed: PROOF_DOC_TYPES },
  { key: 'photos',    field: 'proof_photos',    label: 'Photos',             accept: '.jpg,.jpeg,.png,.webp',       hint: 'Photo evidence of the person or situation',           allowed: PROOF_IMAGE_TYPES },
  { key: 'videos',    field: 'proof_videos',    label: 'Video',              accept: '.mp4,.webm,.mov',             hint: 'Short clip (max 50 MB)',                              allowed: PROOF_VIDEO_TYPES },
];

const PROOF_BADGE = {
  document: 'bg-blue-100 text-blue-700',
  photo:    'bg-green-100 text-green-700',
  video:    'bg-purple-100 text-purple-700',
};

function validate(fields, isEdit) {
  const errors = {};
  const title = (fields.title || '').trim();
  const desc  = (fields.description || '').trim();

  if (!title)                          errors.title       = 'Title is required';
  else if (title.length < 10)          errors.title       = 'Title must be at least 10 characters';
  else if (title.length > 200)         errors.title       = 'Title must be 200 characters or fewer';

  if (!fields.category_id)             errors.category_id = 'Category is required';

  const goal = Number(fields.goal_amount);
  if (!fields.goal_amount)             errors.goal_amount = 'Goal amount is required';
  else if (isNaN(goal) || goal < 1000) errors.goal_amount = 'Minimum goal amount is 1,000 UZS';

  if (!desc)                           errors.description = 'Description is required';
  else if (desc.length < 50)           errors.description = 'Description must be at least 50 characters';

  if (isEdit && !fields.status)        errors.status      = 'Status is required';

  return errors;
}

export default function CaseForm({
  initialData = {},
  categories  = [],
  onSubmit,
  onDeleteProof,
  submitLabel = 'Submit',
  isEdit      = false,
  extraActions,
}) {
  const [fields, setFields] = useState({
    title:       initialData.title       ?? '',
    description: initialData.description ?? '',
    category_id: initialData.category_id ?? '',
    goal_amount: initialData.goal_amount  ?? '',
    status:      initialData.status      ?? 'active',
  });
  const [touched, setTouched]       = useState({});
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState(initialData.image_url
    ? `${SERVER_ORIGIN}${initialData.image_url}` : null);
  const [imageError, setImageError] = useState('');
  const [dragging, setDragging]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const fileInputRef = useRef(null);

  // Proofs: new files staged per category + existing (already-saved) proofs.
  const [proofFiles, setProofFiles]   = useState({ documents: [], photos: [], videos: [] });
  const [proofError, setProofError]   = useState('');
  const [existingProofs, setExistingProofs]   = useState(initialData.proofs ?? []);
  const [deletingProofId, setDeletingProofId] = useState(null);

  // Sync initial data if parent fetches async (edit page)
  useEffect(() => {
    if (initialData.title) {
      setFields({
        title:       initialData.title       ?? '',
        description: initialData.description ?? '',
        category_id: initialData.category_id ?? '',
        goal_amount: initialData.goal_amount  ?? '',
        status:      initialData.status      ?? 'active',
      });
      if (initialData.image_url) {
        setImagePreview(`${SERVER_ORIGIN}${initialData.image_url}`);
      }
      setExistingProofs(initialData.proofs ?? []);
    }
  }, [initialData.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors  = validate(fields, isEdit);
  const isValid = Object.keys(errors).length === 0 && !imageError;

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((f) => ({ ...f, [name]: value }));
    setServerError('');
  }

  function handleBlur(e) {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
  }

  function processFile(file) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('Only JPG, PNG, and WebP files are accepted');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError('File must be under 5 MB');
      return;
    }
    setImageError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleFileInput(e) { processFile(e.target.files[0]); }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function addProofFiles(catKey, fileList, allowed) {
    const accepted = [];
    for (const f of Array.from(fileList || [])) {
      if (!allowed.includes(f.type)) { setProofError(`"${f.name}" is not an accepted file type`); continue; }
      if (f.size > MAX_PROOF_SIZE)   { setProofError(`"${f.name}" exceeds the 50 MB limit`);       continue; }
      accepted.push(f);
    }
    if (accepted.length) {
      setProofError('');
      setProofFiles((p) => ({ ...p, [catKey]: [...p[catKey], ...accepted] }));
    }
  }

  function removeProofFile(catKey, idx) {
    setProofFiles((p) => ({ ...p, [catKey]: p[catKey].filter((_, i) => i !== idx) }));
  }

  async function handleDeleteExisting(proofId) {
    if (!onDeleteProof) return;
    setDeletingProofId(proofId);
    try {
      await onDeleteProof(proofId);
      setExistingProofs((list) => list.filter((p) => p.id !== proofId));
    } catch {
      setProofError('Could not remove that proof. Please try again.');
    } finally {
      setDeletingProofId(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const allTouched = Object.fromEntries(
      ['title', 'description', 'category_id', 'goal_amount', 'status'].map((k) => [k, true])
    );
    setTouched(allTouched);
    if (!isValid) return;

    const formData = new FormData();
    formData.append('title',       fields.title.trim());
    formData.append('description', fields.description.trim());
    formData.append('category_id', fields.category_id);
    formData.append('goal_amount', fields.goal_amount);
    if (isEdit) formData.append('status', fields.status);
    if (imageFile) formData.append('image', imageFile);

    // Append staged proof files under their server field names.
    for (const cat of PROOF_CATEGORIES) {
      for (const file of proofFiles[cat.key]) {
        formData.append(cat.field, file);
      }
    }

    setSubmitting(true);
    setServerError('');
    try {
      await onSubmit(formData);
    } catch (err) {
      const data = err.response?.data;
      const msg = Array.isArray(data?.errors)
        ? data.errors[0].msg
        : (data?.error || 'Something went wrong. Please try again.');
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (field) =>
    `w-full px-4 py-2.5 rounded-lg border text-gray-800 text-sm
     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
     ${touched[field] && errors[field]
       ? 'border-red-400 bg-red-50'
       : 'border-gray-300 bg-white hover:border-gray-400'}`;

  const FieldError = ({ field }) =>
    touched[field] && errors[field] ? (
      <p className="mt-1.5 text-xs text-red-600">{errors[field]}</p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {serverError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700
          rounded-lg px-4 py-3 text-sm">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
          </svg>
          {serverError}
        </div>
      )}

      {/* Title */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Title</label>
          <span className="text-xs text-gray-400">{fields.title.length}/200</span>
        </div>
        <input
          name="title" type="text"
          value={fields.title}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter a clear, descriptive title (10–200 chars)"
          className={inputClass('title')}
        />
        <FieldError field="title" />
      </div>

      {/* Category + Goal row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            name="category_id"
            value={fields.category_id}
            onChange={handleChange}
            onBlur={handleBlur}
            className={inputClass('category_id')}
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <FieldError field="category_id" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Goal Amount</label>
          <div className="relative">
            <input
              name="goal_amount"
              type="number"
              value={fields.goal_amount}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="5000000"
              min={1000}
              className={`${inputClass('goal_amount')} pr-16`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
              UZS
            </span>
          </div>
          {fields.goal_amount && !errors.goal_amount && (
            <p className="mt-1 text-xs text-blue-600 font-medium">
              Goal: {formatCurrency(fields.goal_amount)}
            </p>
          )}
          <FieldError field="goal_amount" />
        </div>
      </div>

      {/* Status (edit only) */}
      {isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={fields.status}
            onChange={handleChange}
            onBlur={handleBlur}
            className={inputClass('status')}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <FieldError field="status" />
        </div>
      )}

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <span className={`text-xs ${fields.description.length < 50 ? 'text-red-400' : 'text-gray-400'}`}>
            {fields.description.length} chars {fields.description.length < 50 ? `(${50 - fields.description.length} more needed)` : ''}
          </span>
        </div>
        <textarea
          name="description"
          value={fields.description}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={6}
          placeholder="Describe the case in detail — who needs help, why, and how donations will be used (min. 50 characters)"
          className={`${inputClass('description')} resize-y`}
        />
        <FieldError field="description" />
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Case Image <span className="text-gray-400 font-normal">(optional)</span>
        </label>

        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity
              flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium
                  hover:bg-gray-100 transition-colors"
              >
                Change Image
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium
                  hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2
              border-dashed cursor-pointer transition-colors
              ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'}`}
          >
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {dragging ? 'Drop to upload' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — Max 5 MB</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileInput}
        />
        {imageError && <p className="mt-1.5 text-xs text-red-600">{imageError}</p>}
      </div>

      {/* Proof & verification */}
      <div className="border-t border-gray-100 pt-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Proof &amp; verification
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload reviewed evidence that this case is genuine — these files are shown publicly to donors.
          </p>
        </div>

        {/* Already-saved proofs (edit) */}
        {existingProofs.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current proofs</p>
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {existingProofs.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${PROOF_BADGE[p.type]}`}>
                    {p.type}
                  </span>
                  <a
                    href={`${SERVER_ORIGIN}${p.file_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate flex-1"
                  >
                    {p.file_url.split('/').pop()}
                  </a>
                  {onDeleteProof && (
                    <button
                      type="button"
                      onClick={() => handleDeleteExisting(p.id)}
                      disabled={deletingProofId === p.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0"
                    >
                      {deletingProofId === p.id ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pickers per category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PROOF_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <label className="block text-sm font-medium text-gray-700">{cat.label}</label>
              <p className="text-xs text-gray-400 mb-1.5 leading-snug min-h-8">{cat.hint}</p>
              <label className="flex flex-col items-center justify-center gap-1 py-4 rounded-lg border-2
                border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50
                cursor-pointer transition-colors">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-gray-500">Click to add</span>
                <input
                  type="file"
                  multiple
                  accept={cat.accept}
                  className="hidden"
                  onChange={(e) => { addProofFiles(cat.key, e.target.files, cat.allowed); e.target.value = ''; }}
                />
              </label>

              {proofFiles[cat.key].length > 0 && (
                <ul className="mt-2 space-y-1">
                  {proofFiles[cat.key].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200
                      rounded px-2 py-1.5">
                      <span className="truncate flex-1 text-gray-700" title={f.name}>{f.name}</span>
                      <span className="text-gray-400 shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button
                        type="button"
                        onClick={() => removeProofFile(cat.key, i)}
                        className="text-red-500 hover:text-red-700 shrink-0 font-bold"
                        aria-label="Remove file"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        {proofError && <p className="mt-2 text-xs text-red-600">{proofError}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        {extraActions}
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
            disabled:opacity-70 disabled:cursor-not-allowed
            text-white font-semibold px-6 py-2.5 rounded-lg transition-colors ml-auto"
        >
          {submitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </>
          ) : submitLabel}
        </button>
      </div>
    </form>
  );
}
