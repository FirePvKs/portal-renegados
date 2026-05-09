import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../lib/api.js';
import Modal from '../Modal.jsx';
import ImageUpload from '../ImageUpload.jsx';

const ROLES = ['lider', 'sub_lider', 'comandante', 'ayudante', 'miembro'];

export default function MapTab() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | route object
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const d = await api.listAllMapRoutes();
      setRoutes(d.routes);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta ruta?')) return;
    try {
      await api.deleteMapRoute(id);
      setRoutes(r => r.filter(x => x.id !== id));
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-bone-100/60 font-mono text-sm uppercase tracking-widest">
          {routes.length} {routes.length === 1 ? 'ruta' : 'rutas'}
        </p>
        <button onClick={() => setEditing('new')} className="btn-primary text-sm px-4 py-2">
          + Nueva Ruta
        </button>
      </div>

      {error && <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-4">{error}</div>}
      {loading && <p className="text-bone-100/50 font-mono">Cargando...</p>}

      <div className="space-y-3">
        {routes.map(r => (
          <div key={r.id} className="shinobi-card-dark flex items-center gap-4 p-4">
            <div
              className="w-3 h-10 rounded-full flex-shrink-0"
              style={{ background: r.color }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-bone-100 truncate">{r.nombre}</h3>
              <p className="text-xs text-bone-100/40 font-mono">
                {r.is_public ? 'Visible para todos los miembros' : 'Acceso restringido'} ·
                creada por {r.created_by_username || '—'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(r)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-xs px-3 py-1.5 border border-blood/40 text-blood hover:bg-blood/10 rounded transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {!loading && routes.length === 0 && (
          <p className="text-center py-12 text-bone-100/30 font-mono">No hay rutas creadas</p>
        )}
      </div>

      {editing && (
        <RouteEditor
          route={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            if (editing === 'new') setRoutes(prev => [r, ...prev]);
            else setRoutes(prev => prev.map(x => x.id === r.id ? r : x));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Editor de Ruta ──────────────────────────────────────────────────────────

function RouteEditor({ route, onClose, onSaved }) {
  const isNew = !route;

  // Campos básicos
  const [nombre, setNombre] = useState(route?.nombre || '');
  const [color, setColor] = useState(route?.color || '#e07b3a');
  const [descripcion, setDescripcion] = useState(route?.descripcion || '');
  const [isPublic, setIsPublic] = useState(route?.is_public ?? true);
  const [allowedRoles, setAllowedRoles] = useState(route?.allowed_roles || []);
  const [allowedUsers, setAllowedUsers] = useState(route?.allowed_users || []);
  const [members, setMembers] = useState([]);

  // Mapa
  const [linea, setLinea] = useState(route?.linea || []); // [{x,y}]
  const [points, setPoints] = useState(route?.points || []);
  const [steps, setSteps] = useState(route?.steps || []);

  // Estado del editor de mapa
  const [mapMode, setMapMode] = useState('view'); // 'view' | 'draw' | 'point'
  const [isDrawing, setIsDrawing] = useState(false);
  const [addingPoint, setAddingPoint] = useState(null); // punto que se está configurando
  const mapRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listAllMapRoutes && api.request('/api/admin/users').then(d => setMembers(d.users || [])).catch(() => {});
  }, []);

  // ── Eventos del mapa ──────────────────────────────────────────────────────

  const getMapPos = useCallback((e) => {
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(3)) };
  }, []);

  const handleMapMouseDown = (e) => {
    if (mapMode !== 'draw') return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getMapPos(e);
    setLinea(prev => [...prev, pos]);
  };

  const handleMapMouseMove = (e) => {
    if (!isDrawing || mapMode !== 'draw') return;
    const pos = getMapPos(e);
    setLinea(prev => {
      const last = prev[prev.length - 1];
      if (!last) return [pos];
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;
      if (Math.sqrt(dx * dx + dy * dy) < 0.5) return prev;
      return [...prev, pos];
    });
  };

  const handleMapMouseUp = () => setIsDrawing(false);

  const handleMapClick = (e) => {
    if (mapMode !== 'point') return;
    const pos = getMapPos(e);
    setAddingPoint({ pos_x: pos.x, pos_y: pos.y, nombre: '', color, coord_x: '', coord_y: '', coord_z: '', imagen_url: null, imagen_public_id: null });
  };

  // ── Pasos ─────────────────────────────────────────────────────────────────

  const addStep = () => setSteps(prev => [...prev, { texto: '', imagen_url: null, imagen_public_id: null }]);
  const updateStep = (i, field, val) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const removeStep = (i) => setSteps(prev => prev.filter((_, idx) => idx !== i));
  const moveStep = (i, dir) => {
    const arr = [...steps];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSteps(arr);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        nombre, color, descripcion, linea, is_public: isPublic,
        allowed_roles: isPublic ? [] : allowedRoles,
        allowed_users: isPublic ? [] : allowedUsers.map(u => u.id || u),
        points, steps
      };
      const d = isNew
        ? await api.createMapRoute(payload)
        : await api.updateMapRoute(route.id, payload);
      onSaved(d.route);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-5xl">
      <>
        <h2 className="font-display text-2xl tracking-wider text-bone-100 mb-6">
          {isNew ? 'Nueva Ruta' : `Editar: ${route.nombre}`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Nombre y color */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">Nombre de la ruta *</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="shinobi-input" placeholder="ej: Ruta del Norte" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">Color</label>
              <div className="flex gap-2">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-12 rounded cursor-pointer bg-transparent border border-bone-100/20" />
                <input type="text" value={color} onChange={e => setColor(e.target.value)} className="shinobi-input flex-1 font-mono" />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">Descripción (opcional)</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} className="shinobi-input h-16 resize-none" placeholder="Breve descripción de la ruta..." />
          </div>

          {/* ── Editor del mapa ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-3 font-mono">Mapa</label>

            {/* Barra de herramientas */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {[
                { mode: 'draw', label: '✏️ Trazar línea' },
                { mode: 'point', label: '📍 Añadir punto' },
                { mode: 'view', label: '👁 Ver' },
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMapMode(mode)}
                  className={`text-xs px-3 py-1.5 rounded font-mono border transition-colors
                    ${mapMode === mode
                      ? 'bg-bone-100/15 border-bone-100/50 text-bone-100'
                      : 'border-bone-100/20 text-bone-100/50 hover:text-bone-100/80'}`}
                >
                  {label}
                </button>
              ))}
              {linea.length > 0 && (
                <button type="button" onClick={() => setLinea([])} className="text-xs px-3 py-1.5 rounded font-mono border border-blood/40 text-blood hover:bg-blood/10 transition-colors">
                  🗑 Borrar línea
                </button>
              )}
              <span className="text-xs text-bone-100/40 font-mono self-center ml-2">
                {mapMode === 'draw' ? 'Click y arrastrá para trazar' : mapMode === 'point' ? 'Click en el mapa para añadir un punto' : ''}
              </span>
            </div>

            {/* Canvas del mapa */}
            <div
              ref={mapRef}
              className="relative rounded-xl overflow-hidden border border-bone-100/20 select-none"
              style={{
                backgroundImage: 'url(/mapa.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                aspectRatio: '1 / 1',
                cursor: mapMode === 'draw' ? 'crosshair' : mapMode === 'point' ? 'cell' : 'default'
              }}
              onMouseDown={handleMapMouseDown}
              onMouseMove={handleMapMouseMove}
              onMouseUp={handleMapMouseUp}
              onMouseLeave={handleMapMouseUp}
              onClick={handleMapClick}
            >
              {/* SVG línea */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {linea.length > 1 && (
                  <polyline
                    points={linea.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                )}
              </svg>

              {/* Puntos */}
              {points.map((p, i) => (
                <div
                  key={i}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${p.pos_x}%`, top: `${p.pos_y}%` }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer"
                    style={{ background: p.color || color }}
                    onClick={(e) => { e.stopPropagation(); if (mapMode === 'view') setAddingPoint({ ...p, _editIndex: i }); }}
                  />
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-ink-900/90 border border-bone-100/20 rounded px-2 py-1 text-xs font-mono whitespace-nowrap hidden group-hover:block z-10">
                    <strong className="text-bone-100">{p.nombre}</strong>
                    {(p.coord_x || p.coord_y || p.coord_z) && (
                      <div className="text-bone-100/60">X:{p.coord_x} Y:{p.coord_y} Z:{p.coord_z}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Lista de puntos */}
            {points.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-bone-100/50 font-mono uppercase mb-2">Puntos ({points.length})</p>
                {points.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-ink-700/40 rounded px-3 py-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color || color }} />
                    <span className="text-sm text-bone-100 flex-1">{p.nombre || '(sin nombre)'}</span>
                    <span className="text-xs text-bone-100/40 font-mono">X:{p.coord_x} Y:{p.coord_y} Z:{p.coord_z}</span>
                    <button type="button" onClick={() => setAddingPoint({ ...p, _editIndex: i })} className="text-xs text-bone-100/50 hover:text-bone-100">✏️</button>
                    <button type="button" onClick={() => setPoints(prev => prev.filter((_, idx) => idx !== i))} className="text-xs text-blood/70 hover:text-blood">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Pasos ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 font-mono">Pasos de la ruta</label>
              <button type="button" onClick={addStep} className="text-xs btn-secondary px-3 py-1.5">+ Agregar paso</button>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="bg-ink-700/40 border border-bone-100/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-bone-100/50 uppercase w-16">Paso {i + 1}</span>
                    <div className="flex gap-1 ml-auto">
                      <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0} className="text-xs px-2 py-0.5 border border-bone-100/20 rounded text-bone-100/50 hover:text-bone-100 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="text-xs px-2 py-0.5 border border-bone-100/20 rounded text-bone-100/50 hover:text-bone-100 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => removeStep(i)} className="text-xs px-2 py-0.5 border border-blood/30 rounded text-blood hover:bg-blood/10">✕</button>
                    </div>
                  </div>
                  <textarea
                    value={step.texto}
                    onChange={e => updateStep(i, 'texto', e.target.value)}
                    placeholder={`Descripción del paso ${i + 1}...`}
                    className="shinobi-input h-16 resize-none mb-2"
                  />
                  <div className="flex items-center gap-2">
                    {step.imagen_url ? (
                      <div className="relative">
                        <img src={step.imagen_url} alt="" className="h-12 w-20 object-cover rounded" />
                        <button type="button" onClick={() => updateStep(i, 'imagen_url', null)} className="absolute -top-1 -right-1 bg-blood text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">✕</button>
                      </div>
                    ) : null}
                    <ImageUpload
                      kind="player"
                      onUploaded={r => { updateStep(i, 'imagen_url', r.url); updateStep(i, 'imagen_public_id', r.public_id); }}
                      className="btn-secondary text-xs px-2 py-1"
                    >
                      {step.imagen_url ? 'Cambiar imagen' : '+ Imagen'}
                    </ImageUpload>
                  </div>
                </div>
              ))}
              {steps.length === 0 && (
                <p className="text-center py-4 text-bone-100/30 font-mono text-xs">Sin pasos — hacé click en "+ Agregar paso"</p>
              )}
            </div>
          </div>

          {/* ── Permisos ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-3 font-mono">Permisos de acceso</label>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="accent-bone-100 w-4 h-4" />
              <span className="text-sm text-bone-100/80">Visible para todos los miembros</span>
            </label>
            {!isPublic && (
              <div className="pl-6 space-y-3">
                <div>
                  <p className="text-xs text-bone-100/50 font-mono uppercase mb-2">Por rol</p>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map(r => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowedRoles.includes(r)}
                          onChange={e => setAllowedRoles(prev => e.target.checked ? [...prev, r] : prev.filter(x => x !== r))}
                          className="accent-bone-100"
                        />
                        <span className="text-xs font-mono text-bone-100/70 capitalize">{r}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-blood text-sm font-mono">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : isNew ? 'Crear ruta' : 'Guardar cambios'}</button>
          </div>
        </form>

        {/* Modal de punto */}
        {addingPoint && (
          <PointEditor
            point={addingPoint}
            defaultColor={color}
            onSave={(p) => {
              if (addingPoint._editIndex !== undefined) {
                setPoints(prev => prev.map((x, i) => i === addingPoint._editIndex ? p : x));
              } else {
                setPoints(prev => [...prev, p]);
              }
              setAddingPoint(null);
            }}
            onCancel={() => setAddingPoint(null)}
          />
        )}
      </>
    </Modal>
  );
}

// ─── Editor de Punto ─────────────────────────────────────────────────────────

function PointEditor({ point, defaultColor, onSave, onCancel }) {
  const [nombre, setNombre] = useState(point.nombre || '');
  const [color, setColor] = useState(point.color || defaultColor);
  const [coordX, setCoordX] = useState(point.coord_x ?? '');
  const [coordY, setCoordY] = useState(point.coord_y ?? '');
  const [coordZ, setCoordZ] = useState(point.coord_z ?? '');
  const [imagenUrl, setImagenUrl] = useState(point.imagen_url || null);
  const [imagenPublicId, setImagenPublicId] = useState(point.imagen_public_id || null);

  const handleSave = () => {
    if (!nombre.trim()) return alert('El nombre es requerido');
    onSave({
      pos_x: point.pos_x, pos_y: point.pos_y,
      nombre: nombre.trim(), color,
      coord_x: coordX !== '' ? parseInt(coordX) : null,
      coord_y: coordY !== '' ? parseInt(coordY) : null,
      coord_z: coordZ !== '' ? parseInt(coordZ) : null,
      imagen_url: imagenUrl, imagen_public_id: imagenPublicId
    });
  };

  return (
    <div className="fixed inset-0 bg-ink-900/60 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="shinobi-card-dark w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="font-display text-lg text-bone-100 mb-4">
          {point._editIndex !== undefined ? 'Editar punto' : 'Nuevo punto'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-1 font-mono">Nombre *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="shinobi-input" placeholder="ej: Pueblo del Este" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-1 font-mono">Color</label>
            <div className="flex gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-10 rounded cursor-pointer bg-transparent border border-bone-100/20" />
              <input type="text" value={color} onChange={e => setColor(e.target.value)} className="shinobi-input flex-1 font-mono text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-1 font-mono">Coordenadas del juego</label>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={coordX} onChange={e => setCoordX(e.target.value)} className="shinobi-input text-center font-mono" placeholder="X" />
              <input type="number" value={coordY} onChange={e => setCoordY(e.target.value)} className="shinobi-input text-center font-mono" placeholder="Y" />
              <input type="number" value={coordZ} onChange={e => setCoordZ(e.target.value)} className="shinobi-input text-center font-mono" placeholder="Z" />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-1 font-mono">Imagen de referencia (opcional)</label>
            <div className="flex items-center gap-2">
              {imagenUrl && (
                <div className="relative">
                  <img src={imagenUrl} alt="" className="h-12 w-20 object-cover rounded" />
                  <button type="button" onClick={() => { setImagenUrl(null); setImagenPublicId(null); }} className="absolute -top-1 -right-1 bg-blood text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">✕</button>
                </div>
              )}
              <ImageUpload
                kind="player"
                onUploaded={r => { setImagenUrl(r.url); setImagenPublicId(r.public_id); }}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                {imagenUrl ? 'Cambiar' : '+ Subir imagen'}
              </ImageUpload>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancelar</button>
          <button type="button" onClick={handleSave} className="btn-primary flex-1 text-sm">Guardar punto</button>
        </div>
      </div>
    </div>
  );
}
