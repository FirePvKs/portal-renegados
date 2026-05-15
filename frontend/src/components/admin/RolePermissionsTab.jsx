import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLES = ['lider', 'sub_lider', 'comandante', 'ayudante', 'miembro'];
const ROLE_LABELS = {
  lider: 'Líder', sub_lider: 'Sub Líder', comandante: 'Comandante',
  ayudante: 'Ayudante', miembro: 'Miembro'
};

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

export default function RolePermissionsTab() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [changes, setChanges] = useState({});

  const isSuperAdmin = user?.username?.toLowerCase() === 'firepentakiller';

  useEffect(() => {
    api.getRolePermissions()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const getVal = (role, perm) => {
    if (changes[`${role}:${perm}`] !== undefined) return changes[`${role}:${perm}`];
    return data?.rolePerms?.find(r => r.role === role && r.permission === perm)?.granted ?? false;
  };

  const toggle = (role, perm) => {
    if (!isSuperAdmin) return;
    setChanges(prev => ({ ...prev, [`${role}:${perm}`]: !getVal(role, perm) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await Promise.all(
        Object.entries(changes).map(([key, granted]) => {
          const [role, permission] = key.split(':');
          return api.setRolePermission(role, permission, granted);
        })
      );
      // Reload
      const d = await api.getRolePermissions();
      setData(d);
      setChanges({});
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-bone-100/50 font-mono text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-xl text-bone-100 mb-1">Permisos por rango</h2>
          <p className="text-xs text-bone-100/40 font-mono">
            {isSuperAdmin ? 'Hacé click en un permiso para activarlo o desactivarlo' : 'Solo el super administrador puede modificar esto'}
          </p>
        </div>
        {isSuperAdmin && Object.keys(changes).length > 0 && (
          <button onClick={handleSave} disabled={!!saving} className="btn-primary text-sm px-4 py-2">
            {saving ? 'Guardando...' : `Guardar ${Object.keys(changes).length} cambio${Object.keys(changes).length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {error && <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-4">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bone-100/10">
              <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-bone-100/40 font-mono w-48">Permiso</th>
              {ROLES.map(r => (
                <th key={r} className="px-4 py-3 text-xs uppercase tracking-widest text-bone-100/60 font-mono text-center">
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(PERM_LABELS).map(([perm, label]) => (
              <tr key={perm} className="border-b border-bone-100/5 hover:bg-ink-700/20 transition-colors">
                <td className="px-4 py-3 text-bone-100/80 font-mono text-xs">{label}</td>
                {ROLES.map(role => {
                  const val = getVal(role, perm);
                  const changed = changes[`${role}:${perm}`] !== undefined;
                  return (
                    <td key={role} className="px-4 py-3 text-center">
                      <button
                        type="button"
                        disabled={!isSuperAdmin}
                        onClick={() => toggle(role, perm)}
                        className={`w-8 h-8 rounded-lg transition-all mx-auto flex items-center justify-center
                          ${isSuperAdmin ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                          ${changed ? 'ring-2 ring-bone-100/40' : ''}
                          ${val ? 'bg-green-500/30 text-green-400' : 'bg-ink-700/50 text-bone-100/20'}`}
                      >
                        {val ? '✓' : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
