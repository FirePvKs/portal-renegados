import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function MapPage() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetail, setRouteDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Zoom / pan state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    api.listMapRoutes()
      .then(d => setRoutes(d.routes))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectRoute = async (route) => {
    if (selectedRoute?.id === route.id) {
      setSelectedRoute(null);
      setRouteDetail(null);
      return;
    }
    setSelectedRoute(route);
    setLoadingRoute(true);
    try {
      const d = await api.getMapRoute(route.id);
      setRouteDetail(d.route);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoute(false);
    }
  };

  // ── Zoom / Pan ────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.min(Math.max(s * delta, 0.5), 5));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  return (
    <div className="min-h-screen flex flex-col bg-ink-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-bone-100/10">
        <Link to={user ? '/home' : '/'} className="text-bone-100/60 hover:text-bone-100 font-mono text-sm transition-colors">
          ← Volver
        </Link>
        <h1 className="font-display text-xl tracking-wider text-bone-100">Mapa de Zonas</h1>
        <button onClick={resetView} className="text-xs font-mono text-bone-100/50 hover:text-bone-100 border border-bone-100/20 px-3 py-1.5 rounded transition-colors">
          Restablecer vista
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Panel izquierdo: rutas ── */}
        <div className="w-56 flex-shrink-0 border-r border-bone-100/10 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-bone-100/10">
            <p className="text-[10px] uppercase tracking-widest text-bone-100/40 font-mono">Rutas disponibles</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {loading && <p className="text-center py-6 text-bone-100/40 font-mono text-xs">Cargando...</p>}
            {!loading && routes.length === 0 && (
              <p className="text-center py-6 text-bone-100/30 font-mono text-xs px-4">No hay rutas disponibles</p>
            )}
            {routes.map(r => (
              <button
                key={r.id}
                onClick={() => selectRoute(r)}
                className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3
                  ${selectedRoute?.id === r.id
                    ? 'bg-bone-100/10 text-bone-100'
                    : 'text-bone-100/60 hover:bg-bone-100/5 hover:text-bone-100'}`}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <span className="text-sm font-mono truncate">{r.nombre}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Mapa ── */}
        <div className="flex-1 overflow-hidden relative">
          <div
            ref={containerRef}
            className="w-full h-full overflow-hidden"
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              ref={mapRef}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.1s',
                position: 'relative',
                width: '100%',
                height: '100%',
              }}
            >
              {/* Imagen del mapa */}
              <img
                src="/mapa.png"
                alt="Mapa"
                className="w-full h-full object-contain select-none pointer-events-none"
                draggable={false}
              />

              {/* SVG overlay para línea y puntos */}
              {routeDetail && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {/* Sombra de la línea */}
                  {routeDetail.linea?.length > 1 && (
                    <polyline
                      points={routeDetail.linea.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {/* Línea de la ruta */}
                  {routeDetail.linea?.length > 1 && (
                    <polyline
                      points={routeDetail.linea.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={routeDetail.color}
                      strokeWidth="0.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  )}
                </svg>
              )}

              {/* Puntos */}
              {routeDetail?.points?.map((p, i) => (
                <MapPoint key={i} point={p} routeColor={routeDetail.color} scale={scale} />
              ))}
            </div>
          </div>

          {/* Controles de zoom */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <button onClick={() => setScale(s => Math.min(s * 1.2, 5))} className="w-8 h-8 bg-ink-800 border border-bone-100/20 rounded text-bone-100 font-mono text-lg flex items-center justify-center hover:bg-ink-700 transition-colors">+</button>
            <button onClick={() => setScale(s => Math.max(s * 0.8, 0.5))} className="w-8 h-8 bg-ink-800 border border-bone-100/20 rounded text-bone-100 font-mono text-lg flex items-center justify-center hover:bg-ink-700 transition-colors">−</button>
          </div>

          {/* Indicador sin ruta seleccionada */}
          {!selectedRoute && !loading && routes.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-ink-900/70 border border-bone-100/15 rounded-xl px-6 py-4 text-center">
                <p className="text-bone-100/60 font-mono text-sm">Seleccioná una ruta del panel izquierdo</p>
              </div>
            </div>
          )}

          {loadingRoute && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-ink-900/70 border border-bone-100/15 rounded-xl px-6 py-4">
                <p className="text-bone-100/60 font-mono text-sm">Cargando ruta...</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Panel derecho: detalle de ruta ── */}
        {routeDetail && (
          <div className="w-72 flex-shrink-0 border-l border-bone-100/10 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-bone-100/10 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: routeDetail.color }} />
              <h2 className="font-display text-bone-100 truncate">{routeDetail.nombre}</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {routeDetail.descripcion && (
                <div className="px-4 py-3 border-b border-bone-100/10">
                  <p className="text-sm text-bone-100/70">{routeDetail.descripcion}</p>
                </div>
              )}

              {routeDetail.steps?.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-bone-100/40 font-mono mb-3">
                    Pasos ({routeDetail.steps.length})
                  </p>
                  <div className="space-y-4">
                    {routeDetail.steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-mono font-bold text-white mt-0.5"
                          style={{ background: routeDetail.color }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-bone-100/90 leading-relaxed">{step.texto}</p>
                          {step.imagen_url && (
                            <img
                              src={step.imagen_url}
                              alt={`Paso ${i + 1}`}
                              className="mt-2 rounded-lg w-full object-cover max-h-32"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {routeDetail.points?.length > 0 && (
                <div className="px-4 py-3 border-t border-bone-100/10">
                  <p className="text-[10px] uppercase tracking-widest text-bone-100/40 font-mono mb-3">
                    Puntos de interés ({routeDetail.points.length})
                  </p>
                  <div className="space-y-2">
                    {routeDetail.points.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 bg-ink-700/30 rounded-lg px-3 py-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ background: p.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-bone-100 font-mono">{p.nombre}</p>
                          {(p.coord_x != null || p.coord_y != null || p.coord_z != null) && (
                            <p className="text-xs text-bone-100/40 font-mono">
                              X:{p.coord_x ?? '—'} Y:{p.coord_y ?? '—'} Z:{p.coord_z ?? '—'}
                            </p>
                          )}
                          {p.imagen_url && (
                            <img src={p.imagen_url} alt={p.nombre} className="mt-1 rounded w-full max-h-20 object-cover" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente de Punto en el mapa ──────────────────────────────────────────

function MapPoint({ point, routeColor, scale }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="absolute"
      style={{
        left: `${point.pos_x}%`,
        top: `${point.pos_y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Anillo exterior pulsante */}
      <div
        className="absolute inset-0 rounded-full animate-ping opacity-40"
        style={{ background: point.color || routeColor, transform: 'scale(2)' }}
      />
      {/* Punto */}
      <div
        className="relative w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer"
        style={{ background: point.color || routeColor }}
      />
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-ink-900/95 border border-bone-100/20 rounded-lg p-2 min-w-32 shadow-xl z-20 pointer-events-none"
          style={{ transform: `translateX(-50%) scale(${1 / scale})`, transformOrigin: 'bottom center' }}
        >
          <p className="text-sm font-mono font-bold text-bone-100 whitespace-nowrap">{point.nombre}</p>
          {(point.coord_x != null || point.coord_y != null || point.coord_z != null) && (
            <p className="text-xs text-bone-100/50 font-mono mt-0.5">
              X:{point.coord_x ?? '—'} Y:{point.coord_y ?? '—'} Z:{point.coord_z ?? '—'}
            </p>
          )}
          {point.imagen_url && (
            <img src={point.imagen_url} alt={point.nombre} className="mt-1.5 rounded w-28 h-16 object-cover" />
          )}
        </div>
      )}
    </div>
  );
}
