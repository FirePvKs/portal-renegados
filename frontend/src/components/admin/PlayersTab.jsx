import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { cldPresets } from '../../lib/cloudinary.js';
import ImageUpload from '../ImageUpload.jsx';

export default function PlayersTab() {
  const [players, setPlayers] = useState([]);
  const [factions, setFactions] = useState([]);
  const [jutsus, setJutsus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [p, f, j] = await Promise.all([
        api.listPlayers(),
        api.listFactions(),
        api.listJutsus()
      ]);
      setPlayers(p.players);
      setFactions(f.factions);
      setJutsus(j.jutsus);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (p) => {
    if (!confirm(`¿Eliminar al jugador "${p.nombre}"?`)) return;
    try {
      await api.deletePlayer(p.id);
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const filtered = players.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div className="flex-1 sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador..."
            className="shinobi-input"
          />
        </div>
        <button onClick={() => setEditing('new')} className="btn-primary">
          + Registrar Jugador
        </button>
      </div>

      {error && (
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {editing && (
        <PlayerEditor
          player={editing === 'new' ? null : editing}
          factions={factions}
          jutsus={jutsus}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <div className="text-bone-100/50 font-mono">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className="shinobi-card-dark p-4 flex gap-3"
              style={p.faction_color ? { borderLeft: `4px solid ${p.faction_color}` } : undefined}
            >
              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-ink-700">
                {p.imagen_url ? (
                  <img
                    src={cldPresets.itemThumb(p.imagen_url)}
                    alt={p.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-2xl text-bone-100/40">
                    {p.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display text-bone-100 truncate">{p.nombre}</h3>
                {p.faction_nombre && (
                  <p className="text-xs uppercase tracking-wider mb-1 font-mono"
                     style={{ color: p.faction_color || 'rgba(224,226,201,0.7)' }}>
                    {p.faction_nombre}
                  </p>
                )}
                <div className="flex gap-3 text-[11px] text-bone-100/50 font-mono">
                  {p.ultimo_nivel != null && <span>Nv. {p.ultimo_nivel}</span>}
                  {p.ultimo_prestigio != null && <span>P. {p.ultimo_prestigio}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setEditing(p)}
                  className="text-[10px] uppercase tracking-wider text-bone-100/70 hover:text-bone-100 hover:bg-bone-100/10 px-2 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="text-[10px] uppercase tracking-wider text-blood hover:bg-blood/10 px-2 py-1 rounded"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-10 text-bone-100/40 font-mono text-sm">
              {search ? 'Sin resultados' : 'No hay jugadores registrados'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerEditor({ player, factions, jutsus, onClose, onSaved }) {
  const isNew = !player;

  const [nombre, setNombre] = useState(player?.nombre || '');
  const [imagen, setImagen] = useState(
    player?.imagen_url ? { url: player.imagen_url, public_id: player.imagen_public_id } : null
  );
  const [ultimoNivel, setUltimoNivel] = useState(player?.ultimo_nivel ?? '');
  const [ultimoPrestigio, setUltimoPrestigio] = useState(player?.ultimo_prestigio ?? '');
  const [factionId, setFactionId] = useState(player?.faction_id || '');
  const [notas, setNotas] = useState(player?.notas || '');
  const [jutsuIds, setJutsuIds] = useState([]);
  const [jutsuSearch, setJutsuSearch] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Cargar jutsus actuales del jugador si está editando
  useEffect(() => {
    if (player?.id) {
      api.getPlayer(player.id)
        .then(d => setJutsuIds(d.jutsus.map(j => j.id)))
        .catch(() => {});
    }
  }, [player?.id]);

  const toggleJutsu = (id) => {
    setJutsuIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  };

  const filteredJutsus = jutsus.filter(j =>
    j.nombre.toLowerCase().includes(jutsuSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      nombre,
      imagen_url: imagen?.url || null,
      imagen_public_id: imagen?.public_id || null,
      ultimo_nivel: ultimoNivel === '' ? null : parseInt(ultimoNivel, 10),
      ultimo_prestigio: ultimoPrestigio === '' ? null : parseInt(ultimoPrestigio, 10),
      faction_id: factionId || null,
      notas: notas || null,
      jutsu_ids: jutsuIds
    };

    try {
      if (isNew) await api.createPlayer(payload);
      else await api.updatePlayer(player.id, payload);
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
        className="shinobi-card-dark w-full max-w-2xl my-8 fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl tracking-wider text-bone-100 mb-6">
          {isNew ? 'Registrar Jugador' : 'Editar Jugador'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Imagen del jugador
            </label>
            <div className="flex items-start gap-3">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-ink-700 flex-shrink-0">
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
                  kind="player"
                  onUploaded={(r) => setImagen(r)}
                  className="btn-secondary text-xs px-3 py-1.5 inline-block"
                >
                  {imagen ? 'Cambiar' : 'Subir imagen'}
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
              Nombre del jugador *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={50}
              className="shinobi-input"
              placeholder="ej: Itachi_Uchiha"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
                Último nivel avistado
              </label>
              <input
                type="number"
                min="0"
                value={ultimoNivel}
                onChange={(e) => setUltimoNivel(e.target.value)}
                className="shinobi-input"
                placeholder="—"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
                Último prestigio avistado
              </label>
              <input
                type="number"
                min="0"
                value={ultimoPrestigio}
                onChange={(e) => setUltimoPrestigio(e.target.value)}
                className="shinobi-input"
                placeholder="—"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Facción
            </label>
            <select
              value={factionId}
              onChange={(e) => setFactionId(e.target.value)}
              className="shinobi-input"
            >
              <option value="">— Sin facción —</option>
              {factions.map(f => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
            {factions.length === 0 && (
              <p className="text-xs text-bone-100/40 mt-1 font-mono">
                💡 Aún no hay facciones. Crea algunas en el tab "Facciones".
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Jutsus conocidos ({jutsuIds.length})
            </label>

            {jutsus.length === 0 ? (
              <p className="text-xs text-bone-100/40 font-mono py-2">
                💡 Aún no hay jutsus. Crea algunos en el tab "Jutsus".
              </p>
            ) : (
              <>
                <input
                  type="text"
                  value={jutsuSearch}
                  onChange={(e) => setJutsuSearch(e.target.value)}
                  placeholder="Buscar jutsu..."
                  className="shinobi-input mb-2"
                />
                <div className="max-h-48 overflow-y-auto border border-bone-100/10 rounded-md bg-ink-700/30 p-2 space-y-1">
                  {filteredJutsus.map(j => (
                    <label
                      key={j.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-bone-100/5 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={jutsuIds.includes(j.id)}
                        onChange={() => toggleJutsu(j.id)}
                        className="accent-bone-100"
                      />
                      <span className="text-sm text-bone-100/80 flex-1">{j.nombre}</span>
                      {j.rango && (
                        <span className="text-[10px] font-mono uppercase tracking-widest bg-bone-100/10 px-2 py-0.5 rounded text-bone-100/60">
                          {j.rango}
                        </span>
                      )}
                    </label>
                  ))}
                  {filteredJutsus.length === 0 && (
                    <p className="text-center text-bone-100/40 py-2 text-xs font-mono">
                      Sin resultados
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-bone-100/70 mb-2 font-mono">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="shinobi-input resize-none"
              placeholder="Información adicional sobre el jugador..."
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
              {saving ? 'Guardando...' : (isNew ? 'Registrar' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
