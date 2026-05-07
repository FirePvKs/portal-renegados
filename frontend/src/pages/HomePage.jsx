import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { cldPresets } from '../lib/cloudinary.js';
import Logo from '../components/Logo.jsx';

export default function HomePage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.listCards()
      .then(d => setCards(d.cards))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = (card) => {
    if (card.is_coming_soon) return;
    if (!card.link) {
      navigate(`/cards/${card.id}`);
      return;
    }
    if (card.is_external) {
      window.open(card.link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(card.link);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-bone-100/50 font-mono text-sm">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {error && (
        <div className="bg-blood/15 border border-blood/40 text-blood rounded-md px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {cards.map((card, i) => (
          <DashboardCard
            key={card.id}
            card={card}
            onClick={() => handleCardClick(card)}
            index={i}
          />
        ))}
      </div>

      {cards.length === 0 && !loading && (
        <div className="text-center py-20 text-bone-100/40 font-mono">
          No hay tarjetas configuradas todavía
        </div>
      )}
    </div>
  );
}

function DashboardCard({ card, onClick, index }) {
  const isPlaceholder = card.is_coming_soon;

  return (
    <button
      onClick={onClick}
      disabled={isPlaceholder}
      className={`group relative block w-full text-left rounded-2xl overflow-hidden border-2 fade-in-up
        transition-all duration-300
        ${isPlaceholder
          ? 'bg-ink-800/60 border-bone-100/15 cursor-default'
          : 'bg-ink-800 border-bone-100/30 hover:border-bone-100/70 hover:scale-[1.02] cursor-pointer hover:shadow-glow-bone'
        }`}
      style={{
        animationDelay: `${index * 60}ms`,
        aspectRatio: '16 / 9'
      }}
    >
      {card.imagen_url && !isPlaceholder ? (
        <img
          src={cldPresets.bannerCard(card.imagen_url)}
          alt={card.titulo}
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          loading="lazy"
        />
      ) : isPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <Logo size={100} />
        </div>
      ) : null}

      {!isPlaceholder && card.imagen_url && (
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/80 via-transparent to-ink-900/80" />
      )}

      <div className="relative h-full flex flex-col justify-between p-4 sm:p-5">
        <h3 className={`font-display tracking-wider leading-tight
          text-xl sm:text-2xl lg:text-3xl
          ${isPlaceholder ? 'text-bone-100/60' : 'text-bone-50'}
          drop-shadow-lg`}
        >
          {card.titulo}
        </h3>

        {card.subtitulo && (
          <p className={`font-mono text-[10px] sm:text-xs uppercase tracking-widest text-center mt-auto
            ${isPlaceholder ? 'text-bone-100/40' : 'text-bone-100/90'}
            drop-shadow-lg`}
          >
            {card.subtitulo}
          </p>
        )}
      </div>

      {isPlaceholder && (
        <div className="absolute top-3 right-3 bg-bone-100/10 border border-bone-100/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest text-bone-100/60">
          Próx.
        </div>
      )}
    </button>
  );
}
