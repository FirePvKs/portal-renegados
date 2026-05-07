import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, requireLider = false, requireAdmin = false }) {
  const { user, loading, isLider, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-bone-100/60 font-mono tracking-widest text-sm">CARGANDO...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireLider && !isLider) return <Navigate to="/" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return children;
}
