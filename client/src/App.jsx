import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary     from './components/ErrorBoundary';
import ScrollToTop       from './components/ScrollToTop';
import Layout            from './components/Layout/Layout';
import ProtectedRoute    from './components/ProtectedRoute';

import HomePage       from './pages/HomePage';
import CasesPage      from './pages/CasesPage';
import CaseDetailPage from './pages/CaseDetailPage';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import DonorDashboard from './pages/DonorDashboard';
import PaymentReturnPage from './pages/PaymentReturnPage';
import AdminDashboard from './pages/AdminDashboard';
import CreateCasePage from './pages/CreateCasePage';
import EditCasePage   from './pages/EditCasePage';
import NotFoundPage   from './pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <ScrollToTop />
            <Layout>
              <Routes>
                {/* Public */}
                <Route path="/"          element={<HomePage />} />
                <Route path="/cases"     element={<CasesPage />} />
                <Route path="/cases/:id" element={<CaseDetailPage />} />
                <Route path="/login"     element={<LoginPage />} />
                <Route path="/register"  element={<RegisterPage />} />

                {/* Payment return landing (any signed-in user; ownership checked by API) */}
                <Route path="/donations/return" element={
                  <ProtectedRoute>
                    <PaymentReturnPage />
                  </ProtectedRoute>
                } />

                {/* Donor only — admins are redirected to /admin */}
                <Route path="/dashboard" element={
                  <ProtectedRoute denyAdmin>
                    <DonorDashboard />
                  </ProtectedRoute>
                } />

                {/* Admin only */}
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/cases/new" element={
                  <ProtectedRoute requireAdmin>
                    <CreateCasePage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/cases/:id/edit" element={
                  <ProtectedRoute requireAdmin>
                    <EditCasePage />
                  </ProtectedRoute>
                } />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Layout>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
