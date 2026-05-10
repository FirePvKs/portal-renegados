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

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const containerRef = useRef(null);

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

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => {
      const next = Math.min(Math.max(prev * delta, 1), 6);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const clampOffset = useCallback((ox, oy, s) => {
    if (!containerRef.current) return { x: ox, y: oy };
    const rect = containerRef.current.getBoundingClientRect();
    const maxX = (rect.width * (s - 1)) / 2;
    const maxY = (rect.height * (s - 1)) / 2;
    return {
      x: Math.min(Math.max(ox, -maxX), maxX),
      y: Math.min(Math.max(oy, -maxY), maxY),
    };
  }, []);

  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    const raw = { x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y };
    setOffset(clampOffset(raw.x, raw.y, scale));
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleZoomBtn = (dir) => {
    setScale(prev => {
      const next = Math.min(Math.max(prev * (dir > 0 ? 1.2 : 0.85), 1), 6);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-ink-900 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo */}
        <div className="w-52 flex-shrink-0 border-r border-bone-100/10 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-bone-100/10 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-bone-100/40 font-mono">Rutas</p>
            <Link to={user ? '/home' : '/'} className="text-[10px] font-mono text-bone-100/40 hover:text-bone-100 transition-colors">← Volver</Link>
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

        {/* Mapa */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative flex items-center justify-center bg-black"
          style={{ cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            {/* Wrapper exacto sobre la imagen */}
            <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
              <img
                src="/mapa.png"
                alt="Mapa"
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 0px)',
                  width: 'auto',
                  height: 'auto',
                  userSelect: 'none',
                }}
                draggable={false}
              />

              {/* SVG línea — exactamente sobre la imagen */}
              {routeDetail?.linea?.length > 1 && (
                <svg
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={routeDetail.linea.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke="rgba(0,0,0,0.5)"
                    strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <polyline
                    points={routeDetail.linea.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke={routeDetail.color}
                    strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
                  />
                </svg>
              )}

              {/* Puntos — exactamente sobre la imagen */}
              {routeDetail?.points?.map((p, i) => (
                <MapPoint key={i} point={p} routeColor={routeDetail.color} scale={scale} />
              ))}
            </div>
          </div>

          {/* Controles zoom */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
            <button onClick={() => handleZoomBtn(1)} className="w-8 h-8 bg-ink-800/90 border border-bone-100/20 rounded text-bone-100 font-mono text-lg flex items-center justify-center hover:bg-ink-700 transition-colors">+</button>
            <button onClick={() => handleZoomBtn(-1)} className="w-8 h-8 bg-ink-800/90 border border-bone-100/20 rounded text-bone-100 font-mono text-lg flex items-center justify-center hover:bg-ink-700 transition-colors">−</button>
          </div>

          {loadingRoute && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-ink-900/80 border border-bone-100/15 rounded-xl px-6 py-4">
                <p className="text-bone-100/60 font-mono text-sm">Cargando ruta...</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho: solo pasos */}
        {routeDetail && (
          <div className="flex-shrink-0 border-l border-bone-100/10 flex flex-col overflow-hidden" style={{ width: '272px' }}>
            <div className="px-4 py-3 border-b border-bone-100/10 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: routeDetail.color }} />
              <h2 className="font-display text-bone-100 truncate">{routeDetail.nombre}</h2>
              <button onClick={() => { setSelectedRoute(null); setRouteDetail(null); }} className="ml-auto text-bone-100/40 hover:text-bone-100 text-lg leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {routeDetail.descripcion && (
                <div className="px-4 py-3 border-b border-bone-100/10">
                  <p className="text-sm text-bone-100/70">{routeDetail.descripcion}</p>
                </div>
              )}
              {routeDetail.steps?.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-bone-100/40 font-mono mb-3">Pasos ({routeDetail.steps.length})</p>
                  <div className="space-y-4">
                    {routeDetail.steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-mono font-bold text-white mt-0.5" style={{ background: routeDetail.color }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-bone-100/90 leading-relaxed">{step.texto}</p>
                          {step.imagen_url && <img src={step.imagen_url} alt={`Paso ${i + 1}`} className="mt-2 rounded-lg w-full object-cover max-h-32" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!routeDetail.steps?.length && (
                <p className="text-center py-8 text-bone-100/30 font-mono text-xs">Sin pasos definidos</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MapPoint({ point, routeColor, scale }) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div
      style={{ position: 'absolute', left: `${point.pos_x}%`, top: `${point.pos_y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div style={{ position: 'absolute', background: point.color || routeColor, width: 24, height: 24, top: -4, left: -4, borderRadius: '50%' }} className="animate-ping opacity-30" />
      <div style={{ background: point.color || routeColor, position: 'relative' }} className="w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer" />
      {showTooltip && (
        <div
          className="absolute bottom-6 left-1/2 bg-ink-900/95 border border-bone-100/20 rounded-lg p-2 min-w-32 shadow-xl z-20 pointer-events-none"
          style={{ transform: `translateX(-50%) scale(${1 / scale})`, transformOrigin: 'bottom center' }}
        >
          <p className="text-sm font-mono font-bold text-bone-100 whitespace-nowrap">{point.nombre}</p>
          {(point.coord_x != null || point.coord_y != null || point.coord_z != null) && (
            <p className="text-xs text-bone-100/50 font-mono mt-0.5">X:{point.coord_x ?? '—'} Y:{point.coord_y ?? '—'} Z:{point.coord_z ?? '—'}</p>
          )}
          {point.imagen_url && <img src={point.imagen_url} alt={point.nombre} className="mt-1.5 rounded w-28 h-16 object-cover" />}
        </div>
      )}
    </div>
  );
}
