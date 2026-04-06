import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageSpinner } from '../Spinner';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }) {
  const { loading } = useAuth();
  const { pathname } = useLocation();

  // Block the whole UI until the auth token is validated on first load
  if (loading) return <FullPageSpinner />;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      {/* key forces remount → triggers page-fade CSS animation on every navigation */}
      <main key={pathname} className="flex-1 page-fade">
        {children}
      </main>
      <Footer />
    </div>
  );
}
