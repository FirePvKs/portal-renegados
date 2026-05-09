import Modal from '../Modal.jsx';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { cldPresets } from '../../lib/cloudinary.js';
import { ROLE_LABELS } from '../RoleBadge.jsx';
import ImageUpload from '../ImageUpload.jsx';

const ROLES = ['lider', 'sub_lider', 'comandante', 'ayudante', 'miembro'];

export default function CardsTab() {
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // card object o 'new'

  const load = async () => {
    try {
      setLoading(true);
      const [c, u] = await Promise.all([api.listCards(), api.listUsers()]);
      setCards(c.cards);
      setUsers(u.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (card) => {
    if (!confirm(`¿Eliminar la tarjeta "${card.titulo}"?`)) return;
    try {
      await api.deleteCard(card.id);
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const moveUp = async (idx) => {
    if (idx === 0) return;
    const newOrder = [...cards];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setCards(newOrder);
    try {
      await api.reorderCards(newOrder.map(c => c.id));
    } catch (e) {
      alert('Error: ' + e.message);
      load();
    }
  };

  const moveDown = async (idx) => {
    if (idx === cards.length - 1) return;
    const newOrder = [...cards];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setCards(newOrder);
    try {
      await api.reorderCards(newOrder.map(c => c.id));
    } catch (e) {
      alert('Error: ' + e.message);
      load();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-bone-100/60 font-mono text-sm">
          {cards.length} {cards.length === 1 ? 'tarjeta' : 'tarjetas'}
        </p>
        <button onClick={() => setEditing('new')} className="btn-primary">
          + Nueva Tarjeta
        </button>
      </div>

      {error && (
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {editing && (
        <CardEditor
          card={editing === 'new' ? null : editing}
          users={users}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <div className="text-bone-100/50 font-mono">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card, idx) => (
            <div key={card.id} className="shinobi-card-dark p-4 flex gap-4">
              {/* Preview */}
              <div className="w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-ink-700">
                {card.imagen_url ? (
                  <img
                    src={cldPresets.bannerCard(card.imagen_url)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-bone-100/30 text-xs font-mono">
                    Sin imagen
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-display text-bone-100 truncate">{card.titulo}</h3>
                  {card.is_coming_soon && (
                    <span className="text-[10px] font-mono uppercase tracking-widest bg-bone-100/10 px-2 py-0.5 rounded text-bone-100/60 flex-shrink-0">
                      Próx.
                    </span>
                  )}
                </div>
                {card.subtitulo && (
                  <p className="text-xs text-bone-100/60 truncate mb-2">{card.subtitulo}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono uppercase">
                  {card.visible_sin_login && (
                    <span className="text-green-400/80 bg-green-400/10 px-1.5 py-0.5 rounded">
                      Pública sin login
                    </span>
                  )}
                  {card.is_public ? (
                    <span className="text-bone-100/40">Todos los miembros</span>
                  ) : (
                    <span className="text-bone-100/40">
                      Restringida ({(card.allowed_roles?.length || 0)} roles, {(card.allowed_users?.length || 0)} usuarios)
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-1">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="text-bone-100/50 hover:text-bone-100 disabled:opacity-20 px-1.5"
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === cards.length - 1}
                    className="text-bone-100/50 hover:text-bone-100 disabled:opacity-20 px-1.5"
                    title="Bajar"
                  >
                    ↓
                  </button>
                </div>
                <button
                  onClick={() => setEditing(card)}
                  className="text-xs uppercase tracking-wider text-bone-100/70 hover:text-bone-100 hover:bg-bone-100/10 px-2 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(card)}
                  className="text-xs uppercase tracking-wider text-blood hover:bg-blood/10 px-2 py-1 rounded"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CardEditor({ card, users, onClose, onSaved }) {
  const isNew = !card;

  const [titulo, setTitulo] = useState(card?.titulo || '');
  const [subtitulo, setSubtitulo] = useState(card?.subtitulo || '');
  const [imagen, setImagen] = useState(
    card?.imagen_url ? { url: card.imagen_url, public_id: card.imagen_public_id } : null
  );
  const [link, setLink] = useState(card?.link || '');
  const [isExternal, setIsExternal] = useState(card?.is_external || false);
  const [isComingSoon, setIsComingSoon] = useState(card?.is_coming_soon ?? true);
  const [isPublic, setIsPublic] = useState(card?.is_public ?? true);
  const [visibleSinLogin, setVisibleSinLogin] = useState(card?.visible_sin_login ?? false);
  const [allowedRoles, setAllowedRoles] = useState(card?.allowed_roles || []);
  const [allowedUsers, setAllowedUsers] = useState(card?.allowed_users || []);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleRole = (role) => {
    setAllowedRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role]);
  };

  const toggleUser = (id) => {
    setAllowedUsers(u => u.includes(id) ? u.filter(x => x !== id) : [...u, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      titulo,
      subtitulo: subtitulo || null,
      imagen_url: imagen?.url || null,
      imagen_public_id: imagen?.public_id || null,
      link: link || null,
      is_external: isExternal,
      is_coming_soon: isComingSoon,
      is_public: isPublic,
      visible_sin_login: visibleSinLogin,
      allowed_roles: isPublic ? [] : allowedRoles,
      allowed_users: isPublic ? [] : allowedUsers
    };

    try {
      if (isNew) await api.createCard(payload);
      else await api.updateCard(card.id, payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <>
        <h2 className="font-display text-2xl tracking-wider text-bone-100 mb-6">
          {isNew ? 'Nueva Tarjeta' : 'Editar Tarjeta'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* IMAGEN */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Imagen de la tarjeta
            </label>
            <div className="flex items-start gap-3">
              <div className="w-32 h-20 rounded-lg overflow-hidden bg-ink-700 flex-shrink-0">
                {imagen ? (
                  <img src={cldPresets.bannerCard(imagen.url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-bone-100/30 text-xs font-mono">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <ImageUpload
                  kind="card"
                  onUploaded={(r) => setImagen(r)}
                  className="btn-secondary text-xs px-3 py-1.5 inline-block"
                >
                  {imagen ? 'Cambiar' : 'Subir imagen'}
                </ImageUpload>
                {imagen && (
                  <button
                    type="button"
                    onClick={() => setImagen(null)}
                    className="text-xs text-blood/70 hover:text-blood font-mono"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TITULO */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              maxLength={50}
              className="shinobi-input"
              placeholder="ej: MAPA ZONAS"
            />
          </div>

          {/* SUBTITULO */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Subtítulo
            </label>
            <input
              type="text"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              maxLength={100}
              className="shinobi-input"
              placeholder="ej: Territorios por sub divisiones"
            />
          </div>

          {/* LINK */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Enlace (opcional)
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="shinobi-input"
              placeholder="ej: https://... o /ruta-interna"
            />
            <label className="flex items-center gap-2 mt-2 text-xs text-bone-100/60 font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={isExternal}
                onChange={(e) => setIsExternal(e.target.checked)}
                className="accent-bone-100"
              />
              Es un enlace externo (abre en nueva pestaña)
            </label>
          </div>

          {/* COMING SOON */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isComingSoon}
              onChange={(e) => setIsComingSoon(e.target.checked)}
              className="accent-bone-100 w-4 h-4"
            />
            <span className="text-sm text-bone-100/80">
              Marcar como "próximamente" (no clickeable)
            </span>
          </label>

          {/* PERMISOS */}
          <div className="border-t border-bone-100/10 pt-5">
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-3 font-mono">
              Permisos de acceso
            </label>

            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={visibleSinLogin}
                onChange={(e) => setVisibleSinLogin(e.target.checked)}
                className="accent-bone-100 w-4 h-4"
              />
              <span className="text-sm text-bone-100/80">
                Visible sin iniciar sesión (página pública)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="accent-bone-100 w-4 h-4"
              />
              <span className="text-sm text-bone-100/80">
                Pública: todos los miembros pueden verla
              </span>
            </label>

            {!isPublic && (
              <div className="space-y-4 pl-7">
                {/* ROLES */}
                <div>
                  <p className="text-xs text-bone-100/50 font-mono uppercase mb-2">
                    Roles permitidos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map(r => (
                      <label
                        key={r}
                        className={`px-3 py-1.5 rounded-md border cursor-pointer text-xs font-mono uppercase transition-colors ${
                          allowedRoles.includes(r)
                            ? 'bg-bone-100/15 border-bone-100/50 text-bone-100'
                            : 'border-bone-100/15 text-bone-100/50 hover:border-bone-100/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allowedRoles.includes(r)}
                          onChange={() => toggleRole(r)}
                          className="hidden"
                        />
                        {ROLE_LABELS[r]}
                      </label>
                    ))}
                  </div>
                </div>

                {/* USUARIOS */}
                <div>
                  <p className="text-xs text-bone-100/50 font-mono uppercase mb-2">
                    Usuarios específicos ({allowedUsers.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto border border-bone-100/10 rounded-md bg-ink-700/30 p-2 space-y-1">
                    {users.map(u => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-bone-100/5 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={allowedUsers.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                          className="accent-bone-100"
                        />
                        <span className="text-sm text-bone-100/80 font-mono">{u.username}</span>
                        <span className="text-[10px] text-bone-100/40 ml-auto">{ROLE_LABELS[u.role]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-blood/15 border border-blood/40 text-blood text-sm rounded-md px-3 py-2 font-mono">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : (isNew ? 'Crear' : 'Guardar')}
            </button>
          </div>
        </form>
      </>
    </Modal>
  );
}
