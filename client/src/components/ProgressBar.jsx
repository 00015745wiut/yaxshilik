export default function ProgressBar({ raised, goal }) {
  const pct = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  const reached = pct >= 100;

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500
              ${reached ? 'bg-green-500' : 'bg-blue-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 w-10 text-right shrink-0">
          {Math.round(pct)}%
        </span>
      </div>

      {reached && (
        <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-green-600
          bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
          </svg>
          Goal Reached
        </span>
      )}
    </div>
  );
}
