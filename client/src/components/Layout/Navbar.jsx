import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [dropOpen, setDropOpen]   = useState(false);

  const linkClass = 'text-gray-700 hover:text-blue-600 font-medium transition-colors';
  const activeLinkClass = 'text-blue-600 font-semibold';

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <Link to="/" className="text-xl font-bold text-blue-600 tracking-tight shrink-0">
            Yaxshilik.uz
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink
              to="/cases"
              className={({ isActive }) => isActive ? activeLinkClass : linkClass}
            >
              Cases
            </NavLink>

            {user && isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => isActive ? activeLinkClass : linkClass}
              >
                Admin Panel
              </NavLink>
            )}

            {user && !isAdmin && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) => isActive ? activeLinkClass : linkClass}
              >
                My Donations
              </NavLink>
            )}
          </div>

          {/* Desktop auth area */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Register
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setDropOpen((v) => !v)}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm select-none">
                    {user.full_name?.[0]?.toUpperCase()}
                  </span>
                  <span className="max-w-[140px] truncate">{user.full_name}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropOpen && (
                  <div
                    onBlur={() => setDropOpen(false)}
                    className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50"
                  >
                    <button
                      onClick={() => { logout(); setDropOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <NavLink
            to="/cases"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md font-medium ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`
            }
          >
            Cases
          </NavLink>

          {user && isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md font-medium ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`
              }
            >
              Admin Panel
            </NavLink>
          )}

          {user && !isAdmin && (
            <NavLink
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md font-medium ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`
              }
            >
              My Donations
            </NavLink>
          )}

          <div className="pt-2 border-t border-gray-100 space-y-1">
            {!user ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-md bg-blue-600 text-white font-medium text-center hover:bg-blue-700"
                >
                  Register
                </Link>
              </>
            ) : (
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-md text-red-600 hover:bg-red-50 font-medium"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
