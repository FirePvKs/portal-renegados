import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { cldPresets } from '../../lib/cloudinary.js';
import ImageUpload from '../ImageUpload.jsx';

export default function FactionsTab() {
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const d = await api.listFactions();
      setFactions(d.factions);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (f) => {
    if (!confirm(`¿Eliminar la facción "${f.nombre}"? Los jugadores que la tengan asignada quedarán sin facción.`)) return;
    try {
      await api.deleteFaction(f.id);
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-bone-100/60 font-mono text-sm">
          {factions.length} {factions.length === 1 ? 'facción' : 'facciones'}
        </p>
        <button onClick={() => setEditing('new')} className="btn-primary">
          + Nueva Facción
        </button>
      </div>

      {error && (
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {editing && (
        <FactionEditor
          faction={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <div className="text-bone-100/50 font-mono">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {factions.map(f => (
            <div
              key={f.id}
              className="shinobi-card-dark p-4 flex gap-3"
              style={f.color ? { borderLeft: `4px solid ${f.color}` } : undefined}
            >
              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-ink-700">
                {f.imagen_url ? (
                  <img
                    src={cldPresets.itemThumb(f.imagen_url)}
                    alt={f.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-display text-2xl"
                    style={{ color: f.color || '#E0E2C9' }}
                  >
                    {f.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display text-bone-100 mb-1">{f.nombre}</h3>
                {f.descripcion && (
                  <p className="text-xs text-bone-100/60 line-clamp-2">{f.descripcion}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setEditing(f)}
                  className="text-[10px] uppercase tracking-wider text-bone-100/70 hover:text-bone-100 hover:bg-bone-100/10 px-2 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(f)}
                  className="text-[10px] uppercase tracking-wider text-blood hover:bg-blood/10 px-2 py-1 rounded"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
          {factions.length === 0 && (
            <div className="col-span-full text-center py-10 text-bone-100/40 font-mono text-sm">
              No hay facciones registradas
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FactionEditor({ faction, onClose, onSaved }) {
  const isNew = !faction;

  const [nombre, setNombre] = useState(faction?.nombre || '');
  const [descripcion, setDescripcion] = useState(faction?.descripcion || '');
  const [color, setColor] = useState(faction?.color || '#E0E2C9');
  const [imagen, setImagen] = useState(
    faction?.imagen_url ? { url: faction.imagen_url, public_id: faction.imagen_public_id } : null
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      nombre,
      descripcion: descripcion || null,
      color: color || null,
      imagen_url: imagen?.url || null,
      imagen_public_id: imagen?.public_id || null
    };

    try {
      if (isNew) await api.createFaction(payload);
      else await api.updateFaction(faction.id, payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-ink-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="shinobi-card-dark w-full max-w-lg my-8 fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl tracking-wider text-bone-100 mb-6">
          {isNew ? 'Nueva Facción' : 'Editar Facción'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Imagen / Emblema
            </label>
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-ink-700 flex-shrink-0">
                {imagen ? (
                  <img src={cldPresets.itemThumb(imagen.url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-bone-100/30 text-xs font-mono">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <ImageUpload
                  kind="faction"
                  onUploaded={(r) => setImagen(r)}
                  className="btn-secondary text-xs px-3 py-1.5 inline-block"
                >
                  {imagen ? 'Cambiar' : 'Subir'}
                </ImageUpload>
                {imagen && (
                  <button type="button" onClick={() => setImagen(null)}
                    className="text-xs text-blood/70 hover:text-blood font-mono">
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Nombre *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={50}
              className="shinobi-input"
              placeholder="ej: Akatsuki"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 rounded cursor-pointer bg-ink-700 border border-bone-100/15"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#a02828"
                pattern="^#[0-9a-fA-F]{6}$"
                className="shinobi-input flex-1 font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="shinobi-input resize-none"
              placeholder="Sobre la facción..."
            />
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
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : (isNew ? 'Crear' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
