import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import { formatCurrency } from '../utils/format';

const CATEGORY_COLORS = {
  'Medical':          'bg-red-100 text-red-700',
  'Education':        'bg-yellow-100 text-yellow-700',
  'Housing':          'bg-purple-100 text-purple-700',
  'Emergency Relief': 'bg-orange-100 text-orange-700',
  'Community':        'bg-teal-100 text-teal-700',
};

const CATEGORY_GRADIENTS = {
  'Medical':          { gradient: 'from-red-100 to-red-200',       emoji: '❤️',  text: 'text-red-600'    },
  'Education':        { gradient: 'from-blue-100 to-blue-200',     emoji: '📚',  text: 'text-blue-600'   },
  'Emergency Relief': { gradient: 'from-orange-100 to-orange-200', emoji: '🏠',  text: 'text-orange-600' },
  'Community':        { gradient: 'from-purple-100 to-purple-200', emoji: '📖',  text: 'text-purple-600' },
  'Housing':          { gradient: 'from-green-100 to-green-200',   emoji: '🏡',  text: 'text-green-600'  },
};

const DEFAULT_GRADIENT = { gradient: 'from-gray-100 to-gray-200', emoji: '🤲', text: 'text-gray-600' };

export default function CaseCard({ caseData }) {
  const {
    id,
    title,
    description,
    image_url,
    goal_amount,
    raised_amount,
    category_name,
    status,
  } = caseData;

  const placeholder = CATEGORY_GRADIENTS[category_name] ?? DEFAULT_GRADIENT;
  const badgeClass  = CATEGORY_COLORS[category_name] ?? 'bg-gray-100 text-gray-700';

  return (
    <Link
      to={`/cases/${id}`}
      className="group flex flex-col bg-white rounded-xl shadow-md overflow-hidden
        hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image / placeholder */}
      <div className="relative aspect-video overflow-hidden">
        {image_url ? (
          <img
            src={`http://localhost:5000${image_url}`}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-linear-to-br ${placeholder.gradient} flex flex-col items-center justify-center gap-2`}>
            <span className="text-4xl select-none" aria-hidden>{placeholder.emoji}</span>
            <span className={`text-xs font-bold uppercase tracking-widest ${placeholder.text}`}>
              {category_name}
            </span>
          </div>
        )}

        {/* Category badge */}
        {category_name && (
          <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full
            backdrop-blur-sm ${badgeClass}`}>
            {category_name}
          </span>
        )}

        {/* Completed overlay */}
        {status === 'completed' && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full
              flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
              Completed
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>

        <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 flex-1">
          {description}
        </p>

        {/* Progress */}
        <div className="space-y-2 pt-1">
          <ProgressBar raised={raised_amount} goal={goal_amount} />
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-800">{formatCurrency(raised_amount)}</span>
            {' '}raised of {formatCurrency(goal_amount)}
          </p>
        </div>

        {/* CTA */}
        <div
          className="mt-1 w-full text-center bg-blue-600 hover:bg-blue-700
            text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          Donate Now
        </div>
      </div>
    </Link>
  );
}
