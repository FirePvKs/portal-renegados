import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { cldPresets } from '../../lib/cloudinary.js';
import ImageUpload from '../ImageUpload.jsx';

const RANGOS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];
const TIPOS = ['Ninjutsu', 'Taijutsu', 'Genjutsu', 'Kenjutsu', 'Fuinjutsu', 'Iryo Ninjutsu', 'Otro'];

export default function JutsusTab() {
  const [jutsus, setJutsus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const d = await api.listJutsus();
      setJutsus(d.jutsus);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (j) => {
    if (!confirm(`¿Eliminar el jutsu "${j.nombre}"?`)) return;
    try {
      await api.deleteJutsu(j.id);
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const filtered = jutsus.filter(j =>
    j.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jutsu..."
          className="shinobi-input sm:max-w-xs"
        />
        <button onClick={() => setEditing('new')} className="btn-primary">
          + Nuevo Jutsu
        </button>
      </div>

      {error && (
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {editing && (
        <JutsuEditor
          jutsu={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <div className="text-bone-100/50 font-mono">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(j => (
            <div key={j.id} className="shinobi-card-dark p-4 flex gap-3">
              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-ink-700">
                {j.imagen_url ? (
                  <img
                    src={cldPresets.itemThumb(j.imagen_url)}
                    alt={j.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-bone-100/30 text-xs font-mono">
                    {j.rango || '?'}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-display text-bone-100 truncate">{j.nombre}</h3>
                  {j.rango && (
                    <span className="text-[10px] font-mono uppercase tracking-widest bg-bone-100/10 px-2 py-0.5 rounded text-bone-100/80 flex-shrink-0">
                      {j.rango}
                    </span>
                  )}
                </div>
                {j.tipo && (
                  <p className="text-xs text-bone-100/50 uppercase tracking-wider mb-1 font-mono">
                    {j.tipo}
                  </p>
                )}
                {j.descripcion && (
                  <p className="text-xs text-bone-100/60 line-clamp-2">{j.descripcion}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setEditing(j)}
                  className="text-[10px] uppercase tracking-wider text-bone-100/70 hover:text-bone-100 hover:bg-bone-100/10 px-2 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(j)}
                  className="text-[10px] uppercase tracking-wider text-blood hover:bg-blood/10 px-2 py-1 rounded"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-10 text-bone-100/40 font-mono text-sm">
              {search ? 'Sin resultados' : 'No hay jutsus en el catálogo'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JutsuEditor({ jutsu, onClose, onSaved }) {
  const isNew = !jutsu;

  const [nombre, setNombre] = useState(jutsu?.nombre || '');
  const [descripcion, setDescripcion] = useState(jutsu?.descripcion || '');
  const [rango, setRango] = useState(jutsu?.rango || '');
  const [tipo, setTipo] = useState(jutsu?.tipo || '');
  const [imagen, setImagen] = useState(
    jutsu?.imagen_url ? { url: jutsu.imagen_url, public_id: jutsu.imagen_public_id } : null
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
      rango: rango || null,
      tipo: tipo || null,
      imagen_url: imagen?.url || null,
      imagen_public_id: imagen?.public_id || null
    };

    try {
      if (isNew) await api.createJutsu(payload);
      else await api.updateJutsu(jutsu.id, payload);
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
          {isNew ? 'Nuevo Jutsu' : 'Editar Jutsu'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Imagen (opcional)
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
                  kind="jutsu"
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
              maxLength={80}
              className="shinobi-input"
              placeholder="ej: Rasengan"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
                Rango
              </label>
              <select value={rango} onChange={(e) => setRango(e.target.value)} className="shinobi-input">
                <option value="">— Sin rango —</option>
                {RANGOS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
                Tipo
              </label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="shinobi-input">
                <option value="">— Sin tipo —</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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
              placeholder="Detalles del jutsu..."
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
