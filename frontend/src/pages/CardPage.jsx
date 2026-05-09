import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { cldPresets } from '../lib/cloudinary.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function CardPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    const fetch = user
      ? api.getCard(id)
      : api.getPublicCard(id);

    fetch
      .then(d => setCard(d.card))
      .catch(e => {
        if (!user && e.message.includes('miembros')) {
          navigate('/login');
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [id, user, authLoading]);

  const backTo = user ? '/home' : '/';

  if (authLoading || loading) {
    return <div className="max-w-5xl mx-auto px-6 py-12 text-bone-100/60 font-mono">Cargando...</div>;
  }

  if (error || !card) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-4">
          {error || 'Tarjeta no encontrada'}
        </div>
        <Link to={backTo} className="btn-secondary inline-block">← Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {!user && (
        <div className="bg-ink-700/50 border border-bone-100/10 rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-bone-100/60 font-mono">
            Estás viendo contenido público.
          </p>
          <Link to="/login" className="btn-primary text-xs px-4 py-1.5 whitespace-nowrap">
            Iniciar sesión
          </Link>
        </div>
      )}

      <Link
        to={backTo}
        className="inline-flex items-center gap-2 text-bone-100/60 hover:text-bone-100 font-mono text-sm mb-6 transition-colors"
      >
        ← Volver al inicio
      </Link>

      <div className="shinobi-card-dark p-0 overflow-hidden mb-6">
        {card.imagen_url && (
          <div className="aspect-[3/1] bg-ink-700">
            <img
              src={cldPresets.bannerFull(card.imagen_url)}
              alt={card.titulo}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-bone-100 mb-2">
            {card.titulo}
          </h1>
          {card.subtitulo && (
            <p className="text-bone-100/60 font-mono text-sm uppercase tracking-widest">
              {card.subtitulo}
            </p>
          )}
        </div>
      </div>

      <div className="shinobi-card-dark text-center py-16">
        <p className="text-bone-100/40 font-mono text-sm uppercase tracking-widest mb-2">
          Contenido en construcción
        </p>
        <p className="text-bone-100/60 italic">
          Esta sección estará disponible próximamente.
        </p>
      </div>
    </div>
  );
}
