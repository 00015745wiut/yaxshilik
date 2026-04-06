import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * requireAdmin  — only admins may enter; non-admins → /
 * denyAdmin     — only non-admins (donors) may enter; admins → /admin
 */
export default function ProtectedRoute({ children, requireAdmin = false, denyAdmin = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="md" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requireAdmin && user.role !== 'admin') return <Navigate to="/" replace />;

  if (denyAdmin && user.role === 'admin') return <Navigate to="/admin" replace />;

  return children;
}
