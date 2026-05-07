import { useState } from 'react';
import { api } from '../../lib/api.js';

export default function AccountTab() {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPass !== confirm) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPass.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.changeMyPassword(current, newPass);
      setSuccess('Contraseña actualizada correctamente');
      setCurrent('');
      setNewPass('');
      setConfirm('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h2 className="font-display text-xl tracking-wider text-bone-100 mb-2">
        Cambiar contraseña
      </h2>
      <p className="text-bone-100/50 text-sm font-mono mb-6">
        Al cambiar tu contraseña, tu sesión actual se mantendrá pero las demás se cerrarán.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
            Contraseña actual
          </label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            className="shinobi-input"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="shinobi-input"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
            Confirmar nueva contraseña
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="shinobi-input"
          />
        </div>

        {error && (
          <div className="bg-blood/15 border border-blood/40 text-blood text-sm rounded-md px-3 py-2 font-mono">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-chakra/15 border border-chakra/40 text-chakra text-sm rounded-md px-3 py-2 font-mono">
            {success}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}
