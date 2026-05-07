import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Header from './components/Header.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CardPage from './pages/CardPage.jsx';
import LibroBingoPage from './pages/LibroBingoPage.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-bone-100/60 font-mono tracking-widest text-sm">CARGANDO...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {user && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" replace /> : <LoginPage />
          } />
          <Route path="/" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/profile/:username" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/cards/:id" element={
            <ProtectedRoute><CardPage /></ProtectedRoute>
          } />
          <Route path="/libro-bingo" element={
            <ProtectedRoute><LibroBingoPage /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
