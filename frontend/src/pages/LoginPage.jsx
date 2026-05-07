import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 scroll-band" />
      </div>

      <div className="relative w-full max-w-md fade-in-up">
        <div className="flex flex-col items-center mb-10">
          <Logo size={120} className="mb-4" />
          <h1 className="font-display text-3xl tracking-[0.3em] text-bone-100 mb-1">
            RENEGADOS
          </h1>
          <div className="h-px w-16 bg-bone-100/30 my-3" />
          <p className="text-xs uppercase tracking-[0.3em] text-bone-100/50 font-mono">
            Acceso Restringido
          </p>
        </div>

        <form onSubmit={handleSubmit} className="shinobi-card-dark space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Nombre
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
              className="shinobi-input"
              placeholder="tunombre"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="shinobi-input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-blood/15 border border-blood/40 text-blood text-sm rounded-md px-4 py-3 font-mono">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>

          <p className="text-xs text-bone-100/40 text-center pt-3 border-t border-bone-100/10 font-mono">
            Solo el líder puede crear nuevas cuentas
          </p>
        </form>
      </div>
    </div>
  );
}
