import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm text-center sm:text-left">
            © 2026 <span className="font-semibold text-blue-600">Yaxshilik.uz</span> — Connecting Hearts, Changing Lives
          </p>
          <nav className="flex items-center gap-6">
            <Link to="#" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link to="#" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
