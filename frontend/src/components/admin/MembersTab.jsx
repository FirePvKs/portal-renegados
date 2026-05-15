import Modal from '../Modal.jsx';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { cldPresets } from '../../lib/cloudinary.js';
import { ROLE_LABELS } from '../RoleBadge.jsx';

const ROLES = ['lider', 'sub_lider', 'comandante', 'ayudante', 'miembro'];

export default function MembersTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingPerms, setEditingPerms] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const d = await api.listUsers();
      setUsers(d.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (id, newRole) => {
    try {
      await api.updateUserRole(id, newRole);
      await loadUsers();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleDelete = async (id, username) => {
    if (!confirm(`¿Eliminar a ${username}? Esta acción es PERMANENTE.`)) return;
    try {
      await api.deleteUser(id);
      await loadUsers();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleResetPassword = async (id, username) => {
    const newPass = prompt(`Nueva contraseña para ${username} (mínimo 6 caracteres):`);
    if (!newPass) return;
    try {
      await api.resetUserPassword(id, newPass);
      alert(`Contraseña actualizada. Compártela con ${username}: ${newPass}`);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-bone-100/60 font-mono text-sm">
          {users.length} {users.length === 1 ? 'miembro' : 'miembros'}
        </p>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Registrar Shinobi
        </button>
      </div>

      {error && (
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadUsers(); }}
        />
      )}

      {editingPerms && (
        <PermissionsModal
          user={editingPerms}
          currentUser={currentUser}
          onClose={() => setEditingPerms(null)}
        />
      )}

      <div className="shinobi-card-dark p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-ink-700/50 border-b border-bone-100/10">
              <tr className="text-xs uppercase tracking-widest text-bone-100/60 font-mono">
                <th className="text-left px-6 py-4">Usuario</th>
                <th className="text-left px-6 py-4">Rol</th>
                <th className="text-left px-6 py-4 hidden md:table-cell">Nivel</th>
                <th className="text-left px-6 py-4 hidden lg:table-cell">Registrado</th>
                <th className="text-right px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-bone-100/50 font-mono">Cargando...</td></tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.id} className="border-b border-bone-100/5 hover:bg-bone-100/[0.02]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img
                          src={cldPresets.avatarSmall(u.avatar_url)}
                          alt=""
                          loading="lazy"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-ink-600 flex items-center justify-center text-bone-100 font-display">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-bone-100 font-medium">{u.username}</div>
                        {u.id === currentUser.id && (
                          <span className="text-[10px] text-bone-100/40 font-mono">(tú)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-ink-700 border border-bone-100/15 text-bone-100 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-bone-100/40"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-bone-100/70 font-mono text-sm hidden md:table-cell">
                    Nv. {u.nivel}
                  </td>
                  <td className="px-6 py-4 text-bone-100/50 font-mono text-xs hidden lg:table-cell">
                    {new Date(u.created_at).toLocaleDateString('es')}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setEditingPerms(u)}
                      className="text-xs uppercase tracking-wider text-bone-100/60 hover:text-bone-100 hover:bg-bone-100/10 px-3 py-1.5 rounded transition-colors"
                    >
                      Permisos
                    </button>
                    <button
                      onClick={() => handleResetPassword(u.id, u.username)}
                      className="text-xs uppercase tracking-wider text-bone-100/60 hover:text-bone-100 hover:bg-bone-100/10 px-3 py-1.5 rounded transition-colors"
                    >
                      Reset pass
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="text-xs uppercase tracking-wider text-blood hover:bg-blood/10 px-3 py-1.5 rounded transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-bone-100/50">Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('miembro');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.createUser(username, password, role);
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <>
        <h2 className="font-display text-2xl tracking-wider text-bone-100 mb-6">
          Registrar Nuevo Shinobi
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              className="shinobi-input"
              placeholder="solo letras, números y _"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Contraseña
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="shinobi-input"
              placeholder="mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Rol Inicial
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="shinobi-input"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-blood/15 border border-blood/40 text-blood text-sm rounded-md px-3 py-2 font-mono">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </>
    </Modal>
  );
}

// ─── Modal de permisos de usuario ────────────────────────────────────────────

const PERM_LABELS = {
  ver_tarjetas:       'Ver tarjetas',
  ver_rutas:          'Ver rutas del mapa',
  ascender_rango:     'Ascender/descender rango',
  registrar_miembro:  'Registrar miembro',
  registrar_jugador:  'Registrar jugador',
  registrar_ruta:     'Registrar ruta',
  eliminar_contenido: 'Eliminar contenido',
  editar_contenido:   'Editar contenido',
  dar_permisos:       'Dar permisos a otros',
};

function PermissionsModal({ user, currentUser, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [overrides, setOverrides] = useState({});

  const isSuperAdminTarget = user.username?.toLowerCase() === 'firepentakiller';
  const isSuperAdminActor = currentUser?.username?.toLowerCase() === 'firepentakiller';

  useEffect(() => {
    api.getUserPermissions(user.id)
      .then(d => {
        setData(d);
        const ov = {};
        for (const o of d.overrides || []) ov[o.permission] = o.granted;
        setOverrides(ov);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  const getRoleDefault = (perm) => {
    const rp = data?.rolePerms?.find(r => r.permission === perm);
    return rp?.granted ?? false;
  };

  const getEffective = (perm) => {
    if (perm in overrides) return overrides[perm];
    return getRoleDefault(perm);
  };

  const handleToggle = (perm) => {
    if (isSuperAdminTarget && !isSuperAdminActor) return;
    const current = getEffective(perm);
    const roleDefault = getRoleDefault(perm);
    const newVal = !current;
    if (newVal === roleDefault) {
      const newOv = { ...overrides };
      delete newOv[perm];
      setOverrides(newOv);
    } else {
      setOverrides(prev => ({ ...prev, [perm]: newVal }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const permissions = Object.keys(PERM_LABELS).map(perm => {
        const roleDefault = getRoleDefault(perm);
        if (perm in overrides) {
          return { permission: perm, granted: overrides[perm] };
        }
        return { permission: perm, granted: null };
      });
      await api.setUserPermissions(user.id, permissions);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = isSuperAdminActor || (!isSuperAdminTarget && currentUser?.id !== user.id);

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      <>
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h2 className="font-display text-2xl tracking-wider text-bone-100">
              Permisos — {user.username}
            </h2>
            <p className="text-xs text-bone-100/40 font-mono uppercase tracking-widest mt-0.5">
              Rango: {ROLE_LABELS[user.role] || user.role}
              {isSuperAdminTarget && ' · Super Administrador'}
            </p>
          </div>
        </div>

        {loading && <p className="text-bone-100/50 font-mono text-sm py-4">Cargando...</p>}
        {error && <p className="text-blood text-sm font-mono mb-4">{error}</p>}

        {data && (
          <>
            {isSuperAdminTarget && !isSuperAdminActor && (
              <div className="bg-blood/10 border border-blood/30 rounded-lg px-4 py-3 mb-4">
                <p className="text-sm text-blood font-mono">No podés modificar los permisos del super administrador.</p>
              </div>
            )}

            <div className="space-y-2">
              {Object.entries(PERM_LABELS).map(([perm, label]) => {
                const effective = getEffective(perm);
                const roleDefault = getRoleDefault(perm);
                const hasOverride = perm in overrides;

                return (
                  <div
                    key={perm}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors
                      ${effective ? 'bg-ink-700/50 border-bone-100/15' : 'bg-ink-800/30 border-bone-100/5'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-mono ${effective ? 'text-bone-100' : 'text-bone-100/40'}`}>
                        {label}
                      </p>
                      {hasOverride && (
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: overrides[perm] ? '#86efac' : '#fca5a5' }}>
                          {overrides[perm] ? '↑ Permiso añadido' : '↓ Permiso quitado'} (override)
                          <button
                            type="button"
                            onClick={() => {
                              const newOv = { ...overrides };
                              delete newOv[perm];
                              setOverrides(newOv);
                            }}
                            className="ml-2 underline opacity-70 hover:opacity-100"
                          >
                            Resetear
                          </button>
                        </p>
                      )}
                      {!hasOverride && (
                        <p className="text-[10px] text-bone-100/30 font-mono mt-0.5">
                          Default del rango {roleDefault ? '(activo)' : '(inactivo)'}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!canEdit || (isSuperAdminTarget && !isSuperAdminActor)}
                      onClick={() => handleToggle(perm)}
                      style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, flexShrink: 0, marginLeft: 16, background: effective ? '#22c55e' : '#4b5563', cursor: canEdit ? 'pointer' : 'not-allowed', opacity: canEdit ? 1 : 0.5, transition: 'background 0.2s', border: 'none', display: 'inline-block' }}
                    >
                      <span style={{ position: 'absolute', top: 3, left: effective ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s', display: 'block' }} />
                    </button>
                  </div>
                );
              })}
            </div>

            {canEdit && !isSuperAdminTarget && (
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Guardar permisos'}
                </button>
              </div>
            )}
            {(!canEdit || isSuperAdminTarget) && (
              <button type="button" onClick={onClose} className="btn-secondary w-full mt-6">Cerrar</button>
            )}
          </>
        )}
      </>
    </Modal>
  );
}
