import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { cldPresets } from '../lib/cloudinary.js';
import Logo from '../components/Logo.jsx';

export default function PublicPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.listPublicCards()
      .then(d => setCards(d.cards))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = (card) => {
    if (card.is_coming_soon) return;
    if (!card.link) return;
    if (card.is_external) {
      window.open(card.link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(card.link);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header mínimo para visitantes */}
      <header className="bg-ink-800 border-b border-bone-100/15">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-bone-100">
            <Logo size={48} />
            <span className="font-display text-2xl tracking-widest hidden sm:inline">
              RENEGADOS
            </span>
          </div>
          <Link
            to="/login"
            className="btn-secondary text-xs px-4 py-2 font-mono uppercase tracking-widest"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        {loading ? (
          <div className="text-bone-100/50 font-mono text-sm">Cargando...</div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20 text-bone-100/40 font-mono">
            No hay contenido público disponible
          </div>
        ) : (
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
        )}
      </main>
    </div>
  );
}

function DashboardCard({ card, onClick, index }) {
  const isPlaceholder = card.is_coming_soon;
  const isClickable = !isPlaceholder && card.link;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`group relative block w-full text-left rounded-2xl overflow-hidden border-2 fade-in-up
        transition-all duration-300
        ${isPlaceholder
          ? 'bg-ink-800/60 border-bone-100/15 cursor-default'
          : isClickable
            ? 'bg-ink-800 border-bone-100/30 hover:border-bone-100/70 hover:scale-[1.02] cursor-pointer hover:shadow-glow-bone'
            : 'bg-ink-800 border-bone-100/30 cursor-default'
        }`}
      style={{ animationDelay: `${index * 60}ms`, aspectRatio: '16 / 9' }}
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
