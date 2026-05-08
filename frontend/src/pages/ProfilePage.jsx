import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { cldPresets } from '../lib/cloudinary.js';
import { useAuth } from '../context/AuthContext.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import ImageUpload from '../components/ImageUpload.jsx';
import Modal from '../components/Modal.jsx';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwnProfile = me?.username === username;
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const d = await api.getProfile(username);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [username]);

  const handleImageUploaded = async (kind, { url, public_id }) => {
    try {
      await api.setMyImage(kind, url, public_id);
      await loadProfile();
      await refresh();
    } catch (e) {
      alert('Error guardando imagen: ' + e.message);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-12 text-bone-100/60 font-mono">Cargando perfil...</div>;
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3">
          {error || 'Perfil no encontrado'}
        </div>
      </div>
    );
  }

  const { profile, jutsus, items } = data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="shinobi-card-dark p-0 overflow-hidden mb-8 fade-in-up">
        <div className="relative h-48 sm:h-64 bg-ink-700 group">
          {profile.banner_url ? (
            <img
              src={cldPresets.bannerFull(profile.banner_url)}
              alt="banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bone-100/20 font-mono text-sm">
              {isOwnProfile ? 'Sube tu banner ↓' : 'Sin banner'}
            </div>
          )}

          {isOwnProfile && (
            <div className="absolute bottom-3 right-3 z-10">
              <ImageUpload
                kind="banner"
                onUploaded={(r) => handleImageUploaded('banner', r)}
                className="btn-secondary text-xs px-3 py-1.5 inline-block"
              >
                {profile.banner_url ? 'Cambiar banner' : '+ Subir banner'}
              </ImageUpload>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 -mt-12 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-ink-800 overflow-hidden bg-ink-700">
                {profile.avatar_url ? (
                  <img
                    src={cldPresets.avatarMedium(profile.avatar_url)}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-3xl text-bone-100">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <ImageUpload
                    kind="avatar"
                    onUploaded={(r) => handleImageUploaded('avatar', r)}
                    className="absolute inset-0 rounded-full bg-ink-900/70 flex items-center justify-center text-xs text-bone-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Cambiar
                  </ImageUpload>
                </div>
              )}
            </div>

            <div className="flex-1 mb-2">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-3xl tracking-wider text-bone-100">
                  {profile.username}
                </h1>
                <RoleBadge role={profile.role} size="lg" />
              </div>
              <p className="text-xs text-bone-100/50 font-mono uppercase tracking-widest">
                Registrado el {new Date(profile.created_at).toLocaleDateString('es', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
              {isOwnProfile && (
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="mt-3 text-xs font-mono uppercase tracking-widest text-bone-100/50 hover:text-bone-100 border border-bone-100/20 hover:border-bone-100/50 px-3 py-1.5 rounded transition-colors"
                >
                  Cambiar contraseña
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Stat label="Nivel" value={profile.nivel} />
            <Stat label="Prestigio" value={profile.prestigio} />
            <Stat label="Jutsus" value={jutsus.length} />
            <Stat label="En venta" value={items.filter(i => i.disponible).length} />
          </div>

          {profile.bio && (
            <div className="border-t border-bone-100/10 pt-4">
              <p className="text-bone-100/80 italic">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>

      <Section title="Jutsus" empty="Aún no hay jutsus registrados">
        {jutsus.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jutsus.map(j => (
              <div key={j.id} className="shinobi-card-dark p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-display text-bone-100">{j.nombre}</h4>
                  {j.rango && (
                    <span className="font-mono text-xs px-2 py-0.5 bg-bone-100/10 rounded">
                      Rango {j.rango}
                    </span>
                  )}
                </div>
                {j.tipo && <p className="text-xs text-bone-100/50 uppercase tracking-wider mb-2">{j.tipo}</p>}
                {j.descripcion && <p className="text-sm text-bone-100/70">{j.descripcion}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="A la venta" empty="No hay items a la venta">
        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {items.map(i => (
              <div key={i.id} className="shinobi-card-dark p-4">
                {i.imagen_url && (
                  <img
                    src={cldPresets.itemThumb(i.imagen_url)}
                    alt={i.nombre}
                    loading="lazy"
                    className="w-full aspect-square object-cover rounded-md mb-3"
                  />
                )}
                <h4 className="font-display text-bone-100 mb-1">{i.nombre}</h4>
                {i.descripcion && <p className="text-sm text-bone-100/70 mb-2">{i.descripcion}</p>}
                <p className="font-mono text-bone-100">${i.precio}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

function Stat({ label, value }) {  return (
    <div className="bg-ink-700/50 border border-bone-100/10 rounded-lg px-4 py-3 text-center">
      <div className="font-display text-2xl text-bone-100">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-bone-100/50 font-mono mt-1">{label}</div>
    </div>
  );
}

function Section({ title, children, empty }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-xl tracking-widest text-bone-100/80 mb-4 flex items-center gap-3">
        <span className="h-px w-8 bg-bone-100/30" />
        {title.toUpperCase()}
      </h2>
      {children || <p className="text-bone-100/40 italic text-sm">{empty}</p>}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setSaving(true);
    try {
      await api.changeMyPassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <>
        <h2 className="font-display text-2xl tracking-wider text-bone-100 mb-6">
          Cambiar contraseña
        </h2>

        {success ? (
          <p className="text-green-400 font-mono text-sm text-center py-4">
            ✓ Contraseña actualizada correctamente
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
                Contraseña actual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="shinobi-input"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="shinobi-input"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="shinobi-input"
                placeholder="Repetí la nueva contraseña"
              />
            </div>

            {error && (
              <p className="text-blood text-sm font-mono">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        )}
      </>
    </Modal>
  );
}
