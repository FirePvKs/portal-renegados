import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { cldPresets } from '../lib/cloudinary.js';

export default function CardPage() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCard(id)
      .then(d => setCard(d.card))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-12 text-bone-100/60 font-mono">Cargando...</div>;
  }

  if (error || !card) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-4">
          {error || 'Tarjeta no encontrada'}
        </div>
        <Link to="/" className="btn-secondary inline-block">← Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link
        to="/"
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
