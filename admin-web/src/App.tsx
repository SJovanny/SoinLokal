import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import VerificationQueuePage from './pages/VerificationQueuePage';
import VerificationDetailPage from './pages/VerificationDetailPage';

export default function App() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user && isAdmin ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <VerificationQueuePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/verification/:profileId"
        element={
          <ProtectedRoute>
            <Layout>
              <VerificationDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
