import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-128px)] flex items-center justify-center bg-gray-50 px-4 py-16">
      <div className="text-center space-y-6 max-w-sm">
        <div className="text-[120px] font-extrabold text-blue-100 leading-none select-none">
          404
        </div>
        <div className="-mt-4">
          <h1 className="text-2xl font-bold text-gray-800">Page not found</h1>
          <p className="text-gray-500 mt-2 text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => history.back()}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700
              hover:bg-gray-100 font-medium text-sm transition-colors"
          >
            ← Go back
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700
              text-white font-semibold text-sm transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
