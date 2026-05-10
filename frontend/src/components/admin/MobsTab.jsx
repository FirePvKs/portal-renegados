import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../lib/api.js';
import Modal from '../Modal.jsx';
import ImageUpload from '../ImageUpload.jsx';

export default function MobsTab() {
  const [mobs, setMobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const d = await api.listMobs();
      setMobs(d.mobs);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este mob?')) return;
    try {
      await api.deleteMob(id);
      setMobs(m => m.filter(x => x.id !== id));
    } catch (e) { alert(e.message); }
  };

  const filtered = mobs.filter(m =>
    !search || m.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar mob..."
          className="shinobi-input flex-1 sm:max-w-xs"
        />
        <button onClick={() => setEditing('new')} className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
          + Nuevo Mob
        </button>
      </div>

      {error && <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-4">{error}</div>}
      {loading && <p className="text-bone-100/50 font-mono text-sm">Cargando...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(mob => (
          <div key={mob.id} className="shinobi-card-dark flex flex-col overflow-hidden">
            {mob.imagen_url ? (
              <div className="h-32 bg-ink-700 overflow-hidden">
                <img src={mob.imagen_url} alt={mob.nombre} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-32 bg-ink-700/50 flex items-center justify-center">
                <span className="font-display text-4xl text-bone-100/20">{mob.nombre.charAt(0)}</span>
              </div>
            )}
            <div className="p-4 flex-1 flex flex-col gap-2">
              <h3 className="font-display text-bone-100 truncate">{mob.nombre}</h3>
              <div className="flex gap-3 text-xs font-mono text-bone-100/50">
                {mob.nivel != null && <span>Nv. {mob.nivel}</span>}
                {mob.xp != null && <span>{mob.xp} XP</span>}
                {mob.spawns?.length > 0 && <span>{mob.spawns.length} spawn{mob.spawns.length !== 1 ? 's' : ''}</span>}
              </div>
              {mob.descripcion && (
                <p className="text-xs text-bone-100/50 line-clamp-2">{mob.descripcion}</p>
              )}
              <div className="flex gap-2 mt-auto pt-2">
                <button onClick={() => setEditing(mob)} className="btn-secondary text-xs px-3 py-1.5 flex-1">Editar</button>
                <button onClick={() => handleDelete(mob.id)} className="text-xs px-3 py-1.5 border border-blood/40 text-blood hover:bg-blood/10 rounded transition-colors">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-bone-100/30 font-mono text-sm">
            {search ? 'Sin resultados' : 'No hay mobs registrados'}
          </div>
        )}
      </div>

      {editing && (
        <MobEditor
          mob={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            if (editing === 'new') setMobs(prev => [m, ...prev]);
            else setMobs(prev => prev.map(x => x.id === m.id ? m : x));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Editor de Mob ────────────────────────────────────────────────────────────

function MobEditor({ mob, onClose, onSaved }) {
  const isNew = !mob;
  const [nombre, setNombre] = useState(mob?.nombre || '');
  const [descripcion, setDescripcion] = useState(mob?.descripcion || '');
  const [nivel, setNivel] = useState(mob?.nivel ?? '');
  const [xp, setXp] = useState(mob?.xp ?? '');
  const [imagen, setImagen] = useState(mob?.imagen_url ? { url: mob.imagen_url, public_id: mob.imagen_public_id } : null);
  const [spawns, setSpawns] = useState(mob?.spawns || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addingSpawn, setAddingSpawn] = useState(null);
  const mapRef = useRef(null);

  const getMapPos = useCallback((e) => {
    const rect = mapRef.current.getBoundingClientRect();
    return {
      pos_x: parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(3)),
      pos_y: parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(3))
    };
  }, []);

  const handleMapClick = (e) => {
    const pos = getMapPos(e);
    setAddingSpawn({ ...pos, notas: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        nombre, descripcion,
        nivel: nivel !== '' ? parseInt(nivel) : null,
        xp: xp !== '' ? parseInt(xp) : null,
        imagen_url: imagen?.url || null,
        imagen_public_id: imagen?.public_id || null,
        spawns
      };
      const d = isNew ? await api.createMob(payload) : await api.updateMob(mob.id, payload);
      onSaved(d.mob);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
      <>
        <h2 className="font-display text-2xl tracking-wider text-bone-100 mb-6">
          {isNew ? 'Nuevo Mob' : `Editar: ${mob.nombre}`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Imagen */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">Imagen (opcional)</label>
            <div className="flex items-center gap-4">
              {imagen ? (
                <div className="relative">
                  <img src={imagen.url} alt="" className="h-24 w-24 object-cover rounded-xl border border-bone-100/10" />
                  <button type="button" onClick={() => setImagen(null)} className="absolute -top-2 -right-2 bg-blood text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                </div>
              ) : (
                <div className="h-24 w-24 bg-ink-700/50 rounded-xl border border-bone-100/10 flex items-center justify-center text-bone-100/20 font-display text-2xl">
                  {nombre.charAt(0) || '?'}
                </div>
              )}
              <ImageUpload
                kind="player"
                onUploaded={r => setImagen({ url: r.url, public_id: r.public_id })}
                className="btn-secondary text-sm px-4 py-2"
              >
                {imagen ? 'Cambiar imagen' : 'Subir imagen'}
              </ImageUpload>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">Nombre *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="shinobi-input" placeholder="ej: Bandido del Bosque" />
          </div>

          {/* Nivel y XP */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">Nivel</label>
              <input type="number" min="1" value={nivel} onChange={e => setNivel(e.target.value)} className="shinobi-input" placeholder="ej: 15" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">XP al matar</label>
              <input type="number" min="0" value={xp} onChange={e => setXp(e.target.value)} className="shinobi-input" placeholder="ej: 250" />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">Descripción (opcional)</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} className="shinobi-input h-16 resize-none" placeholder="Descripción del mob..." />
          </div>

          {/* Mapa de spawns */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Zonas de aparición — click en el mapa para marcar
            </label>
            <div
              ref={mapRef}
              className="relative rounded-xl overflow-hidden border border-bone-100/20 cursor-crosshair"
              style={{ backgroundImage: 'url(/mapa.png)', backgroundSize: 'cover', backgroundPosition: 'center', aspectRatio: '1 / 1' }}
              onClick={handleMapClick}
            >
              {spawns.map((s, i) => (
                <div
                  key={i}
                  className="absolute group"
                  style={{ left: `${s.pos_x}%`, top: `${s.pos_y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="w-5 h-5 rounded-full bg-blood border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold cursor-pointer" onClick={() => setSpawns(prev => prev.filter((_, idx) => idx !== i))}>
                    ✕
                  </div>
                  {s.notas && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-ink-900/90 border border-bone-100/20 rounded px-2 py-1 text-xs font-mono whitespace-nowrap hidden group-hover:block z-10 text-bone-100">
                      {s.notas}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-bone-100/40 font-mono mt-1">Click en un punto rojo para eliminarlo</p>

            {/* Lista de spawns */}
            {spawns.length > 0 && (
              <div className="mt-2 space-y-1">
                {spawns.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-ink-700/30 rounded px-3 py-2">
                    <span className="text-xs font-mono text-bone-100/50">#{i + 1}</span>
                    <span className="text-xs text-bone-100/40 font-mono">{s.pos_x.toFixed(1)}%, {s.pos_y.toFixed(1)}%</span>
                    <input
                      type="text"
                      value={s.notas || ''}
                      onChange={e => setSpawns(prev => prev.map((x, idx) => idx === i ? { ...x, notas: e.target.value } : x))}
                      placeholder="Nota opcional..."
                      className="shinobi-input flex-1 text-xs py-1"
                      onClick={e => e.stopPropagation()}
                    />
                    <button type="button" onClick={() => setSpawns(prev => prev.filter((_, idx) => idx !== i))} className="text-xs text-blood/70 hover:text-blood">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-blood text-sm font-mono">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : isNew ? 'Crear mob' : 'Guardar cambios'}</button>
          </div>
        </form>

        {/* Mini modal para nota del spawn */}
        {addingSpawn && (
          <div className="fixed inset-0 bg-ink-900/60 z-[60] flex items-center justify-center p-4" onClick={() => setAddingSpawn(null)}>
            <div className="shinobi-card-dark w-full max-w-xs" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-lg text-bone-100 mb-3">Nota del spawn (opcional)</h3>
              <input
                type="text"
                value={addingSpawn.notas}
                onChange={e => setAddingSpawn(prev => ({ ...prev, notas: e.target.value }))}
                className="shinobi-input mb-3"
                placeholder="ej: Aparece de noche"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setAddingSpawn(null)} className="btn-secondary flex-1 text-sm">Cancelar</button>
                <button
                  type="button"
                  onClick={() => {
                    setSpawns(prev => [...prev, { pos_x: addingSpawn.pos_x, pos_y: addingSpawn.pos_y, notas: addingSpawn.notas }]);
                    setAddingSpawn(null);
                  }}
                  className="btn-primary flex-1 text-sm"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </Modal>
  );
}
