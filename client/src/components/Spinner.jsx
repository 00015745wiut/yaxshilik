export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-5 h-5 border-2', md: 'w-9 h-9 border-[3px]', lg: 'w-14 h-14 border-4' };
  return (
    <div className={`${sizes[size]} border-blue-600 border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

/** Full-page centered spinner */
export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
      </div>
    </div>
  );
}
