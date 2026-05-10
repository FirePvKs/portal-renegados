import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import MembersTab from '../components/admin/MembersTab.jsx';
import CardsTab from '../components/admin/CardsTab.jsx';
import PlayersTab from '../components/admin/PlayersTab.jsx';
import JutsusTab from '../components/admin/JutsusTab.jsx';
import FactionsTab from '../components/admin/FactionsTab.jsx';
import AccountTab from '../components/admin/AccountTab.jsx';
import MapTab from '../components/admin/MapTab.jsx';
import MobsTab from '../components/admin/MobsTab.jsx';

const TABS = [
  { id: 'members',  label: 'Miembros' },
  { id: 'cards',    label: 'Tarjetas' },
  { id: 'players',  label: 'Jugadores' },
  { id: 'jutsus',   label: 'Jutsus' },
  { id: 'factions', label: 'Facciones' },
  { id: 'map',      label: 'Mapa' },
  { id: 'mobs',     label: 'Mobs' },
  { id: 'account',  label: 'Mi Cuenta' },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [active, setActive] = useState('members');

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-blood font-mono mb-2">
          Acceso de Líder
        </p>
        <h1 className="font-display text-4xl tracking-wider text-bone-100">
          Panel de Administración
        </h1>
      </div>

      <div className="flex gap-1 border-b border-bone-100/15 mb-8 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`relative px-5 py-3 font-mono uppercase text-xs tracking-widest transition-colors whitespace-nowrap
              ${active === tab.id
                ? 'text-bone-100'
                : 'text-bone-100/40 hover:text-bone-100/70'
              }`}
          >
            {tab.label}
            {active === tab.id && (
              <span className="absolute bottom-0 inset-x-2 h-0.5 bg-bone-100" />
            )}
          </button>
        ))}
      </div>

      <div className="fade-in-up" key={active}>
        {active === 'members'  && <MembersTab currentUser={user} />}
        {active === 'cards'    && <CardsTab />}
        {active === 'players'  && <PlayersTab />}
        {active === 'jutsus'   && <JutsusTab />}
        {active === 'factions' && <FactionsTab />}
        {active === 'map'      && <MapTab />}
        {active === 'mobs'     && <MobsTab />}
        {active === 'account'  && <AccountTab />}
      </div>
    </div>
  );
}
