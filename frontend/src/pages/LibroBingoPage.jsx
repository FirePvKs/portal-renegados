import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { cldPresets } from '../lib/cloudinary.js';

export default function LibroBingoPage() {
  const [players, setPlayers] = useState([]);
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [factionFilter, setFactionFilter] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([api.listPlayers(), api.listFactions()])
      .then(([p, f]) => {
        setPlayers(p.players);
        setFactions(f.factions);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter(p => {
    if (factionFilter && p.faction_id !== factionFilter) return false;
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-bone-100/60 hover:text-bone-100 font-mono text-sm mb-6 transition-colors"
      >
        ← Volver al inicio
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-wider text-bone-100 mb-2">
          Libro Bingo
        </h1>
        <p className="text-bone-100/50 text-sm font-mono uppercase tracking-widest">
          {filtered.length} {filtered.length === 1 ? 'jugador registrado' : 'jugadores registrados'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jugador..."
          className="shinobi-input flex-1"
        />
        <select
          value={factionFilter}
          onChange={(e) => setFactionFilter(e.target.value)}
          className="shinobi-input sm:max-w-xs"
        >
          <option value="">Todas las facciones</option>
          {factions.map(f => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
        </select>
      </div>

      {loading && <div className="text-bone-100/50 font-mono">Cargando...</div>}

      {error && (
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className="group block bg-ink-800 border border-bone-100/15 rounded-xl overflow-hidden text-left
              hover:border-bone-100/40 hover:scale-[1.03] hover:shadow-glow-bone transition-all fade-in-up"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div
              className="aspect-square bg-ink-700 relative"
              style={p.faction_color ? { borderTop: `3px solid ${p.faction_color}` } : undefined}
            >
              {p.imagen_url ? (
                <img
                  src={cldPresets.itemThumb(p.imagen_url)}
                  alt={p.nombre}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-4xl text-bone-100/30">
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-display text-sm text-bone-100 truncate">{p.nombre}</h3>
              {p.faction_nombre && (
                <p className="text-[10px] uppercase tracking-wider font-mono mt-1 truncate"
                   style={{ color: p.faction_color || 'rgba(224,226,201,0.6)' }}>
                  {p.faction_nombre}
                </p>
              )}
              <div className="flex gap-2 text-[10px] text-bone-100/40 font-mono mt-1">
                {p.ultimo_nivel != null && <span>Nv. {p.ultimo_nivel}</span>}
                {p.ultimo_prestigio != null && <span>P. {p.ultimo_prestigio}</span>}
              </div>
            </div>
          </button>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full text-center py-20 text-bone-100/40 font-mono">
            {search || factionFilter ? 'Sin resultados' : 'No hay jugadores registrados'}
          </div>
        )}
      </div>

      {selected && (
        <PlayerDetailModal id={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function PlayerDetailModal({ id, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPlayer(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div
      className="fixed inset-0 bg-ink-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="shinobi-card-dark w-full max-w-2xl my-8 fade-in-up p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="p-12 text-center text-bone-100/50 font-mono">Cargando...</div>
        )}

        {error && (
          <div className="p-6">
            <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3">
              {error}
            </div>
          </div>
        )}

        {data && (
          <>
            <div
              className="relative aspect-[3/1] bg-ink-700"
              style={data.player.faction_color ? {
                background: `linear-gradient(135deg, ${data.player.faction_color}40, transparent)`
              } : undefined}
            >
              {data.player.imagen_url ? (
                <img
                  src={cldPresets.bannerFull(data.player.imagen_url)}
                  alt={data.player.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-7xl text-bone-100/15">
                  {data.player.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-9 h-9 bg-ink-900/70 hover:bg-ink-900 border border-bone-100/20 rounded-full flex items-center justify-center text-bone-100"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-3xl tracking-wider text-bone-100 mb-1">
                    {data.player.nombre}
                  </h2>
                  {data.player.faction_nombre && (
                    <p className="text-xs uppercase tracking-wider font-mono"
                       style={{ color: data.player.faction_color || 'rgba(224,226,201,0.7)' }}>
                      {data.player.faction_nombre}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <Stat label="Último nivel" value={data.player.ultimo_nivel ?? '—'} />
                <Stat label="Último prestigio" value={data.player.ultimo_prestigio ?? '—'} />
              </div>

              {data.jutsus.length > 0 && (
                <div className="mb-5">
                  <h3 className="font-display text-sm tracking-widest text-bone-100/70 uppercase mb-2">
                    Jutsus conocidos ({data.jutsus.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.jutsus.map(j => (
                      <div key={j.id} className="bg-ink-700/50 border border-bone-100/10 rounded-md px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-bone-100 truncate">{j.nombre}</p>
                          {j.tipo && (
                            <p className="text-[10px] uppercase tracking-wider text-bone-100/40 font-mono">
                              {j.tipo}
                            </p>
                          )}
                        </div>
                        {j.rango && (
                          <span className="text-[10px] font-mono uppercase tracking-widest bg-bone-100/10 px-2 py-0.5 rounded text-bone-100/80 flex-shrink-0">
                            {j.rango}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.player.notas && (
                <div className="border-t border-bone-100/10 pt-4">
                  <h3 className="font-display text-sm tracking-widest text-bone-100/70 uppercase mb-2">
                    Notas
                  </h3>
                  <p className="text-sm text-bone-100/80 whitespace-pre-wrap">
                    {data.player.notas}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-ink-700/50 border border-bone-100/10 rounded-lg px-4 py-3 text-center">
      <div className="font-display text-2xl text-bone-100">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-bone-100/50 font-mono mt-1">{label}</div>
    </div>
  );
}
